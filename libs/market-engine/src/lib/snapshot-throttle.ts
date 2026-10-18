import { Scheduler } from './scheduler';

export class SnapshotThrottle {
  private lastEmitAt = 0;
  private trailingTimer: unknown = null;

  public constructor(
    private readonly scheduler: Scheduler,
    private readonly intervalMs: number
  ) {}

  public reset(): void {
    this.clearTrailing();
    this.lastEmitAt = 0;
  }

  public dispose(): void {
    this.clearTrailing();
    this.lastEmitAt = 0;
  }

  public tick(emit: () => void, now = this.scheduler.now()): void {
    const elapsed =
      this.lastEmitAt === 0 ? this.intervalMs : now - this.lastEmitAt;

    if (elapsed >= this.intervalMs) {
      this.clearTrailing();
      emit();
      this.lastEmitAt = now;
      return;
    }

    if (!isNilTimer(this.trailingTimer)) {
      return;
    }

    const remaining = this.intervalMs - elapsed;
    this.trailingTimer = this.scheduler.setTimeout(() => {
      this.trailingTimer = null;
      emit();
      this.lastEmitAt = this.scheduler.now();
    }, remaining);
  }

  private clearTrailing(): void {
    if (!isNilTimer(this.trailingTimer)) {
      this.scheduler.clearTimeout(this.trailingTimer);
      this.trailingTimer = null;
    }
  }
}

function isNilTimer(handle: unknown): handle is null {
  return handle === null || handle === undefined;
}
