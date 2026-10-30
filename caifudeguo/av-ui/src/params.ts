/*
 * caifudeguo AV-Depot UI — Copyright (C) 2026 Rich Dr (caifudeguo.de)
 * Based on finanzfluss/calculators (AGPL-3.0). Licensed under AGPL-3.0-only.
 */

/** Day on which the parameters were checked against the 2026 rules. Update when parameters change. */
export const PARAMS_CHECK_DATE = '2026-10-16'

/** Upstream calculation core (unchanged under src/). */
export const CORE_COMMIT = 'dcc29a69bdd8a3943d092e4c86ad42bff2767e1a'
export const CORE_COMMIT_SHORT = CORE_COMMIT.slice(0, 7)
/** `git log -1 --format=%cs dcc29a6` */
export const CORE_COMMIT_DATE = '2026-10-09'
export const CORE_COMMIT_URL = `https://github.com/finanzfluss/calculators/commit/${CORE_COMMIT}`

export const FORK_REPO_URL = 'https://github.com/dich-pixel/caifudeguo-calculators'

/** Build commit of this fork, injected by vite at build time (see vite.config.ts). */
export function forkCommit(): string {
  return typeof __CFD_BUILD_SHA__ === 'string' && __CFD_BUILD_SHA__
    ? __CFD_BUILD_SHA__
    : 'caifudeguo/main'
}

export function forkSourceUrl(): string {
  return `${FORK_REPO_URL}/tree/${forkCommit()}`
}

/** Start year: not shown in the UI; max(2027, current year) as in the core default (src/calculators/av-depot.ts:57-61). */
export function startYear(today: Date = new Date()): number {
  return Math.max(2027, today.getFullYear())
}

export const HEIGHT_MESSAGE_TYPE = 'caifudeguo-av-depot:height'
/** host -> app: "send your height again" (embed.js may start after the app's first message). */
export const HEIGHT_REQUEST_TYPE = 'caifudeguo-av-depot:resend'
