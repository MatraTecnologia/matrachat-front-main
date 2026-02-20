'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
    MessageCircle, Globe, Hash, Tag, Loader2,
    ExternalLink, Settings2, Plus, Check, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { usePermissions } from '@/contexts/permissions-context'
import { NoPermission } from '@/components/no-permission'

// Cores predefinidas para novas tags
const PRESET_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
    '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#3b82f6', '#06b6d4', '#64748b', '#a16207',
]

// ─── Types ─────────────────────────────────────────────────────────────────────

type OrgTag = { id: string; name: string; color: string }
type ContactTagItem = { tag: OrgTag }
type Channel = { id: string; name: string; type: string; status: string }
type AssignedTo = { id: string; name: string; image?: string | null }

type Contact = {
    id: string
    name: string
    phone?: string | null
    email?: string | null
    avatarUrl?: string | null
    convStatus: string
    assignedToId?: string | null
    assignedTo?: AssignedTo | null
    channel?: Channel | null
    tags: ContactTagItem[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
    return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

function ChannelIcon({ type, className }: { type: string; className?: string }) {
    if (type === 'whatsapp') return <MessageCircle className={className} />
    if (type === 'api') return <Globe className={className} />
    return <Hash className={className} />
}

function useOrgId() {
    const [orgId, setOrgId] = useState<string | null>(null)
    useEffect(() => {
        api.get('/organizations')
            .then(({ data }) => { if (Array.isArray(data) && data.length > 0) setOrgId(data[0].id) })
            .catch(() => null)
    }, [])
    return orgId
}

// ─── KanbanCard ────────────────────────────────────────────────────────────────

function KanbanCard({
    contact,
    isDragging,
    onDragStart,
    onDragEnd,
    onClick,
}: {
    contact: Contact
    isDragging: boolean
    onDragStart: (contactId: string, sourceTagId: string | null) => void
    onDragEnd: () => void
    onClick: () => void
}) {
    const primaryTag = contact.tags[0]?.tag ?? null
    const extraTags = contact.tags.slice(1)

    const statusColor =
        contact.convStatus === 'open' ? 'bg-emerald-500' :
            contact.convStatus === 'pending' ? 'bg-amber-400' :
                'bg-slate-300'

    return (
        <div
            draggable
            onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move'
                onDragStart(contact.id, primaryTag?.id ?? null)
            }}
            onDragEnd={onDragEnd}
            onClick={onClick}
            className={cn(
                'relative group bg-background rounded-xl border border-border px-3 py-2.5 cursor-grab',
                'active:cursor-grabbing hover:border-primary/30 hover:shadow-md transition-all select-none',
                isDragging && 'opacity-40 scale-95',
            )}
        >
            {/* Status stripe */}
            <div className={cn('absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full', statusColor)} />

            <div className="flex items-start gap-2.5 pl-1.5">
                {/* Avatar */}
                <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                    {contact.avatarUrl && <AvatarImage src={contact.avatarUrl} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-semibold">
                        {initials(contact.name)}
                    </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                    {/* Name + channel icon */}
                    <div className="flex items-center justify-between gap-1">
                        <span className="text-[13px] font-semibold truncate leading-snug">
                            {contact.name}
                        </span>
                        {contact.channel && (
                            <ChannelIcon
                                type={contact.channel.type}
                                className={cn(
                                    'h-3.5 w-3.5 shrink-0',
                                    contact.channel.type === 'whatsapp' ? 'text-emerald-500' : 'text-blue-500'
                                )}
                            />
                        )}
                    </div>

                    {/* Phone / email */}
                    {(contact.phone || contact.email) && (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {contact.phone ?? contact.email}
                        </p>
                    )}

                    {/* Bottom row: extra tags + assigned member */}
                    {(extraTags.length > 0 || contact.assignedTo) && (
                        <div className="flex items-center justify-between gap-1 mt-2">
                            <div className="flex gap-1 flex-wrap min-w-0">
                                {extraTags.map((ct) => (
                                    <span
                                        key={ct.tag.id}
                                        className="inline-block rounded-full px-1.5 text-[10px] font-medium leading-5"
                                        style={{
                                            backgroundColor: ct.tag.color + '28',
                                            color: ct.tag.color,
                                        }}
                                    >
                                        {ct.tag.name}
                                    </span>
                                ))}
                            </div>

                            {contact.assignedTo && (
                                <Avatar className="h-[18px] w-[18px] shrink-0 ring-1 ring-background">
                                    {contact.assignedTo.image && <AvatarImage src={contact.assignedTo.image} />}
                                    <AvatarFallback className="text-[8px] bg-muted-foreground/25 text-foreground">
                                        {initials(contact.assignedTo.name)}
                                    </AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Open in conversations link */}
            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="h-3 w-3 text-muted-foreground/60" />
            </div>
        </div>
    )
}

// ─── KanbanColumn ──────────────────────────────────────────────────────────────

function KanbanColumn({
    tag,
    contacts,
    isOver,
    draggingId,
    onDragOver,
    onDragLeave,
    onDrop,
    onDragStart,
    onDragEnd,
    onCardClick,
}: {
    tag: OrgTag | null
    contacts: Contact[]
    isOver: boolean
    draggingId: string | null
    onDragOver: (tagId: string | null) => void
    onDragLeave: () => void
    onDrop: (targetTagId: string | null) => void
    onDragStart: (contactId: string, sourceTagId: string | null) => void
    onDragEnd: () => void
    onCardClick: (contact: Contact) => void
}) {
    const colColor = tag?.color ?? '#94a3b8'

    return (
        <div className="flex flex-col w-[270px] shrink-0 h-full">
            {/* Column header */}
            <div className="flex items-center gap-2 mb-3 px-0.5">
                <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: colColor }}
                />
                <span className="text-[13px] font-semibold truncate flex-1 text-foreground">
                    {tag?.name ?? 'Sem tag'}
                </span>
                <span
                    className="text-[11px] font-semibold rounded-full px-2 py-0.5 shrink-0"
                    style={{
                        backgroundColor: colColor + '20',
                        color: colColor,
                    }}
                >
                    {contacts.length}
                </span>
            </div>

            {/* Top accent line */}
            <div
                className="h-1 rounded-full mb-2 opacity-60"
                style={{ backgroundColor: colColor }}
            />

            {/* Drop zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); onDragOver(tag?.id ?? null) }}
                onDragLeave={onDragLeave}
                onDrop={(e) => { e.preventDefault(); onDrop(tag?.id ?? null) }}
                className={cn(
                    'flex-1 flex flex-col gap-2 rounded-xl p-2 overflow-y-auto transition-all duration-150',
                    isOver
                        ? 'bg-primary/6 ring-2 ring-dashed ring-primary/40'
                        : 'bg-muted/40',
                )}
            >
                {contacts.map((c) => (
                    <KanbanCard
                        key={c.id}
                        contact={c}
                        isDragging={draggingId === c.id}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                        onClick={() => onCardClick(c)}
                    />
                ))}

                {/* Empty / drop hint */}
                {contacts.length === 0 && (
                    <div className={cn(
                        'flex-1 flex flex-col items-center justify-center gap-1.5 min-h-[120px] rounded-lg transition-colors',
                        isOver ? 'text-primary/70' : 'text-muted-foreground/40'
                    )}>
                        {isOver ? (
                            <p className="text-sm font-medium">Soltar aqui</p>
                        ) : (
                            <p className="text-xs">Sem contatos</p>
                        )}
                    </div>
                )}

                {/* Drop hint at bottom when has cards */}
                {contacts.length > 0 && isOver && (
                    <div className="h-8 rounded-lg border-2 border-dashed border-primary/40 flex items-center justify-center">
                        <p className="text-xs text-primary/60 font-medium">Soltar aqui</p>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── AddColumnButton ───────────────────────────────────────────────────────────

function AddColumnButton({
    onCreated,
}: {
    onCreated: (tag: OrgTag) => void
}) {
    const [open, setOpen] = useState(false)
    const [name, setName] = useState('')
    const [color, setColor] = useState(PRESET_COLORS[0])
    const [saving, setSaving] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    function handleOpen() {
        setName('')
        setColor(PRESET_COLORS[0])
        setOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
    }

    async function handleCreate() {
        const trimmed = name.trim()
        if (!trimmed || saving) return
        setSaving(true)
        try {
            const { data } = await api.post('/tags', { name: trimmed, color })
            onCreated(data)
            setOpen(false)
        } catch {
            /* silencioso */
        } finally {
            setSaving(false)
        }
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter') { e.preventDefault(); handleCreate() }
        if (e.key === 'Escape') setOpen(false)
    }

    if (!open) {
        return (
            <div className="flex flex-col w-[270px] shrink-0 h-full">
                <button
                    onClick={handleOpen}
                    className="flex items-center gap-2 w-full rounded-xl border-2 border-dashed border-border/60 px-4 py-3 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-muted/30 transition-all text-sm font-medium mt-[28px]"
                >
                    <Plus className="h-4 w-4" />
                    Nova coluna
                </button>
            </div>
        )
    }

    return (
        <div className="flex flex-col w-[270px] shrink-0 h-full">
            <div className="rounded-xl border bg-background shadow-sm p-3 mt-[28px] space-y-3">
                <p className="text-xs font-semibold text-foreground">Nova coluna</p>

                {/* Nome */}
                <Input
                    ref={inputRef}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Nome da coluna…"
                    className="h-8 text-sm"
                />

                {/* Seletor de cor */}
                <div className="flex flex-wrap gap-1.5">
                    {PRESET_COLORS.map((c) => (
                        <button
                            key={c}
                            onClick={() => setColor(c)}
                            className="h-5 w-5 rounded-full ring-offset-background transition-all"
                            style={{ backgroundColor: c }}
                            title={c}
                        >
                            {color === c && (
                                <Check className="h-3 w-3 text-white mx-auto" strokeWidth={3} />
                            )}
                        </button>
                    ))}
                </div>

                {/* Ações */}
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        className="flex-1 h-7 text-xs"
                        onClick={handleCreate}
                        disabled={!name.trim() || saving}
                    >
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Criar'}
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => setOpen(false)}
                    >
                        <X className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function KanbanPage() {
    const { data: perms } = usePermissions()
    const router = useRouter()
    const orgId = useOrgId()

    const [tags, setTags] = useState<OrgTag[]>([])
    const [contacts, setContacts] = useState<Contact[]>([])
    const [loading, setLoading] = useState(true)

    // Drag state
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const [overColumn, setOverColumn] = useState<string | null>(null)  // tagId or '__notag__'
    const dragInfo = useRef<{ contactId: string; sourceTagId: string | null } | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [tagsRes, contactsRes] = await Promise.all([
                api.get('/tags'),
                api.get('/contacts', { params: { limit: 500 } }),
            ])
            setTags(tagsRes.data)
            setContacts(contactsRes.data.contacts ?? [])
        } catch {
            setTags([])
            setContacts([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (orgId) load()
    }, [orgId, load])

    // ── Drag handlers ──────────────────────────────────────────────────────────

    function handleDragStart(contactId: string, sourceTagId: string | null) {
        dragInfo.current = { contactId, sourceTagId }
        setDraggingId(contactId)
    }

    function handleDragEnd() {
        dragInfo.current = null
        setDraggingId(null)
        setOverColumn(null)
    }

    async function handleDrop(targetTagId: string | null) {
        const info = dragInfo.current
        setDraggingId(null)
        setOverColumn(null)
        dragInfo.current = null

        if (!info) return

        const { contactId, sourceTagId } = info
        if (sourceTagId === targetTagId) return

        // Optimistic update: move card
        setContacts((prev) => prev.map((c) => {
            if (c.id !== contactId) return c
            const kept = c.tags.filter((ct) => ct.tag.id !== sourceTagId)
            if (targetTagId) {
                const targetTag = tags.find((t) => t.id === targetTagId)
                if (targetTag) return { ...c, tags: [{ tag: targetTag }, ...kept] }
            }
            return { ...c, tags: kept }
        }))

        // Sync to API
        try {
            if (sourceTagId) {
                await api.delete(`/tags/${sourceTagId}/contacts/${contactId}`)
            }
            if (targetTagId) {
                await api.post(`/tags/${targetTagId}/contacts`, { contactId })
            }
        } catch {
            // Rollback on error
            if (orgId) load()
        }
    }

    function handleDragOver(tagId: string | null) {
        setOverColumn(tagId ?? '__notag__')
    }

    function getColumnContacts(tagId: string | null): Contact[] {
        if (tagId === null) {
            return contacts.filter((c) => !c.tags || c.tags.length === 0)
        }
        return contacts.filter((c) => c.tags?.[0]?.tag.id === tagId)
    }

    function handleCardClick(contact: Contact) {
        router.push(`/conversations?contactId=${contact.id}`)
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (perms && !perms.permissions.canViewConversations) return <NoPermission />


    // Inclui "Sem tag" (null) apenas quando já existem tags, para não duplicar
    // o estado vazio com a coluna vazia ao mesmo tempo
    const columns: (OrgTag | null)[] = tags.length > 0 ? [null, ...tags] : []

    const totalContacts = contacts.length

    // Explicit width so overflow-x-auto scroll reaches the AddColumnButton
    // columns + 1 (empty state when no tags or just AddColumnButton), each 270px wide, gap-5 = 20px, px-6 = 48px, w-4 spacer = 16px
    const colCount = columns.length + 1 + (tags.length === 0 ? 1 : 0)  // +1 for empty state placeholder when no tags
    const boardMinPx = colCount * 270 + (colCount - 1) * 20 + 48 + 16

    return (
        <div className="flex flex-col h-full bg-background min-w-[calc(100vw-256px)]">
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-base font-semibold">Kanban</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {totalContacts} contato{totalContacts !== 1 ? 's' : ''} · {tags.length} tag{tags.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs h-8"
                    onClick={() => router.push('/settings')}
                >
                    <Settings2 className="h-3.5 w-3.5" />
                    Gerenciar tags
                </Button>
            </div>

            {/* ── Board (sempre visível; AddColumnButton presente mesmo sem tags) ── */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden max-w-[90vw]">
                <div
                    className="flex gap-5 h-full px-6 py-5"
                    style={{ width: `${boardMinPx}px`, minWidth: '100%' }}
                >

                    {/* Estado vazio */}
                    {tags.length === 0 && (
                        <div className="flex flex-col items-center justify-center gap-4 text-center w-[270px] shrink-0 text-muted-foreground">
                            <Tag className="h-8 w-8 opacity-40" />
                            <p className="text-xs">Crie a primeira coluna ao lado</p>
                        </div>
                    )}

                    {/* Coluna "Sem tag" + colunas de tags */}
                    {columns.map((tag) => {
                        const colId = tag?.id ?? '__notag__'
                        const colConts = getColumnContacts(tag?.id ?? null)
                        return (
                            <KanbanColumn
                                key={colId}
                                tag={tag}
                                contacts={colConts}
                                isOver={overColumn === colId}
                                draggingId={draggingId}
                                onDragOver={handleDragOver}
                                onDragLeave={() => setOverColumn(null)}
                                onDrop={handleDrop}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                onCardClick={handleCardClick}
                            />
                        )
                    })}

                    {/* Botão nova coluna */}
                    {orgId && (
                        <AddColumnButton
                            onCreated={(tag) => setTags((prev) => [...prev, tag])}
                        />
                    )}

                    {/* Spacer */}
                    <div className="w-4 shrink-0" />
                </div>
            </div>
        </div>
    )
}
