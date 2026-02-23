'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Users, UserPlus, Mail, KeyRound, Trash2, Shield,
    ShieldCheck, ShieldAlert, UserCog, Loader2, MoreHorizontal,
    CheckCircle2, Clock, Search, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { usePermissions } from '@/contexts/permissions-context'
import { NoPermission } from '@/components/no-permission'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'owner' | 'admin' | 'agent' | 'member'

type Member = {
    id: string
    role: Role
    createdAt: string
    user: {
        id: string
        name: string
        email: string
        image?: string | null
        emailVerified?: boolean
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
    return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

const ROLE_META: Record<Role, { label: string; icon: React.ElementType; className: string }> = {
    owner:  { label: 'Owner',        icon: ShieldAlert,  className: 'bg-amber-100 text-amber-700 border-amber-200' },
    admin:  { label: 'Administrador', icon: ShieldCheck,  className: 'bg-blue-100 text-blue-700 border-blue-200' },
    agent:  { label: 'Agente',        icon: UserCog,      className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    member: { label: 'Membro',        icon: Shield,       className: 'bg-slate-100 text-slate-600 border-slate-200' },
}

function RoleBadge({ role }: { role: Role }) {
    const meta = ROLE_META[role] ?? ROLE_META.member
    const Icon = meta.icon
    return (
        <span className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
            meta.className
        )}>
            <Icon className="h-3 w-3" />
            {meta.label}
        </span>
    )
}

function useOrgAndUser() {
    const [orgId, setOrgId]   = useState<string | null>(null)
    const [userId, setUserId] = useState<string | null>(null)
    useEffect(() => {
        api.get('/organizations').then(({ data }) => {
            if (Array.isArray(data) && data.length > 0) setOrgId(data[0].id)
        }).catch(() => null)
        api.get('/auth/get-session').then(({ data }) => {
            if (data?.user?.id) setUserId(data.user.id)
        }).catch(() => null)
    }, [])
    return { orgId, userId }
}

// ─── InviteDialog ─────────────────────────────────────────────────────────────

function InviteDialog({
    open, onClose, orgId, onInvited,
}: {
    open: boolean
    onClose: () => void
    orgId: string
    onInvited: () => void
}) {
    const [email,   setEmail]   = useState('')
    const [role,    setRole]    = useState<string>('agent')
    const [loading, setLoading] = useState(false)

    async function handleInvite() {
        if (!email.trim() || loading) return
        setLoading(true)
        try {
            await api.post(`/organizations/${orgId}/invite`, { email: email.trim(), role })
            toast.success(`Convite enviado para ${email.trim()}`)
            setEmail('')
            setRole('agent')
            onInvited()
            onClose()
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
            toast.error(msg ?? 'Erro ao enviar convite.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        Convidar membro
                    </DialogTitle>
                    <DialogDescription>
                        Digite o e-mail do usuário. Se a conta não existir, será criada automaticamente
                        e um e-mail de definição de senha será enviado.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">E-mail</label>
                        <Input
                            type="email"
                            placeholder="usuario@empresa.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                            autoFocus
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Papel</label>
                        <Select value={role} onValueChange={setRole}>
                            <SelectTrigger className="h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="agent">
                                    <div className="flex items-center gap-2">
                                        <UserCog className="h-3.5 w-3.5 text-emerald-600" />
                                        Agente — atende conversas
                                    </div>
                                </SelectItem>
                                <SelectItem value="admin">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                                        Administrador — gerencia a organização
                                    </div>
                                </SelectItem>
                                <SelectItem value="member">
                                    <div className="flex items-center gap-2">
                                        <Shield className="h-3.5 w-3.5 text-slate-500" />
                                        Membro — acesso básico
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button onClick={handleInvite} disabled={!email.trim() || loading} className="gap-2">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                        Enviar convite
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── ChangeRoleDialog ─────────────────────────────────────────────────────────

function ChangeRoleDialog({
    member, orgId, myRole, onClose, onChanged,
}: {
    member: Member
    orgId: string
    myRole: Role | null
    onClose: () => void
    onChanged: () => void
}) {
    const [role,    setRole]    = useState<string>(member.role)
    const [loading, setLoading] = useState(false)

    async function handleSave() {
        if (role === member.role || loading) return
        setLoading(true)
        try {
            await api.patch(`/organizations/${orgId}/members/${member.id}`, { role })
            toast.success(`Papel de ${member.user.name} alterado para ${ROLE_META[role as Role]?.label ?? role}`)
            onChanged()
            onClose()
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
            toast.error(msg ?? 'Erro ao alterar papel.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Alterar papel</DialogTitle>
                    <DialogDescription>
                        Altere o papel de <strong>{member.user.name}</strong> na organização.
                    </DialogDescription>
                </DialogHeader>

                <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="h-9">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {/* Apenas owners podem atribuir role owner */}
                        {myRole === 'owner' && (
                            <SelectItem value="owner">
                                <div className="flex items-center gap-2">
                                    <ShieldAlert className="h-3.5 w-3.5 text-amber-600" /> Owner
                                </div>
                            </SelectItem>
                        )}
                        <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" /> Administrador
                            </div>
                        </SelectItem>
                        <SelectItem value="agent">
                            <div className="flex items-center gap-2">
                                <UserCog className="h-3.5 w-3.5 text-emerald-600" /> Agente
                            </div>
                        </SelectItem>
                        <SelectItem value="member">
                            <div className="flex items-center gap-2">
                                <Shield className="h-3.5 w-3.5 text-slate-500" /> Membro
                            </div>
                        </SelectItem>
                    </SelectContent>
                </Select>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={role === member.role || loading} className="gap-2">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Salvar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── RemoveConfirmDialog ──────────────────────────────────────────────────────

function RemoveConfirmDialog({
    member, orgId, onClose, onRemoved,
}: {
    member: Member
    orgId: string
    onClose: () => void
    onRemoved: () => void
}) {
    const [loading, setLoading] = useState(false)

    async function handleRemove() {
        setLoading(true)
        try {
            await api.delete(`/organizations/${orgId}/members/${member.id}`)
            toast.success(`${member.user.name} removido da organização.`)
            onRemoved()
            onClose()
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
            toast.error(msg ?? 'Erro ao remover membro.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <Trash2 className="h-4 w-4" />
                        Remover membro
                    </DialogTitle>
                    <DialogDescription>
                        Tem certeza que deseja remover <strong>{member.user.name}</strong> ({member.user.email}) da organização?
                        Essa ação não pode ser desfeita.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button variant="destructive" onClick={handleRemove} disabled={loading} className="gap-2">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Remover
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── MemberRow ────────────────────────────────────────────────────────────────

function MemberRow({
    member, currentUserId, myRole, orgId, onReload,
}: {
    member: Member
    currentUserId: string | null
    myRole: Role | null
    orgId: string
    onReload: () => void
}) {
    const [dialog, setDialog] = useState<'role' | 'remove' | null>(null)
    const [actioning, setActioning] = useState<string | null>(null)

    const isMe       = member.user.id === currentUserId
    const isOwner    = member.role === 'owner'
    // Owners podem gerenciar outros owners (mas não a si mesmos)
    // Admins podem gerenciar apenas agents e members (não owners)
    const canManage  = !isMe && ((myRole === 'owner') || (myRole === 'admin' && !isOwner))
    const canPromote = myRole === 'owner'  // somente owner promove para admin ou owner

    async function sendReset() {
        setActioning('reset')
        try {
            await api.post(`/organizations/${orgId}/members/${member.id}/send-reset-password`)
            toast.success(`E-mail de redefinição enviado para ${member.user.email}`)
        } catch {
            toast.error('Erro ao enviar e-mail de redefinição.')
        } finally {
            setActioning(null)
        }
    }

    async function sendVerification() {
        setActioning('verify')
        try {
            await api.post(`/organizations/${orgId}/members/${member.id}/send-verification`)
            toast.success(`E-mail de verificação reenviado para ${member.user.email}`)
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
            toast.error(msg ?? 'Erro ao reenviar verificação.')
        } finally {
            setActioning(null)
        }
    }

    const joinedAt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
        .format(new Date(member.createdAt))

    return (
        <>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted/40 transition-colors group">
                {/* Avatar */}
                <Avatar className="h-9 w-9 shrink-0">
                    {member.user.image && <AvatarImage src={member.user.image} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {initials(member.user.name)}
                    </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{member.user.name}</span>
                        {isMe && (
                            <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">você</span>
                        )}
                        <RoleBadge role={member.role} />
                        {/* Email verification status */}
                        {member.user.emailVerified === false && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                Aguardando verificação
                            </span>
                        )}
                        {member.user.emailVerified === true && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 opacity-70">
                                <CheckCircle2 className="h-3 w-3" />
                                Verificado
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{member.user.email}</p>
                </div>

                {/* Joined at */}
                <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">{joinedAt}</span>

                {/* Actions */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                        {/* Change role */}
                        {canManage && (
                            <DropdownMenuItem
                                onClick={() => setDialog('role')}
                                className="gap-2 text-xs"
                            >
                                <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                                Alterar papel
                            </DropdownMenuItem>
                        )}

                        {/* Send password reset */}
                        <DropdownMenuItem
                            onClick={sendReset}
                            disabled={actioning === 'reset'}
                            className="gap-2 text-xs"
                        >
                            {actioning === 'reset'
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <KeyRound className="h-3.5 w-3.5 text-violet-500" />
                            }
                            Enviar redefinição de senha
                        </DropdownMenuItem>

                        {/* Send verification */}
                        {member.user.emailVerified === false && (
                            <DropdownMenuItem
                                onClick={sendVerification}
                                disabled={actioning === 'verify'}
                                className="gap-2 text-xs"
                            >
                                {actioning === 'verify'
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <Mail className="h-3.5 w-3.5 text-amber-500" />
                                }
                                Reenviar verificação de e-mail
                            </DropdownMenuItem>
                        )}

                        {/* Remove */}
                        {canManage && !isMe && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => setDialog('remove')}
                                    className="gap-2 text-xs text-destructive focus:text-destructive"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Remover da organização
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Dialogs */}
            {dialog === 'role' && (
                <ChangeRoleDialog
                    member={member}
                    orgId={orgId}
                    myRole={myRole}
                    onClose={() => setDialog(null)}
                    onChanged={onReload}
                />
            )}
            {dialog === 'remove' && (
                <RemoveConfirmDialog
                    member={member}
                    orgId={orgId}
                    onClose={() => setDialog(null)}
                    onRemoved={onReload}
                />
            )}
        </>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MembersPage() {
    const { data: perms } = usePermissions()
    const { orgId, userId } = useOrgAndUser()

    const [members,     setMembers]     = useState<Member[]>([])
    const [loading,     setLoading]     = useState(true)
    const [inviteOpen,  setInviteOpen]  = useState(false)
    const [search,      setSearch]      = useState('')
    const [roleFilter,  setRoleFilter]  = useState<string>('all')

    const load = useCallback(async (id: string) => {
        setLoading(true)
        try {
            const { data } = await api.get(`/organizations/${id}/members`)
            setMembers(data)
        } catch {
            setMembers([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (orgId) load(orgId)
    }, [orgId, load])

    const myMember = members.find((m) => m.user.id === userId)
    const myRole   = (myMember?.role ?? null) as Role | null
    const canInvite = myRole === 'owner' || myRole === 'admin'

    const filtered = members.filter((m) => {
        if (roleFilter !== 'all' && m.role !== roleFilter) return false
        if (!search) return true
        const q = search.toLowerCase()
        return m.user.name.toLowerCase().includes(q) || m.user.email.toLowerCase().includes(q)
    })

    // Stats
    const counts = {
        total:  members.length,
        owners: members.filter((m) => m.role === 'owner').length,
        admins: members.filter((m) => m.role === 'admin').length,
        agents: members.filter((m) => m.role === 'agent').length,
    }

    if (perms && !perms.permissions.canManageMembers) return <NoPermission />

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b shrink-0">
                <div>
                    <h1 className="text-lg font-semibold">Membros</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Gerencie quem tem acesso à organização
                    </p>
                </div>
                {canInvite && (
                    <Button
                        size="sm"
                        className="gap-2"
                        onClick={() => setInviteOpen(true)}
                    >
                        <UserPlus className="h-4 w-4" />
                        Convidar membro
                    </Button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">

                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'Total',         value: counts.total,  icon: Users,       color: 'text-foreground' },
                            { label: 'Owners',        value: counts.owners, icon: ShieldAlert, color: 'text-amber-600' },
                            { label: 'Admins',        value: counts.admins, icon: ShieldCheck, color: 'text-blue-600' },
                            { label: 'Agentes',       value: counts.agents, icon: UserCog,     color: 'text-emerald-600' },
                        ].map((s) => (
                            <div key={s.label} className="rounded-xl border bg-muted/30 px-4 py-3">
                                <div className={cn('flex items-center gap-1.5 text-xs font-medium mb-1', s.color)}>
                                    <s.icon className="h-3.5 w-3.5" />
                                    {s.label}
                                </div>
                                <p className="text-2xl font-bold">{s.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                className="pl-8 h-8 text-xs"
                                placeholder="Buscar por nome ou e-mail..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs shrink-0">
                                    {roleFilter === 'all' ? 'Todos os papéis' : ROLE_META[roleFilter as Role]?.label ?? roleFilter}
                                    <ChevronDown className="h-3.5 w-3.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem onClick={() => setRoleFilter('all')} className="text-xs gap-2">
                                    <Users className="h-3.5 w-3.5" /> Todos
                                    {roleFilter === 'all' && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-primary" />}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {(['owner', 'admin', 'agent', 'member'] as Role[]).map((r) => {
                                    const meta = ROLE_META[r]
                                    return (
                                        <DropdownMenuItem key={r} onClick={() => setRoleFilter(r)} className="text-xs gap-2">
                                            <meta.icon className="h-3.5 w-3.5" />
                                            {meta.label}
                                            {roleFilter === r && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-primary" />}
                                        </DropdownMenuItem>
                                    )
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Members list */}
                    <div className="rounded-xl border overflow-hidden">
                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                                <Users className="h-8 w-8 text-muted-foreground/40" />
                                <p className="text-sm text-muted-foreground">
                                    {search || roleFilter !== 'all' ? 'Nenhum membro encontrado.' : 'Sem membros ainda.'}
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {filtered.map((member) => (
                                    <MemberRow
                                        key={member.id}
                                        member={member}
                                        currentUserId={userId}
                                        myRole={myRole}
                                        orgId={orgId!}
                                        onReload={() => orgId && load(orgId)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Info box */}
                    <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-3 text-xs text-muted-foreground space-y-1">
                        <p className="font-medium text-foreground">Sobre os papéis</p>
                        <p><strong>Owner</strong> — acesso total, não pode ser removido ou rebaixado.</p>
                        <p><strong>Administrador</strong> — gerencia membros, canais e configurações.</p>
                        <p><strong>Agente</strong> — atende conversas e gerencia contatos.</p>
                        <p><strong>Membro</strong> — acesso somente leitura às conversas.</p>
                    </div>
                </div>
            </div>

            {/* Invite dialog */}
            {orgId && (
                <InviteDialog
                    open={inviteOpen}
                    onClose={() => setInviteOpen(false)}
                    orgId={orgId}
                    onInvited={() => load(orgId)}
                />
            )}
        </div>
    )
}
