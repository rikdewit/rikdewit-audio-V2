
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { SessionStatus, TranscriptionEntry } from './types';
import { decode, decodeAudioData, createBlob } from './utils/audioUtils';
import AudioVisualizer from './components/AudioVisualizer';

const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-12-2025';

const App: React.FC = () => {
  const [status, setStatus] = useState<SessionStatus>(SessionStatus.IDLE);
  const [history, setHistory] = useState<TranscriptionEntry[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Audio Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  
  // Gemini Session Ref
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const transcriptionsRef = useRef({ user: '', model: '' });

  const stopAllAudio = useCallback(() => {
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  const startSession = async () => {
    if (status === SessionStatus.CONNECTED || status === SessionStatus.CONNECTING) return;
    
    setStatus(SessionStatus.CONNECTING);
    setErrorMsg(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Initialize Audio Contexts
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      sessionPromiseRef.current = ai.live.connect({
        model: MODEL_NAME,
        callbacks: {
          onopen: () => {
            setStatus(SessionStatus.CONNECTED);
            
            // Audio input processing
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            analyzerRef.current = inputAudioContextRef.current!.createAnalyser();
            analyzerRef.current.fftSize = 256;
            
            scriptProcessorRef.current = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessorRef.current.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(analyzerRef.current);
            analyzerRef.current.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Transcription
            if (message.serverContent?.outputTranscription) {
              transcriptionsRef.current.model += message.serverContent.outputTranscription.text;
            } else if (message.serverContent?.inputTranscription) {
              transcriptionsRef.current.user += message.serverContent.inputTranscription.text;
            }

            if (message.serverContent?.turnComplete) {
              const userText = transcriptionsRef.current.user;
              const modelText = transcriptionsRef.current.model;
              
              if (userText || modelText) {
                setHistory(prev => [
                  ...prev,
                  ...(userText ? [{ role: 'user', text: userText, timestamp: Date.now() } as TranscriptionEntry] : []),
                  ...(modelText ? [{ role: 'model', text: modelText, timestamp: Date.now() } as TranscriptionEntry] : [])
                ]);
              }
              transcriptionsRef.current = { user: '', model: '' };
            }

            // Handle Audio Playback
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              const outputCtx = outputAudioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              
              const buffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              
              source.onended = () => sourcesRef.current.delete(source);
              source.start(nextStartTimeRef.current);
              
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }

            // Handle Interruptions
            if (message.serverContent?.interrupted) {
              stopAllAudio();
            }
          },
          onerror: (e) => {
            console.error("Session Error:", e);
            setErrorMsg("A connection error occurred. Please try again.");
            setStatus(SessionStatus.ERROR);
          },
          onclose: () => {
            setStatus(SessionStatus.IDLE);
            stopAllAudio();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: "You are the Rikewit AI Studio assistant. You are helpful, professional, and clear. Your goal is to showcase the power of low-latency AI audio interaction."
        }
      });

    } catch (err: any) {
      console.error("Failed to start session:", err);
      setErrorMsg(err.message || "Failed to initialize studio.");
      setStatus(SessionStatus.ERROR);
    }
  };

  const endSession = async () => {
    if (sessionPromiseRef.current) {
      const session = await sessionPromiseRef.current;
      session.close();
      sessionPromiseRef.current = null;
    }
    
    if (scriptProcessorRef.current) scriptProcessorRef.current.disconnect();
    if (inputAudioContextRef.current) inputAudioContextRef.current.close();
    if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    
    stopAllAudio();
    setStatus(SessionStatus.IDLE);
  };

  // Auto-scroll transcriptions
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <header className="w-full flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center neon-glow">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">RIKEWIT <span className="text-blue-500 font-light">AUDIO</span></h1>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status === SessionStatus.CONNECTED ? 'bg-green-500 animate-pulse' : 'bg-white/20'}`} />
          <span className="text-xs font-semibold text-white/60 tracking-widest uppercase">
            {status}
          </span>
        </div>
      </header>

      {/* Main Studio View */}
      <main className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
        
        {/* Left Column: Visualizers & Controls */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="glass p-6 rounded-3xl flex flex-col gap-6">
            <h2 className="text-sm font-semibold text-white/40 uppercase tracking-widest">Studio Engine</h2>
            
            <AudioVisualizer 
              isRecording={status === SessionStatus.CONNECTED} 
              analyzerNode={analyzerRef.current || undefined} 
            />

            <div className="flex flex-col gap-3">
              {status === SessionStatus.IDLE || status === SessionStatus.ERROR ? (
                <button
                  onClick={startSession}
                  className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-blue-500 hover:text-white transition-all duration-300 flex items-center justify-center gap-2 group"
                >
                  <span className="group-hover:scale-110 transition-transform">Start Session</span>
                </button>
              ) : (
                <button
                  onClick={endSession}
                  disabled={status === SessionStatus.CONNECTING}
                  className="w-full py-4 bg-red-500/10 text-red-500 border border-red-500/50 font-bold rounded-2xl hover:bg-red-500 hover:text-white transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <span>End Session</span>
                </button>
              )}
              
              {status === SessionStatus.CONNECTING && (
                <p className="text-center text-xs text-blue-400 font-medium animate-pulse">Establishing secure link...</p>
              )}
              
              {errorMsg && (
                <p className="text-center text-xs text-red-400 font-medium px-4">{errorMsg}</p>
              )}
            </div>
          </div>

          <div className="glass p-6 rounded-3xl">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Specs</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between">
                <span className="text-white/40">Model</span>
                <span className="text-white/80 font-mono">Gemini 2.5 Flash</span>
              </li>
              <li className="flex justify-between">
                <span className="text-white/40">Latency</span>
                <span className="text-green-400 font-mono">&lt; 300ms</span>
              </li>
              <li className="flex justify-between">
                <span className="text-white/40">Audio</span>
                <span className="text-white/80 font-mono">16-bit PCM</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Transcription History */}
        <div className="lg:col-span-2 flex flex-col h-[500px] lg:h-auto">
          <div className="glass rounded-3xl flex flex-col h-full overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h2 className="text-sm font-semibold text-white/40 uppercase tracking-widest">Live Transcription</h2>
              <button 
                onClick={() => setHistory([])}
                className="text-xs text-white/30 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
            
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
            >
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                  <svg className="w-12 h-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <p className="text-sm">Speak to begin transcription...</p>
                </div>
              ) : (
                history.map((entry, idx) => (
                  <div 
                    key={`${entry.timestamp}-${idx}`}
                    className={`flex flex-col ${entry.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                      entry.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white/5 text-white/90 rounded-tl-none border border-white/5'
                    }`}>
                      {entry.text}
                    </div>
                    <span className="text-[10px] text-white/20 mt-1 uppercase tracking-tighter">
                      {entry.role === 'user' ? 'You' : 'Gemini'} • {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
            
            {status === SessionStatus.CONNECTED && (
              <div className="p-4 bg-blue-600/5 border-t border-blue-500/20 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 active-ring" />
                <span className="text-xs text-blue-400 font-medium">Listening for input...</span>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-12 py-8 text-center text-white/20 text-xs">
        &copy; {new Date().getFullYear()} Rikewit Audio Studio. Powered by Google Gemini API.
      </footer>
    </div>
  );
};

export default App;
