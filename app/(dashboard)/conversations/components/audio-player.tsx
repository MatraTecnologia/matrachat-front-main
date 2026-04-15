'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Play, Pause } from 'lucide-react'
import { cn } from '@/lib/utils'

const BAR_COUNT = 36

const hashCode = (s: string) => {
    let h = 0
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h + s.charCodeAt(i)) | 0
    }
    return Math.abs(h)
}

const generateBars = (seed: number): number[] => {
    const bars: number[] = []
    let s = seed || 1
    for (let i = 0; i < BAR_COUNT; i++) {
        s = (s * 16807 + 7) % 2147483647
        const normalized = (s % 100) / 100
        bars.push(0.15 + normalized * 0.85)
    }
    return bars
}

const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
}

const SPEEDS = [1, 1.5, 2] as const

export const AudioPlayer = ({ src, isOutbound = false, fallbackDuration }: {
    src: string
    isOutbound?: boolean
    fallbackDuration?: number
}) => {
    const audioRef = useRef<HTMLAudioElement>(null)
    const waveformRef = useRef<HTMLDivElement>(null)
    const [playing, setPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [speedIdx, setSpeedIdx] = useState(0)

    const bars = useMemo(() => generateBars(hashCode(src)), [src])
    const displayDuration = (duration > 0 && isFinite(duration)) ? duration : (fallbackDuration ?? 0)
    const progress = displayDuration > 0 ? currentTime / displayDuration : 0

    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        const onLoaded = () => setDuration(audio.duration)
        const onTimeUpdate = () => setCurrentTime(audio.currentTime)
        const onEnded = () => { setPlaying(false); setCurrentTime(0) }

        audio.addEventListener('loadedmetadata', onLoaded)
        audio.addEventListener('timeupdate', onTimeUpdate)
        audio.addEventListener('ended', onEnded)

        if (audio.readyState >= 1) setDuration(audio.duration)

        return () => {
            audio.removeEventListener('loadedmetadata', onLoaded)
            audio.removeEventListener('timeupdate', onTimeUpdate)
            audio.removeEventListener('ended', onEnded)
        }
    }, [src])

    const togglePlay = useCallback(() => {
        const audio = audioRef.current
        if (!audio) return
        if (playing) {
            audio.pause()
        } else {
            audio.play().catch(() => {})
        }
        setPlaying(!playing)
    }, [playing])

    const handleSeek = useCallback((e: React.MouseEvent) => {
        const audio = audioRef.current
        const container = waveformRef.current
        if (!audio || !container || !displayDuration) return
        const rect = container.getBoundingClientRect()
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
        audio.currentTime = ratio * displayDuration
        setCurrentTime(audio.currentTime)
    }, [displayDuration])

    const cycleSpeed = useCallback(() => {
        const next = (speedIdx + 1) % SPEEDS.length
        setSpeedIdx(next)
        if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next]
    }, [speedIdx])

    return (
        <div className="flex items-center gap-2 w-56">
            <audio ref={audioRef} src={src} preload="metadata">{/* hidden player */}</audio>

            <button
                onClick={togglePlay}
                className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors',
                    isOutbound
                        ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                )}
            >
                {playing
                    ? <Pause className="h-3.5 w-3.5" fill="currentColor" />
                    : <Play className="h-3.5 w-3.5 ml-0.5" fill="currentColor" />
                }
            </button>

            <div className="flex-1 flex flex-col gap-1 min-w-0">
                <div
                    ref={waveformRef}
                    onClick={handleSeek}
                    className="flex items-center gap-[2px] h-7 cursor-pointer"
                >
                    {bars.map((h, i) => {
                        const barProgress = i / BAR_COUNT
                        const isPlayed = barProgress < progress
                        return (
                            <div
                                key={i}
                                className={cn(
                                    'w-[3px] rounded-full transition-colors duration-150',
                                    isPlayed
                                        ? isOutbound
                                            ? 'bg-primary-foreground/90'
                                            : 'bg-emerald-500'
                                        : isOutbound
                                            ? 'bg-primary-foreground/30'
                                            : 'bg-muted-foreground/30'
                                )}
                                style={{ height: `${Math.round(h * 24 + 4)}px` }}
                            />
                        )
                    })}
                </div>

                <div className="flex items-center justify-between">
                    <span className={cn(
                        'text-[10px] tabular-nums',
                        isOutbound ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}>
                        {playing || currentTime > 0 ? formatTime(currentTime) : formatTime(displayDuration)}
                    </span>

                    <button
                        onClick={cycleSpeed}
                        className={cn(
                            'text-[10px] font-medium px-1 py-0.5 rounded transition-colors',
                            isOutbound
                                ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground/70'
                                : 'bg-muted-foreground/10 hover:bg-muted-foreground/20 text-muted-foreground'
                        )}
                    >
                        {SPEEDS[speedIdx]}x
                    </button>
                </div>
            </div>
        </div>
    )
}
