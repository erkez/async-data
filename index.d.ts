declare module '@ekz/async-data' {
    import { DateTime } from 'luxon';
    import { Option, Some, None } from '@ekz/option';

    import * as extractors from '@ekz/async-data/extractors';

    export interface AsyncDataMatch<A, B> {
        Empty?: () => B;
        Ready?: (value: A) => B;
        Pending?: (startTime: DateTime) => B;
        Failed?: (error: Error) => B;
        PendingStale?: (value: A, startTime: DateTime) => B;
        FailedStale?: (value: A, error: Error) => B;
    }

    export interface AsyncData<A> {
        readonly value: A;
        readonly error: Error;
        readonly state: AsyncDataState;
        readonly isEmpty: boolean;
        readonly nonEmpty: boolean;
        readonly isPending: boolean;
        readonly isReady: boolean;
        readonly isStale: boolean;
        readonly isFailed: boolean;
        duration(currentTime?: DateTime): Option<number>;
        pending(startTime?: DateTime): AsyncData<A>;
        fail(error: Error): AsyncData<A>;
        ready(value: A): AsyncData<A>;
        map<B>(f: (value: A) => B): AsyncData<B>;
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

    export function Empty<A>(): AsyncData<A>;

    export function Pending<A>(startTime: DateTime): AsyncData<A>;

    export function Failed<A>(error: Error): AsyncData<A>;

    export function Ready<A>(value: A): AsyncData<A>;

    export function observePromise<A>(
        promise: Promise<A>,
        updater: (cb: (data: AsyncData<A>) => AsyncData<A>) => unknown
    ): () => void;

    export function observePromiseGS<A>(
        promise: Promise<A>,
        getState: () => AsyncData<A>,
        setState: (data: AsyncData<A>) => unknown
    ): () => void;

    export { extractors };
}

declare module '@ekz/async-data/extractors' {
    import { AsyncData } from '@ekz/async-data';

    export function render<A, R>(ad: AsyncData<A>, f: (value: A) => R): R | null;
    export function renderReady<A, R>(ad: AsyncData<A>, f: (value: A) => R): R | null;
    export function renderFailed<A, R>(ad: AsyncData<A>, f: (error: Error) => R): R | null;
    export function renderPending<A, R>(ad: AsyncData<A>, f: (duration: number) => R): R | null;
    export function renderStale<A, R>(ad: AsyncData<A>, f: (value: A) => R): R | null;
    export function renderEmpty<A, R>(ad: AsyncData<A>, f: () => R): R | null;
}
