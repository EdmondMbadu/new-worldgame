import * as T from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

/** Screen-space light shafts from bright sky pixels toward the sun. */
class SunShaftsPass extends Pass {
  quad: FullScreenQuad;
  material: T.ShaderMaterial;
  constructor() {
    super();
    this.material = new T.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        uSun: { value: new T.Vector2(0.5, 0.5) },
        uStrength: { value: 0 },
        uTint: { value: new T.Color('#ffc080') },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
      fragmentShader: `
        uniform sampler2D tDiffuse, tDepth; uniform vec2 uSun; uniform float uStrength; uniform vec3 uTint;
        varying vec2 vUv;
        void main(){
          vec4 base = texture2D(tDiffuse, vUv);
          if (uStrength <= 0.001) { gl_FragColor = base; return; }
          const int N = 36;
          vec2 delta = (uSun - vUv) / float(N) * 0.9;
          vec2 uv = vUv + delta * fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
          float decay = 1.0; vec3 acc = vec3(0.);
          for (int i = 0; i < N; i++) {
            uv += delta;
            vec2 c = clamp(uv, vec2(0.001), vec2(0.999));
            float sky = step(0.99995, texture2D(tDepth, c).x);
            vec3 s = texture2D(tDiffuse, c).rgb;
            float l = max(dot(s, vec3(0.3, 0.55, 0.15)) - 0.7, 0.);
            acc += sky * min(s * l, vec3(3.)) * decay;
            decay *= 0.955;
          }
          base.rgb += acc / float(N) * uStrength * uTint;
          gl_FragColor = base;
        }`,
    });
    this.quad = new FullScreenQuad(this.material);
  }
  render(renderer: T.WebGLRenderer, writeBuffer: T.WebGLRenderTarget, readBuffer: T.WebGLRenderTarget) {
    this.material.uniforms.tDiffuse.value = readBuffer.texture;
    this.material.uniforms.tDepth.value = readBuffer.depthTexture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
  dispose() {
    this.material.dispose();
    this.quad.dispose();
  }
}

/** Filmic grade in linear HDR: warm highlights, cool shadows, saturation, vignette, grain. */
class GradePass extends Pass {
  quad: FullScreenQuad;
  material: T.ShaderMaterial;
  constructor() {
    super();
    this.material = new T.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uSat: { value: 1.12 },
        uVignette: { value: 0.35 },
        uTime: { value: 0 },
        uGrain: { value: 0.025 },
        uWarm: { value: 1 },
        uAberration: { value: 0 },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform float uSat, uVignette, uTime, uGrain, uWarm, uAberration;
        varying vec2 vUv;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime * 3.1) * 43758.5453); }
        void main(){
          vec2 off = (vUv - 0.5) * uAberration;
          vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
          float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
          col = mix(vec3(l), col, uSat);
          vec3 shadowTint = vec3(0.9, 0.97, 1.08);
          vec3 lightTint = mix(vec3(1.0), vec3(1.07, 1.0, 0.9), uWarm);
          col *= mix(shadowTint, lightTint, smoothstep(0.02, 0.6, l));
          vec2 q = (vUv - 0.5) * vec2(1.0, 0.82);
          col *= mix(1.0, smoothstep(0.95, 0.2, length(q) * 1.25), uVignette);
          col += (hash(vUv * 811.) - 0.5) * uGrain * (0.25 + sqrt(max(l, 0.)));
          gl_FragColor = vec4(max(col, 0.), 1.);
        }`,
    });
    this.quad = new FullScreenQuad(this.material);
  }
  render(renderer: T.WebGLRenderer, writeBuffer: T.WebGLRenderTarget, readBuffer: T.WebGLRenderTarget) {
    this.material.uniforms.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
  dispose() {
    this.material.dispose();
    this.quad.dispose();
  }
}

export type PostFrame = {
  dt: number;
  sun: T.Vector3;
  sunColor: T.Color;
  darkness: number;
  shaftStrength: number;
  impact: number;
};

export class PostFX {
  composer: EffectComposer;
  private bloom: UnrealBloomPass | null = null;
  private shafts: SunShaftsPass | null = null;
  private grade: GradePass;
  private fxaa: FXAAPass | null = null;
  private time = 0;
  private projected = new T.Vector3();
  constructor(
    private renderer: T.WebGLRenderer,
    scene: T.Scene,
    private camera: T.PerspectiveCamera,
    private high: boolean,
  ) {
    const size = renderer.getDrawingBufferSize(new T.Vector2());
    const target = new T.WebGLRenderTarget(Math.max(1, size.x), Math.max(1, size.y), {
      type: T.HalfFloatType,
      samples: high ? 4 : 0,
    });
    if (high) {
      target.depthTexture = new T.DepthTexture(Math.max(1, size.x), Math.max(1, size.y));
      target.depthTexture.type = T.UnsignedIntType;
    }
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(scene, camera));
    if (high) {
      this.shafts = new SunShaftsPass();
      this.composer.addPass(this.shafts);
      this.bloom = new UnrealBloomPass(new T.Vector2(size.x / 2, size.y / 2), 0.4, 0.55, 0.92);
      this.composer.addPass(this.bloom);
    }
    this.grade = new GradePass();
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());
    if (!high) {
      this.fxaa = new FXAAPass();
      this.composer.addPass(this.fxaa);
    }
  }
  setSize(width: number, height: number) {
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(width, height);
  }
  render(f: PostFrame) {
    this.time += f.dt;
    const g = this.grade.material.uniforms;
    g.uTime.value = this.time % 100;
    g.uWarm.value = 1 - f.darkness * 0.8;
    g.uSat.value = 1.14 - f.darkness * 0.12;
    g.uVignette.value = 0.32 + f.darkness * 0.18;
    g.uAberration.value = f.impact * 0.006;
    if (this.bloom) {
      this.bloom.strength = 0.26 + f.darkness * 0.5;
      this.bloom.threshold = 1.15 - f.darkness * 0.55;
    }
    if (this.shafts) {
      const u = this.shafts.material.uniforms;
      this.projected.copy(this.camera.position).addScaledVector(f.sun, 1000).project(this.camera);
      const forward = this.camera.getWorldDirection(new T.Vector3());
      const facing = Math.max(0, forward.dot(f.sun));
      u.uSun.value.set(this.projected.x * 0.5 + 0.5, this.projected.y * 0.5 + 0.5);
      u.uStrength.value = f.shaftStrength * Math.pow(facing, 2.5) * (1 - f.darkness);
      u.uTint.value.copy(f.sunColor);
    }
    this.composer.render(f.dt);
  }
  dispose() {
    this.composer.dispose();
    this.bloom?.dispose();
    this.shafts?.dispose();
    this.grade.dispose();
    this.fxaa?.dispose();
    this.composer.renderTarget1.depthTexture?.dispose();
    this.composer.renderTarget2.depthTexture?.dispose();
  }
}
