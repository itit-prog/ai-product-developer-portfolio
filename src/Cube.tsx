import { useEffect, useRef } from 'react'

const faceAngles = [0, 60, 120, 180, 240, 300]

export default function Cube() {
  const stageRef = useRef<HTMLDivElement>(null)
  const prismRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stage = stageRef.current
    const prism = prismRef.current
    if (!stage || !prism) return

    let frame = 0
    let targetX = 0
    let targetY = 0
    let currentX = 0
    let currentY = 0
    let compact = false
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    const updateSize = () => {
      compact = stage.getBoundingClientRect().width < 480
      stage.dataset.compact = compact ? 'true' : 'false'
    }

    const applyPointer = () => {
      currentX += (targetX - currentX) * 0.08
      currentY += (targetY - currentY) * 0.08
      prism.style.setProperty('--pointer-x', `${currentX.toFixed(2)}deg`)
      prism.style.setProperty('--pointer-y', `${currentY.toFixed(2)}deg`)
      frame = requestAnimationFrame(applyPointer)
    }

    const handlePointer = (event: PointerEvent) => {
      if (reducedMotion.matches || compact) return
      const rect = stage.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width - 0.5
      const y = (event.clientY - rect.top) / rect.height - 0.5
      targetX = Math.max(-5, Math.min(5, x * 10))
      targetY = Math.max(-5, Math.min(5, y * -8))
      stage.dataset.hover = 'true'
    }

    const handleLeave = () => {
      targetX = 0
      targetY = 0
      stage.dataset.hover = 'false'
    }

    const handleMotionPreference = () => {
      stage.dataset.reduced = reducedMotion.matches ? 'true' : 'false'
      if (reducedMotion.matches) {
        targetX = 0
        targetY = 0
      }
    }

    const observer = new ResizeObserver(updateSize)
    observer.observe(stage)
    updateSize()
    handleMotionPreference()
    reducedMotion.addEventListener('change', handleMotionPreference)
    stage.addEventListener('pointermove', handlePointer)
    stage.addEventListener('pointerleave', handleLeave)
    frame = requestAnimationFrame(applyPointer)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      reducedMotion.removeEventListener('change', handleMotionPreference)
      stage.removeEventListener('pointermove', handlePointer)
      stage.removeEventListener('pointerleave', handleLeave)
    }
  }, [])

  return (
    <div ref={stageRef} className="cube-stage prism-stage" data-hover="false">
      <div ref={prismRef} className="prism" aria-hidden="true">
        <div className="prism-shell">
          {faceAngles.map((angle) => (
            <i className="prism-face" key={angle} style={{ '--face-angle': `${angle}deg` } as React.CSSProperties} />
          ))}
          <i className="prism-cap prism-cap-top" />
          <i className="prism-cap prism-cap-bottom" />
          <i className="prism-reflection" />
        </div>
      </div>
      <span className="cube-label">/ DIGITAL ARTIFACT</span>
    </div>
  )
}
