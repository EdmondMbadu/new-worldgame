/**
 * Browser builds load Rapier's WebAssembly as its own file (about 520 KB
 * compressed) rather than as base64 inside JavaScript (about 750 KB), and the
 * browser compiles it while it downloads. The version and API are identical to
 * the compat build the Node test suite uses.
 */
import * as Rapier from '@dimforge/rapier3d';
import { initRapierWasm } from './rapier-wasm';
const RAPIER = { ...Rapier, init: initRapierWasm } as unknown as typeof import('@dimforge/rapier3d-compat').default;
export default RAPIER;
