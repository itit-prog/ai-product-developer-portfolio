export function createCanvasLoop(element: HTMLElement, draw: (time: number) => boolean) {
  let frame = 0;
  let visible = false;
  let disposed = false;

  const invalidate = () => {
    if (!disposed && visible && !document.hidden && !frame) frame = requestAnimationFrame(render);
  };
  const render = (time: number) => {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    if (draw(time)) invalidate();
  };
  const stop = () => { cancelAnimationFrame(frame); frame = 0; };
  const visibilityChange = () => { if (document.hidden) stop(); else invalidate(); };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) invalidate(); else stop();
  });
  observer.observe(element);
  document.addEventListener('visibilitychange', visibilityChange);

  return {
    invalidate,
    dispose() {
      disposed = true;
      stop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibilityChange);
    },
  };
}
