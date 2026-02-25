'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    Users, Plus, Search, Loader2, Pencil, Trash2,
    Phone, Mail, ChevronLeft, ChevronRight, RefreshCw,
    MessageCircle, Globe, Hash, GitMerge, Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
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

function ContactRow({ contact, onEdit, onDelete, onStartConversation }: {
    contact: Contact
    onEdit: (c: Contact) => void
    onDelete: (c: Contact) => void
    onStartConversation: (c: Contact) => void
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
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                    onClick={() => onStartConversation(contact)}
                    title="Iniciar conversa"
                >
                    <MessageCircle className="h-3.5 w-3.5" />
                </Button>
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
    const router = useRouter()

    const [contacts, setContacts]         = useState<Contact[]>([])
    const [total, setTotal]               = useState(0)
    const [page, setPage]                 = useState(1)
    const [search, setSearch]             = useState('')
    const [searchInput, setSearchInput]   = useState('')
    const [loading, setLoading]           = useState(true)
    const [waChannels, setWaChannels]     = useState<ChannelRef[]>([])
    const [syncing, setSyncing]           = useState(false)
    const [unifying, setUnifying]         = useState(false)
    const [unifyOpen, setUnifyOpen]       = useState(false)
    const [unifyResult, setUnifyResult]   = useState<{ mergedGroups: number; removedContacts: number } | null>(null)
    const [unifyProgress, setUnifyProgress] = useState(0)
    const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const [formOpen, setFormOpen]         = useState(false)
    const [editContact, setEditContact]   = useState<Contact | undefined>()
    const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null)
    const [startConvModal, setStartConvModal] = useState<{
        open: boolean
        contact: Contact | null
        channelId: string | null
        message: string
        sending: boolean
    }>({ open: false, contact: null, channelId: null, message: '', sending: false })

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
        api.get('/channels')
            .then(({ data }) => setWaChannels((data as ChannelRef[]).filter((c) => c.type === 'whatsapp' && c.status === 'connected')))
            .catch(() => null)
    }, [orgId])

    useEffect(() => { if (orgId) loadContacts(orgId, search, page) }, [orgId, search, page, loadContacts])

    useEffect(() => {
        const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 350)
        return () => clearTimeout(t)
    }, [searchInput])

    async function handleUnify() {
        setUnifying(true)
        setUnifyProgress(0)

        // Progresso simulado: sobe até ~85% enquanto aguarda resposta
        progressTimerRef.current = setInterval(() => {
            setUnifyProgress((prev) => {
                if (prev >= 85) {
                    clearInterval(progressTimerRef.current!)
                    return 85
                }
                // Incremento mais rápido no início, mais lento ao se aproximar de 85%
                const step = prev < 40 ? 6 : prev < 70 ? 3 : 1
                return Math.min(prev + step, 85)
            })
        }, 300)

        try {
            const { data } = await api.post('/contacts/unify')
            clearInterval(progressTimerRef.current!)
            setUnifyProgress(100)
            await new Promise((r) => setTimeout(r, 400)) // pausa breve para mostrar 100%
            setUnifyResult(data)
            if (orgId) loadContacts(orgId, search, page)
        } catch (err: unknown) {
            clearInterval(progressTimerRef.current!)
            setUnifyProgress(0)
            toast.error(err instanceof Error ? err.message : 'Erro ao unificar contatos.')
            setUnifyOpen(false)
        } finally {
            setUnifying(false)
        }
    }

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

    function handleStartConversation(contact: Contact) {
        // Determina canal inicial: o do contato ou o único disponível
        const initialChannelId = contact.channelId
            ?? (waChannels.length === 1 ? waChannels[0].id : null)
        setStartConvModal({ open: true, contact, channelId: initialChannelId, message: '', sending: false })
    }

    async function handleSendAndNavigate(skipSend: boolean) {
        const { contact, channelId, message } = startConvModal
        if (!contact) return

        setStartConvModal((s) => ({ ...s, sending: true }))
        try {
            // Vincula canal ao contato se mudou ou não tinha
            if (channelId && channelId !== contact.channelId) {
                await api.patch(`/contacts/${contact.id}`, { channelId })
            }

            if (!skipSend && message.trim()) {
                // Salva mensagem no DB (dispara SSE para todos os agentes)
                await api.post('/messages', {
                    contactId: contact.id,
                    channelId,
                    direction: 'outbound',
                    type: 'text',
                    content: message.trim(),
                })

                // Envia via WhatsApp se o canal for whatsapp e o contato tiver número
                const channel = waChannels.find((c) => c.id === channelId)
                const phone = contact.phone ?? contact.externalId
                if (channel?.type === 'whatsapp' && phone) {
                    await api.post(`/channels/${channelId}/whatsapp/send`, {
                        number: phone,
                        text: message.trim(),
                    }).catch(() => null) // não bloqueia se falhar envio
                }
            }
        } catch {
            toast.error('Erro ao enviar mensagem.')
            setStartConvModal((s) => ({ ...s, sending: false }))
            return
        }

        setStartConvModal({ open: false, contact: null, channelId: null, message: '', sending: false })
        router.push(`/conversations?contactId=${contact.id}`)
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
                    <Button variant="outline" onClick={() => { setUnifyResult(null); setUnifyOpen(true) }} disabled={!orgId || unifying}>
                        {unifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GitMerge className="mr-2 h-4 w-4" />}
                        Unificar
                    </Button>
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
                                    onStartConversation={handleStartConversation}
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

            {/* Modal: iniciar conversa */}
            <Dialog
                open={startConvModal.open}
                onOpenChange={(v) => !v && !startConvModal.sending && setStartConvModal({ open: false, contact: null, channelId: null, message: '', sending: false })}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5 text-green-600" />
                            Iniciar conversa
                        </DialogTitle>
                        <DialogDescription>
                            Envie a primeira mensagem para <strong>{startConvModal.contact?.name}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-4 py-1">
                        {/* Seleção de canal — só aparece quando há múltiplas instâncias e o contato não tem canal */}
                        {!startConvModal.contact?.channelId && waChannels.length > 1 && (
                            <div className="flex flex-col gap-2">
                                <Label className="text-xs font-medium text-muted-foreground">Instância WhatsApp</Label>
                                <div className="flex flex-col gap-1.5">
                                    {waChannels.map((ch) => (
                                        <button
                                            key={ch.id}
                                            onClick={() => setStartConvModal((s) => ({ ...s, channelId: ch.id }))}
                                            className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                                                startConvModal.channelId === ch.id
                                                    ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                                                    : 'hover:bg-muted'
                                            }`}
                                        >
                                            <MessageCircle className="h-4 w-4 text-green-600 shrink-0" />
                                            <span className="font-medium">{ch.name}</span>
                                            {startConvModal.channelId === ch.id && (
                                                <span className="ml-auto text-xs text-green-600 font-medium">Selecionado</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Campo de mensagem */}
                        <div className="flex flex-col gap-2">
                            <Label className="text-xs font-medium text-muted-foreground">Mensagem</Label>
                            <Textarea
                                placeholder="Digite sua mensagem..."
                                rows={3}
                                value={startConvModal.message}
                                onChange={(e) => setStartConvModal((s) => ({ ...s, message: e.target.value }))}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        if (startConvModal.message.trim()) handleSendAndNavigate(false)
                                    }
                                }}
                                disabled={startConvModal.sending}
                                autoFocus
                            />
                            <p className="text-[11px] text-muted-foreground">Enter para enviar · Shift+Enter para nova linha</p>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => handleSendAndNavigate(true)}
                            disabled={startConvModal.sending}
                        >
                            Só abrir conversa
                        </Button>
                        <Button
                            onClick={() => handleSendAndNavigate(false)}
                            disabled={startConvModal.sending || !startConvModal.message.trim() || (!startConvModal.channelId && waChannels.length > 0 && !startConvModal.contact?.channelId)}
                        >
                            {startConvModal.sending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="mr-2 h-4 w-4" />
                            )}
                            Enviar e abrir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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

            {/* Dialog Unificar */}
            <Dialog open={unifyOpen} onOpenChange={(v) => { if (!unifying) { setUnifyOpen(v); if (!v) { setUnifyResult(null); setUnifyProgress(0) } } }}>
                <DialogContent className="sm:max-w-md" onInteractOutside={(e) => { if (unifying) e.preventDefault() }}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <GitMerge className="h-5 w-5 text-primary" />
                            {unifyResult ? 'Unificação concluída' : unifying ? 'Unificando contatos...' : 'Unificar contatos duplicados'}
                        </DialogTitle>
                        <DialogDescription asChild>
                            <div className="space-y-3 text-sm text-muted-foreground pt-1">
                                {unifying ? (
                                    <div className="space-y-3">
                                        <p>Comparando contatos e migrando dados. Isso pode levar alguns instantes...</p>
                                        <div className="space-y-1.5">
                                            <Progress value={unifyProgress} className="h-2" />
                                            <p className="text-xs text-right text-muted-foreground">{unifyProgress}%</p>
                                        </div>
                                    </div>
                                ) : unifyResult ? (
                                    unifyResult.mergedGroups === 0 ? (
                                        <p>Nenhum contato duplicado encontrado. Tudo já está unificado!</p>
                                    ) : (
                                        <div className="space-y-1">
                                            <Progress value={100} className="h-2 mb-3" />
                                            <p className="font-medium text-foreground">
                                                {unifyResult.mergedGroups} grupo{unifyResult.mergedGroups !== 1 ? 's' : ''} unificado{unifyResult.mergedGroups !== 1 ? 's' : ''}.
                                            </p>
                                            <p>
                                                {unifyResult.removedContacts} contato{unifyResult.removedContacts !== 1 ? 's' : ''} duplicado{unifyResult.removedContacts !== 1 ? 's' : ''} removido{unifyResult.removedContacts !== 1 ? 's' : ''}.
                                            </p>
                                            <p className="text-xs">As mensagens e tags foram transferidas para o contato com canal vinculado.</p>
                                        </div>
                                    )
                                ) : (
                                    <>
                                        <p>Contatos com o mesmo número de telefone serão unificados.</p>
                                        <p>O contato vinculado ao canal WhatsApp será mantido como principal. As mensagens, tags e campanhas dos duplicados serão transferidas para ele.</p>
                                        <p className="font-medium text-foreground">Esta ação não pode ser desfeita.</p>
                                    </>
                                )}
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        {unifyResult ? (
                            <Button onClick={() => { setUnifyOpen(false); setUnifyResult(null); setUnifyProgress(0) }}>Fechar</Button>
                        ) : (
                            <>
                                <Button variant="outline" onClick={() => setUnifyOpen(false)} disabled={unifying}>Cancelar</Button>
                                <Button onClick={handleUnify} disabled={unifying}>
                                    {unifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Unificar agora
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
