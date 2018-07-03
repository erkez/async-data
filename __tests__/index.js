// @flow
'use strict';

import * as AsyncData from '../src';
import { None } from '@ekz/option';
import { DateTime } from 'luxon';

describe('AsyncData', () => {
    it('Empty', () => {
        let ad = AsyncData.Empty();
        expect(ad.state).toBe('Empty');
        expect(() => ad.value).toThrow();
        expect(() => ad.error).toThrow();
        expect(ad.isEmpty).toBe(true);
        expect(ad.isReady).toBe(false);
        expect(ad.isPending).toBe(false);
        expect(ad.isStale).toBe(false);
        expect(ad.isFailed).toBe(false);
    });

    it('Ready', () => {
        let ad = AsyncData.Ready(1);
        expect(ad.state).toBe('Ready');
        expect(ad.value).toBe(1);
        expect(() => ad.error).toThrow();
        expect(ad.isEmpty).toBe(false);
        expect(ad.isReady).toBe(true);
        expect(ad.isPending).toBe(false);
        expect(ad.isStale).toBe(false);
        expect(ad.isFailed).toBe(false);
    });

    it('Pending', () => {
        let ad = AsyncData.Pending();
        expect(ad.state).toBe('Pending');
        expect(() => ad.value).toThrow();
        expect(() => ad.error).toThrow();
        expect(ad.isEmpty).toBe(true);
        expect(ad.isReady).toBe(false);
        expect(ad.isPending).toBe(true);
        expect(ad.isStale).toBe(false);
        expect(ad.isFailed).toBe(false);
    });

    it('PendingStale', () => {
        let ad = AsyncData.Ready(1).pending();
        expect(ad.state).toBe('PendingStale');
        expect(ad.value).toBe(1);
        expect(() => ad.error).toThrow();
        expect(ad.isEmpty).toBe(false);
        expect(ad.isReady).toBe(false);
        expect(ad.isPending).toBe(true);
        expect(ad.isStale).toBe(true);
        expect(ad.isFailed).toBe(false);
    });

    it('FailedStale', () => {
        let error = new Error();
        let ad = AsyncData.Ready(1)
            .pending()
            .fail(error);
        expect(ad.state).toBe('FailedStale');
        expect(ad.value).toBe(1);
        expect(ad.error).toBe(error);
        expect(ad.isEmpty).toBe(false);
        expect(ad.isReady).toBe(false);
        expect(ad.isPending).toBe(false);
        expect(ad.isStale).toBe(true);
        expect(ad.isFailed).toBe(true);
    });

    it('Failed', () => {
        let error = new Error();
        let ad = AsyncData.Failed(error);
        expect(ad.state).toBe('Failed');
        expect(() => ad.value).toThrow();
        expect(ad.error).toBe(error);
        expect(ad.isEmpty).toBe(true);
        expect(ad.isReady).toBe(false);
        expect(ad.isPending).toBe(false);
        expect(ad.isStale).toBe(false);
        expect(ad.isFailed).toBe(true);
    });

    it('should properly transition between states', () => {
        let ad = AsyncData.Empty();
        expect(ad.state).toBe('Empty');
        ad = ad.fail(new Error());
        expect(ad.state).toBe('Failed');
        ad = ad.pending();
        expect(ad.state).toBe('Pending');
        ad = ad.ready(1);
        expect(ad.state).toBe('Ready');
        ad = ad.pending();
        expect(ad.state).toBe('PendingStale');
        ad = ad.fail(new Error());
        expect(ad.state).toBe('FailedStale');
        ad = ad.ready(1);
        expect(ad.state).toBe('Ready');
    });

    it('should properly match', () => {
        let matchers = {
            Empty: jest.fn().mockReturnValue('Empty'),
            Failed: jest.fn().mockReturnValue('Failed'),
            Pending: jest.fn().mockReturnValue('Pending'),
            Ready: jest.fn().mockReturnValue('Ready'),
            PendingStale: jest.fn().mockReturnValue('PendingStale'),
            FailedStale: jest.fn().mockReturnValue('FailedStale')
        };

        let getDefault = jest.fn().mockReturnValue('none');

        let ad = AsyncData.Empty();
        let result = ad.match(matchers, getDefault);
        expect(result).toBe('Empty');

        ad = ad.fail(new Error());
        result = ad.match(matchers, getDefault);
        expect(result).toBe('Failed');

        ad = ad.pending();
        result = ad.match(matchers, getDefault);
        expect(result).toBe('Pending');

        ad = ad.ready(1);
        result = ad.match(matchers, getDefault);
        expect(result).toBe('Ready');

        ad = ad.pending();
        result = ad.match(matchers, getDefault);
        expect(result).toBe('PendingStale');

        ad = ad.fail(new Error());
        result = ad.match(matchers, getDefault);
        expect(result).toBe('FailedStale');

        expect(matchers.Empty).toHaveBeenCalledTimes(1);
        expect(matchers.Ready).toHaveBeenCalledTimes(1);
        expect(matchers.Failed).toHaveBeenCalledTimes(1);
        expect(matchers.FailedStale).toHaveBeenCalledTimes(1);
        expect(matchers.Pending).toHaveBeenCalledTimes(1);
        expect(matchers.PendingStale).toHaveBeenCalledTimes(1);
        expect(getDefault).toHaveBeenCalledTimes(0);
    });

    it('should properly match default', () => {
        let matchers = {
            Ready: jest.fn().mockReturnValue('Ready')
        };

        let getDefault = jest.fn().mockReturnValue('none');

        let ad = AsyncData.Pending();
        let result = ad.match(matchers, getDefault);
        expect(result).toBe('none');

        expect(matchers.Ready).toHaveBeenCalledTimes(0);
        expect(getDefault).toHaveBeenCalledTimes(1);
    });

    it('should properly map', () => {
        let ad: AsyncData.AsyncData<number> = AsyncData.Empty();
        let double = jest.fn().mockImplementation(x => x * 2);

        ad = ad.map(double);
        expect(ad.state).toBe('Empty');
        expect(() => ad.value).toThrow();

        ad = ad.fail(new Error()).map(double);
        expect(ad.state).toBe('Failed');
        expect(() => ad.value).toThrow();

        ad = ad.pending().map(double);
        expect(ad.state).toBe('Pending');
        expect(() => ad.value).toThrow();

        ad = ad.ready(2).map(double);
        expect(ad.state).toBe('Ready');
        expect(ad.value).toBe(4);

        ad = ad.pending().map(double);
        expect(ad.state).toBe('PendingStale');
        expect(ad.value).toBe(8);

        ad = ad.fail(new Error()).map(double);
        expect(ad.state).toBe('FailedStale');
        expect(ad.value).toBe(16);

        ad = ad.ready(3).map(double);
        expect(ad.state).toBe('Ready');
        expect(ad.value).toBe(6);
    });

    it('should properly get duration of pending data', () => {
        expect.assertions(2);
        let startTime = DateTime.utc();
        let currentTime = DateTime.utc().plus({ milliseconds: 850 });

        let ad = AsyncData.Pending(startTime);
        let duration = ad.duration(currentTime);
        duration.map(value => expect(value).toBeCloseTo(850, 1));

        ad = ad.ready(2);
        duration = ad.duration(currentTime);
        expect(duration).toEqual(None);
    });

    it('should accept null as ready value', () => {
        let ad: AsyncData.AsyncData<null> = AsyncData.Empty();
        expect(ad.isEmpty).toBe(true);

        ad = ad.ready(null);
        expect(ad.isEmpty).toBe(false);
        expect(ad.value).toBe(null);
    });

    it('should properly observe promise', async () => {
        let ad: AsyncData.AsyncData<number> = AsyncData.Empty();
        let getter = jest.fn().mockImplementation(() => ad);
        let setter = jest.fn().mockImplementation(newAd => (ad = newAd));
        let deferred = defer();

        AsyncData.observePromiseGS(deferred.promise, getter, setter);
        expect(ad.state).toBe('Pending');
        expect(getter).toHaveBeenCalledTimes(1);
        expect(setter.mock.calls[0][0].state).toBe('Pending');

        deferred.resolve(1);
        await deferred.promise;

        expect(getter).toHaveBeenCalledTimes(2);
        expect(setter).toHaveBeenCalledTimes(2);
        expect(setter.mock.calls[1][0].state).toBe('Ready');
        expect(ad.state).toBe('Ready');
        expect(ad.value).toBe(1);

        deferred = defer();
        AsyncData.observePromiseGS(deferred.promise, getter, setter);
        expect(getter).toHaveBeenCalledTimes(3);
        expect(setter).toHaveBeenCalledTimes(3);
        expect(setter.mock.calls[2][0].state).toBe('PendingStale');
        expect(ad.state).toBe('PendingStale');

        deferred.reject(new Error(''));
        await deferred.promise.catch(() => {});

        expect(getter).toHaveBeenCalledTimes(4);
        expect(setter).toHaveBeenCalledTimes(4);
        expect(setter.mock.calls[3][0].state).toBe('FailedStale');

        expect(ad.state).toBe('FailedStale');
        expect(ad.value).toBe(1);
    });

    it('observe promise should not call ready updater when cancelled', async () => {
        let ad: AsyncData.AsyncData<number> = AsyncData.Empty();
        let getter = jest.fn().mockImplementation(() => ad);
        let setter = jest.fn().mockImplementation(newAd => (ad = newAd));
        let deferred = defer();

        let cancel = AsyncData.observePromiseGS(deferred.promise, getter, setter);
        expect(ad.state).toBe('Pending');
        expect(getter).toHaveBeenCalledTimes(1);
        expect(setter.mock.calls[0][0].state).toBe('Pending');

        cancel();
        deferred.resolve(1);
        await deferred.promise;

        expect(getter).toHaveBeenCalledTimes(1);
        expect(setter).toHaveBeenCalledTimes(1);
        expect(ad.state).toBe('Pending');
    });

    it('observe promise should not call failed updater when cancelled', async () => {
        let ad: AsyncData.AsyncData<number> = AsyncData.Empty();
        let getter = jest.fn().mockImplementation(() => ad);
        let setter = jest.fn().mockImplementation(newAd => (ad = newAd));
        let deferred = defer();

        let cancel = AsyncData.observePromiseGS(deferred.promise, getter, setter);
        expect(ad.state).toBe('Pending');
        expect(getter).toHaveBeenCalledTimes(1);
        expect(setter.mock.calls[0][0].state).toBe('Pending');

        cancel();
        deferred.reject(new Error());

        try {
            await deferred.promise;
        } catch (e) {}

        expect(getter).toHaveBeenCalledTimes(1);
        expect(setter).toHaveBeenCalledTimes(1);
        expect(ad.state).toBe('Pending');
    });
});

type Deferred<V> = {
    promise: Promise<V>,
    resolve(value: V): void,
    reject(error: Error): void
};

function defer<A>(): Deferred<A> {
    let resolve: (value: A) => void;
    let reject: (error: Error) => void;

    let promise: Promise<A> = new Promise(($resolve, $reject) => {
        resolve = $resolve;
        reject = $reject;
    });

    // $FlowFixMe
    return { promise, resolve, reject };
}
