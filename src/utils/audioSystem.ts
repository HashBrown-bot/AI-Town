/**
 * Pixel Town Procedural Web Audio Engine
 * Generates gentle ambient chords, soothing breeze, birdsong, and retro UI chimes
 * without requiring any external mp3/wav files.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMusicPlaying: boolean = false;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientTimer: any = null;
  private birdsTimer: any = null;
  private currentVolume: number = 0.35;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.currentVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public getIsPlaying(): boolean {
    return this.isMusicPlaying;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getVolume(): number {
    return this.currentVolume;
  }

  public setVolume(val: number) {
    this.currentVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.currentVolume, this.ctx.currentTime, 0.05);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.currentVolume, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  public toggleMusic(): boolean {
    if (this.isMusicPlaying) {
      this.stopAmbient();
      this.isMusicPlaying = false;
    } else {
      this.startAmbient();
      this.isMusicPlaying = true;
    }
    return this.isMusicPlaying;
  }

  public startAmbient() {
    this.initContext();
    if (!this.ctx || !this.musicGain) return;

    this.isMusicPlaying = true;

    // Gentle chord progression: Cmaj9 - Am9 - Fmaj7 - G6
    const chordProgressions = [
      [261.63, 329.63, 392.00, 493.88, 587.33], // C, E, G, B, D
      [220.00, 261.63, 329.63, 392.00, 493.88], // A, C, E, G, B
      [174.61, 261.63, 329.63, 349.23, 440.00], // F, C, E, F, A
      [196.00, 246.94, 293.66, 392.00, 440.00], // G, B, D, G, A
    ];

    let chordIdx = 0;

    const playChordStep = () => {
      if (!this.isMusicPlaying || !this.ctx || !this.musicGain) return;
      
      const chord = chordProgressions[chordIdx % chordProgressions.length];
      chordIdx++;

      // Arpeggiate soft notes
      chord.forEach((freq, i) => {
        setTimeout(() => {
          if (!this.isMusicPlaying) return;
          this.playWarmNote(freq, 4.5);
        }, i * 380 + Math.random() * 80);
      });

      this.ambientTimer = setTimeout(playChordStep, 4500);
    };

    playChordStep();
    this.scheduleBirdChirps();
  }

  public stopAmbient() {
    this.isMusicPlaying = false;
    if (this.ambientTimer) {
      clearTimeout(this.ambientTimer);
      this.ambientTimer = null;
    }
    if (this.birdsTimer) {
      clearTimeout(this.birdsTimer);
      this.birdsTimer = null;
    }
  }

  private playWarmNote(freq: number, duration: number) {
    if (!this.ctx || !this.musicGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const noteGain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    // Warm lowpass filter to remove harsh retro square sound
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(350, now + duration);

    // Gentle slow attack and gentle decay
    noteGain.gain.setValueAtTime(0.0001, now);
    noteGain.gain.exponentialRampToValueAtTime(0.09, now + 0.8);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(noteGain);
    noteGain.connect(this.musicGain);

    osc.start(now);
    osc.stop(now + duration + 0.1);
  }

  private scheduleBirdChirps() {
    if (!this.isMusicPlaying) return;

    const nextDelay = 8000 + Math.random() * 14000;
    this.birdsTimer = setTimeout(() => {
      if (this.isMusicPlaying) {
        this.playGentleBirdsong();
        this.scheduleBirdChirps();
      }
    }, nextDelay);
  }

  private playGentleBirdsong() {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const baseFreq = 2200 + Math.random() * 800;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq + 600, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(baseFreq - 200, now + 0.18);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.03, now + 0.05);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // UI Interactive Sounds
  public playClick() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playChime() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.04, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.45);
    });
  }

  public playEventFanfare() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0.06, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.6);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.65);
    });
  }
}

export const soundEngine = new SoundEngine();
