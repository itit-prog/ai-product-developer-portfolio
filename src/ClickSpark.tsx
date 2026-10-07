import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { createCanvasLoop } from './canvasLoop';

type Props = { sparkColor?: string; sparkSize?: number; sparkRadius?: number; sparkCount?: number; duration?: number; easing?: string; extraScale?: number; children: ReactNode };
type Spark = { x: number; y: number; angle: number; startTime: number };

export default function ClickSpark({ sparkColor = '#6de0ff', sparkSize = 10, sparkRadius = 18, sparkCount = 8, duration = 460, easing = 'ease-out', extraScale = 1, children }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<Spark[]>([]);
  const invalidateRef = useRef<() => void>(() => {});
  const ease = useCallback((value: number) => easing === 'linear' ? value : easing === 'ease-in' ? value * value : easing === 'ease-in-out' ? (value < 0.5 ? 2 * value * value : -1 + (4 - 2 * value) * value) : value * (2 - value), [easing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = (timestamp: number) => {
      context.clearRect(0, 0, width, height);
      sparksRef.current = sparksRef.current.filter((spark) => {
        const progress = (timestamp - spark.startTime) / duration;
        if (progress >= 1) return false;
        const eased = ease(progress);
        const distance = eased * sparkRadius * extraScale;
        const length = sparkSize * (1 - eased);
        const x1 = spark.x + distance * Math.cos(spark.angle);
        const y1 = spark.y + distance * Math.sin(spark.angle);
        const x2 = spark.x + (distance + length) * Math.cos(spark.angle);
        const y2 = spark.y + (distance + length) * Math.sin(spark.angle);
        context.strokeStyle = sparkColor;
        context.lineWidth = 1.8;
        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.stroke();
        return true;
      });
      return sparksRef.current.length > 0;
    };
    resize();
    const loop = createCanvasLoop(canvas, draw);
    invalidateRef.current = loop.invalidate;
    window.addEventListener('resize', resize);
    return () => { loop.dispose(); invalidateRef.current = () => {}; window.removeEventListener('resize', resize); };
  }, [duration, ease, extraScale, sparkColor, sparkRadius, sparkSize]);

  const handleClick = (event: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const now = performance.now();
    sparksRef.current.push(...Array.from({ length: sparkCount }, (_, index) => ({ x: event.clientX - rect.left, y: event.clientY - rect.top, angle: (2 * Math.PI * index) / sparkCount, startTime: now })));
    invalidateRef.current();
  };

  return <div className="click-spark" onClick={handleClick}><canvas ref={canvasRef} aria-hidden="true" />{children}</div>;
}
