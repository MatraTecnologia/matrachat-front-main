import { useEffect, useRef } from 'react'
import { usePresenceContext } from '../contexts/presence-context'

export type SseNewMessage = {
    type: 'new_message'
    contactId: string
    assignedToId?: string | null
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
        /** Agente que enviou — preenchido apenas para mensagens outbound do painel */
        user?: { id: string; name: string; image?: string | null } | null
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
    assignedToImage?: string | null
    teamId?: string | null
    teamName?: string | null
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

type AgentEvent = SseNewMessage | SseConvUpdated | SseUserViewing | SseUserLeft | SseUserTyping

type Handlers = {
    onNewMessage?: (ev: SseNewMessage) => void
    onConvUpdated?: (ev: SseConvUpdated) => void
    onUserViewing?: (ev: SseUserViewing) => void
    onUserLeft?: (ev: SseUserLeft) => void
    onUserTyping?: (ev: SseUserTyping) => void
}

// orgId mantido por compatibilidade de API mas não é mais necessário —
// o servidor já filtra por org via Socket.io rooms (org:${orgId}).
export function useAgentSse(_orgId: string | null, handlers: Handlers) {
    const { socket } = usePresenceContext()
    const handlersRef = useRef(handlers)
    handlersRef.current = handlers

    useEffect(() => {
        if (!socket) return

        function handleAgentEvent(event: AgentEvent) {
            switch (event.type) {
                case 'new_message':
                    handlersRef.current.onNewMessage?.(event)
                    break
                case 'conv_updated':
                    handlersRef.current.onConvUpdated?.(event)
                    break
                case 'user_viewing':
                    handlersRef.current.onUserViewing?.(event)
                    break
                case 'user_left':
                    handlersRef.current.onUserLeft?.(event)
                    break
                case 'user_typing':
                    handlersRef.current.onUserTyping?.(event)
                    break
            }
        }

        socket.on('agent_event', handleAgentEvent)
        return () => {
            socket.off('agent_event', handleAgentEvent)
        }
    }, [socket])
}
