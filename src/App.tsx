import { useState, useEffect, useRef } from 'react'
import './App.css'
import { useLocationTracker } from './useLocationTracker'
import { useSilentAudio } from './useSilentAudio'

type AppState = 'idle' | 'countdown' | 'running' | 'finished'

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

function formatPaceSeconds(ps: number | null): string {
  if (ps === null) return "--'--\""
  const m = Math.floor(ps / 60)
  const s = Math.round(ps % 60)
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

export default function App() {
  const [appState, setAppState] = useState<AppState>('idle')
  const [countdown, setCountdown] = useState(5)
  const [elapsed, setElapsed] = useState(0)
  const [finalDistance, setFinalDistance] = useState(0)
  const [finalTime, setFinalTime] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  const { totalDistance, rollingPaceSeconds, startTracking, stopTracking, permissionDenied } =
    useLocationTracker()
  const silentAudio = useSilentAudio()

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
    setCountdown(5)
    setAppState('countdown')
  }

  function handleFinish() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    wakeLockRef.current?.release()
    wakeLockRef.current = null
    silentAudio.stop()
    setFinalDistance(totalDistance)
    setFinalTime(elapsed)
    stopTracking()
    setAppState('finished')
  }

  function handleClear() {
    wakeLockRef.current?.release()
    wakeLockRef.current = null
    silentAudio.stop()
    setElapsed(0)
    setFinalDistance(0)
    setFinalTime(0)
    setAppState('idle')
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      wakeLockRef.current?.release()
      silentAudio.stop()
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

  // Countdown tick — starts GPS + run when it reaches 0
  useEffect(() => {
    if (appState !== 'countdown') return
    const id = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(id)
          setElapsed(0)
          startTimeRef.current = Date.now()
          startTracking()
          silentAudio.start()
          timerRef.current = setInterval(
            () => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)),
            1000,
          )
          acquireWakeLock()
          setAppState('running')
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [appState])

  const finalDistanceKm = finalDistance / 1000

  return (
    <div className="app">
      {appState === 'idle' && (
        <div className="screen">
          <h1 className="title">GO RUN</h1>
          <div className="shoe-icon">👟</div>
          {permissionDenied && (
            <p className="permission-warning">
              Location denied. Enable in Settings → Privacy → Location Services.
            </p>
          )}
          <button className="circle-btn green" onClick={handleGo}>
            <span className="go-text">GO</span>
          </button>
        </div>
      )}

      {appState === 'countdown' && (
        <div className="screen">
          <p className="countdown-label">GET READY</p>
          <div className="countdown-number">{countdown}</div>
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
              value={formatPaceSeconds(rollingPaceSeconds)}
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
        <div className="screen finished-screen">
          <h2 className="complete-title">RUN COMPLETE</h2>
          <div className="hero-stat">
            <span className="hero-value">{finalDistanceKm.toFixed(2)}</span>
            <span className="hero-unit">km</span>
          </div>
          <div className="secondary-stats">
            <div className="secondary-stat">
              <span className="secondary-value">{formatTime(finalTime)}</span>
              <span className="secondary-label">TIME</span>
            </div>
            <div className="secondary-divider" />
            <div className="secondary-stat">
              <span className="secondary-value">{formatPace(finalTime, finalDistanceKm)} /km</span>
              <span className="secondary-label">PACE</span>
            </div>
          </div>
          <button className="clear-btn" onClick={handleClear}>
            CLEAR
          </button>
        </div>
      )}
    </div>
  )
}
