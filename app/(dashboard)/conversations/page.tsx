'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
    Search, MessageSquare, Send, Paperclip, Smile,
    Check, CheckCheck, Clock, RefreshCw, User, Tag,
    MoreVertical, SlidersHorizontal,
    Loader2, MessageCircle, Globe, Hash, ChevronDown, Plus, X,
    CheckCircle2, UserCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    ContextMenu, ContextMenuContent, ContextMenuItem,
    ContextMenuSeparator, ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { api } from '@/lib/api'
import { usePermissions } from '@/contexts/permissions-context'
import { NoPermission } from '@/components/no-permission'
import { useAgentSse, type SseNewMessage, type SseConvUpdated } from '@/hooks/useAgentSse'
import { toast } from 'sonner'

// ─── Tipos ─────────────────────────────────────────────────────────────────────

type ChannelRef = { id: string; name: string; type: string; status: string }
type ContactTag = { tag: { id: string; name: string; color: string } }
type MemberRef  = { id: string; name: string; email: string; image?: string | null }
type RawMember  = { id: string; role: string; user: { id: string; name: string; email: string; image?: string | null } }

type Contact = {
    id: string
    name: string
    phone?: string | null
    email?: string | null
    avatarUrl?: string | null
    channelId?: string | null
    externalId?: string | null
    notes?: string | null
    convStatus: string
    assignedToId?: string | null
    assignedTo?: { id: string; name: string; image?: string | null } | null
    createdAt: string
    channel?: ChannelRef | null
    tags?: ContactTag[]
}

type LocalMessage = {
    id: string
    text: string
    type: 'reply' | 'note' | 'inbound'
    status: 'sending' | 'sent' | 'error'
    createdAt: Date
}

type ConvStatus = 'open' | 'resolved' | 'pending'
type ConvTab    = 'mine' | 'unassigned' | 'all'

// ─── Hook: orgId + currentUserId ───────────────────────────────────────────────

