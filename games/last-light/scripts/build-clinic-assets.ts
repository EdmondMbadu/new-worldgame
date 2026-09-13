import { mkdirSync, writeFileSync } from 'node:fs';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createClinicArchitecture } from '../src/clinic-architecture';
// GLTFExporter only needs FileReader for its binary buffer in this image-free asset pipeline.
(globalThis as any).FileReader = class {
  result: any;
  onloadend: any;
  async readAsArrayBuffer(blob: Blob) {
    this.result = await blob.arrayBuffer();
    this.onloadend?.();
  }
  async readAsDataURL(blob: Blob) {
    this.result = `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`;
    this.onloadend?.();
  }
};
mkdirSync('public/models', { recursive: true });
for (let id = 0; id < 5; id++) {
  const root = createClinicArchitecture(id);
  const result = await new GLTFExporter().parseAsync(root, { binary: true });
  writeFileSync(
    `public/models/clinic-${id}.glb`,
    Buffer.from(result as ArrayBuffer),
  );
  console.log(`clinic-${id}.glb: ${(result as ArrayBuffer).byteLength} bytes`);
}
