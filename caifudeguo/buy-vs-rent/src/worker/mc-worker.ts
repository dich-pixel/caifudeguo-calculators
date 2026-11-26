import type {EngineConfig, Inputs} from '../engine';
import {   runMonteCarlo } from '../engine'

interface Req {
  type: 'run'
  inputs: Partial<Inputs>
  config?: Partial<EngineConfig>
}

globalThis.onmessage = (event: MessageEvent<Req>) => {
  const data = event.data
  if (!data || data.type !== 'run')
    return
  const result = runMonteCarlo(data.inputs, data.config, (done, total) => {
    globalThis.postMessage({ type: 'progress', done, total })
  })
  globalThis.postMessage({ type: 'result', result })
}