function useOrgAndUser() {
    const [orgId, setOrgId]     = useState<string | null>(null)
    const [userId, setUserId]   = useState<string | null>(null)
    useEffect(() => {
        api.get('/organizations')
            .then(({ data }) => { if (Array.isArray(data) && data.length > 0) setOrgId(data[0].id) })
            .catch(() => null)
        api.get('/auth/get-session')
            .then(({ data }) => { if (data?.user?.id) setUserId(data.user.id) })
            .catch(() => null)
    }, [])
    return { orgId, userId }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
    return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

function ChannelIcon({ type, className }: { type: string; className?: string }) {
    if (type === 'whatsapp') return <MessageCircle className={className} />
    if (type === 'api')      return <Globe className={className} />
    return <Hash className={className} />
}

// ─── ContactModal ─────────────────────────────────────────────────────────────

function ContactModal({ contact, open, onClose }: { contact: Contact | null; open: boolean; onClose: () => void }) {
    if (!contact) return null
    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Detalhes do contato</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-3 pt-2 pb-1">
                    <Avatar className="h-16 w-16">
                        {contact.avatarUrl && <AvatarImage src={contact.avatarUrl} />}
                        <AvatarFallback className="text-xl bg-primary/10 text-primary font-semibold">
                            {initials(contact.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                        <p className="font-semibold text-base">{contact.name}</p>
                        {contact.channel && (
                            <div className="flex items-center justify-center gap-1 mt-0.5">
                                <ChannelIcon type={contact.channel.type} className={cn('h-3.5 w-3.5', contact.channel.type === 'whatsapp' ? 'text-green-600' : 'text-blue-600')} />
                                <span className="text-xs text-muted-foreground">{contact.channel.name}</span>
                            </div>
                        )}
                    </div>
                </div>
                <Separator />
                <div className="space-y-2.5 text-sm">
                    {contact.phone && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Telefone</span>
                            <span className="font-medium">{contact.phone}</span>
                        </div>
                    )}
                    {contact.email && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">E-mail</span>
                            <span className="font-medium">{contact.email}</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <span className={cn('font-medium capitalize', {
                            'text-yellow-600': contact.convStatus === 'pending',
                            'text-blue-600':   contact.convStatus === 'open',
                            'text-green-600':  contact.convStatus === 'resolved',
                        })}>
                            {contact.convStatus === 'pending' ? 'Pendente'
                                : contact.convStatus === 'open' ? 'Em andamento'
                                : 'Resolvida'}
                        </span>
                    </div>
                    {contact.assignedTo && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Atribuído a</span>
                            <span className="font-medium">{contact.assignedTo.name}</span>
                        </div>
                    )}
                    {contact.notes && (
                        <div className="flex flex-col gap-1">
                            <span className="text-muted-foreground">Notas</span>
                            <p className="text-xs bg-muted rounded-md px-3 py-2 whitespace-pre-wrap">{contact.notes}</p>
                        </div>
                    )}
                    {(contact.tags ?? []).length > 0 && (
                        <div className="flex flex-col gap-1.5">
                            <span className="text-muted-foreground">Etiquetas</span>
                            <div className="flex flex-wrap gap-1.5">
                                {(contact.tags ?? []).map((ct) => (
                                    <span
                                        key={ct.tag.id}
                                        className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                                        style={{ backgroundColor: ct.tag.color + '22', color: ct.tag.color }}
                                    >
                                        {ct.tag.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ─── ContactItem ──────────────────────────────────────────────────────────────

function ContactItem({
    contact, active, onClick, unreadCount, onContextAction,
}: {
    contact: Contact
    active: boolean
    onClick: () => void
    unreadCount?: number
    onContextAction: (action: 'view' | 'resolve' | 'reopen', contact: Contact) => void
}) {
    const hasUnread = (unreadCount ?? 0) > 0
    const inner = (
        <button
            onClick={onClick}
            className={cn(
                'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60',
                active && 'bg-primary/5 border-l-2 border-primary'
            )}
        >
            <div className="relative shrink-0">
                <Avatar className="h-9 w-9">
                    {contact.avatarUrl && <AvatarImage src={contact.avatarUrl} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {initials(contact.name)}
                    </AvatarFallback>
                </Avatar>
                {hasUnread && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-blue-500 border-2 border-background text-[10px] font-bold text-white px-0.5">
                        {unreadCount! > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                    <span className={cn('text-sm truncate', hasUnread ? 'font-semibold' : 'font-medium')}>
                        {contact.name}
                    </span>
                    {contact.channel && (
                        <ChannelIcon
                            type={contact.channel.type}
                            className={cn('h-3.5 w-3.5 shrink-0', contact.channel.type === 'whatsapp' ? 'text-green-600' : 'text-blue-600')}
                        />
                    )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                    <p className="text-xs text-muted-foreground truncate flex-1">
                        {contact.phone ?? contact.email ?? 'Sem contato'}
                    </p>
                    {contact.assignedTo && (
                        <span className="text-[10px] text-muted-foreground shrink-0 bg-muted rounded px-1">
                            {contact.assignedTo.name.split(' ')[0]}
                        </span>
                    )}
                </div>
            </div>
        </button>
    )

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>{inner}</ContextMenuTrigger>
            <ContextMenuContent className="w-52">
                <ContextMenuItem className="gap-2 text-xs" onClick={() => onContextAction('view', contact)}>
                    <User className="h-3.5 w-3.5" />Ver detalhes do contato
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem className="gap-2 text-xs" onClick={onClick}>
                    <MessageSquare className="h-3.5 w-3.5" />Abrir conversa
                </ContextMenuItem>
                <ContextMenuSeparator />
                {contact.convStatus === 'resolved' ? (
                    <ContextMenuItem className="gap-2 text-xs text-blue-700 focus:text-blue-700" onClick={() => onContextAction('reopen', contact)}>
                        <RefreshCw className="h-3.5 w-3.5" />Reabrir conversa
                    </ContextMenuItem>
                ) : (
                    <ContextMenuItem className="gap-2 text-xs text-green-700 focus:text-green-700" onClick={() => onContextAction('resolve', contact)}>
                        <CheckCircle2 className="h-3.5 w-3.5" />Resolver conversa
                    </ContextMenuItem>
                )}
            </ContextMenuContent>
        </ContextMenu>
    )
}

// ─── ConversationList ─────────────────────────────────────────────────────────

type OrgTagRef = { id: string; name: string; color: string }

function ConversationList({
    contacts, loading, selected, onSelect, status, tab, onStatusChange, onTabChange,
    channelFilter, userId, unreadIds, tags, tagFilter, onTagFilterChange, orgId, onContactUpdated,
}: {
    contacts: Contact[]
    loading: boolean
    selected: Contact | null
    onSelect: (c: Contact) => void
    status: ConvStatus
    tab: ConvTab
    onStatusChange: (s: ConvStatus) => void
    onTabChange: (t: ConvTab) => void
    channelFilter: string | null
    userId: string | null
    unreadIds: Map<string, number>
    tags: OrgTagRef[]
    tagFilter: string | null
    onTagFilterChange: (tagId: string | null) => void
    orgId: string | null
    onContactUpdated: (updated: Partial<Contact> & { id: string }) => void
}) {
    const [search, setSearch] = useState('')
    const [modalContact, setModalContact] = useState<Contact | null>(null)
    const [searchResults, setSearchResults] = useState<Contact[] | null>(null)
    const [searchLoading, setSearchLoading] = useState(false)

    // Busca no backend com debounce quando há texto — garante que todos os contatos sejam encontrados
    useEffect(() => {
        if (!search || !orgId) {
            setSearchResults(null)
            return
        }
        setSearchLoading(true)
        const timer = setTimeout(async () => {
            try {
                const { data } = await api.get('/contacts', { params: { orgId, search, limit: 50 } })
                setSearchResults(data.contacts)
            } catch {
                setSearchResults(null)
            } finally {
                setSearchLoading(false)
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [search, orgId])

    async function handleContextAction(action: 'view' | 'resolve' | 'reopen', contact: Contact) {
        if (action === 'view') {
            setModalContact(contact)
            return
        }
        if (!orgId) return
        if (action === 'resolve') {
            try {
                await api.patch(`/contacts/${contact.id}/resolve`, { orgId })
                onContactUpdated({ id: contact.id, convStatus: 'resolved', assignedToId: null, assignedTo: null })
            } catch { /* silencioso */ }
        } else {
            try {
                await api.patch(`/contacts/${contact.id}/open`, { orgId })
                onContactUpdated({ id: contact.id, convStatus: 'open' })
            } catch { /* silencioso */ }
        }
    }

    const activeTag = tagFilter ? tags.find((t) => t.id === tagFilter) ?? null : null

    // Quando há busca ativa usa os resultados do backend; caso contrário filtra localmente por status/tab
    const filtered = search
        ? (searchResults ?? [])
        : contacts.filter((c) => {
            if (channelFilter && c.channelId !== channelFilter) return false
            const hasUnread = unreadIds.has(c.id)
            if (!hasUnread && (c.convStatus ?? 'open') !== status) return false
            if (tab === 'mine'       && c.assignedToId !== userId) return false
            if (tab === 'unassigned' && c.assignedToId != null) return false
            return true
        })

    return (
        <div className="flex h-full w-[300px] shrink-0 flex-col border-r">
            {/* Tabs status */}
            <div className="border-b px-3 pt-3 pb-0">
                <Tabs value={status} onValueChange={(v) => onStatusChange(v as ConvStatus)}>
                    <TabsList className="w-full h-8 rounded-md p-0.5">
                        <TabsTrigger value="open"     className="flex-1 text-xs h-7">Abertas</TabsTrigger>
                        <TabsTrigger value="pending"  className="flex-1 text-xs h-7">Pendentes</TabsTrigger>
                        <TabsTrigger value="resolved" className="flex-1 text-xs h-7">Resolvidas</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Sub-tabs + tag filter */}
            <div className="flex items-center gap-1 border-b px-3 py-1.5">
                {(['mine', 'unassigned', 'all'] as ConvTab[]).map((t) => (
                    <button key={t} onClick={() => onTabChange(t)}
                        className={cn(
                            'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                            tab === t ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {t === 'mine' ? 'Minhas' : t === 'unassigned' ? 'Não atrib.' : 'Todos'}
                    </button>
                ))}
                <div className="ml-auto flex items-center gap-1">
                    {/* Tag filter dropdown */}
                    {tags.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn('h-6 w-6', tagFilter && 'text-primary')}
                                >
                                    <Tag className="h-3.5 w-3.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                    onClick={() => onTagFilterChange(null)}
                                    className={cn('text-xs gap-2', !tagFilter && 'font-medium')}
                                >
                                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
                                    Todas as tags
                                    {!tagFilter && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-primary" />}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {tags.map((tag) => (
                                    <DropdownMenuItem
                                        key={tag.id}
                                        onClick={() => onTagFilterChange(tag.id)}
                                        className={cn('text-xs gap-2', tagFilter === tag.id && 'font-medium')}
                                    >
                                        <span
                                            className="h-2 w-2 rounded-full shrink-0"
                                            style={{ backgroundColor: tag.color }}
                                        />
                                        <span className="truncate flex-1">{tag.name}</span>
                                        {tagFilter === tag.id && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-primary" />}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                        <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                </div>
            </div>

            {/* Active tag filter badge */}
            {activeTag && (
                <div className="flex items-center gap-2 px-3 py-1.5 border-b">
                    <span className="text-[11px] text-muted-foreground">Filtrando:</span>
                    <span
                        className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{ backgroundColor: activeTag.color + '22', color: activeTag.color }}
                    >
                        <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: activeTag.color }}
                        />
                        {activeTag.name}
                    </span>
                    <button
                        onClick={() => onTagFilterChange(null)}
                        className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </div>
            )}

            {/* Search */}
            <div className="px-3 py-2 border-b">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input className="pl-8 h-8 text-xs" placeholder="Buscar contato..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto">
                {(loading || searchLoading) && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                )}
                {!loading && !searchLoading && filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
                        <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
                        <p className="text-xs text-muted-foreground">
                            {search ? 'Nenhum contato encontrado.' : 'Nenhuma conversa nesta categoria.'}
                        </p>
                    </div>
                )}
                {!loading && !searchLoading && filtered.map((c) => (
                    <ContactItem
                        key={c.id}
                        contact={c}
                        active={selected?.id === c.id}
                        onClick={() => onSelect(c)}
                        unreadCount={unreadIds.get(c.id) ?? 0}
                        onContextAction={handleContextAction}
                    />
                ))}
            </div>
            <ContactModal
                contact={modalContact}
                open={!!modalContact}
                onClose={() => setModalContact(null)}
            />
        </div>
    )
}

// ─── ConversationEmpty ────────────────────────────────────────────────────────

function ConversationEmpty() {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center px-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <MessageSquare className="h-10 w-10 text-muted-foreground" />
            </div>
            <div>
                <p className="text-base font-semibold">Selecione um contato</p>
                <p className="text-sm text-muted-foreground mt-1">
                    Escolha um contato da lista para iniciar ou visualizar uma conversa.
                </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
                <kbd className="px-2 py-1 rounded border bg-muted font-mono">Ctrl + Enter</kbd>
                <span>enviar mensagem</span>
            </div>
        </div>
    )
}

// ─── ConversationDetail ───────────────────────────────────────────────────────

function ConversationDetail({ contact, waChannels, orgId, members, onContactUpdated, incomingMessage, canSend }: {
    contact: Contact
    waChannels: ChannelRef[]
    orgId: string
    members: MemberRef[]
    onContactUpdated: (updated: Partial<Contact> & { id: string }) => void
    incomingMessage?: { id: string; content: string; createdAt: string } | null
    canSend?: boolean
}) {
    const [contactModalOpen, setContactModalOpen] = useState(false)
    const [reply, setReply]         = useState('')
    const [replyType, setReplyType] = useState<'reply' | 'note'>('reply')
    const [messages, setMessages]   = useState<LocalMessage[]>([])
    const [loadingMsgs, setLoadingMsgs] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore]     = useState(false)
    const oldestDateRef = useRef<string | null>(null)
    const msgListRef    = useRef<HTMLDivElement>(null)
    const [sending, setSending]     = useState(false)
    const [assigning, setAssigning] = useState(false)
    const [resolving, setResolving] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const defaultChannel = contact.channel?.type === 'whatsapp' ? contact.channel : null
    const [selectedChannel, setSelectedChannel] = useState<ChannelRef | null>(defaultChannel)

    type TagRef = { id: string; name: string; color: string }
    const [contactTags, setContactTags] = useState<TagRef[]>((contact.tags ?? []).map((t) => t.tag))
    const [allTags, setAllTags]         = useState<TagRef[]>([])
    const [tagMenuOpen, setTagMenuOpen] = useState(false)

    useEffect(() => {
        api.get('/tags', { params: { orgId } })
            .then(({ data }) => setAllTags(data))
            .catch(() => null)
    }, [orgId])

    function parseMessages(raw: Array<{ id: string; content: string; type: string; direction: string; status: string; createdAt: string }>): LocalMessage[] {
        return raw.map((m) => ({
            id: m.id,
            text: m.content,
            type: m.direction === 'inbound' ? 'inbound' : m.type === 'note' ? 'note' : 'reply',
            status: m.status as LocalMessage['status'],
            createdAt: new Date(m.createdAt),
        }))
    }

    // Reload messages when contact changes
    useEffect(() => {
        setSelectedChannel(contact.channel?.type === 'whatsapp' ? contact.channel : null)
        setContactTags((contact.tags ?? []).map((t) => t.tag))
        setReply('')
        setLoadingMsgs(true)
        setHasMore(false)
        oldestDateRef.current = null

        api.get('/messages', { params: { contactId: contact.id, orgId, limit: 50 } })
            .then(({ data }) => {
                const msgs = parseMessages(data.messages)
                setMessages(msgs)
                setHasMore(data.hasMore ?? false)
                if (msgs.length > 0) oldestDateRef.current = msgs[0].createdAt.toISOString()
            })
            .catch(() => setMessages([]))
            .finally(() => setLoadingMsgs(false))

        // Ao abrir uma conversa pendente, marca como "open" automaticamente
        if (contact.convStatus === 'pending') {
            api.patch(`/contacts/${contact.id}/open`, { orgId })
                .then(() => onContactUpdated({ id: contact.id, convStatus: 'open' }))
                .catch(() => null)
        }
    }, [contact.id, orgId])

    async function handleLoadMore() {
        if (!oldestDateRef.current || loadingMore) return
        setLoadingMore(true)
        const scrollEl = msgListRef.current
        const prevScrollHeight = scrollEl?.scrollHeight ?? 0
        try {
            const { data } = await api.get('/messages', {
                params: { contactId: contact.id, orgId, limit: 50, before: oldestDateRef.current },
            })
            const older = parseMessages(data.messages)
            if (older.length > 0) {
                setMessages((prev) => [...older, ...prev])
                setHasMore(data.hasMore ?? false)
                oldestDateRef.current = older[0].createdAt.toISOString()
                // Mantém posição de scroll após prepend
                requestAnimationFrame(() => {
                    if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight - prevScrollHeight
                })
            } else {
                setHasMore(false)
            }
        } catch {
            // silencioso
        } finally {
            setLoadingMore(false)
        }
    }

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Append inbound message when pushed from parent SSE handler
    useEffect(() => {
        if (!incomingMessage) return
        setMessages((prev) => {
            if (prev.find((m) => m.id === incomingMessage.id)) return prev
            return [...prev, {
                id: incomingMessage.id,
                text: incomingMessage.content,
                type: 'inbound' as const,
                status: 'sent' as const,
                createdAt: new Date(incomingMessage.createdAt),
            }]
        })
    }, [incomingMessage])

    async function handleAddTag(tag: TagRef) {
        if (contactTags.find((t) => t.id === tag.id)) return
        try {
            await api.post(`/tags/${tag.id}/contacts`, { contactId: contact.id })
            setContactTags((prev) => [...prev, tag])
        } catch { /* silencioso */ }
        setTagMenuOpen(false)
    }

    async function handleRemoveTag(tagId: string) {
        try {
            await api.delete(`/tags/${tagId}/contacts/${contact.id}`)
            setContactTags((prev) => prev.filter((t) => t.id !== tagId))
        } catch { /* silencioso */ }
    }

    async function handleAssign(memberId: string | null) {
        setAssigning(true)
        try {
            const { data } = await api.patch(`/contacts/${contact.id}/assign`, {
                orgId,
                assignedToId: memberId,
            })
            const member = members.find((m) => m.id === memberId) ?? null
            onContactUpdated({
                id: contact.id,
                assignedToId: data.assignedToId,
                assignedTo: member ? { id: member.id, name: member.name, image: member.image } : null,
            })
        } catch { /* silencioso */ } finally {
            setAssigning(false)
        }
    }

    async function handleResolve() {
        setResolving(true)
        try {
            await api.patch(`/contacts/${contact.id}/resolve`, { orgId })
            onContactUpdated({ id: contact.id, convStatus: 'resolved', assignedToId: null, assignedTo: null })
        } catch { /* silencioso */ } finally {
            setResolving(false)
        }
    }

    async function handleReopen() {
        try {
            await api.patch(`/contacts/${contact.id}/open`, { orgId })
            onContactUpdated({ id: contact.id, convStatus: 'open' })
        } catch { /* silencioso */ }
    }

    const contactNumber = contact.externalId ?? contact.phone?.replace(/^\+/, '') ?? null

    async function saveMessage(params: {
        content: string; type: 'text' | 'note'; direction: 'outbound' | 'inbound'; channelId?: string; status?: string
    }) {
        try {
            await api.post('/messages', {
                orgId,
                contactId: contact.id,
                channelId: params.channelId,
                direction: params.direction,
                type: params.type,
                content: params.content,
                status: params.status ?? 'sent',
            })
        } catch { /* falha silenciosa */ }
    }

    async function handleSend() {
        const text = reply.trim()
        if (!text || sending) return

        if (replyType === 'note') {
            const msg: LocalMessage = { id: crypto.randomUUID(), text, type: 'note', status: 'sent', createdAt: new Date() }
            setMessages((prev) => [...prev, msg])
            setReply('')
            saveMessage({ content: text, type: 'note', direction: 'outbound' })
            return
        }

        if (!selectedChannel) { alert('Selecione um canal WhatsApp para enviar a mensagem.'); return }
        if (!contactNumber)   { alert('Número do contato não encontrado.'); return }

        const tempId = crypto.randomUUID()
        const optimistic: LocalMessage = { id: tempId, text, type: 'reply', status: 'sending', createdAt: new Date() }
        setMessages((prev) => [...prev, optimistic])
        setReply('')
        setSending(true)

        try {
            await api.post(`/channels/${selectedChannel.id}/whatsapp/send`, { number: contactNumber, text })
            setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, status: 'sent' } : m))
            saveMessage({ content: text, type: 'text', direction: 'outbound', channelId: selectedChannel.id, status: 'sent' })
        } catch {
            setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, status: 'error' } : m))
        } finally {
            setSending(false)
        }
    }

    const currentAssignee = contact.assignedTo

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 border-b px-4 py-3">
                <Avatar className="h-8 w-8 shrink-0">
                    {contact.avatarUrl && <AvatarImage src={contact.avatarUrl} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {initials(contact.name)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{contact.name}</p>
                        {contact.channel && (
                            <Badge variant="secondary" className="gap-1 text-xs py-0 h-5">
                                <ChannelIcon
                                    type={contact.channel.type}
                                    className={cn('h-3 w-3', contact.channel.type === 'whatsapp' ? 'text-green-600' : 'text-blue-600')}
                                />
                                {contact.channel.name}
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        <p className="text-xs text-muted-foreground">
                            {contact.phone ?? contact.email ?? 'Sem informação de contato'}
                        </p>
                        {contactTags.map((t) => (
                            <span
                                key={t.id}
                                className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none"
                                style={{ backgroundColor: `${t.color}20`, color: t.color }}
                            >
                                {t.name}
                                <button onClick={() => handleRemoveTag(t.id)} className="ml-0.5 opacity-60 hover:opacity-100">
                                    <X className="h-2.5 w-2.5" />
                                </button>
                            </span>
                        ))}
                        <DropdownMenu open={tagMenuOpen} onOpenChange={setTagMenuOpen}>
                            <DropdownMenuTrigger asChild>
                                <button className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-muted-foreground/30 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                                    <Plus className="h-2.5 w-2.5" />
                                    tag
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-44">
                                {allTags.length === 0 && (
                                    <p className="px-2 py-2 text-xs text-muted-foreground">Crie tags em Configurações.</p>
                                )}
                                {allTags.filter((t) => !contactTags.find((ct) => ct.id === t.id)).map((t) => (
                                    <DropdownMenuItem key={t.id} onClick={() => handleAddTag(t)} className="gap-2 text-xs">
                                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                                        {t.name}
                                    </DropdownMenuItem>
                                ))}
                                {allTags.length > 0 && allTags.every((t) => contactTags.find((ct) => ct.id === t.id)) && (
                                    <p className="px-2 py-2 text-xs text-muted-foreground">Todas as tags já aplicadas.</p>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Agent assignment */}
                <div className="flex items-center gap-1">
                    {/* Assign dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 text-xs max-w-[140px]"
                                disabled={assigning}
                            >
                                {assigning ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : currentAssignee ? (
                                    <>
                                        <Avatar className="h-4 w-4">
                                            {currentAssignee.image && <AvatarImage src={currentAssignee.image} />}
                                            <AvatarFallback className="text-[8px]">
                                                {initials(currentAssignee.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="truncate">{currentAssignee.name.split(' ')[0]}</span>
                                    </>
                                ) : (
                                    <>
                                        <UserCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span className="text-muted-foreground">Atribuir</span>
                                    </>
                                )}
                                <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                            <p className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                Atribuir conversa
                            </p>
                            {members.map((m) => (
                                <DropdownMenuItem
                                    key={m.id}
                                    onClick={() => handleAssign(m.id)}
                                    className={cn('gap-2 text-xs', contact.assignedToId === m.id && 'bg-primary/5 text-primary')}
                                >
                                    <Avatar className="h-5 w-5">
                                        {m.image && <AvatarImage src={m.image} />}
                                        <AvatarFallback className="text-[9px]">{initials(m.name)}</AvatarFallback>
                                    </Avatar>
                                    <span className="flex-1 truncate">{m.name}</span>
                                    {contact.assignedToId === m.id && <Check className="h-3.5 w-3.5" />}
                                </DropdownMenuItem>
                            ))}
                            {currentAssignee && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleAssign(null)} className="gap-2 text-xs text-muted-foreground">
                                        <X className="h-3.5 w-3.5" />
                                        Remover atribuição
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                className="gap-2"
                                onClick={() => setContactModalOpen(true)}
                            >
                                <User className="h-4 w-4" />Ver contato
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="gap-2"
                                onClick={() => setTagMenuOpen(true)}
                            >
                                <Tag className="h-4 w-4" />Adicionar etiqueta
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {contact.convStatus === 'resolved' ? (
                                <DropdownMenuItem
                                    className="gap-2 text-blue-700 focus:text-blue-700"
                                    onClick={handleReopen}
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Reabrir conversa
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem
                                    className="gap-2 text-green-700 focus:text-green-700"
                                    onClick={handleResolve}
                                    disabled={resolving}
                                >
                                    {resolving
                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                        : <CheckCircle2 className="h-4 w-4" />
                                    }
                                    Resolver conversa
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Área de mensagens */}
            <div ref={msgListRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                {/* Botão carregar histórico */}
                {!loadingMsgs && hasMore && (
                    <div className="flex justify-center py-1">
                        <button
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                            className="flex items-center gap-1.5 rounded-full border bg-background px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm hover:text-foreground transition-colors disabled:opacity-50"
                        >
                            {loadingMore
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <RefreshCw className="h-3 w-3" />}
                            {loadingMore ? 'Carregando...' : 'Carregar mensagens anteriores'}
                        </button>
                    </div>
                )}
                {loadingMsgs && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                )}
                {!loadingMsgs && messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                            {contact.channel
                                ? <ChannelIcon type={contact.channel.type} className="h-7 w-7 text-muted-foreground" />
                                : <MessageSquare className="h-7 w-7 text-muted-foreground" />
                            }
                        </div>
                        <div>
                            <p className="text-sm font-medium">Início da conversa com {contact.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {contact.channel
                                    ? `Via ${contact.channel.name} · ${contact.phone ?? contact.email ?? ''}`
                                    : 'Envie uma mensagem para começar.'}
                            </p>
                        </div>
                    </div>
                )}
                {!loadingMsgs && messages.map((msg) => {
                    const isOutbound = msg.type === 'reply' || msg.type === 'note'
                    return (
                        <div key={msg.id} className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}>
                            {!isOutbound && (
                                <Avatar className="h-6 w-6 mr-2 shrink-0 self-end">
                                    {contact.avatarUrl && <AvatarImage src={contact.avatarUrl} />}
                                    <AvatarFallback className="text-[10px] bg-muted">{initials(contact.name)}</AvatarFallback>
                                </Avatar>
                            )}
                            <div className={cn(
                                'max-w-[70%] rounded-2xl px-3 py-2 text-sm',
                                msg.type === 'note'
                                    ? 'bg-amber-50 border border-amber-200 text-amber-900'
                                    : isOutbound
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-foreground'
                            )}>
                                {msg.type === 'note' && (
                                    <p className="text-[10px] font-semibold text-amber-600 mb-0.5">Nota interna</p>
                                )}
                                <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                                <div className="flex items-center justify-end gap-1 mt-1">
                                    <span className={cn('text-[10px]',
                                        msg.type === 'note' ? 'text-amber-500' :
                                        isOutbound ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                    )}>
                                        {msg.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {isOutbound && msg.type !== 'note' && (
                                        msg.status === 'sending' ? <Clock className="h-3 w-3 text-primary-foreground/70" /> :
                                        msg.status === 'sent'    ? <CheckCheck className="h-3 w-3 text-primary-foreground/70" /> :
                                        <span className="text-[10px] text-red-300">!</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Reply box */}
            <div className="border-t px-4 py-3">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <button
                        onClick={() => setReplyType('reply')}
                        className={cn('rounded px-2.5 py-1 text-xs font-medium transition-colors',
                            replyType === 'reply' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}
                    >
                        Resposta
                    </button>
                    <button
                        onClick={() => setReplyType('note')}
                        className={cn('rounded px-2.5 py-1 text-xs font-medium transition-colors',
                            replyType === 'note' ? 'bg-amber-100 text-amber-700' : 'text-muted-foreground hover:text-foreground')}
                    >
                        Nota interna
                    </button>

                    {replyType === 'reply' && waChannels.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className={cn(
                                    'ml-auto flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors border',
                                    selectedChannel
                                        ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                                        : 'border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10'
                                )}>
                                    <MessageCircle className="h-3 w-3" />
                                    <span className="max-w-[120px] truncate">
                                        {selectedChannel ? selectedChannel.name : 'Selecionar instância'}
                                    </span>
                                    <ChevronDown className="h-3 w-3 opacity-60" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                                <p className="px-2 py-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                                    Instância WhatsApp
                                </p>
                                {waChannels.map((ch) => (
                                    <DropdownMenuItem
                                        key={ch.id}
                                        onClick={() => {
                                            setSelectedChannel(ch)
                                            api.patch(`/contacts/${contact.id}`, { channelId: ch.id }).catch(() => null)
                                            onContactUpdated({ id: contact.id, channelId: ch.id, channel: ch })
                                        }}
                                        className={cn('gap-2 text-xs', selectedChannel?.id === ch.id && 'bg-primary/5 text-primary')}
                                    >
                                        <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                                        <span className="flex-1 truncate">{ch.name}</span>
                                        {ch.status === 'connected'
                                            ? <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                            : <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                                        }
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
                {canSend && (<>
                <div className="flex gap-2 items-end">
                    <div className="flex-1 relative">
                        <Textarea
                            placeholder={replyType === 'reply' ? 'Digite sua mensagem...' : 'Nota interna (visível apenas para a equipe)...'}
                            className={cn('min-h-[80px] resize-none pr-10 text-sm', replyType === 'note' && 'bg-amber-50 border-amber-200')}
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                    e.preventDefault()
                                    handleSend()
                                }
                            }}
                        />
                        <Button variant="ghost" size="icon" className="absolute right-2 bottom-2 h-6 w-6">
                            <Smile className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                            size="icon"
                            className={cn('h-8 w-8', replyType === 'note' && 'bg-amber-500 hover:bg-amber-600')}
                            disabled={!reply.trim() || sending}
                            onClick={handleSend}
                        >
                            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                    <kbd className="font-mono">Ctrl + Enter</kbd> para enviar
                </p>
                </>)}
            </div>

            {/* Modal de detalhes do contato */}
            <ContactModal
                contact={contact}
                open={contactModalOpen}
                onClose={() => setContactModalOpen(false)}
            />
        </div>
    )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

function ConversationsPageInner() {
    const { data: perms } = usePermissions()
    const canSend = perms?.permissions.canSendMessages !== false
    const ownOnly = perms?.permissions.canViewOwnConversationsOnly === true

    const router        = useRouter()
    const searchParams  = useSearchParams()
    const channelFilter = searchParams.get('channelId')
    const tagFilter     = searchParams.get('tagId')
    const contactFilter = searchParams.get('contactId')

    const { orgId, userId }           = useOrgAndUser()
    const [status, setStatus]         = useState<ConvStatus>('open')
    const [tab, setTab]               = useState<ConvTab>('all')
    const [contacts, setContacts]     = useState<Contact[]>([])
    const [loading, setLoading]       = useState(true)
    const [selected, setSelected]     = useState<Contact | null>(null)
    const [waChannels, setWaChannels] = useState<ChannelRef[]>([])
    const [members, setMembers]       = useState<MemberRef[]>([])
    const [tags, setTags]             = useState<OrgTagRef[]>([])
    const [unreadIds, setUnreadIds]       = useState<Map<string, number>>(new Map())
    const [incomingMessage, setIncoming]  = useState<{ id: string; content: string; createdAt: string } | null>(null)

    const loadContacts = useCallback(async (id: string, tId?: string | null) => {
        setLoading(true)
        try {
            const { data } = await api.get('/contacts', {
                params: { orgId: id, limit: 500, hasMessages: true, ...(tId ? { tagId: tId } : {}), ...(ownOnly && userId ? { assignedToUserId: userId } : {}) },
            })
            setContacts(data.contacts)
        } catch {
            setContacts([])
        } finally {
            setLoading(false)
        }
    }, [ownOnly, userId])

    const loadChannels = useCallback(async (id: string) => {
        try {
            const { data } = await api.get('/channels', { params: { orgId: id } })
            setWaChannels((data as ChannelRef[]).filter((c) => c.type === 'whatsapp' && c.status === 'connected'))
        } catch { setWaChannels([]) }
    }, [])

    const loadMembers = useCallback(async (id: string) => {
        try {
            const { data } = await api.get('/agent/members', { params: { orgId: id } })
            const flat: MemberRef[] = (data as RawMember[]).map((m) => ({
                id:    m.user.id,
                name:  m.user.name,
                email: m.user.email,
                image: m.user.image,
            }))
            setMembers(flat)
        } catch { setMembers([]) }
    }, [])

    const loadTags = useCallback(async (id: string) => {
        try {
            const { data } = await api.get('/tags', { params: { orgId: id } })
            setTags(data)
        } catch { setTags([]) }
    }, [])

    useEffect(() => {
        if (orgId) {
            loadContacts(orgId, tagFilter)
            loadChannels(orgId)
            loadMembers(orgId)
            loadTags(orgId)
        }
    }, [orgId, tagFilter, loadContacts, loadChannels, loadMembers, loadTags])

    // Auto-seleciona contato pelo contactId da URL
    useEffect(() => {
        if (contactFilter && contacts.length > 0 && !selected) {
            const found = contacts.find((c) => c.id === contactFilter)
            if (found) setSelected(found)
        }
    }, [contactFilter, contacts, selected])

    // ── SSE: real-time events from agent SSE stream ───────────────────────────

    const selectedRef = useRef(selected)
    selectedRef.current = selected
    const contactsRef = useRef(contacts)
    contactsRef.current = contacts

    const handleNewMessage = useCallback((ev: SseNewMessage) => {
        const { contactId, message } = ev
        if (selectedRef.current?.id === contactId) {
            // Push message into the detail panel
            setIncoming({ id: message.id, content: message.content, createdAt: message.createdAt })
        } else {
            // Mark as unread
            setUnreadIds((prev) => {
                const next = new Map(prev)
                next.set(contactId, (prev.get(contactId) ?? 0) + 1)
                return next
            })
            // Sonner toast for incoming message (not the selected contact)
            const contactName = ev.contactName ?? ev.contact?.name ?? contactsRef.current.find((c) => c.id === contactId)?.name ?? 'Novo contato'
            const avatarUrl   = ev.contactAvatarUrl ?? ev.contact?.avatarUrl ?? contactsRef.current.find((c) => c.id === contactId)?.avatarUrl ?? undefined
            const preview     = message.content.slice(0, 80) + (message.content.length > 80 ? '…' : '')
            toast(contactName, {
                description: preview,
                icon: avatarUrl
                    ? <img src={avatarUrl} alt={contactName} className="h-8 w-8 rounded-full object-cover" />
                    : undefined,
                duration: 5000,
            })
        }
        // Bubble the contact to top of list (or add if new contact)
        setContacts((prev) => {
            const idx = prev.findIndex((c) => c.id === contactId)
            if (idx === -1) {
                // Novo contato criado pelo webhook — adiciona ao topo se temos os dados
                if (ev.contact) {
                    const newContact: Contact = {
                        id:         ev.contact.id,
                        name:       ev.contact.name,
                        phone:      ev.contact.phone,
                        avatarUrl:  ev.contact.avatarUrl,
                        externalId: ev.contact.externalId,
                        channelId:  ev.contact.channelId,
                        convStatus: ev.contact.convStatus,
                        createdAt:  ev.contact.createdAt,
                        tags:       [],
                    }
                    return [newContact, ...prev]
                }
                return prev
            }
            if (idx === 0) return prev // já no topo
            const updated = [...prev]
            const [item] = updated.splice(idx, 1)
            return [item, ...updated]
        })
    }, [])

    const handleConvUpdated = useCallback((ev: SseConvUpdated) => {
        setContacts((prev) => prev.map((c) => {
            if (c.id !== ev.contactId) return c
            return {
                ...c,
                convStatus: ev.convStatus,
                assignedToId: ev.assignedToId,
                assignedTo: ev.assignedToName
                    ? { id: ev.assignedToId ?? '', name: ev.assignedToName, image: null }
                    : null,
            }
        }))
        setSelected((prev) => {
            if (!prev || prev.id !== ev.contactId) return prev
            return {
                ...prev,
                convStatus: ev.convStatus,
                assignedToId: ev.assignedToId,
                assignedTo: ev.assignedToName
                    ? { id: ev.assignedToId ?? '', name: ev.assignedToName, image: null }
                    : null,
            }
        })
    }, [])

    useAgentSse(orgId, { onNewMessage: handleNewMessage, onConvUpdated: handleConvUpdated })

    // ── Contact update handler (from assign / resolve) ────────────────────────

    const handleContactUpdated = useCallback((updated: Partial<Contact> & { id: string }) => {
        setContacts((prev) => prev.map((c) => c.id === updated.id ? { ...c, ...updated } : c))
        setSelected((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev))
    }, [])

    function handleSelectContact(c: Contact) {
        setSelected(c)
        setIncoming(null)
        setUnreadIds((prev) => {
            const next = new Map(prev)
            next.delete(c.id)
            return next
        })
        const params = new URLSearchParams(searchParams.toString())
        params.set('contactId', c.id)
        router.replace(`/conversations?${params.toString()}`)
    }

    function handleTagFilterChange(tagId: string | null) {
        const params = new URLSearchParams(searchParams.toString())
        if (tagId) params.set('tagId', tagId)
        else params.delete('tagId')
        params.delete('contactId')
        router.replace(`/conversations?${params.toString()}`)
    }

    if (perms && !perms.permissions.canViewConversations) return <NoPermission />

    return (
        <div className="flex flex-1 overflow-hidden">
            <ConversationList
                contacts={contacts}
                loading={loading}
                selected={selected}
                onSelect={handleSelectContact}
                status={status}
                tab={tab}
                onStatusChange={setStatus}
                onTabChange={setTab}
                channelFilter={channelFilter}
                userId={userId}
                unreadIds={unreadIds}
                tags={tags}
                tagFilter={tagFilter}
                onTagFilterChange={handleTagFilterChange}
                orgId={orgId}
                onContactUpdated={handleContactUpdated}
            />
            <div className="flex flex-1 overflow-hidden">
                {selected && orgId
                    ? (
                        <ConversationDetail
                            key={selected.id}
                            contact={selected}
                            waChannels={waChannels}
                            orgId={orgId}
                            members={members}
                            onContactUpdated={handleContactUpdated}
                            incomingMessage={incomingMessage}
                            canSend={canSend}
                        />
                    )
                    : <ConversationEmpty />
                }
            </div>
        </div>
    )
}

export default function ConversationsPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        }>
            <ConversationsPageInner />
        </Suspense>
    )
}
