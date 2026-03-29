import { useState, useRef, useCallback } from 'react'

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

export function useLocationTracker() {
  const [totalDistance, setTotalDistance] = useState(0)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const watchIdRef = useRef<number | null>(null)
  const lastPosRef = useRef<{ lat: number; lon: number } | null>(null)

  const startTracking = useCallback(() => {
    setTotalDistance(0)
    setPermissionDenied(false)
    lastPosRef.current = null

    if (!navigator.geolocation) return

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
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setPermissionDenied(true)
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 },
    )
  }, [])

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    lastPosRef.current = null
  }, [])

  return { totalDistance, startTracking, stopTracking, permissionDenied }
}
