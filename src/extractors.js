// @flow
'use strict';

import type { AsyncData } from './';

export function render<A, R>(ad: AsyncData<A>, f: A => R): R | null {
    return ad.nonEmpty ? f(ad.value) : null;
}

export function renderReady<A, R>(ad: AsyncData<A>, f: A => R): R | null {
    return ad.isReady ? f(ad.value) : null;
}

export function renderFailed<A, R>(ad: AsyncData<A>, f: Error => R): R | null {
    return ad.isFailed ? f(ad.error) : null;
}

export function renderPending<A, R>(ad: AsyncData<A>, f: number => R): R | null {
    return ad.isPending ? f(ad.duration().get()) : null;
}

export function renderStale<A, R>(ad: AsyncData<A>, f: A => R): R | null {
    return ad.isStale ? f(ad.value) : null;
}

export function renderEmpty<A, R>(ad: AsyncData<A>, f: () => R): R | null {
    return ad.isEmpty ? f() : null;
}
