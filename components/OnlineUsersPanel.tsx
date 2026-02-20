'use client'

import { useState, useEffect } from 'react'
import { User, MessageSquare } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { usePermissions } from '@/contexts/permissions-context'
import { usePresenceContext, type UserPresence } from '@/contexts/presence-context'
import { api } from '@/lib/api'

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

type UserWithStatus = UserPresence & {
    userEmail: string
    userRole: string
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
    const [allMembers, setAllMembers] = useState<OrgMember[]>([])
    const [usersWithStatus, setUsersWithStatus] = useState<UserWithStatus[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<UserWithStatus | null>(null)

    // Consome presença do Context Global (já conectado)
    const { onlineUsers, isConnected } = usePresenceContext()

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

    // Combina membros com status online do WebSocket
    useEffect(() => {
        const combined = allMembers
            .filter(member => member.user.id !== currentUserId)
            .map(member => {
                const onlineInfo = onlineUsers.find(ou => ou.userId === member.user.id)

                if (onlineInfo) {
                    // Usuário está online
                    return {
                        ...onlineInfo,
                        userEmail: member.user.email,
                        userRole: member.role,
                    }
                } else {
                    // Usuário está offline
                    return {
                        userId: member.user.id,
                        userName: member.user.name,
                        userEmail: member.user.email,
                        userImage: member.user.image,
                        userRole: member.role,
                        organizationId: orgId || '',
                        status: 'offline' as const,
                        currentContactId: null,
                        currentRoute: null,
                        lastActivity: new Date(),
                        connectedAt: new Date(),
                    }
                }
            })
            // Ordena: online primeiro, depois por nome
            .sort((a, b) => {
                if (a.status !== b.status) {
                    if (a.status === 'online') return -1
                    if (b.status === 'online') return 1
                    if (a.status === 'away') return -1
                    if (b.status === 'away') return 1
                }
                return a.userName.localeCompare(b.userName)
            })

        setUsersWithStatus(combined as UserWithStatus[])
    }, [allMembers, onlineUsers, currentUserId, orgId])

    // Calcula tempo online
    function getTimeOnline(connectedAt: Date | string | null): string {
        if (!connectedAt) return 'Offline'

        const now = new Date()
        const connected = connectedAt instanceof Date ? connectedAt : new Date(connectedAt)
        const diff = Math.floor((now.getTime() - connected.getTime()) / 1000)

        if (diff < 60) return `${diff}s`
        if (diff < 3600) return `${Math.floor(diff / 60)}m`
        return `${Math.floor(diff / 3600)}h${Math.floor((diff % 3600) / 60)}m`
    }

    // Verifica se usuário está online
    function isUserOnline(status: 'online' | 'away' | 'offline'): boolean {
        return status !== 'offline'
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
                    {usersWithStatus.length} Usuários ({usersWithStatus.filter(u => u.status !== 'offline').length} online)
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
                            {usersWithStatus.filter(u => u.status !== 'offline').length > 0 ? (
                                <span className="flex items-center gap-1">
                                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                                    {usersWithStatus.filter(u => u.status !== 'offline').length} online agora
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
                                            user.status === 'online' ? 'bg-green-500' :
                                            user.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                                        }`}></span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{user.userName}</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {user.status !== 'offline' ? (
                                                <>👁️ {getContactName(user.currentContactId)}</>
                                            ) : (
                                                <>{getRoleLabel(user.userRole)} • {user.userEmail}</>
                                            )}
                                        </p>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <p className="text-xs text-muted-foreground">
                                            {user.status !== 'offline' ? getTimeOnline(user.connectedAt) : 'Offline'}
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
                                        selectedUser.status === 'online' ? 'bg-green-500' :
                                        selectedUser.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
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
                                        selectedUser.status === 'online' ? 'text-green-600' :
                                        selectedUser.status === 'away' ? 'text-yellow-600' : 'text-gray-600'
                                    }`}>
                                        <span className={`h-2 w-2 rounded-full ${
                                            selectedUser.status === 'online' ? 'bg-green-500' :
                                            selectedUser.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                                        }`}></span>
                                        {selectedUser.status === 'online' ? 'Online' :
                                         selectedUser.status === 'away' ? 'Ausente' : 'Offline'}
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
                                {selectedUser.status !== 'offline' && (
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

                            {selectedUser.status !== 'offline' && selectedUser.currentContactId && (
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
