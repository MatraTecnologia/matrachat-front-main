// ─── Hook de Presença em Tempo Real com Socket.io ───────────────────────────
// Sistema completo de rastreamento automático de usuários

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useRouter, usePathname } from 'next/navigation'

export type UserPresence = {
    userId: string
    userName: string
    userEmail: string
    userImage: string | null
    userRole: string
    organizationId: string
    status: 'online' | 'away' | 'offline'
    currentContactId: string | null
    currentRoute: string | null
    lastActivity: Date
    connectedAt: Date
}

export type PresenceEvent =
    | { type: 'user_online'; user: UserPresence }
    | { type: 'user_offline'; userId: string; organizationId: string }
    | { type: 'user_away'; userId: string; organizationId: string }
    | { type: 'user_active'; userId: string; organizationId: string }
    | { type: 'user_viewing'; userId: string; contactId: string; organizationId: string }
    | { type: 'user_typing'; userId: string; contactId: string; isTyping: boolean; organizationId: string }
    | { type: 'presence_update'; users: UserPresence[]; organizationId: string }

type UsePresenceOptions = {
    userId: string | null
    userName: string | null
    userEmail: string | null
    userImage: string | null
    userRole: string | null
    organizationId: string | null
    enabled?: boolean
}

type UsePresenceReturn = {
    isConnected: boolean
    onlineUsers: UserPresence[]
    setViewing: (contactId: string | null) => void
    setTyping: (contactId: string, isTyping: boolean) => void
    setStatus: (status: 'online' | 'away') => void
}

export function usePresence(options: UsePresenceOptions): UsePresenceReturn {
    const { userId, userName, userEmail, userImage, userRole, organizationId, enabled = true } = options

    const socketRef = useRef<Socket | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([])

    const pathname = usePathname()
    const heartbeatIntervalRef = useRef<NodeJS.Timeout>()
    const idleTimeoutRef = useRef<NodeJS.Timeout>()
    const lastActivityRef = useRef<Date>(new Date())

    // ═══════════════════════════════════════════════════════════════════════════
    // Conexão WebSocket
    // ═══════════════════════════════════════════════════════════════════════════

    useEffect(() => {
        if (!enabled || !userId || !userName || !userEmail || !organizationId) return

        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

        // Conecta ao Socket.io
        const socket = io(baseUrl, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 10,
        })

        socketRef.current = socket

        // ─── Event Listeners ─────────────────────────────────────────────────────

        socket.on('connect', () => {
            console.log('✅ WebSocket conectado')
            setIsConnected(true)

            // Registra usuário
            socket.emit('register', {
                userId,
                userName,
                userEmail,
                userImage,
                userRole: userRole || 'member',
                organizationId,
            })

            // Inicia heartbeat
            startHeartbeat()
        })

        socket.on('disconnect', () => {
            console.log('❌ WebSocket desconectado')
            setIsConnected(false)
            stopHeartbeat()
        })

        socket.on('presence_event', (event: PresenceEvent) => {
            handlePresenceEvent(event)
        })

        socket.on('presence_update', (data: { users: UserPresence[] }) => {
            setOnlineUsers(data.users)
        })

        // Cleanup ao desmontar
        return () => {
            socket.disconnect()
            stopHeartbeat()
        }
    }, [enabled, userId, userName, userEmail, userRole, organizationId])

    // ═══════════════════════════════════════════════════════════════════════════
    // Heartbeat (mantém online)
    // ═══════════════════════════════════════════════════════════════════════════

    function startHeartbeat() {
        if (heartbeatIntervalRef.current) return

        // Envia heartbeat a cada 15 segundos
        heartbeatIntervalRef.current = setInterval(() => {
            socketRef.current?.emit('heartbeat')
        }, 15000)
    }

    function stopHeartbeat() {
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current)
            heartbeatIntervalRef.current = undefined
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Tracking de Atividade (detecta idle)
    // ═══════════════════════════════════════════════════════════════════════════

    useEffect(() => {
        if (!isConnected) return

        function updateActivity() {
            lastActivityRef.current = new Date()

            // Reseta timer de idle
            if (idleTimeoutRef.current) {
                clearTimeout(idleTimeoutRef.current)
            }

            // Marca como away após 3 minutos de inatividade
            idleTimeoutRef.current = setTimeout(() => {
                socketRef.current?.emit('status', { status: 'away' })
            }, 3 * 60 * 1000)
        }

        // Detecta atividade do usuário
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart']
        events.forEach(event => {
            window.addEventListener(event, updateActivity, { passive: true })
        })

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, updateActivity)
            })
            if (idleTimeoutRef.current) {
                clearTimeout(idleTimeoutRef.current)
            }
        }
    }, [isConnected])

    // ═══════════════════════════════════════════════════════════════════════════
    // Page Visibility (aba ativa/inativa)
    // ═══════════════════════════════════════════════════════════════════════════

    useEffect(() => {
        if (!isConnected) return

        function handleVisibilityChange() {
            if (document.hidden) {
                // Aba ficou em segundo plano
                socketRef.current?.emit('status', { status: 'away' })
            } else {
                // Aba voltou ao foco
                socketRef.current?.emit('status', { status: 'online' })
                socketRef.current?.emit('heartbeat')
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [isConnected])

    // ═══════════════════════════════════════════════════════════════════════════
    // BeforeUnload (detecta fechar aba)
    // ═══════════════════════════════════════════════════════════════════════════

    useEffect(() => {
        if (!isConnected) return

        function handleBeforeUnload() {
            // Tenta enviar desconexão antes de fechar
            socketRef.current?.emit('status', { status: 'offline' })
        }

        window.addEventListener('beforeunload', handleBeforeUnload)

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
        }
    }, [isConnected])

    // ═══════════════════════════════════════════════════════════════════════════
    // Tracking de Navegação
    // ═══════════════════════════════════════════════════════════════════════════

    useEffect(() => {
        if (!isConnected || !pathname) return

        socketRef.current?.emit('navigate', { route: pathname })
    }, [isConnected, pathname])

    // ═══════════════════════════════════════════════════════════════════════════
    // Handlers de Eventos
    // ═══════════════════════════════════════════════════════════════════════════

    function handlePresenceEvent(event: PresenceEvent) {
        switch (event.type) {
            case 'user_online':
                setOnlineUsers(prev => {
                    const filtered = prev.filter(u => u.userId !== event.user.userId)
                    return [...filtered, event.user]
                })
                break

            case 'user_offline':
                setOnlineUsers(prev => prev.filter(u => u.userId !== event.userId))
                break

            case 'user_away':
                setOnlineUsers(prev => prev.map(u =>
                    u.userId === event.userId ? { ...u, status: 'away' } : u
                ))
                break

            case 'user_active':
                setOnlineUsers(prev => prev.map(u =>
                    u.userId === event.userId ? { ...u, status: 'online' } : u
                ))
                break

            case 'user_viewing':
                setOnlineUsers(prev => prev.map(u =>
                    u.userId === event.userId ? { ...u, currentContactId: event.contactId } : u
                ))
                break
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // API Pública
    // ═══════════════════════════════════════════════════════════════════════════

    function setViewing(contactId: string | null) {
        socketRef.current?.emit('viewing', { contactId })
    }

    function setTyping(contactId: string, isTyping: boolean) {
        socketRef.current?.emit('typing', { contactId, isTyping })
    }

    function setStatus(status: 'online' | 'away') {
        socketRef.current?.emit('status', { status })
    }

    return {
        isConnected,
        onlineUsers,
        setViewing,
        setTyping,
        setStatus,
    }
}
