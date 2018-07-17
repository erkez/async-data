// @flow
'use strict';

import { DateTime } from 'luxon';
import { Some, None } from '@ekz/option';
import * as extractors from './extractors';
import type { Option } from '@ekz/option';

export type AsyncDataMatch<A, B> = {|
    Empty?: () => B,
    Ready?: (value: A) => B,
    Pending?: (startTime: DateTime) => B,
    Failed?: (error: Error) => B,
    PendingStale?: (value: A, startTime: DateTime) => B,
    FailedStale?: (value: A, error: Error) => B
|};

export interface AsyncData<A> {
    +value: A;
    +error: Error;
    +state: AsyncDataState;
    +isEmpty: boolean;
    +nonEmpty: boolean;
    +isPending: boolean;
    +isReady: boolean;
    +isStale: boolean;
    +isFailed: boolean;
    duration(currentTime?: DateTime): Option<number>;
    pending(startTime?: DateTime): AsyncData<A>;
    fail(error: Error): AsyncData<A>;
    ready(value: A): AsyncData<A>;
    map<B>(f: (A) => B): AsyncData<B>;
    match<B>(match: AsyncDataMatch<A, B>, getDefault: () => B): B;
    toOption(): Option<A>;
}

export type AsyncDataState =
    | 'Empty'
    | 'Ready'
    | 'Pending'
    | 'PendingStale'
    | 'Failed'
    | 'FailedStale';

class $AsyncData<A> implements AsyncData<A> {
    _value: Option<A>;
    _error: Option<Error>;
    _startTime: Option<DateTime>;
    _state: AsyncDataState;

    constructor(value: Option<A>, error: Option<Error>, startTime: Option<DateTime>) {
        this._value = value;
        this._error = error;
        this._startTime = startTime;
        this._state = this._getState();
    }

    get value(): A {
        if (this._value.isEmpty) {
            throw new Error('Cannot get value when empty');
        }

        return this._value.get();
    }

    get error(): Error {
        if (this._error.isEmpty) {
            throw new Error('Cannot get error when not in failure state');
        }

        return this._error.get();
    }

    get state(): AsyncDataState {
        return this._state;
    }

    get isEmpty(): boolean {
        return this._value.isEmpty;
    }

    get nonEmpty(): boolean {
        return !this.isEmpty;
    }

    get isReady(): boolean {
        return this.nonEmpty && !this.isStale;
    }

    get isPending(): boolean {
        return this._startTime.isDefined;
    }

    get isStale(): boolean {
        return this.nonEmpty && (this.isPending || this._error.isDefined);
    }

    get isFailed(): boolean {
        return this._error.isDefined;
    }

    duration(currentTime?: DateTime = DateTime.utc()): Option<number> {
        return this._startTime.map(start => currentTime.diff(start, 'milliseconds').milliseconds);
    }

    pending(startTime?: DateTime = DateTime.utc()): AsyncData<A> {
        return new $AsyncData(this._value, this._error, Some(startTime));
    }

    fail(error: Error): AsyncData<A> {
        return new $AsyncData(this._value, Some(error), None);
    }

    ready<B: A>(value: B): AsyncData<A> {
        return new $AsyncData(Some(value), None, None);
    }

    map<B>(f: A => B): AsyncData<B> {
        return this.match(
            {
                Ready: value => Ready(f(value)),
                PendingStale: (value, startTime) => Ready(f(value)).pending(startTime),
                FailedStale: (value, error) => Ready(f(value)).fail(error)
            },
            () => new $AsyncData(None, this._error, this._startTime)
        );
    }

    match<B>(match: AsyncDataMatch<A, B>, getDefault: () => B): B {
        if (this.state === 'Ready' && match.Ready != null) {
            return match.Ready(this.value);
        } else if (this.state === 'Empty' && match.Empty != null) {
            return match.Empty();
        } else if (this.state === 'Pending' && match.Pending != null) {
            let pending = match.Pending;
            return pending(this._startTime.get());
        } else if (
            this.state === 'PendingStale' &&
            match.PendingStale != null
        ) {
            let pendingStale = match.PendingStale;
            return pendingStale(this.value, this._startTime.get());
        } else if (this.state === 'Failed' && match.Failed != null) {
            return match.Failed(this.error);
        } else if (
            this.state === 'FailedStale' &&
            match.FailedStale != null
        ) {
            return match.FailedStale(this.value, this.error);
        }

        return getDefault();
    }

    toOption(): Option<A> {
        return this._value;
    }

    _getState(): AsyncDataState {
        if (this.isEmpty && this.isPending) {
            return 'Pending';
        } else if (this.nonEmpty && this.isPending) {
            return 'PendingStale';
        } else if (this.isEmpty && this.isFailed && !this.isPending) {
            return 'Failed';
        } else if (this.nonEmpty && this.isFailed) {
            return 'FailedStale';
        } else if (this.nonEmpty) {
            return 'Ready';
        } else {
            return 'Empty';
        }
    }
}

export function Empty<A>(): AsyncData<A> {
    return new $AsyncData(None, None, None);
}

export function Pending<A>(startTime?: DateTime = DateTime.utc()): AsyncData<A> {
    return new $AsyncData(None, None, Some(startTime));
}

export function Failed<A>(error: Error): AsyncData<A> {
    return new $AsyncData(None, Some(error), None);
}

export function Ready<A>(value: A): AsyncData<A> {
    return new $AsyncData(Some(value), None, None);
}

export function observePromise<A>(
    promise: Promise<A>,
    updater: (cb: AsyncData<A> => AsyncData<A>) => mixed
): () => void {
    updater(s => s.pending());

    let cancelled = false;
    const unsubscribe = () => {
        cancelled = true;
    };

    promise
        .then(data => {
            if (!cancelled) {
                updater(s => s.ready(data));
            }

            return null;
        })
        .catch((error: Error) => {
            if (!cancelled) {
                updater(s => s.fail(error));
            }

            return null;
        });

    return unsubscribe;
}

export function observePromiseGS<A>(
    promise: Promise<A>,
    getState: () => AsyncData<A>,
    setState: (AsyncData<A>) => mixed
): () => void {
    let updater = update => setState(update(getState()));
    return observePromise(promise, updater);
}

export { extractors };
