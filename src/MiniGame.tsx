import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RotateCcw, Sparkles, Zap } from 'lucide-react'

const GRID_SIZE = 25
const ROUND_LENGTH = 30

function nextSignal(previous: number) {
  let next = Math.floor(Math.random() * GRID_SIZE)
  while (next === previous) next = Math.floor(Math.random() * GRID_SIZE)
  return next
}

export default function MiniGame() {
  const [running, setRunning] = useState(false)
  const [signal, setSignal] = useState(12)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [combo, setCombo] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [timeLeft, setTimeLeft] = useState(ROUND_LENGTH)
  const [missedCell, setMissedCell] = useState<number | null>(null)
  const [missVersion, setMissVersion] = useState(0)
  const timerRef = useRef<number | null>(null)
  const missTimerRef = useRef<number | null>(null)

  const clearMissFeedback = useCallback(() => {
    if (missTimerRef.current !== null) window.clearTimeout(missTimerRef.current)
    missTimerRef.current = null
    setMissedCell(null)
  }, [])

  const stopGame = useCallback(() => {
    setRunning(false)
    setBest((current) => Math.max(current, score))
    if (timerRef.current !== null) window.clearInterval(timerRef.current)
    timerRef.current = null
    clearMissFeedback()
  }, [clearMissFeedback, score])

  const startGame = useCallback(() => {
    setRunning(true)
    setScore(0)
    setCombo(0)
    setFeedback('')
    setTimeLeft(ROUND_LENGTH)
    setSignal(Math.floor(Math.random() * GRID_SIZE))
    clearMissFeedback()
  }, [clearMissFeedback])

  useEffect(() => () => {
    if (missTimerRef.current !== null) window.clearTimeout(missTimerRef.current)
  }, [])

  useEffect(() => {
    if (!running) return
    timerRef.current = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          setRunning(false)
          return 0
        }
        return current - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [running])

  useEffect(() => {
    if (!running) return
    const speed = Math.max(260, 900 - score * 38)
    const signalTimer = window.setInterval(() => {
      setSignal((current) => nextSignal(current))
    }, speed)
    return () => window.clearInterval(signalTimer)
  }, [running, score])

  useEffect(() => {
    if (timeLeft === 0) setBest((current) => Math.max(current, score))
  }, [timeLeft, score])

  const cells = useMemo(() => Array.from({ length: GRID_SIZE }, (_, index) => index), [])

  const hitSignal = (cell: number) => {
    if (!running) return
    if (cell !== signal) {
      setScore(0)
      setCombo(0)
      setFeedback('ПРОМАХ · СЕРИЯ СБРОШЕНА')
      if (missTimerRef.current !== null) window.clearTimeout(missTimerRef.current)
      setMissVersion((current) => current + 1)
      setMissedCell(cell)
      missTimerRef.current = window.setTimeout(() => {
        setMissedCell(null)
        missTimerRef.current = null
      }, 560)
      setSignal((current) => nextSignal(current))
      return
    }
    setCombo((current) => current + 1)
    setScore((current) => current + 1 + (combo >= 4 ? 1 : 0))
    setFeedback(combo >= 4 ? `СЕРИЯ ×${combo + 1}` : 'ТОЧНО')
    setSignal((current) => nextSignal(current))
  }

  const status = running ? 'СИГНАЛ АКТИВЕН' : timeLeft === 0 ? 'РАУНД ЗАВЕРШЁН' : 'ГОТОВ К ЗАПУСКУ'

  return (
    <section className="signal-game" id="game">
      <div className="signal-game-inner">
        <div className="signal-game-intro">
          <span className="section-kicker">03 / ЛАБОРАТОРИЯ</span>
          <h2>Поймай сигнал<br /><em>собери серию</em></h2>
          <p>Небольшой интерактивный эксперимент о скорости реакции и точности интерфейса.</p>
          <div className="signal-game-actions">
            <button className="button primary" type="button" onClick={startGame}>
              {running ? 'Начать заново' : 'Запустить игру'} <Zap size={16} />
            </button>
            <button className="game-reset" type="button" onClick={stopGame} disabled={!running} aria-label="Остановить игру" title="Остановить игру">
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        <div className="signal-console" aria-label="Мини-игра: поймай сигнал">
          <div className="signal-console-top">
            <div className="signal-status" aria-live="polite"><span className={running ? 'signal-pulse is-active' : 'signal-pulse'} />{feedback || status}</div>
            <span className="signal-round">00:{String(timeLeft).padStart(2, '0')}</span>
          </div>
          <div className={`signal-grid${missedCell !== null ? ` is-miss-${missVersion % 2 ? 'a' : 'b'}` : ''}`} role="grid" aria-label="Сетка для поиска сигнала">
            {cells.map((cell) => (
              <button
                className={`signal-cell${cell === signal && running ? ' is-target' : ''}${cell === missedCell ? ` is-miss-${missVersion % 2 ? 'a' : 'b'}` : ''}`}
                key={cell}
                type="button"
                role="gridcell"
                aria-label={cell === missedCell ? `Ячейка ${cell + 1}, промах` : cell === signal && running ? 'Активный сигнал' : `Ячейка ${cell + 1}`}
                onClick={() => hitSignal(cell)}
              >
                <span />
              </button>
            ))}
          </div>
          <div className="signal-console-bottom">
            <span><Sparkles size={14} /> Точность интерфейса</span>
            <strong>{String(score).padStart(2, '0')} <small>ОЧКОВ</small></strong>
            <strong>{String(combo).padStart(2, '0')} <small>СЕРИЯ</small></strong>
            <strong>{String(best).padStart(2, '0')} <small>РЕКОРД</small></strong>
          </div>
        </div>
      </div>
    </section>
  )
}
