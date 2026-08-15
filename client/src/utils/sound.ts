/**
 * Web Audio API based sound synthesizer for restaurant order chimes.
 * Generates a clean, pleasant multi-tone restaurant bell chime without external audio assets.
 */

class SoundService {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    const savedMute = localStorage.getItem('cafe_sound_muted');
    if (savedMute !== null) {
      this.isMuted = savedMute === 'true';
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public unlockAudio(): void {
    try {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {
      // Audio unlock is best-effort; a blocked AudioContext is not an error.
    }
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  public setSoundMuted(muted: boolean): void {
    this.isMuted = muted;
    localStorage.setItem('cafe_sound_muted', String(muted));
  }

  public toggleMute(): boolean {
    const next = !this.isMuted;
    this.setSoundMuted(next);
    return next;
  }

  /**
   * Play an audible 3-tone chime for incoming orders (E5 -> G5 -> C6 harmonic bell)
   */
  public playOrderChime(): void {
    if (this.isMuted) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Notes in Hz: E5 (659.25), G5 (783.99), C6 (1046.50)
      const notes = [
        { freq: 659.25, time: 0, duration: 0.35, gain: 0.3 },
        { freq: 783.99, time: 0.15, duration: 0.35, gain: 0.35 },
        { freq: 1046.50, time: 0.32, duration: 0.7, gain: 0.45 },
      ];

      notes.forEach(({ freq, time, duration, gain }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        // Add a slight triangle harmonic for a richer bell sound
        const oscHarmonic = ctx.createOscillator();
        const harmGain = ctx.createGain();
        oscHarmonic.type = 'triangle';
        oscHarmonic.frequency.setValueAtTime(freq * 2, now + time);

        // Envelope: quick attack, smooth decay
        gainNode.gain.setValueAtTime(0.001, now + time);
        gainNode.gain.exponentialRampToValueAtTime(gain, now + time + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + time + duration);

        harmGain.gain.setValueAtTime(0.001, now + time);
        harmGain.gain.exponentialRampToValueAtTime(gain * 0.25, now + time + 0.02);
        harmGain.gain.exponentialRampToValueAtTime(0.001, now + time + duration * 0.7);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscHarmonic.connect(harmGain);
        harmGain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + duration);

        oscHarmonic.start(now + time);
        oscHarmonic.stop(now + time + duration);
      });
    } catch {
      // AudioContext might be blocked until first user interaction
    }
  }
}

export const soundService = new SoundService();

if (typeof window !== 'undefined') {
  const unlock = () => {
    soundService.unlockAudio();
  };
  window.addEventListener('click', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
  window.addEventListener('touchstart', unlock, { passive: true });
}
