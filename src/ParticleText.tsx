import { useEffect, useRef } from 'react';
import { createCanvasLoop } from './canvasLoop';
import './ParticleText.css';

type ParticleTextProps = {
  text?: string;
  particleSize?: number;
  density?: number;
  color?: string;
  highlightColor?: string;
  scatter?: number;
  gatherDuration?: number;
  stagger?: number;
  pointerRepel?: number;
  repelRadius?: number;
  idleDrift?: number;
  fontSize?: string | number;
  fontWeight?: number;
  fontFamily?: string;
  align?: 'left' | 'center';
  glow?: boolean;
  className?: string;
};

type Particle = {
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  size: number;
  color: string;
  seed: number;
  depth: number;
  delay: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);

function parseHex(hex: string) {
  const clean = hex.replace('#', '').trim();
  if (!/^[0-9a-f]{6}$/i.test(clean)) return null;
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
}

function mixColor(from: number[], to: number[], amount: number) {
  return `rgb(${Math.round(from[0] + (to[0] - from[0]) * amount)}, ${Math.round(from[1] + (to[1] - from[1]) * amount)}, ${Math.round(from[2] + (to[2] - from[2]) * amount)})`;
}

export default function ParticleText({
  text = 'React Bits',
  particleSize = 2,
  density = 4,
  color = '#ffffff',
  highlightColor = '#6de0ff',
  scatter = 180,
  gatherDuration = 1600,
  stagger = 420,
  pointerRepel = 40,
  repelRadius = 120,
  idleDrift = 0.7,
  fontSize = 'clamp(3rem, 12vw, 8rem)',
  fontWeight = 800,
  fontFamily = "'Space Grotesk', sans-serif",
  align = 'center',
  glow = true,
  className = ''
}: ParticleTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let resizeFrame = 0;
    let buildId = 0;
    let gatherStart = 0;
    let gathering = false;
    let settled = false;
    let ready = false;
    let settleTimer = 0;
    let reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let particles: Particle[] = [];
    const pointer = { x: 0, y: 0, smoothX: 0, smoothY: 0, active: false };
    const baseColor = parseHex(color) ?? [255, 255, 255];
    const accentColor = parseHex(highlightColor) ?? baseColor;

    const resolveSize = () => {
      if (typeof fontSize === 'number') return fontSize;
      const probe = document.createElement('span');
      probe.textContent = 'M';
      probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;font:${fontWeight} ${fontSize} ${fontFamily === 'inherit' ? getComputedStyle(container).fontFamily : fontFamily}`;
      container.appendChild(probe);
      const size = parseFloat(getComputedStyle(probe).fontSize) || 48;
      probe.remove();
      return size;
    };

    const buildParticles = async () => {
      const currentBuild = ++buildId;
      window.clearTimeout(settleTimer);
      ready = false;
      container.classList.remove('is-ready', 'is-interacting');
      settled = reducedMotion;
      container.classList.toggle('is-settled', settled);
      container.classList.remove('is-interacting');
      const rect = container.getBoundingClientRect();
      width = Math.floor(rect.width);
      height = Math.floor(rect.height);
      if (!width || !height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const family = fontFamily === 'inherit' ? getComputedStyle(container).fontFamily : fontFamily;
      const initialSize = resolveSize();
      const initialFont = `${fontWeight} ${initialSize}px ${family}`;
      try { await document.fonts?.load(initialFont); } catch { /* fallback font is valid */ }
      if (currentBuild !== buildId) return;

      const offscreen = document.createElement('canvas');
      const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
      if (!offCtx) return;
      offCtx.font = initialFont;
      const measured = offCtx.measureText(text);
      const size = Math.max(18, initialSize * Math.min(1, width * 0.92 / Math.max(1, measured.width)));
      offCtx.font = `${fontWeight} ${size}px ${family}`;
      const finalMetrics = offCtx.measureText(text);
      const padding = Math.ceil(size * 0.16);
      offscreen.width = Math.ceil(finalMetrics.width + padding * 2);
      offscreen.height = Math.ceil(size * 1.28 + padding * 2);
      offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
      offCtx.font = `${fontWeight} ${size}px ${family}`;
      offCtx.textBaseline = 'top';
      offCtx.fillStyle = '#fff';
      offCtx.fillText(text, padding, padding);

      const pixels = offCtx.getImageData(0, 0, offscreen.width, offscreen.height).data;
      const targets: Array<{ x: number; y: number; alpha: number }> = [];
      const step = Math.max(2, Math.floor(density));
      for (let y = 0; y < offscreen.height; y += step) {
        for (let x = 0; x < offscreen.width; x += step) {
          const alpha = pixels[(y * offscreen.width + x) * 4 + 3];
          if (alpha > 40) targets.push({ x: (align === 'left' ? -padding : width / 2 - offscreen.width / 2) + x, y: height / 2 - offscreen.height / 2 + y, alpha: alpha / 255 });
        }
      }

      const maxParticles = Math.min(2600, Math.max(900, Math.floor((width * height) / 90)));
      const stride = Math.max(1, Math.ceil(targets.length / maxParticles));
      particles = targets.filter((_, index) => index % stride === 0).map((target, index) => {
        const seed = ((index * 9301 + 49297) % 233280) / 233280;
        const depth = 0.45 + (((index * 233 + 97) % 1000) / 1000) * 0.9;
        const angle = seed * Math.PI * 2;
        const distance = (reducedMotion ? 0 : scatter) * (0.35 + depth * 0.75);
        const startX = target.x + Math.cos(angle) * distance + (seed - 0.5) * scatter * 0.45;
        const startY = target.y + Math.sin(angle) * distance + (depth - 0.9) * scatter * 0.45;
        return { x: reducedMotion ? target.x : startX, y: reducedMotion ? target.y : startY, startX, startY, targetX: target.x, targetY: target.y, size: Math.max(0.7, particleSize * (0.72 + target.alpha * 0.5)), color: mixColor(baseColor, accentColor, clamp(target.x / Math.max(1, width) + (seed - 0.5) * 0.35, 0, 1)), seed, depth, delay: reducedMotion ? 0 : seed * stagger };
      });
      ready = true;
      container.classList.add('is-ready');
      pointer.x = width / 2;
      pointer.y = height / 2;
      pointer.smoothX = pointer.x;
      pointer.smoothY = pointer.y;
      gatherStart = performance.now();
      gathering = !reducedMotion;
      settled = reducedMotion;
      container.classList.toggle('is-settled', settled);
      if (!reducedMotion) {
        settleTimer = window.setTimeout(() => {
          if (currentBuild !== buildId || pointer.active) return;
          gathering = false;
          settled = true;
          container.classList.add('is-settled');
          loop.invalidate();
        }, gatherDuration + stagger + 120);
      }
      loop.invalidate();
    };

    const render = (now: number) => {
      ctx.clearRect(0, 0, width, height);
      ctx.shadowBlur = glow && !reducedMotion ? particleSize * 3 : 0;
      ctx.shadowColor = highlightColor;
      pointer.smoothX += (pointer.x - pointer.smoothX) * 0.16;
      pointer.smoothY += (pointer.y - pointer.smoothY) * 0.16;
      let complete = true;
      particles.forEach((particle) => {
        let x = particle.targetX;
        let y = particle.targetY;
        let progress = 1;
        if (gathering) {
          progress = clamp((now - gatherStart - particle.delay) / Math.max(1, gatherDuration), 0, 1);
          const eased = easeOutCubic(progress);
          x = particle.startX + (particle.targetX - particle.startX) * eased;
          y = particle.startY + (particle.targetY - particle.startY) * eased;
          if (progress < 1) complete = false;
        } else if (!reducedMotion && idleDrift > 0) {
          x += Math.sin(now * 0.0009 + particle.seed * 10) * idleDrift * particle.depth;
          y += Math.cos(now * 0.0007 + particle.depth * 10) * idleDrift * particle.depth;
        }
        if (pointer.active && !reducedMotion) {
          const dx = x - pointer.smoothX;
          const dy = y - pointer.smoothY;
          const distance = Math.hypot(dx, dy);
          if (distance > 0 && distance < repelRadius) {
            const force = Math.pow(1 - distance / repelRadius, 2) * pointerRepel;
            x += (dx / distance) * force;
            y += (dy / distance) * force;
          }
        }
        ctx.globalAlpha = clamp(0.3 + progress * 0.7, 0, 1);
        ctx.fillStyle = particle.color;
        ctx.fillRect(x - particle.size / 2, y - particle.size / 2, particle.size, particle.size);
      });
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      if (gathering && complete) {
        gathering = false;
        settled = true;
        container.classList.add('is-settled');
      }
      return !reducedMotion && (!settled || pointer.active);
    };

    const loop = createCanvasLoop(container, render);
    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
      settled = false;
      container.classList.remove('is-settled');
      if (ready) container.classList.add('is-interacting');
      loop.invalidate();
    };
    const onLeave = () => {
      pointer.active = false;
      if (!gathering && !reducedMotion) {
        settled = true;
        container.classList.remove('is-interacting');
        container.classList.add('is-settled');
      }
      loop.invalidate();
    };
    const onResize = () => { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(() => { void buildParticles(); }); };
    const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const onMotionChange = (event: MediaQueryListEvent) => { reducedMotion = event.matches; void buildParticles(); };

    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    window.addEventListener('resize', onResize);
    motionQuery?.addEventListener('change', onMotionChange);
    void buildParticles();
    return () => { buildId += 1; window.clearTimeout(settleTimer); loop.dispose(); cancelAnimationFrame(resizeFrame); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerleave', onLeave); window.removeEventListener('resize', onResize); motionQuery?.removeEventListener('change', onMotionChange); };
  }, [text, particleSize, density, color, highlightColor, scatter, gatherDuration, stagger, pointerRepel, repelRadius, idleDrift, fontSize, fontWeight, fontFamily, align, glow]);

  return <div ref={containerRef} className={`particle-text ${className}`} aria-label={text}><canvas ref={canvasRef} aria-hidden="true"/><span className="particle-text__sr">{text}</span></div>;
}
