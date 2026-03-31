import { useState, useRef, useCallback, useEffect } from 'react'

const WINDOW_MS = 30_000        // 30-second rolling window
const MIN_WINDOW_METRES = 30    // minimum distance to show a pace
const PACE_THROTTLE_MS = 5_000  // update at most every 5s

function haversineMetres(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

type TimestampedPosition = { lat: number; lon: number; t: number }

export function useLocationTracker() {
  const [totalDistance, setTotalDistance] = useState(0)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [rollingPaceSeconds, setRollingPaceSeconds] = useState<number | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const lastPosRef = useRef<{ lat: number; lon: number } | null>(null)
  const positionBufferRef = useRef<TimestampedPosition[]>([])
  const lastPaceUpdateRef = useRef<number>(0)
  const trackingActiveRef = useRef(false)

  // Start (or restart) the geolocation watcher without resetting accumulated state
  const startWatcher = useCallback(() => {
    if (!navigator.geolocation) return

    // Clear any existing watcher first
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        // Skip inaccurate fixes
        if (accuracy > 25) return

        if (lastPosRef.current) {
          const dist = haversineMetres(
            lastPosRef.current.lat,
            lastPosRef.current.lon,
            latitude,
            longitude,
          )
          setTotalDistance((prev) => prev + dist)
        }
        lastPosRef.current = { lat: latitude, lon: longitude }

        // Rolling pace calculation
        const now = Date.now()
        positionBufferRef.current.push({ lat: latitude, lon: longitude, t: now })
        positionBufferRef.current = positionBufferRef.current.filter(
          (p) => now - p.t <= WINDOW_MS,
        )

        if (now - lastPaceUpdateRef.current >= PACE_THROTTLE_MS) {
          const buf = positionBufferRef.current
          if (buf.length >= 2) {
            let windowDistM = 0
            for (let i = 1; i < buf.length; i++) {
              windowDistM += haversineMetres(
                buf[i - 1].lat,
                buf[i - 1].lon,
                buf[i].lat,
                buf[i].lon,
              )
            }
            if (windowDistM >= MIN_WINDOW_METRES) {
              const windowSecs = (buf[buf.length - 1].t - buf[0].t) / 1000
              setRollingPaceSeconds(windowSecs / (windowDistM / 1000))
            } else {
              setRollingPaceSeconds(null)
            }
          }
          lastPaceUpdateRef.current = now
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setPermissionDenied(true)
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 },
    )
  }, [])

  const startTracking = useCallback(() => {
    setTotalDistance(0)
    setPermissionDenied(false)
    setRollingPaceSeconds(null)
    lastPosRef.current = null
    positionBufferRef.current = []
    lastPaceUpdateRef.current = 0
    trackingActiveRef.current = true

    startWatcher()
  }, [startWatcher])

  const stopTracking = useCallback(() => {
    trackingActiveRef.current = false
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    lastPosRef.current = null
  }, [])

  // Restart the geolocation watcher when the page becomes visible again.
  // On iOS/Android, locking the phone suspends watchPosition callbacks.
  // Re-creating the watcher on resume ensures GPS updates continue,
  // while lastPosRef is preserved so the distance gap is captured.
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && trackingActiveRef.current) {
        // Clear stale pace data — the gap makes rolling pace meaningless
        positionBufferRef.current = []
        lastPaceUpdateRef.current = 0
        setRollingPaceSeconds(null)

        startWatcher()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [startWatcher])

  return { totalDistance, rollingPaceSeconds, startTracking, stopTracking, permissionDenied }
}
