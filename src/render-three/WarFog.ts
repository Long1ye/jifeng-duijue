import { DataTexture, DepthTexture, LinearFilter, Mesh, OrthographicCamera, PlaneGeometry, RGBAFormat, Scene, ShaderMaterial, UnsignedIntType, Vector2, WebGLRenderTarget, type WebGLRenderer } from 'three';
import { BRIDGE_WORLD } from '../game/Bridge';
import { VISION, type TeamVision } from '../presentation/TeamVision';
import { WORLD_ORIGIN, type ThreeCamera } from './Coordinates';

/** One world-space visibility field and a depth-aware full-frame composite. */
export class WarFog {
  /** Visual texture cadence; TeamVision still evaluates visibility every frame. */
  updateInterval = 0;
  readonly width = 512;
  readonly height = 288;
  readonly data = new Uint8Array(this.width * this.height * 4);
  readonly texture = new DataTexture(this.data, this.width, this.height, RGBAFormat);
  readonly target = new WebGLRenderTarget(1, 1, { depthBuffer: true });
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly mesh: Mesh<PlaneGeometry, ShaderMaterial>;
  private lastTime = -1;
  private lastSources = '';
  private readonly current = new Float32Array(this.width * this.height);
  private readonly desired = new Float32Array(this.width * this.height);
  constructor() {
    this.texture.minFilter = this.texture.magFilter = LinearFilter; this.texture.generateMipmaps = false;
    this.target.depthTexture = new DepthTexture(1, 1, UnsignedIntType);
    const material = new ShaderMaterial({ depthTest: false, depthWrite: false, toneMapped: false,
      uniforms: { sceneColor: { value: this.target.texture }, sceneDepth: { value: this.target.depthTexture },
        visibility: { value: this.texture }, inverseProjection: { value: null }, cameraWorld: { value: null }, fogTime: { value: 0 },
        worldSize: { value: new Vector2(BRIDGE_WORLD.width, BRIDGE_WORLD.height) }, origin: { value: new Vector2(WORLD_ORIGIN.x, WORLD_ORIGIN.y) } },
      vertexShader: 'varying vec2 fogUv; void main(){ fogUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
      fragmentShader: `
        uniform sampler2D sceneColor, sceneDepth, visibility;
        uniform mat4 inverseProjection, cameraWorld;
        uniform vec2 worldSize, origin; uniform float fogTime; varying vec2 fogUv;
        vec3 worldAt(float depth) {
          vec4 p=inverseProjection*vec4(fogUv*2.0-1.0,depth*2.0-1.0,1.0);
          return (cameraWorld*vec4(p.xyz/p.w,1.0)).xyz;
        }
        void main(){
          vec4 color=texture2D(sceneColor,fogUv);
          float depth=texture2D(sceneDepth,fogUv).r; vec3 world=worldAt(depth);
          if(depth>0.99999 || world.y < -40.0){
            vec3 nearPoint=worldAt(0.0), farPoint=worldAt(1.0);
            world=mix(nearPoint,farPoint,-nearPoint.y/(farPoint.y-nearPoint.y));
          }
          vec2 fieldUv=(world.xz+origin)/worldSize;
          vec2 sight=texture2D(visibility,clamp(fieldUv,0.0,1.0)).rg;
          float edge=4.0*sight.r*(1.0-sight.r);
          float drift=sin(world.x*0.015+fogTime*0.11)*sin(world.z*0.013-fogTime*0.08);
          float fog=clamp((1.0-sight.r)*mix(0.88,0.76,sight.g)+drift*edge*0.018,0.0,1.0);
          vec3 dark=color.rgb*vec3(0.20,0.28,0.40)+vec3(0.008,0.014,0.025);
          gl_FragColor=vec4(mix(color.rgb,dark,fog),color.a);
          #include <colorspace_fragment>
        }`,
    });
    this.mesh = new Mesh(new PlaneGeometry(2, 2), material); this.scene.add(this.mesh);
    this.reset();
  }
  reset(): void { this.data.fill(0); this.current.fill(0); this.texture.needsUpdate = true; this.lastTime = -1; this.lastSources = ''; }
  update(time: number, vision: TeamVision): void {
    if (time < this.lastTime) this.reset();
    this.mesh.material.uniforms.fogTime.value = time;
    if (this.lastTime >= 0 && time > this.lastTime && time - this.lastTime + 1e-9 < this.updateInterval) return;
    const signature = vision.sources.map(source => `${source.x},${source.y},${source.radius},${source.brush}`).join('|');
    if (time === this.lastTime && signature === this.lastSources) return;
    const sourcesChanged = signature !== this.lastSources || this.lastTime < 0;
    this.lastSources = signature;
    const dt = this.lastTime < 0 ? 1 : Math.max(0, Math.min(.1, time - this.lastTime));
    const blend = this.lastTime < 0 ? 1 : 1 - Math.exp(-dt * 12);
    this.lastTime = time;
    const cellX = BRIDGE_WORLD.width / this.width, cellY = BRIDGE_WORLD.height / this.height;
    // Terrain and grass retain their colors inside team sight. Brush concealment
    // applies to enemies through TeamVision, independently of this visual field.
    if (sourcesChanged) {
      this.desired.fill(0);
      for (const source of vision.sources) {
        const left = Math.max(0, Math.floor((source.x - source.radius) / cellX)), right = Math.min(this.width - 1, Math.ceil((source.x + source.radius) / cellX));
        const top = Math.max(0, Math.floor((source.y - source.radius) / cellY)), bottom = Math.min(this.height - 1, Math.ceil((source.y + source.radius) / cellY));
        for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
          const index = y * this.width + x;
          const d = Math.hypot((x + .5) * cellX - source.x, (y + .5) * cellY - source.y);
          const t = Math.max(0, Math.min(1, (source.radius - d) / VISION.feather));
          this.desired[index] = Math.max(this.desired[index], t * t * (3 - 2 * t) * 255);
        }
      }
    }
    let changed = false;
    for (let index = 0; index < this.current.length; index++) {
      const i = index * 4, current = this.desired[index];
      this.current[index] += (current - this.current[index]) * blend;
      const red = Math.round(this.current[index]), green = current > 24 ? 255 : this.data[i + 1];
      changed ||= this.data[i] !== red || this.data[i + 1] !== green || this.data[i + 3] !== 255;
      this.data[i] = red; this.data[i + 1] = green; this.data[i + 3] = 255;
    }
    if (changed) this.texture.needsUpdate = true;
  }
  render(renderer: WebGLRenderer, scene: Scene, rig: ThreeCamera): void {
    const width = renderer.domElement.width, height = renderer.domElement.height;
    if (this.target.width !== width || this.target.height !== height) this.target.setSize(width, height);
    this.target.samples = Math.min(4, renderer.capabilities.maxSamples);
    this.mesh.material.uniforms.inverseProjection.value = rig.camera.projectionMatrixInverse;
    this.mesh.material.uniforms.cameraWorld.value = rig.camera.matrixWorld;
    const previous = renderer.getRenderTarget();
    renderer.setRenderTarget(this.target); renderer.render(scene, rig.camera);
    renderer.setRenderTarget(previous); renderer.render(this.scene, this.camera);
  }
  dispose(): void { this.texture.dispose(); this.target.dispose(); this.mesh.geometry.dispose(); this.mesh.material.dispose(); this.scene.clear(); }
}
