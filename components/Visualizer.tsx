
import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../services/AudioEngine';

const Visualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = 200;
      canvas.height = 40;
    };
    resize();

    const draw = () => {
      const analyser = audioEngine.getAnalyser();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (!analyser) {
        ctx.strokeStyle = '#27272a';
        ctx.beginPath();
        ctx.moveTo(0, canvas.height/2);
        ctx.lineTo(canvas.width, canvas.height/2);
        ctx.stroke();
        requestAnimationFrame(draw);
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      const barWidth = (canvas.width / (bufferLength / 3));
      let x = 0;

      for (let i = 0; i < bufferLength / 3; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = `rgba(59, 130, 246, ${0.1 + (barHeight/canvas.height)})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
      requestAnimationFrame(draw);
    };

    draw();
  }, []);

  return <canvas ref={canvasRef} className="opacity-80" />;
};

export default Visualizer;
