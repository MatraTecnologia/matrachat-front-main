'use client'

import { useState, useEffect } from 'react'
import { usePermissions } from '@/contexts/permissions-context'
import { usePresenceContext, type UserPresence } from '@/contexts/presence-context'
import { NoPermission } from '@/components/no-permission'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { AgentScreenMirror } from '@/components/AgentScreenMirror'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Monitor, Eye, Users, Activity, MessageSquare,
    Clock, Maximize2, Grid3x3, LayoutGrid,
    MessageCircle
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

type Contact = {
    id: string
    name: string
    phone: string | null
    avatarUrl: string | null
}

type AgentView = UserPresence & {
    contact?: Contact | null
    lastMessages?: Array<{
        id: string
        content: string
        direction: 'inbound' | 'outbound'
        createdAt: string
    }>
}

export default function SupervisaoPage() {
    const { data: perms, loading: permsLoading } = usePermissions()
    const { onlineUsers, isConnected } = usePresenceContext()
    const [contacts, setContacts] = useState<Map<string, Contact>>(new Map())
    const [agentViews, setAgentViews] = useState<AgentView[]>([])
    const [selectedAgent, setSelectedAgent] = useState<AgentView | null>(null)
    const [viewMode, setViewMode] = useState<'grid' | 'detailed'>('grid')

    // Verificar permissão
    if (permsLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-muted-foreground">Carregando...</div>
            </div>
        )
    }

    if (!perms || (perms.role !== 'admin' && perms.role !== 'owner')) {
        return <NoPermission />
    }

    // Carregar informações de contatos que os agentes estão visualizando
    useEffect(() => {
        const contactIds = onlineUsers
            .map(u => u.currentContactId)
            .filter((id): id is string => id !== null)

        if (contactIds.length === 0) return

        // Buscar informações dos contatos
        Promise.all(
            contactIds.map(id =>
                api.get(`/contacts/${id}`)
                    .then(({ data }) => ({ id, data }))
                    .catch(() => null)
            )
        ).then(results => {
            const contactMap = new Map<string, Contact>()
            results.forEach(result => {
                if (result) {
                    contactMap.set(result.id, result.data)
                }
            })
            setContacts(contactMap)
        })
    }, [onlineUsers])

    // Criar visualizações dos agentes com informações dos contatos
    useEffect(() => {
        const views: AgentView[] = onlineUsers.map(user => ({
            ...user,
            contact: user.currentContactId ? contacts.get(user.currentContactId) : null
        }))
        setAgentViews(views)
    }, [onlineUsers, contacts])

    // Calcular tempo online
    function getTimeOnline(connectedAt: Date | string): string {
        const now = new Date()
        const connected = connectedAt instanceof Date ? connectedAt : new Date(connectedAt)
        const diff = Math.floor((now.getTime() - connected.getTime()) / 1000)

        if (diff < 60) return `${diff}s`
        if (diff < 3600) return `${Math.floor(diff / 60)}min`
        const hours = Math.floor(diff / 3600)
        const mins = Math.floor((diff % 3600) / 60)
        return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`
    }

    // Renderizar grid de agentes
    function renderAgentGrid() {
        if (agentViews.length === 0) {
            return (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
                    <Users className="h-16 w-16 opacity-50" />
                    <p className="text-lg">Nenhum agente online no momento</p>
                    <p className="text-sm">Os agentes aparecerão aqui quando conectarem</p>
                </div>
            )
        }

        return (
            <div className="grid gap-4 p-6 auto-rows-fr" style={{
                gridTemplateColumns: `repeat(auto-fit, minmax(350px, 1fr))`
            }}>
                {agentViews.map(agent => (
                    <Card
                        key={agent.userId}
                        className={cn(
                            "transition-all hover:shadow-lg cursor-pointer border-2",
                            agent.status === 'online' && "border-green-500/20",
                            agent.status === 'away' && "border-yellow-500/20"
                        )}
                        onClick={() => {
                            setSelectedAgent(agent)
                            setViewMode('detailed')
                        }}
                    >
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Avatar className="h-12 w-12">
                                        {agent.userImage && <AvatarImage src={agent.userImage} />}
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                            {agent.userName.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className={cn(
                                        "absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background",
                                        agent.status === 'online' ? "bg-green-500" : "bg-yellow-500"
                                    )} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <CardTitle className="text-base truncate">{agent.userName}</CardTitle>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        {getTimeOnline(agent.connectedAt)}
                                    </div>
                                </div>
                                <Badge variant={agent.status === 'online' ? 'default' : 'secondary'}>
                                    {agent.status === 'online' ? 'Ativo' : 'Ausente'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {agent.currentContactId && agent.contact ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <Eye className="h-4 w-4 text-primary" />
                                        <span>Visualizando conversa</span>
                                    </div>
                                    <div className="rounded-lg border bg-muted/30 p-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                                {agent.contact.avatarUrl && <AvatarImage src={agent.contact.avatarUrl} />}
                                                <AvatarFallback className="bg-primary/10 text-xs">
                                                    {agent.contact.name.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{agent.contact.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {agent.contact.phone || 'Sem telefone'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            window.location.href = `/conversations?contactId=${agent.currentContactId}`
                                        }}
                                    >
                                        <MessageSquare className="mr-2 h-3.5 w-3.5" />
                                        Abrir Conversa
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                                    <Activity className="h-8 w-8 mb-2 opacity-50" />
                                    <p className="text-sm">Navegando no sistema</p>
                                    {agent.currentRoute && (
                                        <p className="text-xs mt-1 opacity-70">{agent.currentRoute}</p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    // Renderizar visualização detalhada de um agente
    function renderDetailedView() {
        if (!selectedAgent) return null

        return (
            <div className="flex h-full flex-col">
                {/* Header */}
                <div className="border-b bg-background/95 p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setViewMode('grid')
                                    setSelectedAgent(null)
                                }}
                            >
                                <Grid3x3 className="mr-2 h-4 w-4" />
                                Voltar ao Grid
                            </Button>
                            <div className="h-6 w-px bg-border" />
                            <div className="relative">
                                <Avatar className="h-10 w-10">
                                    {selectedAgent.userImage && <AvatarImage src={selectedAgent.userImage} />}
                                    <AvatarFallback className="bg-primary/10">
                                        {selectedAgent.userName.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <span className={cn(
                                    "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
                                    selectedAgent.status === 'online' ? "bg-green-500" : "bg-yellow-500"
                                )} />
                            </div>
                            <div>
                                <h2 className="font-semibold">{selectedAgent.userName}</h2>
                                <p className="text-xs text-muted-foreground">
                                    Online há {getTimeOnline(selectedAgent.connectedAt)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content - Espelho da Tela do Agente em Tempo Real */}
                <div className="flex-1 overflow-hidden p-6">
                    <AgentScreenMirror agentUserId={selectedAgent.userId} />
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col bg-background">
            {/* Header */}
            {viewMode === 'grid' && (
                <div className="border-b bg-background/95 p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Monitor className="h-6 w-6 text-primary" />
                            <div>
                                <h1 className="text-2xl font-bold">Supervisão em Tempo Real</h1>
                                <p className="text-sm text-muted-foreground">
                                    Monitore a atividade de {agentViews.length} {agentViews.length === 1 ? 'agente' : 'agentes'} online
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
                                isConnected ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                            )}>
                                <span className={cn(
                                    "h-2 w-2 rounded-full",
                                    isConnected ? "bg-green-500" : "bg-red-500"
                                )} />
                                {isConnected ? 'Conectado' : 'Desconectado'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {viewMode === 'grid' ? renderAgentGrid() : renderDetailedView()}
            </div>
        </div>
    )
}
