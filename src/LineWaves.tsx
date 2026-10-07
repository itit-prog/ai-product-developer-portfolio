import { useEffect, useRef } from 'react';
import { createCanvasLoop } from './canvasLoop';

export default function LineWaves() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0, height = 0, mouseX = .5, mouseY = .5, targetX = .5, targetY = .5;
    const loop = createCanvasLoop(canvas, time => {
      mouseX += (targetX - mouseX) * .04;
      mouseY += (targetY - mouseY) * .04;
      context.clearRect(0, 0, width, height);
      const phase = motion.matches ? 0 : time;
      for (let line = -22; line < 23; line++) {
        context.beginPath();
        for (let px = -30; px < width + 30; px += 12) {
          const py = height / 2 + line * 25 + Math.sin(px * .012 + phase * .0007 + line * .4) * 30 + Math.sin(px * .004 - phase * .0003) * 42;
          const dx = px - width * mouseX, dy = py - height * mouseY;
          const force = Math.max(0, 1 - Math.hypot(dx, dy) / 420);
          const x = px + dx * force * .16, y = py + dy * force * .1;
          if (px === -30) context.moveTo(x, y); else context.lineTo(x, y);
        }
        context.strokeStyle = `rgba(90,210,255,${.05 + Math.max(0, 1 - Math.abs(line) / 26) * .18})`;
        context.lineWidth = .8;
        context.stroke();
      }
      return !motion.matches;
    });
    const size = () => {
      const dpr = Math.min(devicePixelRatio, matchMedia('(pointer: coarse)').matches ? 1 : 1.5);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      loop.invalidate();
    };
    const move = (event: PointerEvent) => {
      if (motion.matches) return;
      const rect = canvas.getBoundingClientRect();
      targetX = (event.clientX - rect.left) / rect.width;
      targetY = (event.clientY - rect.top) / rect.height;
    };
    const host = canvas.parentElement;
    size();
    window.addEventListener('resize', size);
    host?.addEventListener('pointermove', move);
    motion.addEventListener('change', loop.invalidate);
    return () => {
      loop.dispose();
      window.removeEventListener('resize', size);
      host?.removeEventListener('pointermove', move);
      motion.removeEventListener('change', loop.invalidate);
    };
  }, []);
  return <canvas ref={ref} className="line-waves" />;
}
