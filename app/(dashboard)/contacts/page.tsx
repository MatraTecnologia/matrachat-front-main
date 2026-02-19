'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
    Users, Plus, Search, Loader2, Pencil, Trash2,
    Phone, Mail, ChevronLeft, ChevronRight, RefreshCw,
    MessageCircle, Globe, Hash,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { api } from '@/lib/api'
import { usePermissions } from '@/contexts/permissions-context'
import { NoPermission } from '@/components/no-permission'

// ─── Tipos ─────────────────────────────────────────────────────────────────────

type ChannelRef = { id: string; name: string; type: string; status: string }

type Contact = {
    id: string
    name: string
    phone?: string | null
    email?: string | null
    avatarUrl?: string | null
    channelId?: string | null
    externalId?: string | null
    notes?: string | null
    createdAt: string
    channel?: ChannelRef | null
}

type ContactsResponse = {
    total: number; page: number; limit: number; contacts: Contact[]
}

// ─── Hook: orgId ───────────────────────────────────────────────────────────────

function useOrgId() {
    const [orgId, setOrgId] = useState<string | null>(null)
    useEffect(() => {
        api.get('/organizations')
            .then(({ data }) => { if (Array.isArray(data) && data.length > 0) setOrgId(data[0].id) })
            .catch(() => null)
    }, [])
    return orgId
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

function channelColor(type: string) {
    if (type === 'whatsapp') return 'text-green-600'
    return 'text-blue-600'
}

// ─── Origin Badge ─────────────────────────────────────────────────────────────

function OriginBadge({ channel }: { channel?: ChannelRef | null }) {
    if (!channel) return null
    return (
        <Badge variant="secondary" className="gap-1 text-xs py-0 h-5 shrink-0">
            <ChannelIcon type={channel.type} className={`h-3 w-3 ${channelColor(channel.type)}`} />
            {channel.name}
        </Badge>
    )
}

// ─── Form Dialog ──────────────────────────────────────────────────────────────

type FormData = { name: string; phone: string; email: string; notes: string }

function ContactDialog({ open, onClose, onSaved, orgId, contact }: {
    open: boolean; onClose: () => void; onSaved: () => void; orgId: string; contact?: Contact
}) {
    const isEdit = !!contact
    const [form, setForm] = useState<FormData>({ name: '', phone: '', email: '', notes: '' })
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        setForm({
            name:  contact?.name  ?? '',
            phone: contact?.phone ?? '',
            email: contact?.email ?? '',
            notes: contact?.notes ?? '',
        })
    }, [contact, open])

    function set(field: keyof FormData, value: string) { setForm((f) => ({ ...f, [field]: value })) }

    async function handleSave() {
        if (!form.name.trim()) { toast.error('O nome é obrigatório.'); return }
        setLoading(true)
        try {
            if (isEdit) {
                await api.patch(`/contacts/${contact.id}`, {
                    name: form.name.trim(),
                    phone: form.phone.trim() || undefined,
                    email: form.email.trim() || undefined,
                    notes: form.notes.trim() || undefined,
                })
                toast.success('Contato atualizado.')
            } else {
                await api.post('/contacts', {
                    name: form.name.trim(),
                    phone: form.phone.trim() || undefined,
                    email: form.email.trim() || undefined,
                    notes: form.notes.trim() || undefined,
                })
                toast.success('Contato criado.')
            }
            onSaved(); onClose()
        } catch { toast.error('Erro ao salvar contato.') }
        finally { setLoading(false) }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle>{isEdit ? 'Editar contato' : 'Novo contato'}</DialogTitle></DialogHeader>
                <div className="space-y-3 py-1">
                    <div className="space-y-1.5">
                        <Label>Nome *</Label>
                        <Input placeholder="João Silva" value={form.name} onChange={(e) => set('name', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Telefone / WhatsApp</Label>
                        <Input placeholder="+55 11 99999-9999" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>E-mail</Label>
                        <Input type="email" placeholder="joao@empresa.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Observações</Label>
                        <Textarea placeholder="Informações adicionais..." value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEdit ? 'Salvar' : 'Criar contato'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── Contact Row ───────────────────────────────────────────────────────────────

function ContactRow({ contact, onEdit, onDelete }: {
    contact: Contact; onEdit: (c: Contact) => void; onDelete: (c: Contact) => void
}) {
    return (
        <div className="group flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:shadow-sm transition-shadow">
            <Avatar className="h-9 w-9 shrink-0">
                {contact.avatarUrl && <AvatarImage src={contact.avatarUrl} />}
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {initials(contact.name)}
                </AvatarFallback>
            </Avatar>

            <div className="flex flex-1 min-w-0 flex-col gap-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{contact.name}</span>
                    <OriginBadge channel={contact.channel} />
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {contact.phone && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />{contact.phone}
                        </span>
                    )}
                    {contact.email && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />{contact.email}
                        </span>
                    )}
                    {!contact.phone && !contact.email && (
                        <span className="text-xs text-muted-foreground/60">Sem informação de contato</span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(contact)}>
                    <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(contact)}>
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const LIMIT = 30

export default function ContactsPage() {
    const { data: perms } = usePermissions()
    const orgId = useOrgId()

    const [contacts, setContacts]         = useState<Contact[]>([])
    const [total, setTotal]               = useState(0)
    const [page, setPage]                 = useState(1)
    const [search, setSearch]             = useState('')
    const [searchInput, setSearchInput]   = useState('')
    const [loading, setLoading]           = useState(true)
    const [waChannels, setWaChannels]     = useState<ChannelRef[]>([])
    const [syncing, setSyncing]           = useState(false)
    const [formOpen, setFormOpen]         = useState(false)
    const [editContact, setEditContact]   = useState<Contact | undefined>()
    const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null)

    const loadContacts = useCallback(async (id: string, q: string, p: number) => {
        setLoading(true)
        try {
            const { data } = await api.get<ContactsResponse>('/contacts', {
                params: { search: q || undefined, page: p, limit: LIMIT },
            })
            setContacts(data.contacts)
            setTotal(data.total)
        } catch { toast.error('Erro ao carregar contatos.') }
        finally { setLoading(false) }
    }, [])

    useEffect(() => {
        if (!orgId) return
        api.get('/channels', { params: { orgId } })
            .then(({ data }) => setWaChannels((data as ChannelRef[]).filter((c) => c.type === 'whatsapp' && c.status === 'connected')))
            .catch(() => null)
    }, [orgId])

    useEffect(() => { if (orgId) loadContacts(orgId, search, page) }, [orgId, search, page, loadContacts])

    useEffect(() => {
        const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 350)
        return () => clearTimeout(t)
    }, [searchInput])

    async function handleSync(channelId: string, channelName: string) {
        setSyncing(true)
        try {
            const { data } = await api.post(`/contacts/sync/${channelId}`)
            toast.success(`${data.synced} novos, ${data.updated} atualizados — ${channelName}`)
            if (orgId) loadContacts(orgId, search, page)
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Erro ao sincronizar.')
        } finally { setSyncing(false) }
    }

    async function handleDeleteConfirm() {
        if (!deleteTarget) return
        try {
            await api.delete(`/contacts/${deleteTarget.id}`)
            setDeleteTarget(null)
            if (orgId) loadContacts(orgId, search, page)
            toast.success('Contato removido.')
        } catch { toast.error('Erro ao remover contato.') }
    }

    const totalPages = Math.ceil(total / LIMIT)
    const isEmpty    = !loading && contacts.length === 0

    if (perms && !perms.permissions.canManageContacts) return <NoPermission />

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
                <div>
                    <h1 className="text-lg font-semibold">Contatos</h1>
                    <p className="text-sm text-muted-foreground">
                        {loading ? '...' : `${total} contato${total !== 1 ? 's' : ''}`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {waChannels.length === 1 && (
                        <Button variant="outline" onClick={() => handleSync(waChannels[0].id, waChannels[0].name)} disabled={syncing || !orgId}>
                            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                            Sincronizar WhatsApp
                        </Button>
                    )}
                    {waChannels.length > 1 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" disabled={syncing || !orgId}>
                                    {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                    Sincronizar WhatsApp
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {waChannels.map((ch) => (
                                    <DropdownMenuItem key={ch.id} onClick={() => handleSync(ch.id, ch.name)} className="gap-2">
                                        <MessageCircle className="h-4 w-4 text-green-600" />{ch.name}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    <Button onClick={() => { setEditContact(undefined); setFormOpen(true) }} disabled={!orgId}>
                        <Plus className="mr-2 h-4 w-4" />Novo contato
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="border-b px-6 py-3">
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Buscar por nome, telefone ou e-mail..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
                </div>
            </div>

            {(loading || isEmpty) && (
                <div className="flex flex-1 items-center justify-center">
                    {loading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
                    {isEmpty && (
                        <div className="flex flex-col items-center gap-4 text-center px-8">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                                <Users className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="font-semibold text-base">{searchInput ? 'Nenhum contato encontrado' : 'Nenhum contato ainda'}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {searchInput ? 'Tente buscar por outro nome, telefone ou e-mail.' : waChannels.length > 0 ? 'Sincronize sua instância WhatsApp ou adicione manualmente.' : 'Adicione seu primeiro contato para começar.'}
                                </p>
                            </div>
                            {!searchInput && (
                                <div className="flex gap-2">
                                    {waChannels.length === 1 && (
                                        <Button variant="outline" onClick={() => handleSync(waChannels[0].id, waChannels[0].name)} disabled={syncing}>
                                            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                            Sincronizar WhatsApp
                                        </Button>
                                    )}
                                    <Button onClick={() => { setEditContact(undefined); setFormOpen(true) }} disabled={!orgId}>
                                        <Plus className="mr-2 h-4 w-4" />Novo contato
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {!loading && contacts.length > 0 && (
                <div className="flex flex-1 flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                        <div className="max-w-3xl space-y-2">
                            {contacts.map((c) => (
                                <ContactRow key={c.id} contact={c}
                                    onEdit={(c) => { setEditContact(c); setFormOpen(true) }}
                                    onDelete={setDeleteTarget}
                                />
                            ))}
                        </div>
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t px-6 py-3">
                            <span className="text-xs text-muted-foreground">Página {page} de {totalPages} — {total} contatos</span>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                                    <ChevronLeft className="h-4 w-4" />Anterior
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                                    Próxima<ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {orgId && (
                <ContactDialog open={formOpen} onClose={() => { setFormOpen(false); setEditContact(undefined) }}
                    onSaved={() => orgId && loadContacts(orgId, search, page)}
                    orgId={orgId} contact={editContact}
                />
            )}

            <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remover contato?</AlertDialogTitle>
                        <AlertDialogDescription>
                            <strong>{deleteTarget?.name}</strong> será removido permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDeleteConfirm}>
                            Remover
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
