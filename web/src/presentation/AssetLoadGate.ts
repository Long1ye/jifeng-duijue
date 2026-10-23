import { DefaultLoadingManager, type LoadingManager } from 'three';
export interface AssetProgress { loaded: number; total: number; failed: readonly string[] }
/** Tracks actual loader completion, including cache hits and failures. */
export class AssetLoadGate {
  onProgress: (progress: AssetProgress) => void = () => {};
  readonly ready: Promise<void>;
  private resolve!: () => void;
  private reject!: (error: Error) => void;
  private loaded = 0;
  private total = 0;
  private sealed = false;
  private finished = false;
  private failures: string[] = [];
  private readonly restore: () => void;
  constructor(manager: LoadingManager = DefaultLoadingManager) {
    this.ready = new Promise<void>((resolve, reject) => { this.resolve = resolve; this.reject = reject; });
    void this.ready.catch(() => {});
    const start = manager.itemStart, end = manager.itemEnd, error = manager.itemError;
    manager.itemStart = url => { this.start(); start.call(manager, url); };
    manager.itemEnd = url => { end.call(manager, url); this.end(); };
    manager.itemError = url => { this.failures.push(url); error.call(manager, url); this.publish(); };
    this.restore = () => { manager.itemStart = start; manager.itemEnd = end; manager.itemError = error; };
  }
  private start(): void { if (!this.finished) { this.total++; this.publish(); } }
  private end(): void { if (!this.finished) { this.loaded++; this.publish(); this.check(); } }
  private publish(): void { this.onProgress({ loaded: this.loaded, total: this.total, failed: this.failures }); }
  track(label: string, promise: Promise<unknown>): void {
    this.start(); void promise.catch(() => { this.failures.push(label); }).finally(() => this.end());
  }
  seal(): void { this.sealed = true; this.check(); }
  private check(): void {
    if (!this.sealed || this.loaded < this.total || this.finished) return;
    this.finished = true; this.restore();
    if (this.failures.length) this.reject(new Error(`有 ${this.failures.length} 项资源加载失败：${this.failures.slice(0, 3).map(url => url.split('/').pop()).join('、')}`));
    else this.resolve();
  }
  dispose(): void {
    if (this.finished) return;
    this.finished = true; this.restore(); this.reject(new Error('资源加载已取消。'));
  }
}
