
import React, { useRef, useEffect } from 'react';
import { AudioVisualizerProps } from '../types';

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isRecording, analyzerNode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Fixed error: Expected 1 arguments, but got 0 for useRef. Added undefined as initial value.
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!canvasRef.current || !analyzerNode) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyzerNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyzerNode.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 3;
      ctx.strokeStyle = isRecording ? '#3b82f6' : '#4b5563';
      ctx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // Add a glow effect
      if (isRecording) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#3b82f6';
      } else {
        ctx.shadowBlur = 0;
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyzerNode, isRecording]);

  return (
    <div className="w-full h-32 flex items-center justify-center overflow-hidden rounded-2xl bg-black/40 border border-white/5 relative">
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={128} 
        className="w-full h-full opacity-80"
      />
      {!isRecording && (
        <div className="absolute inset-0 flex items-center justify-center text-white/20 font-medium tracking-widest text-xs uppercase">
          Studio Offline
        </div>
      )}
    </div>
  );
};

export default AudioVisualizer;
