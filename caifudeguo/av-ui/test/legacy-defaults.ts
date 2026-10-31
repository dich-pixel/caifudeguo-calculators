// Pre-0.3.3 form defaults (Finanzfluss web defaults, plan §2): Basiszins 0 %, zvE Rentenphase 20.000 €.
// The pinned reference numbers in the older tests/fixtures were computed from these inputs, so those tests keep
// using them explicitly. The 0.3.3 defaults (Basiszins 3,2 %, auto zvE Rentenphase) are tested in retirement-auto.test.ts.
import type { FormValues } from '../src/model'
import { DEFAULTS } from '../src/model'

export const LEGACY_DEFAULTS: FormValues = {
  ...structuredClone(DEFAULTS),
  fields: { ...DEFAULTS.fields, baseRate: '0,00', zveRetirement: '20.000' },
}
