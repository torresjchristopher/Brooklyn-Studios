
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { audioEngine } from './services/AudioEngine';
import { generateKeyboardLandscape } from './services/geminiService';
import Visualizer from './components/Visualizer';
import { 
  PIANO_MAPPINGS, 
  INITIAL_SOUNDBOARD_SLOTS, 
  COMMUNITY_DEFAULTS,
  PARAM_CONTROLS,
  PERFORMANCE_CONTROLS 
} from './constants';
import { KeyboardProfile, Recording, SoundboardSlot, LoopTrack } from './types';
import { 
  Sparkles, Mic, Square, Download, Play, Trash2, Send, 
  Command, Layers, Volume2, Music, BookOpen, Globe, Settings, Save, Keyboard as KeyIcon, RefreshCw, PlusCircle
} from 'lucide-react';

const RANDOM_PROMPTS = [
  'Vintage Spanish Guitar',
  'Deep Cyberpunk Cello',
  'Wind blowing through frozen tall grass',
  'An old metallic trumpet with echo',
  'Raindrops on a tin roof in E minor',
  'Synthesized moonlight on a black lake',
  'Rusted industrial pipe resonance'
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'studio' | 'discover' | 'manual'>('studio');
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [soundboard, setSoundboard] = useState<SoundboardSlot[]>(INITIAL_SOUNDBOARD_SLOTS);
  const [communityPool, setCommunityPool] = useState<KeyboardProfile[]>(COMMUNITY_DEFAULTS as any);
  const [aiLoading, setAiLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Loop Studio State
  const [loops, setLoops] = useState<LoopTrack[]>([]);
  const [isLoopRecording, setIsLoopRecording] = useState(false);
  const [loopProgress, setLoopProgress] = useState(0);

  const [profile, setProfile] = useState<KeyboardProfile>({
    id: 'init',
    author: 'System',
    name: 'Hardware Ready',
    waveform: 'sine',
    baseAttack: 0.1,
    baseRelease: 0.8,
    filterProgression: 0.5,
    noiseLevel: 0.05,
    resonance: 1,
    detune: 0,
    themeColor: '#3b82f6',
    description: 'Hardware initialized. Waiting for prompt.'
  });

  const [masterVolume, setMasterVolume] = useState(0.5);
  const [octaveShift, setOctaveShift] = useState(0);

  const stateRef = useRef({ profile, masterVolume, octaveShift, isInputFocused });
  useEffect(() => { 
    stateRef.current = { profile, masterVolume, octaveShift, isInputFocused }; 
  }, [profile, masterVolume, octaveShift, isInputFocused]);

  // Initial Auto-Generation
  useEffect(() => {
    const randomPrompt = RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)];
    setPrompt(randomPrompt);
    // Note: We can't auto-gen on mount because of API key requirements/UI flow, 
    // but we'll trigger it once they "Initialize"
  }, []);

  const initAudio = async () => {
    audioEngine.init();
    audioEngine.startLooping();
    setIsInitialized(true);
    // Initial generation once engine is hot
    handleGenerate();
  };

  // Loop Progress Tracker
  useEffect(() => {
    let frame: number;
    const tick = () => {
      setLoopProgress(audioEngine.getCurrentProgress());
      frame = requestAnimationFrame(tick);
    };
    if (isInitialized) frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isInitialized]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isInitialized || e.repeat || stateRef.current.isInputFocused) return;
    const key = e.key.toLowerCase();

    // 1. Synth (A-L row)
    const pianoKey = PIANO_MAPPINGS.find(k => k.key === key);
    if (pianoKey) {
      setActiveKeys(prev => new Set(prev).add(key));
      const freq = pianoKey.frequency * Math.pow(2, stateRef.current.octaveShift);
      audioEngine.playNote(key, freq, { ...stateRef.current.profile, volume: stateRef.current.masterVolume, pitch: 0 });
      return;
    }

    // 2. Sampler (0-9)
    if (/^[0-9]$/.test(key)) {
      const slot = soundboard.find(s => s.id === parseInt(key));
      if (slot?.url) {
        audioEngine.triggerSample(slot.url, stateRef.current.masterVolume);
        setActiveKeys(prev => new Set(prev).add(key));
        setTimeout(() => setActiveKeys(prev => { const n = new Set(prev); n.delete(key); return n; }), 150);
      }
      return;
    }

    // 3. Mixing & Param Controls (Q-P)
    const param = PARAM_CONTROLS.find(p => p.key === key);
    if (param) {
      setActiveKeys(prev => new Set(prev).add(key));
      setTimeout(() => setActiveKeys(prev => { const n = new Set(prev); n.delete(key); return n; }), 100);
      setProfile(p => {
        const next = { ...p };
        if (param.action === 'attack_up') next.baseAttack = Math.min(2, p.baseAttack + 0.1);
        if (param.action === 'attack_down') next.baseAttack = Math.max(0.01, p.baseAttack - 0.1);
        if (param.action === 'cutoff_up') next.filterProgression = Math.min(1.5, p.filterProgression + 0.1);
        if (param.action === 'cutoff_down') next.filterProgression = Math.max(0, p.filterProgression - 0.1);
        if (param.action === 'release_up') next.baseRelease = Math.min(3, p.baseRelease + 0.1);
        if (param.action === 'release_down') next.baseRelease = Math.max(0.1, p.baseRelease - 0.1);
        return next;
      });
      return;
    }

    // 4. Performance & Global (Z-M + Arrows)
    const perf = PERFORMANCE_CONTROLS.find(p => p.key === key);
    if (perf) {
      if (perf.action === 'octave_up') setOctaveShift(s => Math.min(2, s + 1));
      if (perf.action === 'octave_down') setOctaveShift(s => Math.max(-2, s - 1));
      if (perf.action === 'publish') startNewLoop('synth');
      return;
    }

    if (e.key === 'ArrowUp') setMasterVolume(v => Math.min(1, v + 0.05));
    if (e.key === 'ArrowDown') setMasterVolume(v => Math.max(0, v - 0.05));
    if (e.key === ' ') toggleRecording();
  }, [isInitialized, soundboard]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    setActiveKeys(prev => { const n = new Set(prev); n.delete(key); return n; });
    audioEngine.stopNote(key, { ...stateRef.current.profile, volume: stateRef.current.masterVolume, pitch: 0 });
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const toggleRecording = async () => {
    if (!isRecording) {
      audioEngine.startRecording();
      setIsRecording(true);
    } else {
      const blob = await audioEngine.stopRecording();
      setIsRecording(false);
      const url = URL.createObjectURL(blob);
      setRecordings(prev => [{
        id: Date.now().toString(),
        blob,
        url,
        timestamp: Date.now(),
        name: `Published: ${profile.name}`,
        profileName: profile.name
      }, ...prev]);
    }
  };

  const startNewLoop = async (type: 'synth' | 'vocal') => {
    if (isLoopRecording) return;
    setIsLoopRecording(true);
    const id = `loop-${Date.now()}`;
    
    // Add placeholder
    setLoops(prev => [...prev, { id, buffer: null, volume: 1, isMuted: false, type, color: profile.themeColor }]);
    
    if (type === 'vocal') audioEngine.toggleMic(true);
    
    const buffer = await audioEngine.recordLoop(id);
    
    if (type === 'vocal') audioEngine.toggleMic(false);
    
    setLoops(prev => prev.map(l => l.id === id ? { ...l, buffer } : l));
    setIsLoopRecording(false);
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const targetPrompt = prompt || RANDOM_PROMPTS[0];
    setAiLoading(true);
    try {
      const newProfile = await generateKeyboardLandscape(targetPrompt);
      setProfile(newProfile);
      setCommunityPool(p => [newProfile, ...p]);
      if (isInitialized) {
        audioEngine.playNote('preview', 220, { ...newProfile, volume: masterVolume, pitch: 0 });
        setTimeout(() => audioEngine.stopNote('preview', newProfile), 600);
      }
    } catch (err) {
      console.error("AI Build failed", err);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans selection:bg-blue-500/20">
      <nav className="border-b border-zinc-900/50 p-4 flex items-center justify-between bg-black/40 backdrop-blur-2xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-zinc-100 shadow-lg shadow-white/5 group transition-transform hover:scale-105 active:scale-95">
            <Command className="w-5 h-5 text-black" />
          </div>
          <div>
            <span className="font-black text-white tracking-tighter uppercase text-xs block">KeySynth Studio</span>
            <div className="flex items-center gap-1.5">
               <span className="text-[9px] text-zinc-600 font-mono tracking-widest uppercase">Hybrid Loop Engine</span>
               <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            </div>
          </div>
        </div>
        
        <div className="flex bg-zinc-950/50 p-1 rounded-2xl border border-zinc-900/50">
           {(['studio', 'discover', 'manual'] as const).map(tab => (
             <button 
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`px-5 py-2 text-[10px] font-bold uppercase rounded-xl transition-all ${
                 activeTab === tab ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-600 hover:text-zinc-300'
               }`}
             >
               {tab}
             </button>
           ))}
        </div>

        <div className="flex items-center gap-3">
           {!isInitialized ? (
             <button onClick={initAudio} className="text-[10px] font-bold px-5 py-2.5 bg-white text-black rounded-xl hover:bg-zinc-200 transition-all shadow-lg shadow-white/5">
               INITIALIZE HARDWARE
             </button>
           ) : (
             <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                 <Volume2 className="w-3.5 h-3.5 text-zinc-500" />
                 <span className="text-[10px] font-mono w-6 text-zinc-400">{Math.round(masterVolume * 100)}</span>
               </div>
             </div>
           )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {activeTab === 'studio' && (
          <div className="flex flex-col gap-8 animate-in fade-in zoom-in-95 duration-500">
            {/* Spinning Editing Track & AI Hub */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
               {/* Loop Radar Visualizer */}
               <div className="lg:col-span-4 bg-zinc-950 border border-zinc-900 rounded-[2.5rem] p-8 flex flex-col items-center justify-center relative group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Spinning Ring */}
                  <div className="relative w-48 h-48 rounded-full border-[10px] border-zinc-900 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle
                        cx="96"
                        cy="96"
                        r="88"
                        stroke="currentColor"
                        strokeWidth="10"
                        fill="transparent"
                        className="text-blue-600 transition-all duration-100"
                        strokeDasharray="552.92"
                        strokeDashoffset={552.92 * (1 - loopProgress)}
                      />
                    </svg>
                    <div className="flex flex-col items-center text-center">
                       <RefreshCw className={`w-8 h-8 ${isLoopRecording ? 'animate-spin text-red-500' : 'text-zinc-700'}`} />
                       <span className="text-[10px] font-black uppercase tracking-widest mt-2 text-zinc-500">
                         {isLoopRecording ? 'Recording...' : '4.0s Sync'}
                       </span>
                    </div>
                  </div>

                  <div className="mt-8 flex gap-3">
                     <button 
                       onClick={() => startNewLoop('synth')}
                       disabled={isLoopRecording}
                       className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-white hover:text-black transition-all group"
                       title="Record Synth Loop [M]"
                     >
                       <PlusCircle className="w-5 h-5" />
                     </button>
                     <button 
                       onClick={() => startNewLoop('vocal')}
                       disabled={isLoopRecording}
                       className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-red-500 hover:text-white transition-all"
                       title="Record Vocal Loop"
                     >
                       <Mic className="w-5 h-5" />
                     </button>
                  </div>
               </div>

               {/* AI Identity Hub */}
               <div className="lg:col-span-8 bg-zinc-950 border border-zinc-900 rounded-[2.5rem] p-8 flex flex-col justify-between relative group overflow-hidden">
                  <div className="space-y-6 relative z-10">
                    <div className="flex items-center gap-3">
                       <Sparkles className="w-6 h-6 text-blue-400" />
                       <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Sonic Architect</h2>
                    </div>
                    <form onSubmit={handleGenerate} className="flex gap-3">
                      <input 
                        value={prompt}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="Describe an instrument or abstract landscape..."
                        className="flex-1 bg-black/60 border border-zinc-800/50 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500/50 text-white placeholder:text-zinc-700 transition-all"
                      />
                      <button 
                        disabled={aiLoading}
                        className="px-8 py-4 bg-zinc-100 text-black hover:bg-white disabled:bg-zinc-800 rounded-2xl transition-all flex items-center gap-3 font-black text-xs uppercase shadow-xl"
                      >
                        {aiLoading ? <Layers className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Reconfigure
                      </button>
                    </form>
                    <p className="text-zinc-500 text-sm max-w-xl leading-relaxed">
                      Every key on your keyboard is dynamically remapped. Current architecture: <span className="text-zinc-300 font-bold underline decoration-blue-500/50 underline-offset-4">{profile.name}</span>.
                    </p>
                  </div>

                  <div className="flex items-end justify-between border-t border-zinc-900 pt-6 mt-6">
                     <div className="flex gap-6">
                        <div className="space-y-1">
                           <span className="text-[9px] font-mono text-zinc-600 uppercase">Resonance</span>
                           <div className="w-24 h-1 bg-zinc-900 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500" style={{ width: `${(profile.resonance/20)*100}%` }} />
                           </div>
                        </div>
                        <div className="space-y-1">
                           <span className="text-[9px] font-mono text-zinc-600 uppercase">Attack</span>
                           <div className="w-24 h-1 bg-zinc-900 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500" style={{ width: `${(profile.baseAttack/2)*100}%` }} />
                           </div>
                        </div>
                     </div>
                     <Visualizer />
                  </div>
               </div>
            </div>

            {/* Loop Mixing Desk */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
               <div className="lg:col-span-9 space-y-6">
                  {/* Loop Tracks Tray */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {loops.map(loop => (
                        <div key={loop.id} className="bg-zinc-950 border border-zinc-900 p-5 rounded-[2rem] space-y-4 group">
                           <div className="flex justify-between items-center">
                              <div className="p-2 rounded-xl bg-zinc-900">
                                 {loop.type === 'vocal' ? <Mic className="w-4 h-4 text-red-400" /> : <Music className="w-4 h-4 text-blue-400" />}
                              </div>
                              <button 
                                onClick={() => {
                                   audioEngine.removeLoop(loop.id);
                                   setLoops(prev => prev.filter(l => l.id !== loop.id));
                                }}
                                className="p-2 text-zinc-700 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                           </div>
                           <div className="space-y-2">
                              <div className="flex justify-between text-[10px] font-mono text-zinc-600 uppercase">
                                 <span>Volume</span>
                                 <span>{Math.round(loop.volume * 100)}%</span>
                              </div>
                              <input 
                                type="range" min="0" max="1" step="0.01" 
                                value={loop.volume} 
                                onChange={(e) => {
                                   const v = parseFloat(e.target.value);
                                   setLoops(prev => prev.map(l => l.id === loop.id ? { ...l, volume: v } : l));
                                   audioEngine.setLoopVolume(loop.id, v);
                                }}
                                className="w-full accent-blue-500 bg-zinc-900 h-1.5 rounded-lg appearance-none cursor-pointer"
                              />
                           </div>
                           <div className="h-10 bg-black/40 rounded-xl overflow-hidden relative">
                              <div className="absolute inset-0 bg-blue-500/10" style={{ width: `${loopProgress * 100}%` }} />
                              <div className="absolute inset-0 flex items-center justify-center">
                                 <span className="text-[9px] font-mono text-zinc-800 uppercase tracking-widest">Active Sync</span>
                              </div>
                           </div>
                        </div>
                     ))}
                     {loops.length === 0 && (
                        <div className="col-span-full h-40 border border-dashed border-zinc-900 rounded-[2.5rem] flex flex-col items-center justify-center text-zinc-700">
                           <Layers className="w-8 h-8 mb-3 opacity-20" />
                           <span className="text-[10px] font-bold uppercase tracking-widest">No active loops recorded</span>
                        </div>
                     )}
                  </div>

                  {/* Performance Keyboard Visual */}
                  <div className="bg-zinc-950 border border-zinc-900 rounded-[2.5rem] p-10 relative group">
                     <div className="flex justify-between items-center mb-10">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.2em]">Live Matrix Input</span>
                           <span className="text-sm font-bold text-white uppercase mt-1">{profile.description}</span>
                        </div>
                        <button 
                          onClick={toggleRecording}
                          className={`flex items-center gap-3 px-8 py-3 rounded-2xl font-black text-[10px] uppercase transition-all shadow-xl ${
                            isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-zinc-900 text-zinc-500 hover:text-white'
                          }`}
                        >
                          {isRecording ? <Square className="w-3.5 h-3.5 fill-current" /> : <Mic className="w-3.5 h-3.5" />}
                          {isRecording ? 'Exporting Mix...' : 'Record Session'}
                        </button>
                     </div>

                     <div className="flex gap-1.5 justify-center">
                       {PIANO_MAPPINGS.map(m => (
                         <div 
                           key={m.key}
                           className={`h-36 w-14 rounded-2xl border flex flex-col items-center justify-end pb-5 transition-all duration-75 ${
                             activeKeys.has(m.key) 
                               ? 'bg-zinc-100 border-white -translate-y-3 shadow-[0_20px_40px_rgba(255,255,255,0.1)] scale-105' 
                               : 'bg-black/40 border-zinc-800/40'
                           }`}
                         >
                           <span className={`text-[10px] font-black tracking-tighter ${activeKeys.has(m.key) ? 'text-black' : 'text-zinc-700'}`}>{m.label}</span>
                           <span className="text-[8px] font-mono text-zinc-800 mt-1">{m.key.toUpperCase()}</span>
                         </div>
                       ))}
                     </div>
                  </div>
               </div>

               {/* Master Output List */}
               <div className="lg:col-span-3 space-y-6">
                  <div className="bg-zinc-950 border border-zinc-900 rounded-[2.5rem] p-6 flex flex-col h-full">
                     <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2 mb-6">
                       <Music className="w-3 h-3" /> Master Tapes
                     </h3>
                     <div className="flex-1 space-y-4 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                        {recordings.map(rec => (
                          <div key={rec.id} className="bg-black border border-zinc-900 p-5 rounded-3xl flex flex-col gap-3 group hover:border-zinc-700 transition-all">
                            <div className="flex justify-between items-start">
                              <div className="truncate pr-2">
                                <div className="text-xs font-black text-white truncate">{rec.name}</div>
                                <div className="text-[9px] text-zinc-600 font-mono mt-1 uppercase tracking-widest">{new Date(rec.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                              </div>
                              <div className="flex gap-1">
                                <a href={rec.url} download={`${rec.name}.webm`} className="p-2 hover:bg-zinc-900 rounded-xl transition-all"><Download className="w-4 h-4" /></a>
                                <button onClick={() => setRecordings(p => p.filter(r => r.id !== rec.id))} className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-600 hover:text-red-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </div>
                            <audio src={rec.url} controls className="w-full h-8 opacity-40 hover:opacity-100 transition-opacity invert hue-rotate-180 brightness-200" />
                          </div>
                        ))}
                        {recordings.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-24 text-zinc-800 border border-dashed border-zinc-900 rounded-3xl">
                            <Layers className="w-8 h-8 mb-4 opacity-10" />
                            <span className="text-[10px] uppercase font-bold tracking-widest opacity-30 text-center px-6">Your session exports will appear here</span>
                          </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'discover' && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom-8 duration-500">
             {communityPool.map(item => (
               <div key={item.id} className="bg-zinc-950 border border-zinc-900 rounded-[2rem] p-6 flex flex-col gap-5 group hover:border-white/10 transition-all">
                 <div className="flex justify-between items-start">
                   <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center shadow-inner" style={{ color: item.themeColor }}>
                     <Globe className="w-6 h-6" />
                   </div>
                   <button 
                    onClick={() => setProfile(item)}
                    className="px-5 py-2 bg-zinc-900 hover:bg-white hover:text-black rounded-xl text-[10px] font-black uppercase transition-all shadow-lg shadow-black/20"
                   >
                     Load
                   </button>
                 </div>
                 <div>
                   <h3 className="font-black text-white text-lg tracking-tighter uppercase">{item.name}</h3>
                   <p className="text-[10px] font-mono text-zinc-700 uppercase tracking-widest mt-1">AI ID: {item.id.slice(0,6)}</p>
                 </div>
                 <p className="text-sm text-zinc-500 leading-relaxed italic line-clamp-2">"{item.description}"</p>
                 <div className="flex gap-2 pt-5 border-t border-zinc-900">
                    <span className="text-[9px] font-bold px-3 py-1.5 bg-zinc-900 rounded-lg text-zinc-600 uppercase tracking-widest">{item.waveform}</span>
                 </div>
               </div>
             ))}
          </div>
        )}

        {activeTab === 'manual' && (
          <div className="bg-zinc-950 border border-zinc-900 rounded-[3rem] p-12 animate-in zoom-in-95 duration-500">
             <div className="flex items-center gap-6 mb-12">
               <div className="p-4 bg-zinc-900 rounded-[2rem]">
                  <KeyIcon className="w-10 h-10 text-zinc-300" />
               </div>
               <div>
                 <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Hardware Interface Guide</h2>
                 <p className="text-zinc-500 text-sm font-medium">Professional matrix reconfiguration for musicians.</p>
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                     <div className="w-3 h-3 rounded-full bg-blue-500" />
                     <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Synth Matrix</h4>
                  </div>
                  <ul className="space-y-4 font-mono text-[11px] text-zinc-500">
                    <li><b className="text-white px-2 py-1 bg-zinc-900 rounded mr-2">A - L</b> Chromatic Scale</li>
                    <li><b className="text-white px-2 py-1 bg-zinc-900 rounded mr-2">W, E, T, Y, U, O, P</b> Sharps/Flats</li>
                    <li><b className="text-white px-2 py-1 bg-zinc-900 rounded mr-2">Z / X</b> Global Octave Shifter</li>
                  </ul>
                </div>
                <div className="space-y-6">
                   <div className="flex items-center gap-2 mb-2">
                     <div className="w-3 h-3 rounded-full bg-red-500" />
                     <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Loop Studio</h4>
                  </div>
                  <ul className="space-y-4 font-mono text-[11px] text-zinc-500">
                    <li><b className="text-white px-2 py-1 bg-zinc-900 rounded mr-2">M</b> Quick Synth Loop</li>
                    <li><b className="text-white px-2 py-1 bg-zinc-900 rounded mr-2">Space</b> Master Export</li>
                    <li><b className="text-white px-2 py-1 bg-zinc-900 rounded mr-2">TAB</b> Clear Active Loop</li>
                  </ul>
                </div>
                <div className="space-y-6">
                   <div className="flex items-center gap-2 mb-2">
                     <div className="w-3 h-3 rounded-full bg-purple-500" />
                     <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Mixing Row</h4>
                  </div>
                  <ul className="space-y-4 font-mono text-[11px] text-zinc-500">
                    <li><b className="text-white px-2 py-1 bg-zinc-900 rounded mr-2">Q / W</b> Attack Modulator</li>
                    <li><b className="text-white px-2 py-1 bg-zinc-900 rounded mr-2">E / R</b> Filter Cutoff Mod</li>
                    <li><b className="text-white px-2 py-1 bg-zinc-900 rounded mr-2">U / I</b> Release Time Mod</li>
                  </ul>
                </div>
                <div className="space-y-6">
                   <div className="flex items-center gap-2 mb-2">
                     <div className="w-3 h-3 rounded-full bg-green-500" />
                     <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Sampler 0-9</h4>
                  </div>
                  <ul className="space-y-4 font-mono text-[11px] text-zinc-500">
                    <li><b className="text-white px-2 py-1 bg-zinc-900 rounded mr-2">1 - 0</b> Fire Sample Slot</li>
                    <li><b className="text-white px-2 py-1 bg-zinc-900 rounded mr-2">Drag</b> Drop MP3 into slots</li>
                  </ul>
                </div>
             </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-5 bg-black/40 backdrop-blur-3xl border-t border-zinc-900/50 flex justify-between items-center pointer-events-none z-50">
        <div className="flex gap-8 text-[9px] font-black font-mono text-zinc-700 uppercase tracking-widest">
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
             SYNC: 48.0K
          </div>
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
             LATENCY: 2.1ms
          </div>
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
             BUFFER: 512 SMPL
          </div>
        </div>
        <div className="text-[9px] font-black font-mono text-zinc-700 uppercase tracking-widest">
          KeySynth Studio Pro // Creative Matrix Active
        </div>
      </footer>
    </div>
  );
};

export default App;
