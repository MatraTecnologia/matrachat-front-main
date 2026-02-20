import { useEffect, useRef, useCallback } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'
const RECONNECT_DELAY = 3000

export type SseNewMessage = {
    type: 'new_message'
    contactId: string
    channelId?: string | null
    externalId?: string | null
    contactName?: string | null
    contactAvatarUrl?: string | null
    message: {
        id: string
        direction: 'outbound' | 'inbound'
        type: string
        content: string
        status: string
        channelId?: string | null
        createdAt: string
    }
    contact?: {
        id: string
        name: string
        phone?: string | null
        avatarUrl?: string | null
        externalId?: string | null
        channelId?: string | null
        convStatus: string
        createdAt: string
    }
}

export type SseConvUpdated = {
    type: 'conv_updated'
    contactId: string
    convStatus: string
    assignedToId: string | null
    assignedToName: string | null
}

export type SseUserViewing = {
    type: 'user_viewing'
    contactId: string
    userId: string
    userName: string
    userImage: string | null
    timestamp: string
}

export type SseUserLeft = {
    type: 'user_left'
    contactId: string
    userId: string
}

export type SseUserTyping = {
    type: 'user_typing'
    contactId: string
    userId: string
    userName: string
    isTyping: boolean
}

type Handlers = {
    onNewMessage?: (ev: SseNewMessage) => void
    onConvUpdated?: (ev: SseConvUpdated) => void
    onUserViewing?: (ev: SseUserViewing) => void
    onUserLeft?: (ev: SseUserLeft) => void
    onUserTyping?: (ev: SseUserTyping) => void
}

export function useAgentSse(orgId: string | null, handlers: Handlers) {
    const esRef = useRef<EventSource | null>(null)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const handlersRef = useRef(handlers)
    handlersRef.current = handlers

    const connect = useCallback(() => {
        if (!orgId) return
        if (esRef.current) {
            esRef.current.close()
            esRef.current = null
        }

        const url = `${API_BASE}/agent/sse`
        const es = new EventSource(url, { withCredentials: true })
        esRef.current = es

        // Agent SSE sends named events: "new_message" and "conv_updated"
        es.addEventListener('new_message', (e: MessageEvent) => {
            try {
                const event: SseNewMessage = JSON.parse(e.data)
                handlersRef.current.onNewMessage?.(event)
            } catch { /* ignore parse errors */ }
        })

        es.addEventListener('conv_updated', (e: MessageEvent) => {
            try {
                const event: SseConvUpdated = JSON.parse(e.data)
                handlersRef.current.onConvUpdated?.(event)
            } catch { /* ignore parse errors */ }
        })

        es.addEventListener('user_viewing', (e: MessageEvent) => {
            try {
                const event: SseUserViewing = JSON.parse(e.data)
                handlersRef.current.onUserViewing?.(event)
            } catch { /* ignore parse errors */ }
        })

        es.addEventListener('user_left', (e: MessageEvent) => {
            try {
                const event: SseUserLeft = JSON.parse(e.data)
                handlersRef.current.onUserLeft?.(event)
            } catch { /* ignore parse errors */ }
        })

        es.addEventListener('user_typing', (e: MessageEvent) => {
            try {
                const event: SseUserTyping = JSON.parse(e.data)
                handlersRef.current.onUserTyping?.(event)
            } catch { /* ignore parse errors */ }
        })

        es.onerror = () => {
            es.close()
            esRef.current = null
            timerRef.current = setTimeout(connect, RECONNECT_DELAY)
        }
    }, [orgId])

    useEffect(() => {
        connect()
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
            esRef.current?.close()
            esRef.current = null
        }
    }, [connect])
}
