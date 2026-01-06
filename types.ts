
export type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface KeyboardProfile {
  id: string;
  name: string;
  author: string;
  waveform: WaveformType;
  baseAttack: number;
  baseRelease: number;
  filterProgression: number;
  noiseLevel: number;
  resonance: number;
  detune: number;
  themeColor: string;
  description: string;
  isInstrument?: boolean;
}

export interface SynthSettings extends KeyboardProfile {
  volume: number;
  pitch: number;
}

export interface LoopTrack {
  id: string;
  buffer: AudioBuffer | null;
  volume: number;
  isMuted: boolean;
  type: 'synth' | 'vocal';
  color: string;
}

export interface Recording {
  id: string;
  blob: Blob;
  url: string;
  timestamp: number;
  name: string;
  profileName: string;
}

export interface KeyMapping {
  key: string;
  note: string;
  frequency: number;
  label: string;
}

export interface SoundboardSlot {
  id: number;
  name: string;
  url?: string;
  color: string;
}
