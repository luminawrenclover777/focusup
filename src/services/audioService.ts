export type SoundType = 'none' | 'rain' | 'brown' | 'pink';

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private currentType: SoundType = 'none';
  private gainNode: GainNode | null = null;
  private sourceNode: AudioNode | null = null;
  private isPlaying: boolean = false;
  private volume: number = 0.5;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public getCurrentType(): SoundType {
    return this.currentType;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public async play(type: SoundType) {
    if (type === 'none') {
      this.stop();
      return;
    }

    try {
      this.initContext();
      if (!this.ctx) return;

      this.stopNodesOnly();

      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.gainNode.connect(this.ctx.destination);

      const bufferSize = this.ctx.sampleRate * 2; // 2 seconds looped buffer
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      if (type === 'brown') {
        // Brown noise: Leaky integrator on white noise
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = data[i];
          data[i] *= 3.5; // Gain compensation
        }
      } else if (type === 'pink') {
        // Pink noise: Paul Kellet filter method
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }
      } else if (type === 'rain') {
        // Rain sound: Lowpass filtered pink noise with subtle randomized drops
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          const brown = (lastOut + 0.03 * white) / 1.03;
          lastOut = brown;
          // Rain droplets crackle
          const drop = Math.random() > 0.998 ? (Math.random() - 0.5) * 0.4 : 0;
          data[i] = (brown * 0.7 + white * 0.15 + drop) * 1.5;
        }
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      // Filter for smoothness
      const filter = this.ctx.createBiquadFilter();
      if (type === 'rain') {
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
      } else if (type === 'brown') {
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, this.ctx.currentTime);
      } else {
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, this.ctx.currentTime);
      }

      noiseSource.connect(filter);
      filter.connect(this.gainNode);
      noiseSource.start();

      this.sourceNode = noiseSource;
      this.currentType = type;
      this.isPlaying = true;
    } catch (err) {
      console.warn('[Audio] White noise playback failed or restricted by browser:', err);
      this.isPlaying = false;
    }
  }

  private stopNodesOnly() {
    if (this.sourceNode) {
      try {
        (this.sourceNode as AudioBufferSourceNode).stop();
        this.sourceNode.disconnect();
      } catch {
        // ignore already stopped
      }
      this.sourceNode = null;
    }
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch {
        // ignore
      }
      this.gainNode = null;
    }
  }

  public stop() {
    this.stopNodesOnly();
    this.currentType = 'none';
    this.isPlaying = false;
  }

  public playCyberHaptic(type: 'pulse' | 'chime' | 'purify' = 'pulse') {
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      const vol = Math.max(0.2, this.volume);

      if (type === 'pulse') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(360, now);
        osc.frequency.exponentialRampToValueAtTime(720, now + 0.08);
        gain.gain.setValueAtTime(0.25 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'chime') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15);
        gain.gain.setValueAtTime(0.3 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'purify') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(261.63, now);
        osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.25);
        gain.gain.setValueAtTime(0.35 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      }
    } catch {
      // Audio context may be locked until first interaction
    }
  }
}

export const soundSynthesizer = new SoundSynthesizer();
