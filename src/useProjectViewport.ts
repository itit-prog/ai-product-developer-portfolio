import { useEffect } from 'react';

export default function useProjectViewport(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const section = document.getElementById('projects');
    if (!section) return;
    const media = matchMedia('(min-width: 1100px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    let aligned = Math.abs(section.getBoundingClientRect().top) < 2;
    let frame = 0;
    let timeout = 0;
    const nativeScrollEnd = 'onscrollend' in window;

    const settle = () => {
      if (!media.matches || aligned) return;
      // A single gentle alignment near the section; never capture wheel input.
      const top = section.getBoundingClientRect().top;
      if (Math.abs(top) > Math.min(140, innerHeight * .18)) return;
      aligned = true;
      if (Math.abs(top) > 1) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const scroll = () => {
      if (!media.matches) return;
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        if (Math.abs(section.getBoundingClientRect().top) > innerHeight * .6) aligned = false;
      });
      if (!nativeScrollEnd) {
        clearTimeout(timeout);
        timeout = window.setTimeout(settle, 180);
      }
    };
    const mediaChange = () => {
      aligned = Math.abs(section.getBoundingClientRect().top) < 2;
      clearTimeout(timeout);
    };
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('scrollend', settle);
    media.addEventListener('change', mediaChange);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('scrollend', settle);
      media.removeEventListener('change', mediaChange);
    };
  }, [enabled]);
}
