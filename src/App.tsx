import { useState, useEffect, useRef } from 'react'
import './App.css'
import { useLocationTracker } from './useLocationTracker'

function ShoeIcon() {
  // Phosphor "sneaker" icon — https://phosphoricons.com (MIT)
  // Rendered twice with clipPaths: orange upper, silver sole
  const d =
    'M228.65,129.11l-60.73-20.24a24,24,0,0,1-14.32-13L130.39,41.6s0-.07,0-.1A16,16,0,0,0,110.25,33L34.53,60.49A16.05,16.05,0,0,0,24,75.53V192a16,16,0,0,0,16,16H240a16,16,0,0,0,16-16V167.06A40,40,0,0,0,228.65,129.11ZM115.72,48l7.11,16.63-21.56,7.85A8,8,0,0,0,104,88a7.91,7.91,0,0,0,2.73-.49l22.4-8.14,4.74,11.07-16.6,6A8,8,0,0,0,120,112a7.91,7.91,0,0,0,2.73-.49l17.6-6.4a40.24,40.24,0,0,0,7.68,10l-14.74,5.36A8,8,0,0,0,136,136a8.14,8.14,0,0,0,2.73-.48l28-10.18,56.87,18.95A24,24,0,0,1,238.93,160H40V75.53ZM40,192h0V176H240v16Z'
  return (
    <svg width="80" height="56" viewBox="0 0 256 256" fill="none">
      <defs>
        <clipPath id="shoe-upper">
          <rect x="0" y="0" width="256" height="176" />
        </clipPath>
        <clipPath id="shoe-sole">
          <rect x="0" y="176" width="256" height="80" />
        </clipPath>
      </defs>
      <path d={d} fill="#FF6A1A" clipPath="url(#shoe-upper)" />
      <path d={d} fill="#C0C8D4" clipPath="url(#shoe-sole)" />
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

  const { totalDistance, startTracking, stopTracking, permissionDenied } =
    useLocationTracker()

  const distanceKm = totalDistance / 1000

  function handleGo() {
    setElapsed(0)
    startTracking()
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    setAppState('running')
  }

  function handleFinish() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setFinalDistance(totalDistance)
    setFinalTime(elapsed)
    stopTracking()
    setAppState('finished')
  }

  function handleClear() {
    setElapsed(0)
    setFinalDistance(0)
    setFinalTime(0)
    setAppState('idle')
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

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
