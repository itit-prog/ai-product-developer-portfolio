import { useEffect, useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';

type Props = { href: string; children: ReactNode };

export default function ProjectCard({ href, children }: Props) {
  const cardRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const media = gsap.matchMedia();

    media.add('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
      const surface = card.querySelector<HTMLElement>('.project-card-surface')!;
      const image = card.querySelector<HTMLImageElement>('.screenshot-art img')!;
      const info = card.querySelector<HTMLElement>('.project-info')!;
      const targets = [surface, image, info];
      const options = { duration: 0.65, ease: 'power3.out' };
      const lift = gsap.quickTo(surface, 'y', options);
      const tiltX = gsap.quickTo(surface, 'rotationX', options);
      const tiltY = gsap.quickTo(surface, 'rotationY', options);
      const imageX = gsap.quickTo(image, 'x', options);
      const imageY = gsap.quickTo(image, 'y', options);
      const zoomX = gsap.quickTo(image, 'scaleX', options);
      const zoomY = gsap.quickTo(image, 'scaleY', options);
      const infoY = gsap.quickTo(info, 'y', options);
      gsap.set(surface, { transformPerspective: 1400 });
      let frame = 0;
      let bounds: DOMRect | null = null;
      let pointerX = 0;
      let pointerY = 0;

      const renderPointer = () => {
        frame = 0;
        if (!bounds) return;
        const x = gsap.utils.clamp(-1, 1, (pointerX - bounds.left) / bounds.width * 2 - 1);
        const y = gsap.utils.clamp(-1, 1, (pointerY - bounds.top) / bounds.height * 2 - 1);
        tiltX(-y * 1.1);
        tiltY(x * 1.1);
        imageX(-x * 4);
        imageY(-y * 3);
      };
      const move = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse') return;
        if (!bounds) { enter(event); return; }
        pointerX = event.clientX;
        pointerY = event.clientY;
        if (!frame) frame = requestAnimationFrame(renderPointer);
      };
      const enter = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse') return;
        // Measure the stationary link, not its tilted visual surface.
        bounds = card.getBoundingClientRect();
        card.dataset.active = 'true';
        lift(-5);
        zoomX(1.05);
        zoomY(1.05);
        infoY(-3);
        move(event);
      };
      const reset = () => {
        if (!bounds) return;
        cancelAnimationFrame(frame);
        frame = 0;
        bounds = null;
        delete card.dataset.active;
        lift(0);
        tiltX(0);
        tiltY(0);
        imageX(0);
        imageY(0);
        zoomX(1);
        zoomY(1);
        infoY(0);
      };
      card.addEventListener('pointerenter', enter);
      card.addEventListener('pointermove', move);
      card.addEventListener('pointerleave', reset);
      card.addEventListener('pointercancel', reset);
      window.addEventListener('blur', reset);
      window.addEventListener('scroll', reset, { passive: true });
      window.addEventListener('resize', reset);
      return () => {
        cancelAnimationFrame(frame);
        delete card.dataset.active;
        card.removeEventListener('pointerenter', enter);
        card.removeEventListener('pointermove', move);
        card.removeEventListener('pointerleave', reset);
        card.removeEventListener('pointercancel', reset);
        window.removeEventListener('blur', reset);
        window.removeEventListener('scroll', reset);
        window.removeEventListener('resize', reset);
        gsap.killTweensOf(targets);
        gsap.set(targets, { clearProps: 'transform' });
      };
    });
    return () => media.revert();
  }, []);

  return <a ref={cardRef} className="project-card" href={href}>
    <div className="project-card-surface">{children}</div>
  </a>;
}
