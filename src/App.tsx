import { useState, useEffect, useRef } from 'react'
import './App.css'
import { useLocationTracker } from './useLocationTracker'

function ShoeIcon() {
  return (
    <svg width="80" height="56" viewBox="0 0 80 56" fill="none">
      {/* Sole */}
      <path d="M7 40 Q5 48 16 48 L62 48 Q72 48 71 40 L71 37 L7 37 Z" fill="#C8C8D4" />
      {/* Midsole */}
      <path d="M7 37 L71 37 L71 40 L7 40 Z" fill="#A8A8BC" />
      {/* Upper body */}
      <path d="M7 40 L7 21 Q7 8 20 7 L42 7 L54 5 Q68 3 71 19 L71 37 L7 37 Z" fill="#FF6A1A" />
      {/* Toe shadow */}
      <path d="M7 21 Q7 8 20 7 L28 7 Q17 11 15 21 Z" fill="#D4520D" />
      {/* Heel collar */}
      <path d="M54 5 Q68 3 71 15 L71 19" stroke="#D4520D" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Swoosh stripe */}
      <path d="M25 30 Q44 19 67 25" stroke="rgba(255,255,255,0.78)" strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* Silver lace area */}
      <path d="M36 7 L36 18 Q36 20 38 20 L50 20 Q52 20 52 18 L54 5 Z" fill="#C8C8D4" opacity="0.85" />
    </svg>
  )
}

type AppState = 'idle' | 'running' | 'finished'

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0)
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatPace(seconds: number, distanceKm: number): string {
  if (distanceKm < 0.01) return "--'--\""
  const paceSeconds = Math.round(seconds / distanceKm)
  const m = Math.floor(paceSeconds / 60)
  const s = paceSeconds % 60
  return `${m}'${String(s).padStart(2, '0')}"`
}

interface StatProps {
  value: string
  unit?: string
  label: string
}

function Stat({ value, unit, label }: StatProps) {
  return (
    <div className="stat">
      <div className="stat-value">
        <span className="stat-number">{value}</span>
        {unit && <span className="stat-unit">{unit}</span>}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-row">
      <span className="summary-label">{label}</span>
      <span className="summary-value">{value}</span>
    </div>
  )
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [finalDistance, setFinalDistance] = useState(0)
  const [finalTime, setFinalTime] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  const { totalDistance, startTracking, stopTracking, permissionDenied } =
    useLocationTracker()

  const distanceKm = totalDistance / 1000

  async function acquireWakeLock() {
    if (!('wakeLock' in navigator)) return
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen')
      wakeLockRef.current.addEventListener('release', () => {
        wakeLockRef.current = null
      })
    } catch {
      // Silently ignore — page may be hidden at request time
    }
  }

  function handleGo() {
    setElapsed(0)
    startTimeRef.current = Date.now()
    startTracking()
    timerRef.current = setInterval(
      () => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)),
      1000,
    )
    acquireWakeLock()
    setAppState('running')
  }

  function handleFinish() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    wakeLockRef.current?.release()
    wakeLockRef.current = null
    setFinalDistance(totalDistance)
    setFinalTime(elapsed)
    stopTracking()
    setAppState('finished')
  }

  function handleClear() {
    wakeLockRef.current?.release()
    wakeLockRef.current = null
    setElapsed(0)
    setFinalDistance(0)
    setFinalTime(0)
    setAppState('idle')
  }

  // Release wake lock on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      wakeLockRef.current?.release()
    }
  }, [])

  // Re-acquire wake lock when returning to app mid-run (iOS releases it on screen-off)
  useEffect(() => {
    function handleVisibilityChange() {
      if (
        document.visibilityState === 'visible' &&
        appState === 'running' &&
        wakeLockRef.current === null
      ) {
        acquireWakeLock()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [appState])

  const finalDistanceKm = finalDistance / 1000

  return (
    <div className="app">
      {appState === 'idle' && (
        <div className="screen">
          <h1 className="title">GO RUN</h1>
          <div className="shoe-icon"><ShoeIcon /></div>
          {permissionDenied && (
            <p className="permission-warning">
              Location denied. Enable in Settings → Privacy → Location Services.
            </p>
          )}
          {'wakeLock' in navigator ? null : (
            <p className="permission-warning">
              Keep the screen on during your run to track GPS distance.
            </p>
          )}
          <button className="circle-btn green" onClick={handleGo}>
            <span className="go-text">GO</span>
          </button>
        </div>
      )}

      {appState === 'running' && (
        <div className="screen">
          <div className="stats-grid">
            <Stat
              value={distanceKm.toFixed(2)}
              unit="km"
              label="DISTANCE"
            />
            <Stat value={formatTime(elapsed)} label="TIME" />
            <Stat
              value={formatPace(elapsed, distanceKm)}
              unit="/km"
              label="PACE"
            />
          </div>
          <button className="circle-btn grey" onClick={handleFinish}>
            <span className="finish-text">FINISH</span>
          </button>
        </div>
      )}

      {appState === 'finished' && (
        <div className="screen">
          <h2 className="complete-title">Run Complete</h2>
          <div className="divider" />
          <div className="summary">
            <SummaryRow
              label="Distance"
              value={`${finalDistanceKm.toFixed(2)} km`}
            />
            <SummaryRow label="Time" value={formatTime(finalTime)} />
            <SummaryRow
              label="Avg Pace"
              value={`${formatPace(finalTime, finalDistanceKm)} /km`}
            />
          </div>
          <button className="clear-btn" onClick={handleClear}>
            CLEAR
          </button>
        </div>
      )}
    </div>
  )
}
