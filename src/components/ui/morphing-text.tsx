import { useEffect, useRef } from 'react';
import './morphing-text.css';

const morphDuration = 1.5;
const cooldownDuration = 0.5;

type MorphingTextProps = {
  className?: string;
  texts: string[];
};

export function MorphingText({ texts, className = '' }: MorphingTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLSpanElement>(null);
  const nextRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const current = currentRef.current;
    const next = nextRef.current;
    if (!container || !current || !next || texts.length === 0) return;

    let index = 0;
    let elapsed = 0;
    let cooldown = 0;
    let lastTime = 0;
    let frame = 0;
    let inView = false;
    let disposed = false;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const setStaticText = () => {
      current.textContent = texts[index % texts.length];
      current.style.filter = 'none';
      current.style.opacity = '1';
      next.style.filter = 'none';
      next.style.opacity = '0';
    };

    const setMorph = (fraction: number) => {
      const progress = Math.min(Math.max(fraction, 0), 1);
      const inverse = 1 - progress;
      const blur = (amount: number) => `${Math.max(0, Math.min(100, 8 / Math.max(amount, 0.01) - 8))}px`;

      current.textContent = texts[index % texts.length];
      next.textContent = texts[(index + 1) % texts.length];
      current.style.filter = `blur(${blur(inverse)})`;
      current.style.opacity = `${Math.pow(inverse, 0.4)}`;
      next.style.filter = `blur(${blur(progress)})`;
      next.style.opacity = `${Math.pow(progress, 0.4)}`;
    };

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const animate = (time: number) => {
      if (disposed || !inView || document.hidden || motionQuery.matches || texts.length < 2) {
        stop();
        return;
      }

      const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
      lastTime = time;
      if (cooldown > 0) {
        cooldown -= delta;
        setStaticText();
      } else {
        elapsed += delta;
        const progress = elapsed / morphDuration;
        setMorph(progress);
        if (progress >= 1) {
          index = (index + 1) % texts.length;
          elapsed = 0;
          cooldown = cooldownDuration;
        }
      }
      frame = requestAnimationFrame(animate);
    };

    const start = () => {
      if (frame || !inView || document.hidden || motionQuery.matches || texts.length < 2) return;
      lastTime = 0;
      frame = requestAnimationFrame(animate);
    };

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) start();
      else stop();
    }, { threshold: 0.1 });

    const onVisibilityChange = () => document.hidden ? stop() : start();
    const onMotionChange = () => {
      if (motionQuery.matches) {
        stop();
        setStaticText();
      } else {
        setMorph(elapsed / morphDuration);
        start();
      }
    };

    if (motionQuery.matches || texts.length === 1) setStaticText();
    else setMorph(0);

    observer.observe(container);
    document.addEventListener('visibilitychange', onVisibilityChange);
    motionQuery.addEventListener('change', onMotionChange);

    return () => {
      disposed = true;
      stop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      motionQuery.removeEventListener('change', onMotionChange);
    };
  }, [texts]);

  return (
    <div ref={containerRef} className={`morphing-text ${className}`} aria-label={texts.join('. ')}>
      <span ref={currentRef} aria-hidden="true">{texts[0]}</span>
      <span ref={nextRef} aria-hidden="true" />
      <svg className="morphing-text__filters" aria-hidden="true" focusable="false">
        <defs>
          <filter id="morphing-text-threshold" colorInterpolationFilters="sRGB">
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 255 -140"
            />
          </filter>
        </defs>
      </svg>
    </div>
  );
}
