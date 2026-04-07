'use client'

import { useRef, useCallback } from 'react'

export const useNotificationSound = () => {
    const audioRef = useRef<HTMLAudioElement | null>(null)

    const play = useCallback(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio('/sounds/notification.mp3')
            audioRef.current.volume = 0.5
        }
        audioRef.current.currentTime = 0
        audioRef.current.play().catch(() => {
            // Browser may block autoplay before user interaction
        })
    }, [])

    return { play }
}
