/**
 * Stands in for Rapier's bundler entry, which imports its WebAssembly as an
 * ES module. Here the same binary is fetched as its own file and compiled while
 * it streams, then handed to the unchanged JavaScript bindings.
 */
import * as bindings from '@dimforge/rapier3d/rapier_wasm3d_bg.js';
import wasmUrl from '@dimforge/rapier3d/rapier_wasm3d_bg.wasm?url';
export * from '@dimforge/rapier3d/rapier_wasm3d_bg.js';

let ready: Promise<void> | null = null;
export function initRapierWasm() {
  return (ready ??= (async () => {
    const imports = { './rapier_wasm3d_bg.js': bindings } as unknown as WebAssembly.Imports;
    let instance: WebAssembly.Instance;
    try {
      ({ instance } = await WebAssembly.instantiateStreaming(fetch(wasmUrl), imports));
    } catch {
      // Servers that send the wrong content type still work, just without streaming.
      const bytes = await (await fetch(wasmUrl)).arrayBuffer();
      ({ instance } = await WebAssembly.instantiate(bytes, imports));
    }
    (bindings as unknown as { __wbg_set_wasm(exports: WebAssembly.Exports): void }).__wbg_set_wasm(instance.exports);
  })());
}
