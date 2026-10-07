import { useEffect, useRef } from 'react';

const FRAGMENT_SOURCE = [
  '#version 300 es',
  'precision highp float;',
  'out vec4 O;',
  'uniform float time;',
  'uniform vec2 resolution;',
  '#define FC gl_FragCoord.xy',
  '#define R resolution',
  '#define T time',
  '#define MN min(R.x,R.y)',
  'float pattern(vec2 uv) {',
  '  float d = .0;',
  '  for (float i = .0; i < 3.; i++) {',
  '    uv.x += sin(T * (1. + i) + uv.y * 1.5) * .2;',
  '    d += .005 / abs(uv.x);',
  '  }',
  '  return d;',
  '}',
  'vec3 scene(vec2 uv) {',
  '  vec3 col = vec3(0);',
  '  uv = vec2(atan(uv.x, uv.y) * 2. / 6.28318, -log(length(uv)) + T);',
  '  for (float i = .0; i < 3.; i++) {',
  '    int k = int(mod(i, 3.));',
  '    col[k] += pattern(uv + i * 6. / MN);',
  '  }',
  '  return col;',
  '}',
  'void main() {',
  '  vec2 uv = (FC - .5 * R) / MN;',
  '  vec3 col = vec3(0);',
  '  float s = 12., e = 9e-4;',
  '  col += e / (sin(uv.x * s) * cos(uv.y * s));',
  '  uv.y += R.x > R.y ? .5 : .5 * (R.y / R.x);',
  '  col += scene(uv);',
  '  O = vec4(col, 1.);',
  '}',
].join('\n');

const VERTEX_SOURCE = [
  '#version 300 es',
  'precision highp float;',
  'in vec2 position;',
  'void main() { gl_Position = vec4(position, 0.0, 1.0); }',
].join('\n');

function compile(gl: WebGL2RenderingContext, source: string, type: number) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Unable to create shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'Shader compilation failed';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext) {
  const vertex = compile(gl, VERTEX_SOURCE, gl.VERTEX_SHADER);
  const fragment = compile(gl, FRAGMENT_SOURCE, gl.FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!program) throw new Error('Unable to create shader program');
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || 'Shader link failed';
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

export default function NoirHeroShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const coarsePointer = matchMedia('(pointer: coarse)');
    const lowPower = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4;
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, powerPreference: 'low-power' });
    if (!gl) return;
    let program: WebGLProgram;
    try { program = createProgram(gl); } catch (error) { console.warn('NOIR hero shader unavailable', error); return; }
    const buffer = gl.createBuffer();
    if (!buffer) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.useProgram(program);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const timeLocation = gl.getUniformLocation(program, 'time');
    const resolutionLocation = gl.getUniformLocation(program, 'resolution');
    gl.clearColor(0.08, 0.075, 0.065, 1);
    let width = 1;
    let height = 1;
    let visible = false;
    let frame = 0;
    let disposed = false;
    let lastTime = 0;
    const animate = !(reducedMotion.matches || coarsePointer.matches || lowPower);
    const draw = (time: number) => {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      if (resolutionLocation) gl.uniform2f(resolutionLocation, width, height);
      if (timeLocation) gl.uniform1f(timeLocation, time * 0.001);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, animate ? 1.5 : 1);
      width = Math.max(1, Math.floor(rect.width * dpr));
      height = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
        draw(0);
      }
    };
    const loop = (time: number) => {
      frame = 0;
      if (disposed || !visible || document.hidden) return;
      if (time - lastTime < 33) { frame = requestAnimationFrame(loop); return; }
      lastTime = time;
      draw(time);
      frame = requestAnimationFrame(loop);
    };
    const start = () => { if (!animate || frame || !visible || document.hidden) return; frame = requestAnimationFrame(loop); };
    const stop = () => { if (frame) cancelAnimationFrame(frame); frame = 0; };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) { draw(0); start(); } else stop(); }, { threshold: 0.01 });
    observer.observe(canvas);
    const visibility = () => document.hidden ? stop() : start();
    const motionChange = () => reducedMotion.matches ? stop() : start();
    const pointerChange = () => coarsePointer.matches ? stop() : start();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    reducedMotion.addEventListener('change', motionChange);
    coarsePointer.addEventListener('change', pointerChange);
    resize();
    return () => {
      disposed = true;
      stop();
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', visibility);
      reducedMotion.removeEventListener('change', motionChange);
      coarsePointer.removeEventListener('change', pointerChange);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);
  return <canvas ref={canvasRef} className="noir-shader" aria-label="Абстрактная анимация NOIR" />;
}

