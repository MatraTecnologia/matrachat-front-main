'use client'

import { useState, useEffect } from 'react'
import { User, MessageSquare } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { usePermissions } from '@/contexts/permissions-context'

type OnlineUser = {
    userId: string
    userName: string
    userImage: string | null
    currentContactId: string | null
    lastActivity: string
    connectedAt: string
}

type OrgMember = {
    id: string
    role: string
    user: {
        id: string
        name: string
        email: string
        image: string | null
    }
}

type UserWithStatus = {
    userId: string
    userName: string
    userEmail: string
    userImage: string | null
    userRole: string
    isOnline: boolean
    currentContactId: string | null
    connectedAt: string | null
}

type Contact = {
    id: string
    name: string
}

export function OnlineUsersPanel({ orgId, currentUserId, contacts }: {
    orgId: string | null
    currentUserId: string | null
    contacts: Contact[]
}) {
    const { data: perms } = usePermissions()
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
    const [allMembers, setAllMembers] = useState<OrgMember[]>([])
    const [usersWithStatus, setUsersWithStatus] = useState<UserWithStatus[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<UserWithStatus | null>(null)

    // Carrega todos os membros da organização
    useEffect(() => {
        if (!orgId) return

        const loadMembers = async () => {
            try {
                const { data } = await api.get('/organizations/current')
                setAllMembers(data.members || [])
            } catch {
                setAllMembers([])
            }
        }

        loadMembers()
    }, [orgId])

    // Carrega usuários online inicialmente e conecta ao SSE para atualizações em tempo real
    useEffect(() => {
        if (!orgId) return

        // Carregamento inicial
        const loadOnlineUsers = async () => {
            try {
                const { data } = await api.get('/agent/presence/online')
                setOnlineUsers(data.users.filter((u: OnlineUser) => u.userId !== currentUserId))
            } catch {
                setOnlineUsers([])
            }
        }

        loadOnlineUsers()

        // Conecta ao SSE para atualizações em tempo real
        const connectSSE = async () => {
            try {
                const token = document.cookie
                    .split('; ')
                    .find(row => row.startsWith('better_auth.session_token='))
                    ?.split('=')[1]

                if (!token) return

                const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
                const eventSource = new EventSource(`${baseUrl}/agent/sse`, {
                    withCredentials: true,
                })

                eventSource.addEventListener('user_viewing', (event) => {
                    const data = JSON.parse(event.data)
                    if (data.userId === currentUserId) return

                    setOnlineUsers(prev => {
                        const filtered = prev.filter(u => u.userId !== data.userId)
                        return [...filtered, {
                            userId: data.userId,
                            userName: data.userName,
                            userImage: data.userImage,
                            currentContactId: data.contactId || null,
                            lastActivity: new Date().toISOString(),
                            connectedAt: prev.find(u => u.userId === data.userId)?.connectedAt || new Date().toISOString(),
                        }]
                    })
                })

                eventSource.addEventListener('user_left', (event) => {
                    const data = JSON.parse(event.data)
                    setOnlineUsers(prev => prev.map(u =>
                        u.userId === data.userId
                            ? { ...u, currentContactId: null }
                            : u
                    ))
                })

                eventSource.onerror = () => {
                    eventSource.close()
                    // Fallback para polling em caso de erro no SSE
                    setTimeout(connectSSE, 5000)
                }

                return () => {
                    eventSource.close()
                }
            } catch (error) {
                console.error('Erro ao conectar SSE:', error)
            }
        }

        const cleanupSSE = connectSSE()

        // Polling de fallback a cada 30s (menos frequente) para sincronizar estado
        const fallbackInterval = setInterval(loadOnlineUsers, 30000)

        return () => {
            clearInterval(fallbackInterval)
            cleanupSSE?.then(cleanup => cleanup?.())
        }
    }, [orgId, currentUserId])

    // Combina membros com status online
    useEffect(() => {
        const combined = allMembers
            .filter(member => member.user.id !== currentUserId)
            .map(member => {
                const onlineInfo = onlineUsers.find(ou => ou.userId === member.user.id)
                return {
                    userId: member.user.id,
                    userName: member.user.name,
                    userEmail: member.user.email,
                    userImage: member.user.image,
                    userRole: member.role,
                    isOnline: !!onlineInfo,
                    currentContactId: onlineInfo?.currentContactId || null,
                    connectedAt: onlineInfo?.connectedAt || null,
                }
            })
            // Ordena: online primeiro, depois por nome
            .sort((a, b) => {
                if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1
                return a.userName.localeCompare(b.userName)
            })

        setUsersWithStatus(combined)
    }, [allMembers, onlineUsers, currentUserId])

    // Calcula tempo online
    function getTimeOnline(connectedAt: string | null): string {
        if (!connectedAt) return 'Offline'

        const now = new Date()
        const connected = new Date(connectedAt)
        const diff = Math.floor((now.getTime() - connected.getTime()) / 1000)

        if (diff < 60) return `${diff}s`
        if (diff < 3600) return `${Math.floor(diff / 60)}m`
        return `${Math.floor(diff / 3600)}h${Math.floor((diff % 3600) / 60)}m`
    }

    // Traduz o papel do usuário
    function getRoleLabel(role: string): string {
        const roles: Record<string, string> = {
            owner: 'Proprietário',
            admin: 'Administrador',
            agent: 'Agente',
            member: 'Membro',
        }
        return roles[role] || role
    }

    // Encontra nome do contato que o usuário está visualizando
    function getContactName(contactId: string | null): string {
        if (!contactId) return 'Navegando...'
        const contact = contacts.find((c) => c.id === contactId)
        return contact ? contact.name : 'Conversa privada'
    }

    // Apenas admin e owner podem ver o painel de usuários online
    if (!orgId) return null
    if (!perms || (perms.role !== 'admin' && perms.role !== 'owner')) return null

    return (
        <>
            {/* Botão flutuante no canto inferior esquerdo */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl"
            >
                <div className="relative">
                    <User className="h-4 w-4" />
                    {onlineUsers.length > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-3 w-3">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
                        </span>
                    )}
                </div>
                <span>
                    {usersWithStatus.length} Usuários ({onlineUsers.length} online)
                </span>
            </button>

            {/* Modal de usuários */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Usuários da Equipe ({usersWithStatus.length})
                        </DialogTitle>
                        <DialogDescription>
                            {onlineUsers.length > 0 ? (
                                <span className="flex items-center gap-1">
                                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                                    {onlineUsers.length} online agora
                                </span>
                            ) : (
                                'Nenhum usuário online no momento'
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                        {usersWithStatus.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p className="text-sm">Nenhum usuário na organização</p>
                            </div>
                        ) : (
                            usersWithStatus.map((user) => (
                                <button
                                    key={user.userId}
                                    onClick={() => setSelectedUser(user)}
                                    className="w-full flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors text-left"
                                >
                                    <div className="relative">
                                        <Avatar className="h-10 w-10">
                                            {user.userImage && <AvatarImage src={user.userImage} />}
                                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                                {user.userName.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className={`absolute bottom-0 right-0 flex h-3 w-3 rounded-full border-2 border-background ${
                                            user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                                        }`}></span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{user.userName}</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {user.isOnline ? (
                                                <>👁️ {getContactName(user.currentContactId)}</>
                                            ) : (
                                                <>{getRoleLabel(user.userRole)} • {user.userEmail}</>
                                            )}
                                        </p>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <p className="text-xs text-muted-foreground">
                                            {getTimeOnline(user.connectedAt)}
                                        </p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal de detalhes do usuário */}
            {selectedUser && (
                <Dialog open={!!selectedUser} onOpenChange={(v) => !v && setSelectedUser(null)}>
                    <DialogContent className="max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <div className="relative">
                                    <Avatar className="h-8 w-8">
                                        {selectedUser.userImage && <AvatarImage src={selectedUser.userImage} />}
                                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                            {selectedUser.userName.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className={`absolute bottom-0 right-0 flex h-2.5 w-2.5 rounded-full border-2 border-background ${
                                        selectedUser.isOnline ? 'bg-green-500' : 'bg-gray-400'
                                    }`}></span>
                                </div>
                                {selectedUser.userName}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="mt-4 space-y-3">
                            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Status:</span>
                                    <span className={`flex items-center gap-1 font-medium ${
                                        selectedUser.isOnline ? 'text-green-600' : 'text-gray-600'
                                    }`}>
                                        <span className={`h-2 w-2 rounded-full ${
                                            selectedUser.isOnline ? 'bg-green-500' : 'bg-gray-400'
                                        }`}></span>
                                        {selectedUser.isOnline ? 'Online' : 'Offline'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Papel:</span>
                                    <span className="font-medium">{getRoleLabel(selectedUser.userRole)}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">E-mail:</span>
                                    <span className="font-medium text-right text-xs">{selectedUser.userEmail}</span>
                                </div>
                                {selectedUser.isOnline && (
                                    <>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Tempo online:</span>
                                            <span className="font-medium">{getTimeOnline(selectedUser.connectedAt)}</span>
                                        </div>
                                        <div className="flex items-start justify-between text-sm">
                                            <span className="text-muted-foreground">Visualizando:</span>
                                            <span className="font-medium text-right">{getContactName(selectedUser.currentContactId)}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {selectedUser.isOnline && selectedUser.currentContactId && (
                                <Button
                                    className="w-full"
                                    onClick={() => {
                                        // Navega para a mesma conversa que o usuário está vendo
                                        const params = new URLSearchParams(window.location.search)
                                        params.set('contactId', selectedUser.currentContactId!)
                                        window.location.href = `/conversations?${params.toString()}`
                                    }}
                                >
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    Ver Esta Conversa
                                </Button>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    )
}
