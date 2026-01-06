
import { KeyboardProfile, SynthSettings } from '../types';

class AudioEngine {
  public ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private destination: MediaStreamAudioDestinationNode | null = null;
  private activeOscillators: Map<string, { osc: OscillatorNode; noise?: AudioBufferSourceNode; gain: GainNode }> = new Map();
  
  // Looping System
  private loopLength = 4.0; // 4 seconds loops
  private startTime = 0;
  private loopTracks: Map<string, { buffer: AudioBuffer; source: AudioBufferSourceNode | null; gain: GainNode }> = new Map();
  private isLooping = false;
  
  // Mic Input
  private micStream: MediaStream | null = null;
  private micNode: MediaStreamAudioSourceNode | null = null;
  private micGain: GainNode | null = null;

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.destination = this.ctx.createMediaStreamDestination();

    this.masterGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.connect(this.destination);

    this.setupRecorder();
    this.setupMic();
  }

  private async setupMic() {
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (this.ctx) {
        this.micNode = this.ctx.createMediaStreamSource(this.micStream);
        this.micGain = this.ctx.createGain();
        this.micGain.gain.value = 0; // Off by default unless recording loop
        this.micNode.connect(this.micGain);
        this.micGain.connect(this.masterGain!);
      }
    } catch (e) {
      console.warn("Mic access denied or unavailable", e);
    }
  }

  private setupRecorder() {
    if (!this.destination) return;
    this.recorder = new MediaRecorder(this.destination.stream);
    this.recorder.ondataavailable = (e) => this.chunks.push(e.data);
  }

  startRecording() {
    if (!this.recorder || this.recorder.state === 'recording') return;
    this.chunks = [];
    this.recorder.start();
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.recorder || this.recorder.state === 'inactive') return resolve(new Blob());
      this.recorder.onstop = () => resolve(new Blob(this.chunks, { type: 'audio/webm;codecs=opus' }));
      this.recorder.stop();
    });
  }

  // --- LOOPING ENGINE ---
  startLooping() {
    if (this.isLooping || !this.ctx) return;
    this.isLooping = true;
    this.startTime = this.ctx.currentTime;
    this.scheduleLoops();
  }

  private scheduleLoops() {
    if (!this.isLooping || !this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Schedule all active tracks for next window
    this.loopTracks.forEach((track, id) => {
      if (track.source) return; // Already scheduled
      const source = this.ctx!.createBufferSource();
      source.buffer = track.buffer;
      source.connect(track.gain);
      // Synchronize to the start time
      const offset = (now - this.startTime) % this.loopLength;
      source.start(now, offset);
      source.loop = true;
      track.source = source;
    });
  }

  async recordLoop(id: string, duration: number = 4000): Promise<AudioBuffer> {
    if (!this.ctx) throw new Error("Audio not initialized");
    
    // We record what's currently going through the destination
    const stream = this.destination!.stream;
    const mediaRecorder = new MediaRecorder(stream);
    const audioChunks: Blob[] = [];
    
    return new Promise((resolve) => {
      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunks);
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await this.ctx!.decodeAudioData(arrayBuffer);
        
        // Save to tracks
        const gain = this.ctx!.createGain();
        gain.connect(this.masterGain!);
        this.loopTracks.set(id, { buffer: audioBuffer, source: null, gain });
        this.scheduleLoops();
        resolve(audioBuffer);
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), duration);
    });
  }

  setLoopVolume(id: string, volume: number) {
    const track = this.loopTracks.get(id);
    if (track && this.ctx) {
      track.gain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.05);
    }
  }

  removeLoop(id: string) {
    const track = this.loopTracks.get(id);
    if (track) {
      track.source?.stop();
      track.gain.disconnect();
      this.loopTracks.delete(id);
    }
  }

  getCurrentProgress() {
    if (!this.ctx || !this.isLooping) return 0;
    return ((this.ctx.currentTime - this.startTime) % this.loopLength) / this.loopLength;
  }

  toggleMic(on: boolean) {
    if (this.micGain && this.ctx) {
      this.micGain.gain.setTargetAtTime(on ? 1.0 : 0, this.ctx.currentTime, 0.1);
    }
  }

  private createNoiseBuffer() {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  playNote(id: string, freq: number, settings: SynthSettings) {
    if (!this.ctx || !this.masterGain) return;
    if (this.activeOscillators.has(id)) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const noteGain = this.ctx.createGain();

    const brightness = (freq / 800) * settings.filterProgression;
    const cutoff = 200 + (brightness * 12000);
    
    filter.type = 'lowpass';
    filter.frequency.setTargetAtTime(cutoff, now, 0.05);
    filter.Q.setTargetAtTime(settings.resonance, now, 0.05);

    osc.type = settings.waveform;
    osc.frequency.setValueAtTime(freq * Math.pow(2, (settings.pitch + settings.detune/100) / 12), now);

    noteGain.gain.setValueAtTime(0, now);
    noteGain.gain.linearRampToValueAtTime(settings.volume, now + Math.max(0.005, settings.baseAttack));

    let noiseSource;
    if (settings.noiseLevel > 0) {
      const buffer = this.createNoiseBuffer();
      if (buffer) {
        noiseSource = this.ctx.createBufferSource();
        noiseSource.buffer = buffer;
        noiseSource.loop = true;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(settings.noiseLevel * 0.3 * settings.volume, now);
        noiseSource.connect(noiseGain);
        noiseGain.connect(filter);
        noiseSource.start();
      }
    }

    osc.connect(filter);
    filter.connect(noteGain);
    noteGain.connect(this.masterGain);

    osc.start();
    this.activeOscillators.set(id, { osc, noise: noiseSource, gain: noteGain });
  }

  stopNote(id: string, settings: SynthSettings) {
    const active = this.activeOscillators.get(id);
    if (!active || !this.ctx) return;

    const { osc, noise, gain } = active;
    const now = this.ctx.currentTime;
    
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(0, now, Math.max(0.01, settings.baseRelease / 4));

    setTimeout(() => {
      osc.stop();
      noise?.stop();
      osc.disconnect();
      noise?.disconnect();
      gain.disconnect();
      this.activeOscillators.delete(id);
    }, settings.baseRelease * 1000 + 200);
  }

  triggerSample(url: string, volume: number) {
    if (!this.ctx || !this.masterGain) return;
    fetch(url).then(r => r.arrayBuffer()).then(d => this.ctx!.decodeAudioData(d)).then(b => {
      const s = this.ctx!.createBufferSource();
      const g = this.ctx!.createGain();
      g.gain.value = volume;
      s.buffer = b;
      s.connect(g);
      g.connect(this.masterGain!);
      s.start();
    }).catch(console.error);
  }

  getAnalyser() {
    if (!this.ctx || !this.masterGain) return null;
    const a = this.ctx.createAnalyser();
    this.masterGain.connect(a);
    a.fftSize = 512;
    return a;
  }
}

export const audioEngine = new AudioEngine();
