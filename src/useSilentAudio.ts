import { useRef, useCallback } from 'react'

/**
 * Plays a near-silent audio loop to keep the browser alive when the
 * phone is locked. Browsers continue running JS for pages that are
 * actively playing audio — the same reason Spotify works on a locked
 * phone. This keeps watchPosition and setInterval firing.
 */
export function useSilentAudio() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)

  const start = useCallback(() => {
    // Avoid double-start
    if (audioContextRef.current) return

    const ctx = new AudioContext()
    audioContextRef.current = ctx

    // Create a 1-second buffer of near-silence (tiny amplitude to avoid
    // being optimized away by the browser)
    const sampleRate = ctx.sampleRate
    const buffer = ctx.createBuffer(1, sampleRate, sampleRate)
    const channel = buffer.getChannelData(0)
    for (let i = 0; i < sampleRate; i++) {
      channel[i] = 1e-7
    }

    // Loop it indefinitely
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    source.connect(ctx.destination)
    source.start()
    sourceRef.current = source
  }, [])

  const stop = useCallback(() => {
    sourceRef.current?.stop()
    sourceRef.current = null
    audioContextRef.current?.close()
    audioContextRef.current = null
  }, [])

  return { start, stop }
}
