// follow-up: CSP script-src without 'unsafe-eval'. Zod 4 probes `new Function('')` when the first object schema is built
// (JIT fast path); under our CSP that probe is blocked and reports a securitypolicyviolation. jitless skips the probe
// (same results, interpreted parse). main.ts imports this module FIRST (before any module that builds a zod schema);
// it is a value import because the package is "sideEffects": false (a bare side-effect import would be dropped).
import { config } from 'zod'

export const zodJitless: boolean = config({ jitless: true }).jitless === true
