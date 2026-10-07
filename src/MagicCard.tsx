import { useEffect, useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';

type Props = {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  particleCount?: number;
};

export default function MagicCard({ children, className = '', glowColor = '109,224,255', particleCount = 12 }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLElement[]>([]);
  const timeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const clearParticles = () => {
      timeoutsRef.current.forEach(window.clearTimeout);
      timeoutsRef.current = [];
      particlesRef.current.forEach((particle) => {
        gsap.killTweensOf(particle);
        gsap.to(particle, { scale: 0, opacity: 0, duration: 0.18, onComplete: () => particle.remove() });
      });
      particlesRef.current = [];
    };

    const spawnParticles = () => {
      clearParticles();
      const rect = card.getBoundingClientRect();
      for (let index = 0; index < particleCount; index += 1) {
        const particle = document.createElement('span');
        particle.className = 'magic-particle';
        particle.style.left = `${Math.random() * rect.width}px`;
        particle.style.top = `${Math.random() * rect.height}px`;
        particle.style.setProperty('--particle-color', glowColor);
        card.appendChild(particle);
        particlesRef.current.push(particle);
        const delay = index * 45;
        const timeout = window.setTimeout(() => {
          gsap.fromTo(particle, { scale: 0, opacity: 0 }, { scale: 1, opacity: 0.9, duration: 0.25, ease: 'back.out(1.8)' });
          gsap.to(particle, { x: (Math.random() - 0.5) * 80, y: (Math.random() - 0.5) * 80, duration: 1.8 + Math.random() * 1.5, repeat: -1, yoyo: true, ease: 'sine.inOut' });
          gsap.to(particle, { opacity: 0.22, duration: 1.2, repeat: -1, yoyo: true, ease: 'sine.inOut' });
        }, delay);
        timeoutsRef.current.push(timeout);
      }
    };

    const onEnter = () => {
      card.classList.add('is-magic-active');
      spawnParticles();
    };
    const onLeave = () => {
      card.classList.remove('is-magic-active');
      clearParticles();
      gsap.to(card, { rotateX: 0, rotateY: 0, x: 0, y: 0, duration: 0.4, ease: 'power3.out' });
    };
    const onMove = (event: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      card.style.setProperty('--glow-x', `${(x / rect.width) * 100}%`);
      card.style.setProperty('--glow-y', `${(y / rect.height) * 100}%`);
      gsap.to(card, { rotateX: ((y - rect.height / 2) / (rect.height / 2)) * -4, rotateY: ((x - rect.width / 2) / (rect.width / 2)) * 4, x: (x - rect.width / 2) * 0.018, y: (y - rect.height / 2) * 0.018, transformPerspective: 900, duration: 0.16, ease: 'power2.out' });
    };
    const onClick = (event: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height) * 1.8;
      ripple.className = 'magic-ripple';
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
      ripple.style.setProperty('--particle-color', glowColor);
      card.appendChild(ripple);
      gsap.fromTo(ripple, { scale: 0, opacity: 0.9 }, { scale: 1, opacity: 0, duration: 0.72, ease: 'power2.out', onComplete: () => ripple.remove() });
    };

    card.addEventListener('mouseenter', onEnter);
    card.addEventListener('mouseleave', onLeave);
    card.addEventListener('mousemove', onMove);
    card.addEventListener('click', onClick);
    return () => { card.removeEventListener('mouseenter', onEnter); card.removeEventListener('mouseleave', onLeave); card.removeEventListener('mousemove', onMove); card.removeEventListener('click', onClick); clearParticles(); gsap.killTweensOf(card); };
  }, [glowColor, particleCount]);

  return <div ref={cardRef} className={`magic-card ${className}`}>{children}</div>;
}
