'use client'

// ─── Context Global de Presença em Tempo Real ────────────────────────────────
// Conecta ao WebSocket assim que o usuário faz login
// Entra na room da organização
// Todos os componentes compartilham o mesmo estado

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { usePathname } from 'next/navigation'

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

type PresenceContextValue = {
    isConnected: boolean
    onlineUsers: UserPresence[]
    setViewing: (contactId: string | null) => void
    setTyping: (contactId: string, isTyping: boolean) => void
    setStatus: (status: 'online' | 'away') => void
}

const PresenceContext = createContext<PresenceContextValue | null>(null)

type PresenceProviderProps = {
    children: ReactNode
    userId: string | null
    userName: string | null
    userEmail: string | null
    userImage: string | null
    userRole: string | null
    organizationId: string | null
}

export function PresenceProvider({
    children,
    userId,
    userName,
    userEmail,
    userImage,
    userRole,
    organizationId,
}: PresenceProviderProps) {
    const socketRef = useRef<Socket | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([])

    const pathname = usePathname()
    const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const lastActivityRef = useRef<Date>(new Date())

    // ═══════════════════════════════════════════════════════════════════════════
    // Conexão WebSocket Global
    // ═══════════════════════════════════════════════════════════════════════════

    useEffect(() => {
        // Só conecta se tiver usuário autenticado e organização
        if (!userId || !userName || !userEmail || !organizationId) {
            console.log('⏸️  Aguardando autenticação para conectar WebSocket...')
            return
        }

        console.log(`🔌 Conectando ao WebSocket como ${userName} (${organizationId})...`)

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
            console.log('✅ WebSocket conectado - Registrando presença...')
            setIsConnected(true)

            // Registra usuário e entra na room da organização
            socket.emit('register', {
                userId,
                userName,
                userEmail,
                userImage,
                userRole: userRole || 'member',
                organizationId,
            })

            console.log(`🏠 Entrou na room: org:${organizationId}`)

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
            console.log(`📋 Recebeu lista de ${data.users.length} usuários online`)
            setOnlineUsers(data.users)
        })

        socket.on('connect_error', (error) => {
            console.error('❌ Erro ao conectar WebSocket:', error)
        })

        // Cleanup ao desmontar
        return () => {
            console.log('🔌 Desconectando WebSocket...')
            socket.disconnect()
            stopHeartbeat()
        }
    }, [userId, userName, userEmail, userImage, userRole, organizationId])

    // ═══════════════════════════════════════════════════════════════════════════
    // Heartbeat (mantém online)
    // ═══════════════════════════════════════════════════════════════════════════

    function startHeartbeat() {
        if (heartbeatIntervalRef.current) return

        // Envia heartbeat a cada 15 segundos
        heartbeatIntervalRef.current = setInterval(() => {
            socketRef.current?.emit('heartbeat')
        }, 15000)

        console.log('💓 Heartbeat iniciado (15s)')
    }

    function stopHeartbeat() {
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current)
            heartbeatIntervalRef.current = null
            console.log('💔 Heartbeat parado')
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
                console.log('😴 Marcado como away (inativo há 3min)')
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
                console.log('🙈 Aba em segundo plano - Away')
            } else {
                // Aba voltou ao foco
                socketRef.current?.emit('status', { status: 'online' })
                socketRef.current?.emit('heartbeat')
                console.log('👀 Aba em foco - Online')
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
            console.log('👋 Fechando aba - Offline')
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
        console.log(`🧭 Navegou para: ${pathname}`)
    }, [isConnected, pathname])

    // ═══════════════════════════════════════════════════════════════════════════
    // Handlers de Eventos
    // ═══════════════════════════════════════════════════════════════════════════

    function handlePresenceEvent(event: PresenceEvent) {
        switch (event.type) {
            case 'user_online':
                console.log(`✅ ${event.user.userName} entrou online`)
                setOnlineUsers(prev => {
                    const filtered = prev.filter(u => u.userId !== event.user.userId)
                    return [...filtered, event.user]
                })
                break

            case 'user_offline':
                console.log(`❌ Usuário ${event.userId} saiu offline`)
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

    const value: PresenceContextValue = {
        isConnected,
        onlineUsers,
        setViewing,
        setTyping,
        setStatus,
    }

    return (
        <PresenceContext.Provider value={value}>
            {children}
        </PresenceContext.Provider>
    )
}

// ═══════════════════════════════════════════════════════════════════════════
// Hook para consumir o Context
// ═══════════════════════════════════════════════════════════════════════════

export function usePresenceContext() {
    const context = useContext(PresenceContext)
    if (!context) {
        throw new Error('usePresenceContext deve ser usado dentro de PresenceProvider')
    }
    return context
}
