import { GAME_CONFIG } from '../core/config/gameConfig';

export type SchedulerCallbacks = {
  onStar: () => void;
  onBonus: () => void;
  onCleanup: () => void;
  onVirus: () => void;
};

export class GameScheduler {
  private starId: number | null = null;
  private bonusId: number | null = null;
  private cleanupId: number | null = null;
  private virusId: number | null = null;
  private paused = false;

  constructor(private cb: SchedulerCallbacks) {}

  start() {
    this.stop();
    this.paused = false;
    this.starId = window.setInterval(() => {
      if (this.paused) return;
      this.cb.onStar();
    }, GAME_CONFIG.starIntervalMs) as any;

    this.scheduleBonus();

    this.cleanupId = window.setInterval(() => {
      if (this.paused) return;
      this.cb.onCleanup();
    }, GAME_CONFIG.cleanupIntervalMs) as any;

    this.virusId = window.setInterval(() => {
      if (this.paused) return;
      this.cb.onVirus();
    }, GAME_CONFIG.virusTickMs) as any;

    document.addEventListener('visibilitychange', this.onVisibility);
  }

  private scheduleBonus = () => {
    if (this.bonusId) clearTimeout(this.bonusId as any);
    const delay =
      GAME_CONFIG.bonusMinDelayMs +
      Math.random() * (GAME_CONFIG.bonusMaxDelayMs - GAME_CONFIG.bonusMinDelayMs);
    this.bonusId = window.setTimeout(() => {
      if (this.paused) {
        this.bonusId = window.setTimeout(() => this.scheduleBonus(), 1000) as any;
        return;
      }
      this.cb.onBonus();
      this.scheduleBonus();
    }, delay) as any;
  };

  private onVisibility = () => {
    if (document.hidden) this.pause();
    else this.resume();
  };

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  setPaused(p: boolean) {
    this.paused = p;
  }

  stop() {
    if (this.starId) clearInterval(this.starId);
    if (this.bonusId) clearTimeout(this.bonusId as any);
    if (this.cleanupId) clearInterval(this.cleanupId);
    if (this.virusId) clearInterval(this.virusId);
    this.starId = this.bonusId = this.cleanupId = this.virusId = null;
    document.removeEventListener('visibilitychange', this.onVisibility);
  }
}
