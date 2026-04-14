'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, X, Maximize, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent } from '@/components/ui/dialog'

const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
}

export const VideoPlayer = ({ src, caption }: {
    src: string
    caption?: string
}) => {
    const thumbRef = useRef<HTMLVideoElement>(null)
    const modalVideoRef = useRef<HTMLVideoElement>(null)
    const progressRef = useRef<HTMLDivElement>(null)
    const [expanded, setExpanded] = useState(false)
    const [playing, setPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [muted, setMuted] = useState(false)
    const [showControls, setShowControls] = useState(true)
    const hideTimer = useRef<ReturnType<typeof setTimeout>>(null)

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0

    useEffect(() => {
        const video = thumbRef.current
        if (!video) return
        const onLoaded = () => setDuration(video.duration)
        video.addEventListener('loadedmetadata', onLoaded)
        if (video.readyState >= 1) setDuration(video.duration)
        return () => video.removeEventListener('loadedmetadata', onLoaded)
    }, [src])

    const handleOpenChange = useCallback((open: boolean) => {
        setExpanded(open)
        if (!open) {
            setPlaying(false)
            setCurrentTime(0)
            setShowControls(true)
            if (hideTimer.current) clearTimeout(hideTimer.current)
        }
    }, [])

    useEffect(() => {
        if (!expanded) return
        const video = modalVideoRef.current
        if (!video) return

        const onTime = () => setCurrentTime(video.currentTime)
        const onLoaded = () => setDuration(video.duration)
        const onEnded = () => { setPlaying(false); setShowControls(true) }
        const onPlay = () => setPlaying(true)
        const onPause = () => setPlaying(false)

        video.addEventListener('timeupdate', onTime)
        video.addEventListener('loadedmetadata', onLoaded)
        video.addEventListener('ended', onEnded)
        video.addEventListener('play', onPlay)
        video.addEventListener('pause', onPause)

        video.play().catch(() => {})

        return () => {
            video.removeEventListener('timeupdate', onTime)
            video.removeEventListener('loadedmetadata', onLoaded)
            video.removeEventListener('ended', onEnded)
            video.removeEventListener('play', onPlay)
            video.removeEventListener('pause', onPause)
        }
    }, [expanded])

    const togglePlay = useCallback(() => {
        const video = modalVideoRef.current
        if (!video) return
        if (playing) video.pause()
        else video.play().catch(() => {})
    }, [playing])

    const handleSeek = useCallback((e: React.MouseEvent) => {
        const video = modalVideoRef.current
        const bar = progressRef.current
        if (!video || !bar || !duration) return
        const rect = bar.getBoundingClientRect()
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
        video.currentTime = ratio * duration
    }, [duration])

    const scheduleHide = useCallback(() => {
        if (hideTimer.current) clearTimeout(hideTimer.current)
        setShowControls(true)
        if (playing) {
            hideTimer.current = setTimeout(() => setShowControls(false), 3000)
        }
    }, [playing])

    const toggleMute = useCallback(() => {
        const video = modalVideoRef.current
        if (!video) return
        video.muted = !muted
        setMuted(!muted)
    }, [muted])

    const toggleFullscreen = useCallback(() => {
        const video = modalVideoRef.current
        if (!video) return
        if (document.fullscreenElement) document.exitFullscreen()
        else video.requestFullscreen().catch(() => {})
    }, [])

    return (
        <>
            <button
                onClick={() => setExpanded(true)}
                className="group relative rounded-lg overflow-hidden max-w-[200px]"
            >
                <video
                    ref={thumbRef}
                    src={src}
                    preload="metadata"
                    className="w-full rounded-lg"
                >{/* thumbnail */}</video>

                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                    <div className="bg-black/60 rounded-full p-2.5">
                        <Play className="h-5 w-5 text-white ml-0.5" fill="white" />
                    </div>
                </div>

                {duration > 0 && (
                    <span className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                        {formatTime(duration)}
                    </span>
                )}
            </button>

            <Dialog open={expanded} onOpenChange={handleOpenChange}>
                <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden">
                    <div
                        className="relative flex items-center justify-center bg-black min-h-[300px]"
                        onMouseMove={scheduleHide}
                        onClick={togglePlay}
                    >
                        <video
                            ref={modalVideoRef}
                            src={src}
                            className="max-w-full max-h-[80vh] object-contain"
                            playsInline
                        >{/* player */}</video>

                        {!playing && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="bg-black/50 rounded-full p-4">
                                    <Play className="h-8 w-8 text-white ml-1" fill="white" />
                                </div>
                            </div>
                        )}

                        <button
                            onClick={(e) => { e.stopPropagation(); handleOpenChange(false) }}
                            className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors z-10"
                        >
                            <X className="h-4 w-4 text-white" />
                        </button>

                        <div
                            className={cn(
                                'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pt-8 pb-3 px-3 transition-opacity duration-300',
                                showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
                            )}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div
                                ref={progressRef}
                                onClick={handleSeek}
                                className="group/bar relative h-1 bg-white/30 rounded-full cursor-pointer mb-2 hover:h-1.5 transition-all"
                            >
                                <div
                                    className="absolute inset-y-0 left-0 bg-white rounded-full"
                                    style={{ width: `${progress}%` }}
                                />
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/bar:opacity-100 transition-opacity"
                                    style={{ left: `calc(${progress}% - 6px)` }}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <button onClick={togglePlay} className="text-white hover:text-white/80 transition-colors">
                                        {playing
                                            ? <Pause className="h-4 w-4" fill="white" />
                                            : <Play className="h-4 w-4 ml-0.5" fill="white" />
                                        }
                                    </button>

                                    <button onClick={toggleMute} className="text-white hover:text-white/80 transition-colors">
                                        {muted
                                            ? <VolumeX className="h-4 w-4" />
                                            : <Volume2 className="h-4 w-4" />
                                        }
                                    </button>

                                    <span className="text-white text-xs tabular-nums">
                                        {formatTime(currentTime)} / {formatTime(duration)}
                                    </span>
                                </div>

                                <button onClick={toggleFullscreen} className="text-white hover:text-white/80 transition-colors">
                                    <Maximize className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {caption && (
                        <div className="p-4 bg-background">
                            <p className="text-sm whitespace-pre-wrap break-words">{caption}</p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}
