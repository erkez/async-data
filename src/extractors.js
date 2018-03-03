// @flow
'use strict';

import type { AsyncData } from '../';

export function render<A, R>(ad: AsyncData<A>, f: A => R): ?R {
    return ad.nonEmpty ? f(ad.value) : null;
}

export function renderReady<A, R>(ad: AsyncData<A>, f: A => R): ?R {
    return ad.isReady ? f(ad.value) : null;
}

export function renderFailed<A, R>(ad: AsyncData<A>, f: Error => R): ?R {
    return ad.isFailed ? f(ad.error) : null;
}

export function renderPending<A, R>(ad: AsyncData<A>, f: number => R): ?R {
    return ad.isPending ? f(ad.duration().get()) : null;
}

export function renderStale<A, R>(ad: AsyncData<A>, f: A => R): ?R {
    return ad.isStale ? f(ad.value) : null;
}

export function renderEmpty<A, R>(ad: AsyncData<A>, f: () => R): ?R {
    return ad.isEmpty ? f() : null;
}
