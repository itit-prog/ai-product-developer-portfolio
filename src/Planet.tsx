import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './planet.css';

type GlobeData = { dots: number[]; coast: number[] };
type PlanetActions = { zoom: (factor: number) => void; reset: () => void; invalidate: () => void };

export default function Planet() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const actionsRef = useRef<PlanetActions | null>(null);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [manualOnly, setManualOnly] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const mobile = matchMedia('(max-width: 850px), (pointer: coarse)');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    const lowPower = navigator.hardwareConcurrency <= 4 || (device.deviceMemory ?? 8) <= 4 || !!device.connection?.saveData;
    const manual = () => mobile.matches || lowPower || reducedMotion.matches;
    setManualOnly(manual());
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !mobile.matches && !lowPower, powerPreference: 'low-power' });
    } catch {
      setStatus('error');
      return;
    }
    setStatus('ready');
    let quality = 1;
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile.matches || lowPower ? 1 : 1.5));
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, .1, 20);
    camera.position.set(0, .12, 4.15);
    const controls = new OrbitControls(camera, canvas);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.enableDamping = true;
    controls.dampingFactor = .12;
    controls.rotateSpeed = .55;
    controls.autoRotateSpeed = .35;
    controls.minPolarAngle = .2;
    controls.maxPolarAngle = Math.PI - .2;
    controls.touches.ONE = THREE.TOUCH.ROTATE;
    controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
    canvas.style.touchAction = 'pan-y';
    controls.saveState();

    const globe = new THREE.Group();
    globe.rotation.set(.08, -.45, -.08);
    scene.add(globe);
    const sphereGeometry = new THREE.SphereGeometry(1, 40, 28);
    const ocean = new THREE.Mesh(
      sphereGeometry,
      new THREE.MeshBasicMaterial({ color: '#091218' }),
    );
    globe.add(ocean);

    const toVector = (longitude: number, latitude: number, radius = 1.002) => {
      const phi = THREE.MathUtils.degToRad(latitude);
      const theta = THREE.MathUtils.degToRad(longitude);
      return new THREE.Vector3(Math.cos(phi) * Math.sin(theta), Math.sin(phi), Math.cos(phi) * Math.cos(theta)).multiplyScalar(radius);
    };
    const grid: number[] = [];
    for (let latitude = -60; latitude <= 60; latitude += 30) {
      for (let longitude = -180; longitude < 180; longitude += 3) {
        grid.push(...toVector(longitude, latitude).toArray(), ...toVector(longitude + 3, latitude).toArray());
      }
    }
    for (let longitude = -180; longitude < 180; longitude += 30) {
      for (let latitude = -90; latitude < 90; latitude += 3) {
        grid.push(...toVector(longitude, latitude).toArray(), ...toVector(longitude, latitude + 3).toArray());
      }
    }
    const gridGeometry = new THREE.BufferGeometry();
    gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(grid, 3));
    globe.add(new THREE.LineSegments(gridGeometry, new THREE.LineBasicMaterial({ color: '#6de0ff', transparent: true, opacity: .15 })));

    const atmosphere = new THREE.Mesh(sphereGeometry, new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { cyan: { value: new THREE.Color('#6de0ff') }, magenta: { value: new THREE.Color('#ff4ecb') } },
      vertexShader: `varying vec3 vNormal; varying vec3 vView;
        void main() { vec4 positionView = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal); vView = normalize(-positionView.xyz);
          gl_Position = projectionMatrix * positionView; }`,
      fragmentShader: `uniform vec3 cyan; uniform vec3 magenta; varying vec3 vNormal; varying vec3 vView;
        void main() { vec3 normal = normalize(vNormal);
          float rim = pow(1.0 - max(dot(normal, normalize(vView)), 0.0), 3.5);
          vec3 color = mix(cyan, magenta, smoothstep(-0.3, 0.9, normal.x) * 0.5);
          gl_FragColor = vec4(color, rim * 0.28); }`,
    }));
    atmosphere.scale.setScalar(1.012);
    globe.add(atmosphere);

    const abort = new AbortController();
    let disposed = false;
    let visible = false;
    let frame = 0;
    let resumeTimer = 0;
    let previousTime = 0;
    let lastInteraction = 0;
    let dragging = false;
    let updatingControls = false;
    let dirty = true;
    let slowFrames = 0;
    let dotMaterial: THREE.ShaderMaterial | undefined;
    const autoRotate = () => !pausedRef.current && !manual();
    const resizeRenderer = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      const pixelRatio = Math.min(devicePixelRatio, mobile.matches || lowPower ? 1 : 1.5) * quality;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      if (dotMaterial) dotMaterial.uniforms.dotScale.value = pixelRatio;
      dirty = true;
    };
    const render = (time: number) => {
      frame = 0;
      if (!visible || document.hidden || disposed) return;
      const elapsed = previousTime ? time - previousTime : 0;
      controls.autoRotate = autoRotate() && !dragging && time - lastInteraction >= 2200;
      controls.enableDamping = !manual() && !pausedRef.current;
      // Cap autonomous motion at 30 fps and interaction at 60, including high-refresh displays.
      const frameInterval = controls.autoRotate && !dirty ? 1000 / 30 : 1000 / 60;
      if (elapsed > 0 && elapsed < frameInterval - 1) { wake(); return; }
      if (dragging && elapsed > 27 && elapsed < 150) slowFrames++;
      else slowFrames = Math.max(0, slowFrames - 1);
      if (slowFrames >= 24 && quality > .7) {
        quality = Math.max(.7, quality - .15);
        slowFrames = 0;
        resizeRenderer();
      }
      updatingControls = true;
      const changed = controls.update(elapsed ? Math.min(elapsed / 1000, .05) : 0);
      updatingControls = false;
      previousTime = time;
      if (dirty || changed) renderer.render(scene, camera);
      dirty = false;
      if (controls.autoRotate || (changed && controls.enableDamping)) wake();
      else if (!dragging) previousTime = 0;
    };
    const wake = () => { if (!disposed && !frame && visible && !document.hidden) frame = requestAnimationFrame(render); };
    const invalidate = () => { dirty = true; wake(); };
    const resume = () => {
      clearTimeout(resumeTimer);
      if (autoRotate() && visible && !document.hidden) resumeTimer = window.setTimeout(wake, Math.max(0, Math.ceil(2200 - (performance.now() - lastInteraction)) + 1));
    };
    const interact = () => { lastInteraction = performance.now(); invalidate(); resume(); };
    const start = () => { dragging = true; clearTimeout(resumeTimer); lastInteraction = performance.now(); };
    const end = () => { dragging = false; interact(); };
    const change = () => { if (!updatingControls) invalidate(); };
    controls.addEventListener('start', start);
    controls.addEventListener('end', end);
    controls.addEventListener('change', change);

    actionsRef.current = {
      zoom(factor) {
        camera.position.setLength(THREE.MathUtils.clamp(camera.position.length() * factor, 3.65, 5.1));
        interact();
      },
      reset() {
        controls.reset();
        globe.rotation.set(.08, -.45, -.08);
        interact();
      },
      invalidate() { invalidate(); resume(); },
    };
    const keyboard = (event: KeyboardEvent) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') actionsRef.current?.reset();
      else if (event.key === '+' || event.key === '=') actionsRef.current?.zoom(.9);
      else if (event.key === '-') actionsRef.current?.zoom(1.1);
      else {
        globe.rotation.y += event.key === 'ArrowLeft' ? -.12 : event.key === 'ArrowRight' ? .12 : 0;
        globe.rotation.x += event.key === 'ArrowUp' ? -.12 : event.key === 'ArrowDown' ? .12 : 0;
      }
      interact();
    };
    canvas.addEventListener('keydown', keyboard);
    const resize = new ResizeObserver(() => {
      resizeRenderer();
      invalidate();
    });
    resize.observe(host);
    const stop = () => { cancelAnimationFrame(frame); frame = 0; previousTime = 0; clearTimeout(resumeTimer); };
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      previousTime = 0;
      if (visible) { invalidate(); resume(); } else stop();
    });
    intersection.observe(host);
    const visibilityChange = () => { if (document.hidden) stop(); else { invalidate(); resume(); } };
    const modeChange = () => { setManualOnly(manual()); resizeRenderer(); invalidate(); resume(); };
    document.addEventListener('visibilitychange', visibilityChange);
    reducedMotion.addEventListener('change', modeChange);
    mobile.addEventListener('change', modeChange);
    const contextLost = (event: Event) => { event.preventDefault(); stop(); setStatus('error'); };
    canvas.addEventListener('webglcontextlost', contextLost);

    fetch('/earth-land.json', { signal: abort.signal })
      .then(response => { if (!response.ok) throw new Error('Map unavailable'); return response.json() as Promise<GlobeData>; })
      .then(data => {
        if (disposed) return;
        const coastGeometry = new THREE.BufferGeometry();
        coastGeometry.setAttribute('position', new THREE.Float32BufferAttribute(data.coast.map(value => value * 1.005), 3));
        globe.add(new THREE.LineSegments(coastGeometry, new THREE.LineBasicMaterial({ color: '#6de0ff', transparent: true, opacity: .46 })));
        const dotGeometry = new THREE.BufferGeometry();
        dotGeometry.setAttribute('position', new THREE.Float32BufferAttribute(data.dots.map(value => value * 1.008), 3));
        dotMaterial = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          uniforms: { cyan: { value: new THREE.Color('#6de0ff') }, dotScale: { value: renderer.getPixelRatio() } },
          vertexShader: `uniform float dotScale; varying float shade;
            void main() { vec4 p = modelViewMatrix * vec4(position, 1.0);
              shade = 0.6 + 0.4 * max(dot(normalize(normalMatrix * normalize(position)), normalize(-p.xyz)), 0.0);
              gl_PointSize = clamp(7.0 * dotScale / -p.z, 1.2, 4.0 * dotScale);
              gl_Position = projectionMatrix * p; }`,
          fragmentShader: `uniform vec3 cyan; varying float shade;
            void main() { float r = length(gl_PointCoord - 0.5);
              float alpha = 1.0 - smoothstep(0.3, 0.5, r);
              if (alpha < 0.01) discard;
              gl_FragColor = vec4(cyan, alpha * shade * 0.85); }`,
        });
        globe.add(new THREE.Points(dotGeometry, dotMaterial));
        invalidate();
      })
      .catch(error => { if (!disposed && error.name !== 'AbortError') invalidate(); });

    return () => {
      disposed = true;
      abort.abort();
      stop();
      resize.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', visibilityChange);
      reducedMotion.removeEventListener('change', modeChange);
      mobile.removeEventListener('change', modeChange);
      canvas.removeEventListener('keydown', keyboard);
      canvas.removeEventListener('webglcontextlost', contextLost);
      controls.removeEventListener('start', start);
      controls.removeEventListener('end', end);
      controls.removeEventListener('change', change);
      controls.dispose();
      scene.traverse(object => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => material.dispose());
      });
      renderer.dispose();
      actionsRef.current = null;
    };
  }, [attempt]);

  return <div className="planet" data-status={status}>
    <div className="planet-stage" ref={hostRef}>
      <canvas ref={canvasRef} tabIndex={0} role="img" aria-label="Интерактивная Земля. Вращение мышью или стрелками, масштаб плюс и минус." onClick={event => event.stopPropagation()} />
      {status === 'loading' && <span className="planet-loading" role="status" aria-label="Загрузка планеты"><LoaderCircle size={20} /></span>}
      {status === 'error' && <div className="planet-error" role="alert"><span>Интерактивная планета временно недоступна</span><button onClick={() => setAttempt(value => value + 1)} title="Повторить загрузку" aria-label="Повторить загрузку"><RotateCcw size={18} /></button></div>}
    </div>
    <div className="planet-controls" role="group" aria-label="Управление планетой" onClick={event => event.stopPropagation()}>
      <button disabled={status !== 'ready'} onClick={() => actionsRef.current?.zoom(.9)} aria-label="Приблизить" title="Приблизить"><Plus size={16} /></button>
      <button disabled={status !== 'ready'} onClick={() => actionsRef.current?.zoom(1.1)} aria-label="Отдалить" title="Отдалить"><Minus size={16} /></button>
      {!manualOnly && <button disabled={status !== 'ready'} onClick={() => { pausedRef.current = !paused; setPaused(!paused); actionsRef.current?.invalidate(); }} aria-label={paused ? 'Продолжить вращение' : 'Приостановить вращение'} title={paused ? 'Продолжить вращение' : 'Приостановить вращение'} aria-pressed={paused}>{paused ? <Play size={15} /> : <Pause size={15} />}</button>}
      <button disabled={status !== 'ready'} onClick={() => actionsRef.current?.reset()} aria-label="Исходное положение" title="Исходное положение"><RotateCcw size={15} /></button>
    </div>
  </div>;
}
