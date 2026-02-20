'use client'

import { useState, useEffect } from 'react'
import { User, MessageSquare } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { api } from '@/lib/api'

type OnlineUser = {
    userId: string
    userName: string
    userImage: string | null
    currentContactId: string | null
    lastActivity: string
    connectedAt: string
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
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<OnlineUser | null>(null)

    // Carrega usuários online
    useEffect(() => {
        if (!orgId) return

        const loadOnlineUsers = async () => {
            try {
                const { data } = await api.get('/agent/presence/online')
                setOnlineUsers(data.users.filter((u: OnlineUser) => u.userId !== currentUserId))
            } catch {
                setOnlineUsers([])
            }
        }

        loadOnlineUsers()
        const interval = setInterval(loadOnlineUsers, 5000) // Atualiza a cada 5s

        return () => clearInterval(interval)
    }, [orgId, currentUserId])

    // Calcula tempo online
    function getTimeOnline(connectedAt: string): string {
        const now = new Date()
        const connected = new Date(connectedAt)
        const diff = Math.floor((now.getTime() - connected.getTime()) / 1000)

        if (diff < 60) return `${diff}s`
        if (diff < 3600) return `${Math.floor(diff / 60)}m`
        return `${Math.floor(diff / 3600)}h${Math.floor((diff % 3600) / 60)}m`
    }

    // Encontra nome do contato que o usuário está visualizando
    function getContactName(contactId: string | null): string {
        if (!contactId) return 'Navegando...'
        const contact = contacts.find((c) => c.id === contactId)
        return contact ? contact.name : 'Conversa privada'
    }

    if (!orgId || onlineUsers.length === 0) return null

    return (
        <>
            {/* Botão flutuante no canto inferior esquerdo */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl"
            >
                <div className="relative">
                    <User className="h-4 w-4" />
                    <span className="absolute -right-1 -top-1 flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
                    </span>
                </div>
                <span>{onlineUsers.length} Online</span>
            </button>

            {/* Modal de usuários online */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-green-600" />
                            Usuários Online ({onlineUsers.length})
                        </DialogTitle>
                        <DialogDescription>
                            Veja quem está online e o que estão fazendo em tempo real
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                        {onlineUsers.map((user) => (
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
                                    <span className="absolute bottom-0 right-0 flex h-3 w-3 rounded-full bg-green-500 border-2 border-background"></span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{user.userName}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        👁️ {getContactName(user.currentContactId)}
                                    </p>
                                </div>

                                <div className="text-right shrink-0">
                                    <p className="text-xs text-muted-foreground">
                                        {getTimeOnline(user.connectedAt)}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal de detalhes do usuário */}
            {selectedUser && (
                <Dialog open={!!selectedUser} onOpenChange={(v) => !v && setSelectedUser(null)}>
                    <DialogContent className="max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                    {selectedUser.userImage && <AvatarImage src={selectedUser.userImage} />}
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                        {selectedUser.userName.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                {selectedUser.userName}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="mt-4 space-y-3">
                            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Status:</span>
                                    <span className="flex items-center gap-1 text-green-600 font-medium">
                                        <span className="h-2 w-2 rounded-full bg-green-500"></span>
                                        Online
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Tempo online:</span>
                                    <span className="font-medium">{getTimeOnline(selectedUser.connectedAt)}</span>
                                </div>
                                <div className="flex items-start justify-between text-sm">
                                    <span className="text-muted-foreground">Visualizando:</span>
                                    <span className="font-medium text-right">{getContactName(selectedUser.currentContactId)}</span>
                                </div>
                            </div>

                            {selectedUser.currentContactId && (
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
