'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import type { EditorRef } from 'react-email-editor'
import {
    Settings, Users, Building2, Loader2, Trash2, ShieldCheck, Tag, Plus, X, Facebook, Eye, EyeOff, Copy, Check, MessageCircle, Download, Upload, Link2, ImageOff,
    UserPlus, Mail, KeyRound, Shield, ShieldAlert, UserCog, MoreHorizontal, CheckCircle2, Clock, Search, ChevronDown,
    Layers, Lock, Pencil, MessageSquare, BarChart2, Cog, UserCheck, Megaphone, Wifi, Bot,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
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

// ─── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'organization' | 'members' | 'roles' | 'tags' | 'facebook' | 'appearance' | 'email-templates'

type OrgTag = {
    id: string
    name: string
    color: string
    createdAt: string
}

type Org = {
    id: string
    name: string
    slug?: string
    logo?: string
    domain?: string
    fbAppId?: string | null
    fbAppSecret?: string | null
    authSideImage?: string | null
    authBg?: string | null
    logoBg?: string | null
    logoFit?: 'contain' | 'cover' | 'fill' | null
}

type Role = 'owner' | 'admin' | 'agent' | 'member'

type Member = {
    id: string
    role: Role
    customRoleId?: string | null
    createdAt: string
    user: { id: string; name: string; email: string; image?: string | null; emailVerified?: boolean }
    customRole?: { id: string; name: string; color: string } | null
}

type OrgPermissions = {
    canViewConversations: boolean
    canSendMessages: boolean
    canViewOwnConversationsOnly: boolean
    canViewDashboard: boolean
    canManageContacts: boolean
    canManageSettings: boolean
    canManageMembers: boolean
    canManageTags: boolean
    canManageCampaigns: boolean
    canManageChannels: boolean
    canManageAgents: boolean
}

type CustomRole = {
    id: string
    organizationId: string
    name: string
    description?: string | null
    color: string
    permissions: OrgPermissions
    createdAt: string
    _count?: { members: number }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

const ROLE_META: Record<Role, { label: string; icon: React.ElementType; className: string }> = {
    owner:  { label: 'Owner',         icon: ShieldAlert, className: 'bg-amber-100 text-amber-700 border-amber-200' },
    admin:  { label: 'Administrador', icon: ShieldCheck, className: 'bg-blue-100 text-blue-700 border-blue-200' },
    agent:  { label: 'Agente',        icon: UserCog,     className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    member: { label: 'Membro',        icon: Shield,      className: 'bg-slate-100 text-slate-600 border-slate-200' },
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

// ─── Sidebar tab ───────────────────────────────────────────────────────────────

function SidebarItem({ icon: Icon, label, active, onClick }: {
    icon: React.ElementType
    label: string
    active: boolean
    onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left',
                active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
        >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
        </button>
    )
}

// ─── Aba: Organização ──────────────────────────────────────────────────────────

const LOGO_BG_PRESETS = [
    { label: 'Transparente', value: 'transparent' },
    { label: 'Branco', value: '#ffffff' },
    { label: 'Preto', value: '#000000' },
    { label: 'Cinza', value: '#f4f4f5' },
    { label: 'Azul escuro', value: '#0f172a' },
]

const FIT_OPTIONS: { value: 'contain' | 'cover' | 'fill'; label: string; desc: string }[] = [
    { value: 'contain', label: 'Conter', desc: 'Imagem inteira visível' },
    { value: 'cover',   label: 'Preencher', desc: 'Ocupa todo o espaço' },
    { value: 'fill',    label: 'Esticar', desc: 'Ignora proporção' },
]

function OrgTab({ org, onSaved }: { org: Org; onSaved: (updated: Org) => void }) {
    const [name, setName]         = useState(org.name)
    const [logo, setLogo]         = useState(org.logo ?? '')
    const [logoMode, setLogoMode] = useState<'upload' | 'url'>(
        org.logo?.startsWith('data:') ? 'upload' : 'url'
    )
    const [logoBg, setLogoBg]     = useState(org.logoBg ?? 'transparent')
    const [logoFit, setLogoFit]   = useState<'contain' | 'cover' | 'fill'>(org.logoFit ?? 'contain')
    const [imgDims, setImgDims]   = useState<{ w: number; h: number } | null>(null)
    const [imgError, setImgError] = useState(false)
    const [saving, setSaving]     = useState(false)

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Imagem muito grande. Máximo 2 MB.')
            return
        }
        const reader = new FileReader()
        reader.onload = () => { setLogo(reader.result as string); setImgError(false); setImgDims(null) }
        reader.readAsDataURL(file)
    }

    function handleImgLoad(e: React.SyntheticEvent<HTMLImageElement>) {
        const img = e.currentTarget
        setImgDims({ w: img.naturalWidth, h: img.naturalHeight })
    }

    async function handleSave() {
        setSaving(true)
        try {
            const { data } = await api.patch('/organizations/current', {
                name:    name.trim() || undefined,
                logo:    logo.trim() || undefined,
                logoBg:  logoBg !== 'transparent' ? logoBg : null,
                logoFit: logoFit !== 'contain' ? logoFit : null,
            })
            onSaved(data)
            // Persist appearance fields locally in case the GET endpoint doesn't return them
            const prev = JSON.parse(localStorage.getItem('matrachat.appearance') || '{}')
            localStorage.setItem('matrachat.appearance', JSON.stringify({
                ...prev,
                logo:    logo.trim() || null,
                logoBg:  logoBg !== 'transparent' ? logoBg : null,
                logoFit: logoFit !== 'contain' ? logoFit : null,
            }))
            toast.success('Organização atualizada.')
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Erro ao salvar.')
        } finally {
            setSaving(false)
        }
    }

    const hasLogo = logo.trim().length > 0
    const containerBg = logoBg === 'transparent' ? undefined : logoBg

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold">Organização</h2>
                <p className="text-sm text-muted-foreground">
                    Informações gerais da sua organização.
                </p>
            </div>
            <Separator />

            <div className="grid gap-5 max-w-md">
                {/* Nome */}
                <div className="space-y-1.5">
                    <Label htmlFor="org-name">Nome</Label>
                    <Input
                        id="org-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nome da organização"
                    />
                </div>

                {/* Logo */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label>Logo <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                        <div className="flex items-center gap-0.5 rounded-md border p-0.5 text-xs">
                            <button type="button" onClick={() => setLogoMode('upload')}
                                className={cn('flex items-center gap-1 rounded px-2 py-1 transition-colors',
                                    logoMode === 'upload' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                                <Upload className="h-3 w-3" />Upload
                            </button>
                            <button type="button" onClick={() => setLogoMode('url')}
                                className={cn('flex items-center gap-1 rounded px-2 py-1 transition-colors',
                                    logoMode === 'url' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                                <Link2 className="h-3 w-3" />URL
                            </button>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        {/* Preview com configurações aplicadas */}
                        <div className="shrink-0 space-y-1">
                            <div
                                className="flex h-20 w-20 items-center justify-center rounded-xl border overflow-hidden"
                                style={{ backgroundColor: containerBg ?? '#f4f4f5' }}
                            >
                                {hasLogo && !imgError ? (
                                    <img
                                        src={logo}
                                        alt="Logo preview"
                                        className={cn('h-full w-full', {
                                            'object-contain p-1.5': logoFit === 'contain',
                                            'object-cover': logoFit === 'cover',
                                            'object-fill': logoFit === 'fill',
                                        })}
                                        onLoad={handleImgLoad}
                                        onError={() => { setImgError(true); setImgDims(null) }}
                                    />
                                ) : (
                                    <span className="text-2xl font-bold text-muted-foreground select-none">
                                        {name.trim().charAt(0).toUpperCase() || '?'}
                                    </span>
                                )}
                            </div>
                            {imgDims && (
                                <p className="text-[10px] text-center text-muted-foreground font-mono">
                                    {imgDims.w}×{imgDims.h}px
                                </p>
                            )}
                        </div>

                        {/* Input */}
                        <div className="flex-1 space-y-2">
                            {logoMode === 'upload' ? (
                                <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border bg-muted/30 px-4 py-3 text-center hover:border-primary/50 hover:bg-muted/60 transition-colors">
                                    <Upload className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                        Clique para selecionar<br />
                                        <span className="text-[10px]">PNG, JPG, SVG · Máx. 2 MB</span>
                                    </span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                </label>
                            ) : (
                                <Input
                                    value={logo}
                                    onChange={(e) => { setLogo(e.target.value); setImgError(false); setImgDims(null) }}
                                    placeholder="https://exemplo.com/logo.png"
                                    className="text-xs"
                                />
                            )}
                            {hasLogo && (
                                <button type="button" onClick={() => { setLogo(''); setImgError(false); setImgDims(null) }}
                                    className="flex items-center gap-1 text-xs text-destructive hover:underline">
                                    <ImageOff className="h-3 w-3" />Remover logo
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Fit mode — só aparece se tem imagem */}
                    {hasLogo && !imgError && (
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Ajuste da imagem</Label>
                            <div className="flex gap-1.5">
                                {FIT_OPTIONS.map((f) => (
                                    <button
                                        key={f.value}
                                        type="button"
                                        title={f.desc}
                                        onClick={() => setLogoFit(f.value)}
                                        className={cn(
                                            'flex flex-col items-center gap-0.5 rounded-lg border px-3 py-2 text-center transition-colors',
                                            logoFit === f.value
                                                ? 'border-primary bg-primary/5 text-primary'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        )}
                                    >
                                        <span className="text-xs font-medium">{f.label}</span>
                                        <span className="text-[10px] opacity-70">{f.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Cor de fundo (fallback para imagens transparentes) */}
                    {hasLogo && !imgError && (
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">
                                Cor de fundo do container{' '}
                                <span className="font-normal opacity-70">(para logos com fundo transparente)</span>
                            </Label>
                            <div className="flex flex-wrap gap-2 items-center">
                                {LOGO_BG_PRESETS.map((p) => (
                                    <button
                                        key={p.value}
                                        type="button"
                                        title={p.label}
                                        onClick={() => setLogoBg(p.value)}
                                        className={cn(
                                            'h-7 w-7 rounded-full border-2 transition-all',
                                            logoBg === p.value
                                                ? 'border-primary scale-110 shadow-sm'
                                                : 'border-muted-foreground/20 hover:border-muted-foreground/50',
                                            p.value === 'transparent' && 'bg-[length:6px_6px]'
                                        )}
                                        style={p.value !== 'transparent'
                                            ? { backgroundColor: p.value }
                                            : { backgroundImage: 'linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%),linear-gradient(45deg,#ccc 25%,#fff 25%,#fff 75%,#ccc 75%)', backgroundSize: '8px 8px', backgroundPosition: '0 0,4px 4px' }
                                        }
                                    />
                                ))}
                                {/* Color picker custom */}
                                <label className="relative h-7 w-7 rounded-full border-2 border-dashed border-border cursor-pointer overflow-hidden hover:border-primary transition-colors" title="Cor personalizada">
                                    <div className="absolute inset-0 rounded-full" style={{ backgroundColor: logoBg === 'transparent' ? undefined : logoBg }} />
                                    <input type="color" value={logoBg === 'transparent' ? '#ffffff' : logoBg}
                                        onChange={(e) => setLogoBg(e.target.value)}
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                                </label>
                                <span className="text-xs text-muted-foreground font-mono">{logoBg}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Domínio */}
                {org.domain && (
                    <div className="space-y-1.5">
                        <Label>Domínio</Label>
                        <Input value={org.domain} readOnly className="bg-muted cursor-not-allowed" />
                    </div>
                )}

                <Button onClick={handleSave} disabled={saving} className="w-fit">
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Salvar alterações
                </Button>
            </div>
        </div>
    )
}

// ─── Membros: InviteDialog ────────────────────────────────────────────────────

function InviteDialog({ open, onClose, orgId, onInvited }: {
    open: boolean; onClose: () => void; orgId: string; onInvited: () => void
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
            setEmail(''); setRole('agent')
            onInvited(); onClose()
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
            toast.error(msg ?? 'Erro ao enviar convite.')
        } finally { setLoading(false) }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" /> Convidar membro
                    </DialogTitle>
                    <DialogDescription>
                        Digite o e-mail do usuário. Se a conta não existir, será criada automaticamente
                        e um e-mail de definição de senha será enviado.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">E-mail</label>
                        <Input type="email" placeholder="usuario@empresa.com" value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleInvite()} autoFocus />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Papel</label>
                        <Select value={role} onValueChange={setRole}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="agent">
                                    <div className="flex items-center gap-2"><UserCog className="h-3.5 w-3.5 text-emerald-600" />Agente — atende conversas</div>
                                </SelectItem>
                                <SelectItem value="admin">
                                    <div className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-blue-600" />Administrador — gerencia a organização</div>
                                </SelectItem>
                                <SelectItem value="member">
                                    <div className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-slate-500" />Membro — acesso básico</div>
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

// ─── Membros: ChangeRoleDialog ────────────────────────────────────────────────

function ChangeRoleDialog({ member, orgId, onClose, onChanged }: {
    member: Member; orgId: string; onClose: () => void; onChanged: () => void
}) {
    // selected value: 'role::owner' | 'role::admin' | ... | 'custom::<id>'
    const initialValue = member.customRoleId ? `custom::${member.customRoleId}` : `role::${member.role}`
    const [selected,     setSelected]     = useState<string>(initialValue)
    const [customRoles,  setCustomRoles]  = useState<CustomRole[]>([])
    const [loading,      setLoading]      = useState(false)
    const [rolesLoading, setRolesLoading] = useState(true)

    useEffect(() => {
        api.get(`/organizations/${orgId}/roles`)
            .then((r) => setCustomRoles(r.data))
            .catch(() => null)
            .finally(() => setRolesLoading(false))
    }, [orgId])

    const isDirty = selected !== initialValue

    async function handleSave() {
        if (!isDirty || loading) return
        setLoading(true)
        try {
            if (selected.startsWith('custom::')) {
                const customRoleId = selected.replace('custom::', '')
                await api.patch(`/organizations/${orgId}/members/${member.id}`, { customRoleId })
                const roleName = customRoles.find((r) => r.id === customRoleId)?.name ?? 'personalizado'
                toast.success(`Papel de ${member.user.name} alterado para "${roleName}".`)
            } else {
                const role = selected.replace('role::', '')
                await api.patch(`/organizations/${orgId}/members/${member.id}`, { role, customRoleId: null })
                toast.success(`Papel de ${member.user.name} alterado para ${ROLE_META[role as Role]?.label ?? role}.`)
            }
            onChanged(); onClose()
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
            toast.error(msg ?? 'Erro ao alterar papel.')
        } finally { setLoading(false) }
    }

    return (
        <Dialog open onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Alterar papel</DialogTitle>
                    <DialogDescription>Altere o papel de <strong>{member.user.name}</strong> na organização.</DialogDescription>
                </DialogHeader>
                <Select value={selected} onValueChange={setSelected} disabled={rolesLoading}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="role::agent"><div className="flex items-center gap-2"><UserCog className="h-3.5 w-3.5 text-emerald-600" />Agente</div></SelectItem>
                        <SelectItem value="role::admin"><div className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-blue-600" />Administrador</div></SelectItem>
                        <SelectItem value="role::member"><div className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-slate-500" />Membro</div></SelectItem>
                        {customRoles.length > 0 && (
                            <>
                                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-t mt-1">Papéis personalizados</div>
                                {customRoles.map((cr) => (
                                    <SelectItem key={cr.id} value={`custom::${cr.id}`}>
                                        <div className="flex items-center gap-2">
                                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cr.color }} />
                                            {cr.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </>
                        )}
                    </SelectContent>
                </Select>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={!isDirty || loading} className="gap-2">
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}Salvar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── Membros: RemoveConfirmDialog ─────────────────────────────────────────────

function RemoveConfirmDialog({ member, orgId, onClose, onRemoved }: {
    member: Member; orgId: string; onClose: () => void; onRemoved: () => void
}) {
    const [loading, setLoading] = useState(false)

    async function handleRemove() {
        setLoading(true)
        try {
            await api.delete(`/organizations/${orgId}/members/${member.id}`)
            toast.success(`${member.user.name} removido da organização.`)
            onRemoved(); onClose()
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
            toast.error(msg ?? 'Erro ao remover membro.')
        } finally { setLoading(false) }
    }

    return (
        <Dialog open onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <Trash2 className="h-4 w-4" />Remover membro
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

// ─── Membros: MemberRow ───────────────────────────────────────────────────────

function MemberRow({ member, currentUserId, myRole, orgId, onReload }: {
    member: Member; currentUserId: string; myRole: Role | null; orgId: string; onReload: () => void
}) {
    const [dialog,    setDialog]    = useState<'role' | 'remove' | null>(null)
    const [actioning, setActioning] = useState<string | null>(null)

    const isMe      = member.user.id === currentUserId
    const isOwner   = member.role === 'owner'
    const canManage = !isOwner && (myRole === 'owner' || myRole === 'admin')

    async function sendReset() {
        setActioning('reset')
        try {
            await api.post(`/organizations/${orgId}/members/${member.id}/send-reset-password`)
            toast.success(`E-mail de redefinição enviado para ${member.user.email}`)
        } catch { toast.error('Erro ao enviar e-mail de redefinição.') }
        finally { setActioning(null) }
    }

    async function sendVerification() {
        setActioning('verify')
        try {
            await api.post(`/organizations/${orgId}/members/${member.id}/send-verification`)
            toast.success(`E-mail de verificação reenviado para ${member.user.email}`)
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
            toast.error(msg ?? 'Erro ao reenviar verificação.')
        } finally { setActioning(null) }
    }

    const joinedAt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
        .format(new Date(member.createdAt))

    return (
        <>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted/40 transition-colors group">
                <Avatar className="h-9 w-9 shrink-0">
                    {member.user.image && <AvatarImage src={member.user.image} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {initials(member.user.name)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{member.user.name}</span>
                        {isMe && <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">você</span>}
                        {member.customRole ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium rounded-full px-2 py-0.5 border" style={{ backgroundColor: `${member.customRole.color}15`, borderColor: member.customRole.color, color: member.customRole.color }}>
                                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: member.customRole.color }} />
                                {member.customRole.name}
                            </span>
                        ) : (
                            <RoleBadge role={member.role} />
                        )}
                        {member.user.emailVerified === false && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">
                                <Clock className="h-2.5 w-2.5" />Aguardando verificação
                            </span>
                        )}
                        {member.user.emailVerified === true && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 opacity-70">
                                <CheckCircle2 className="h-3 w-3" />Verificado
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{member.user.email}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">{joinedAt}</span>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                        {canManage && (
                            <DropdownMenuItem onClick={() => setDialog('role')} className="gap-2 text-xs">
                                <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />Alterar papel
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={sendReset} disabled={actioning === 'reset'} className="gap-2 text-xs">
                            {actioning === 'reset' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5 text-violet-500" />}
                            Enviar redefinição de senha
                        </DropdownMenuItem>
                        {member.user.emailVerified === false && (
                            <DropdownMenuItem onClick={sendVerification} disabled={actioning === 'verify'} className="gap-2 text-xs">
                                {actioning === 'verify' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5 text-amber-500" />}
                                Reenviar verificação de e-mail
                            </DropdownMenuItem>
                        )}
                        {canManage && !isMe && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setDialog('remove')} className="gap-2 text-xs text-destructive focus:text-destructive">
                                    <Trash2 className="h-3.5 w-3.5" />Remover da organização
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            {dialog === 'role'   && <ChangeRoleDialog    member={member} orgId={orgId} onClose={() => setDialog(null)} onChanged={onReload} />}
            {dialog === 'remove' && <RemoveConfirmDialog member={member} orgId={orgId} onClose={() => setDialog(null)} onRemoved={onReload} />}
        </>
    )
}

// ─── Aba: Membros ──────────────────────────────────────────────────────────────

function MembersTab({ org, currentUserId }: { org: Org; currentUserId: string }) {
    const [members,    setMembers]    = useState<Member[]>([])
    const [loading,    setLoading]    = useState(true)
    const [inviteOpen, setInviteOpen] = useState(false)
    const [search,     setSearch]     = useState('')
    const [roleFilter, setRoleFilter] = useState<string>('all')

    const load = useCallback(() => {
        setLoading(true)
        api.get(`/organizations/${org.id}/members`)
            .then(({ data }) => setMembers(data))
            .catch(() => setMembers([]))
            .finally(() => setLoading(false))
    }, [org.id])

    useEffect(() => { load() }, [load])

    const myMember = members.find((m) => m.user.id === currentUserId)
    const myRole   = (myMember?.role ?? null) as Role | null
    const canInvite = myRole === 'owner' || myRole === 'admin'

    const filtered = members.filter((m) => {
        if (roleFilter !== 'all' && m.role !== roleFilter) return false
        if (!search) return true
        const q = search.toLowerCase()
        return m.user.name.toLowerCase().includes(q) || m.user.email.toLowerCase().includes(q)
    })

    const counts = {
        total:  members.length,
        owners: members.filter((m) => m.role === 'owner').length,
        admins: members.filter((m) => m.role === 'admin').length,
        agents: members.filter((m) => m.role === 'agent').length,
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Membros</h2>
                    <p className="text-sm text-muted-foreground">Gerencie quem tem acesso à organização.</p>
                </div>
                {canInvite && (
                    <Button size="sm" className="gap-2" onClick={() => setInviteOpen(true)}>
                        <UserPlus className="h-4 w-4" />Convidar membro
                    </Button>
                )}
            </div>
            <Separator />

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total',   value: counts.total,  icon: Users,       color: 'text-foreground' },
                    { label: 'Owners',  value: counts.owners, icon: ShieldAlert, color: 'text-amber-600' },
                    { label: 'Admins',  value: counts.admins, icon: ShieldCheck, color: 'text-blue-600' },
                    { label: 'Agentes', value: counts.agents, icon: UserCog,     color: 'text-emerald-600' },
                ].map((s) => (
                    <div key={s.label} className="rounded-xl border bg-muted/30 px-4 py-3">
                        <div className={cn('flex items-center gap-1.5 text-xs font-medium mb-1', s.color)}>
                            <s.icon className="h-3.5 w-3.5" />{s.label}
                        </div>
                        <p className="text-2xl font-bold">{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input className="pl-8 h-8 text-xs" placeholder="Buscar por nome ou e-mail..."
                        value={search} onChange={(e) => setSearch(e.target.value)} />
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
                            <Users className="h-3.5 w-3.5" />Todos
                            {roleFilter === 'all' && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-primary" />}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {(['owner', 'admin', 'agent', 'member'] as Role[]).map((r) => {
                            const meta = ROLE_META[r]
                            return (
                                <DropdownMenuItem key={r} onClick={() => setRoleFilter(r)} className="text-xs gap-2">
                                    <meta.icon className="h-3.5 w-3.5" />{meta.label}
                                    {roleFilter === r && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-primary" />}
                                </DropdownMenuItem>
                            )
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* List */}
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
                                currentUserId={currentUserId}
                                myRole={myRole}
                                orgId={org.id}
                                onReload={load}
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

            {/* Invite dialog */}
            <InviteDialog
                open={inviteOpen}
                onClose={() => setInviteOpen(false)}
                orgId={org.id}
                onInvited={load}
            />
        </div>
    )
}

// ─── Aba: Tags ─────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#6366f1', '#a855f7', '#ec4899',
    '#64748b', '#0ea5e9',
]

// ─── Aba: Papéis ───────────────────────────────────────────────────────────────

const PERMISSION_ITEMS: { key: keyof OrgPermissions; label: string; icon: React.ElementType; description: string }[] = [
    { key: 'canViewConversations',        label: 'Ver conversas',                icon: MessageSquare, description: 'Acessa a lista de conversas' },
    { key: 'canSendMessages',             label: 'Enviar mensagens',             icon: MessageSquare, description: 'Pode responder e iniciar conversas' },
    { key: 'canViewOwnConversationsOnly', label: 'Somente próprias conversas',   icon: UserCheck,     description: 'Vê apenas conversas atribuídas a si' },
    { key: 'canViewDashboard',            label: 'Ver relatórios',               icon: BarChart2,     description: 'Acessa dashboard e métricas' },
    { key: 'canManageContacts',           label: 'Gerenciar contatos',           icon: Users,         description: 'Criar, editar e excluir contatos' },
    { key: 'canManageSettings',           label: 'Gerenciar configurações',      icon: Cog,           description: 'Alterar configurações da organização' },
    { key: 'canManageMembers',            label: 'Gerenciar membros',            icon: UserPlus,      description: 'Convidar e remover membros' },
    { key: 'canManageTags',               label: 'Gerenciar etiquetas',          icon: Tag,           description: 'Criar e excluir etiquetas' },
    { key: 'canManageCampaigns',          label: 'Gerenciar campanhas',          icon: Megaphone,     description: 'Criar e editar campanhas' },
    { key: 'canManageChannels',           label: 'Gerenciar canais',             icon: Wifi,          description: 'Conectar e configurar canais' },
    { key: 'canManageAgents',             label: 'Gerenciar IA',                 icon: Bot,           description: 'Configurar agentes de IA' },
]

const DEFAULT_PERMISSIONS: OrgPermissions = {
    canViewConversations:        true,
    canSendMessages:             true,
    canViewOwnConversationsOnly: false,
    canViewDashboard:            false,
    canManageContacts:           false,
    canManageSettings:           false,
    canManageMembers:            false,
    canManageTags:               false,
    canManageCampaigns:          false,
    canManageChannels:           false,
    canManageAgents:             false,
}

const BUILT_IN_ROLES: { role: Role; permissions: OrgPermissions }[] = [
    {
        role: 'owner',
        permissions: { canViewConversations: true, canSendMessages: true, canViewOwnConversationsOnly: false, canViewDashboard: true, canManageContacts: true, canManageSettings: true, canManageMembers: true, canManageTags: true, canManageCampaigns: true, canManageChannels: true, canManageAgents: true },
    },
    {
        role: 'admin',
        permissions: { canViewConversations: true, canSendMessages: true, canViewOwnConversationsOnly: false, canViewDashboard: true, canManageContacts: true, canManageSettings: false, canManageMembers: true, canManageTags: true, canManageCampaigns: true, canManageChannels: true, canManageAgents: true },
    },
    {
        role: 'agent',
        permissions: { canViewConversations: true, canSendMessages: true, canViewOwnConversationsOnly: false, canViewDashboard: false, canManageContacts: true, canManageSettings: false, canManageMembers: false, canManageTags: false, canManageCampaigns: false, canManageChannels: false, canManageAgents: false },
    },
    {
        role: 'member',
        permissions: { canViewConversations: true, canSendMessages: false, canViewOwnConversationsOnly: true, canViewDashboard: false, canManageContacts: false, canManageSettings: false, canManageMembers: false, canManageTags: false, canManageCampaigns: false, canManageChannels: false, canManageAgents: false },
    },
]

function RoleDialog({ orgId, role, onClose, onSaved }: {
    orgId: string
    role?: CustomRole | null
    onClose: () => void
    onSaved: () => void
}) {
    const [name,        setName]        = useState(role?.name ?? '')
    const [description, setDescription] = useState(role?.description ?? '')
    const [color,       setColor]       = useState(role?.color ?? '#6366f1')
    const [perms,       setPerms]       = useState<OrgPermissions>(role?.permissions ?? { ...DEFAULT_PERMISSIONS })
    const [loading,     setLoading]     = useState(false)

    const isEdit = !!role

    function togglePerm(key: keyof OrgPermissions) {
        setPerms((prev) => ({ ...prev, [key]: !prev[key] }))
    }

    async function handleSave() {
        if (!name.trim() || loading) return
        setLoading(true)
        try {
            if (isEdit) {
                await api.patch(`/organizations/${orgId}/roles/${role!.id}`, { name: name.trim(), description: description.trim() || null, color, permissions: perms })
                toast.success('Papel atualizado.')
            } else {
                await api.post(`/organizations/${orgId}/roles`, { name: name.trim(), description: description.trim() || null, color, permissions: perms })
                toast.success('Papel criado.')
            }
            onSaved(); onClose()
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
            toast.error(msg ?? 'Erro ao salvar papel.')
        } finally { setLoading(false) }
    }

    const COLOR_PRESETS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#0ea5e9', '#64748b']

    return (
        <Dialog open onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh]">
                <DialogHeader className="shrink-0">
                    <DialogTitle>{isEdit ? 'Editar papel' : 'Novo papel personalizado'}</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
                    {/* Nome */}
                    <div className="space-y-1.5">
                        <Label>Nome do papel</Label>
                        <Input
                            placeholder="Ex: Supervisor, Vendedor..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* Cor */}
                    <div className="space-y-1.5">
                        <Label>Cor</Label>
                        <div className="flex items-center gap-2 flex-wrap">
                            {COLOR_PRESETS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={cn(
                                        'h-7 w-7 rounded-full transition-all',
                                        color === c
                                            ? 'ring-2 ring-offset-2 ring-foreground scale-110'
                                            : 'opacity-70 hover:opacity-100 hover:scale-105'
                                    )}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Descrição */}
                    <div className="space-y-1.5">
                        <Label>Descrição <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                        <Input
                            placeholder="Descreva o papel brevemente..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    {/* Permissões */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                            <Lock className="h-3.5 w-3.5" />Permissões
                        </Label>
                        <div className="rounded-lg border divide-y overflow-hidden">
                            {PERMISSION_ITEMS.map(({ key, label, description: desc, icon: Icon }) => (
                                <label
                                    key={key}
                                    className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded accent-primary shrink-0"
                                        checked={perms[key]}
                                        onChange={() => togglePerm(key)}
                                    />
                                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium leading-tight">{label}</p>
                                        <p className="text-xs text-muted-foreground">{desc}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter className="shrink-0 pt-2 border-t">
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={!name.trim() || loading} className="gap-2">
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isEdit ? 'Salvar' : 'Criar papel'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function RolesTab({ org, myRole }: { org: Org; myRole: Role }) {
    const [roles,      setRoles]      = useState<CustomRole[]>([])
    const [loading,    setLoading]    = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editing,    setEditing]    = useState<CustomRole | null>(null)
    const [deleting,   setDeleting]   = useState<CustomRole | null>(null)
    const [delLoading, setDelLoading] = useState(false)

    const canEdit = myRole === 'owner' || myRole === 'admin'

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await api.get(`/organizations/${org.id}/roles`)
            setRoles(res.data)
        } catch { /* ignore */ }
        finally { setLoading(false) }
    }, [org.id])

    useEffect(() => { load() }, [load])

    async function handleDelete(role: CustomRole) {
        setDelLoading(true)
        try {
            await api.delete(`/organizations/${org.id}/roles/${role.id}`)
            toast.success(`Papel "${role.name}" removido.`)
            setDeleting(null)
            load()
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
            toast.error(msg ?? 'Erro ao remover papel.')
        } finally { setDelLoading(false) }
    }

    return (
        <div className="max-w-2xl space-y-8">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold">Papéis e Permissões</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Crie papéis personalizados e defina exatamente o que cada um pode fazer.
                    </p>
                </div>
                {canEdit && (
                    <Button size="sm" className="gap-2 shrink-0" onClick={() => { setEditing(null); setDialogOpen(true) }}>
                        <Plus className="h-4 w-4" />Novo papel
                    </Button>
                )}
            </div>

            {/* Papéis built-in */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Papéis padrão (não editáveis)</h3>
                <div className="space-y-2">
                    {BUILT_IN_ROLES.map(({ role, permissions }) => {
                        const meta = ROLE_META[role]
                        const Icon = meta.icon
                        const activePerms = PERMISSION_ITEMS.filter(({ key }) => permissions[key]).map(({ label }) => label)
                        return (
                            <div key={role} className="rounded-lg border p-3 flex items-start gap-3">
                                <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shrink-0 mt-0.5', meta.className)}>
                                    <Icon className="h-3.5 w-3.5" />{meta.label}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground">
                                        {activePerms.length > 0
                                            ? activePerms.join(' · ')
                                            : 'Acesso somente leitura'
                                        }
                                    </p>
                                </div>
                                <Lock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-1" />
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Papéis personalizados */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Papéis personalizados</h3>
                {loading ? (
                    <div className="flex items-center gap-2 py-6 text-muted-foreground text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />Carregando...
                    </div>
                ) : roles.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-8 flex flex-col items-center gap-3 text-center text-muted-foreground">
                        <Layers className="h-8 w-8 opacity-30" />
                        <div>
                            <p className="text-sm font-medium">Nenhum papel personalizado</p>
                            <p className="text-xs mt-0.5">Crie papéis para definir permissões específicas para sua equipe.</p>
                        </div>
                        {canEdit && (
                            <Button size="sm" variant="outline" className="gap-2 mt-1" onClick={() => { setEditing(null); setDialogOpen(true) }}>
                                <Plus className="h-4 w-4" />Criar primeiro papel
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {roles.map((role) => {
                            const activePerms = PERMISSION_ITEMS.filter(({ key }) => role.permissions[key]).map(({ label }) => label)
                            return (
                                <div key={role.id} className="rounded-lg border p-3 flex items-start gap-3">
                                    <span
                                        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shrink-0 mt-0.5"
                                        style={{ backgroundColor: `${role.color}20`, borderColor: `${role.color}50`, color: role.color }}
                                    >
                                        <Layers className="h-3 w-3" />{role.name}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        {role.description && (
                                            <p className="text-xs text-foreground/70 mb-0.5">{role.description}</p>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            {activePerms.length > 0
                                                ? activePerms.join(' · ')
                                                : 'Sem permissões ativas'
                                            }
                                        </p>
                                        <p className="text-xs text-muted-foreground/60 mt-0.5">
                                            {role._count?.members ?? 0} membro(s)
                                        </p>
                                    </div>
                                    {canEdit && (
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(role); setDialogOpen(true) }}>
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleting(role)}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Dialogs */}
            {dialogOpen && (
                <RoleDialog
                    orgId={org.id}
                    role={editing}
                    onClose={() => { setDialogOpen(false); setEditing(null) }}
                    onSaved={load}
                />
            )}
            {deleting && (
                <Dialog open onOpenChange={(v) => !v && setDeleting(null)}>
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle>Remover papel</DialogTitle>
                            <DialogDescription>
                                Remover <strong>&quot;{deleting.name}&quot;</strong>? Membros com este papel voltarão ao papel base.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleting(null)} disabled={delLoading}>Cancelar</Button>
                            <Button variant="destructive" onClick={() => handleDelete(deleting)} disabled={delLoading} className="gap-2">
                                {delLoading && <Loader2 className="h-4 w-4 animate-spin" />}Remover
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}

type WaChannel = { id: string; name: string; type: string; status: string }

function TagsTab({ org }: { org: Org }) {
    const [tags, setTags] = useState<OrgTag[]>([])
    const [loading, setLoading] = useState(true)
    const [newName, setNewName] = useState('')
    const [newColor, setNewColor] = useState('#6366f1')
    const [creating, setCreating] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [waChannels, setWaChannels] = useState<WaChannel[]>([])
    const [selectedChannelId, setSelectedChannelId] = useState('')
    const [importing, setImporting] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [syncingHistory, setSyncingHistory] = useState(false)
    const [historyResult, setHistoryResult] = useState<{ importedMessages: number; importedContacts: number } | null>(null)

    const load = useCallback(() => {
        setLoading(true)
        api.get('/tags')
            .then(({ data }) => setTags(data))
            .catch(() => setTags([]))
            .finally(() => setLoading(false))
    }, [org.id])

    useEffect(() => { load() }, [load])

    useEffect(() => {
        api.get('/channels')
            .then(({ data }) => {
                const connected = (data as WaChannel[]).filter(
                    (c: WaChannel & { type: string }) => c.type === 'whatsapp' && c.status === 'connected'
                )
                setWaChannels(connected)
                if (connected.length > 0) setSelectedChannelId(connected[0].id)
            })
            .catch(() => null)
    }, [org.id])

    async function handleImportLabels() {
        if (!selectedChannelId) return
        setImporting(true)
        try {
            const { data } = await api.post(`/channels/${selectedChannelId}/whatsapp/import-labels`)
            toast.success(`${data.created} tag${data.created !== 1 ? 's' : ''} importada${data.created !== 1 ? 's' : ''} (${data.skipped} já existiam).`)
            if (data.created > 0) load()
        } catch {
            toast.error('Erro ao importar labels do WhatsApp.')
        } finally {
            setImporting(false)
        }
    }

    async function handleSyncContacts() {
        if (!selectedChannelId) return
        setSyncing(true)
        try {
            const { data } = await api.post(`/channels/${selectedChannelId}/whatsapp/sync-label-contacts`)
            const synced = data.synced ?? data.updated ?? 0
            toast.success(`${synced} contato${synced !== 1 ? 's' : ''} sincronizado${synced !== 1 ? 's' : ''} com as etiquetas do WhatsApp.`)
        } catch {
            toast.error('Erro ao sincronizar contatos com as etiquetas.')
        } finally {
            setSyncing(false)
        }
    }

    async function handleSyncHistory() {
        if (!selectedChannelId) return
        setSyncingHistory(true)
        setHistoryResult(null)
        try {
            const { data } = await api.post(`/channels/${selectedChannelId}/whatsapp/sync-history`, { limit: 200 })
            setHistoryResult({ importedMessages: data.importedMessages, importedContacts: data.importedContacts })
            toast.success(`Histórico importado: ${data.importedMessages} mensagem${data.importedMessages !== 1 ? 's' : ''}, ${data.importedContacts} contato${data.importedContacts !== 1 ? 's' : ''} novo${data.importedContacts !== 1 ? 's' : ''}.`)
        } catch {
            toast.error('Erro ao importar histórico de mensagens.')
        } finally {
            setSyncingHistory(false)
        }
    }

    async function handleCreate() {
        if (!newName.trim()) return
        setCreating(true)
        try {
            const { data } = await api.post('/tags', { name: newName.trim(), color: newColor })
            setTags((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
            setNewName('')
            toast.success('Tag criada.')
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Erro ao criar tag.')
        } finally {
            setCreating(false)
        }
    }

    async function handleDelete(id: string) {
        setDeletingId(id)
        try {
            await api.delete(`/tags/${id}`)
            setTags((prev) => prev.filter((t) => t.id !== id))
            toast.success('Tag removida.')
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Erro ao remover tag.')
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold">Tags</h2>
                <p className="text-sm text-muted-foreground">
                    Crie etiquetas para categorizar seus contatos.
                </p>
            </div>
            <Separator />

            {/* Importar / Sincronizar do WhatsApp */}
            {waChannels.length > 0 && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-4 max-w-lg">
                    <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-green-600" />
                        <p className="text-sm font-medium">Integração com WhatsApp Business</p>
                    </div>

                    {/* Seletor de canal */}
                    {waChannels.length > 1 && (
                        <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                            <SelectTrigger className="w-52 h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {waChannels.map((ch) => (
                                    <SelectItem key={ch.id} value={ch.id} className="text-xs">
                                        {ch.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    {waChannels.length === 1 && (
                        <span className="text-xs text-muted-foreground">{waChannels[0].name}</span>
                    )}

                    {/* Passo 1 — Importar etiquetas */}
                    <div className="rounded-md border bg-background p-3 space-y-2">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-medium">1. Importar etiquetas</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Cria as tags na plataforma com base nas etiquetas do WhatsApp. Tags já existentes são ignoradas.
                                </p>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5 shrink-0"
                                onClick={handleImportLabels}
                                disabled={importing || syncing}
                            >
                                {importing
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <Download className="h-3.5 w-3.5" />
                                }
                                {importing ? 'Importando...' : 'Importar'}
                            </Button>
                        </div>
                    </div>

                    {/* Passo 2 — Sincronizar contatos */}
                    <div className="rounded-md border bg-background p-3 space-y-2">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-medium">2. Sincronizar contatos com as etiquetas</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Associa cada contato às tags corretas com base nas etiquetas que ele possui no WhatsApp. Execute após importar.
                                </p>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5 shrink-0"
                                onClick={handleSyncContacts}
                                disabled={importing || syncing}
                            >
                                {syncing
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <Download className="h-3.5 w-3.5 rotate-180" />
                                }
                                {syncing ? 'Sincronizando...' : 'Sincronizar'}
                            </Button>
                        </div>
                    </div>

                    {/* Passo 3 — Importar histórico de mensagens */}
                    <div className="rounded-md border bg-background p-3 space-y-2">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-medium">3. Importar histórico de mensagens</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Busca as últimas 200 mensagens de cada conversa na Evolution API e salva no sistema.
                                </p>
                                {historyResult && (
                                    <p className="text-[11px] text-green-700 font-medium mt-1">
                                        {`✓ ${historyResult.importedMessages} mensagem${historyResult.importedMessages !== 1 ? 's' : ''} · ${historyResult.importedContacts} contato${historyResult.importedContacts !== 1 ? 's' : ''} novo${historyResult.importedContacts !== 1 ? 's' : ''}`}
                                    </p>
                                )}
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5 shrink-0"
                                onClick={handleSyncHistory}
                                disabled={importing || syncing || syncingHistory}
                            >
                                {syncingHistory
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <Download className="h-3.5 w-3.5" />
                                }
                                {syncingHistory ? 'Importando...' : 'Importar histórico'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Formulário de criação */}
            <div className="flex items-end gap-3 max-w-md">
                <div className="space-y-1.5 flex-1">
                    <Label htmlFor="tag-name">Nova tag</Label>
                    <Input
                        id="tag-name"
                        placeholder="Nome da tag..."
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label>Cor</Label>
                    <div className="flex flex-wrap gap-1.5 w-40">
                        {PRESET_COLORS.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setNewColor(c)}
                                className={cn(
                                    'h-6 w-6 rounded-full border-2 transition-all',
                                    newColor === c ? 'border-foreground scale-110' : 'border-transparent'
                                )}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>
                <Button onClick={handleCreate} disabled={creating || !newName.trim()} className="shrink-0">
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Criar
                </Button>
            </div>

            {/* Lista de tags */}
            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            ) : tags.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                    <Tag className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Nenhuma tag criada ainda.</p>
                </div>
            ) : (
                <div className="flex flex-wrap gap-2 max-w-xl">
                    {tags.map((t) => (
                        <div
                            key={t.id}
                            className="flex items-center gap-1.5 rounded-full border pl-3 pr-1 py-1 text-sm font-medium"
                            style={{ borderColor: t.color, color: t.color, backgroundColor: `${t.color}15` }}
                        >
                            <span
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{ backgroundColor: t.color }}
                            />
                            {t.name}
                            <button
                                onClick={() => handleDelete(t.id)}
                                disabled={deletingId === t.id}
                                className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full hover:bg-black/10 transition-colors"
                            >
                                {deletingId === t.id
                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                    : <X className="h-3 w-3" />
                                }
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Aba: Facebook ─────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

function FacebookTab({ org, onSaved }: { org: Org; onSaved: (updated: Org) => void }) {
    const [fbAppId, setFbAppId] = useState(org.fbAppId ?? '')
    const [fbAppSecret, setFbAppSecret] = useState(org.fbAppSecret ?? '')
    const [showSecret, setShowSecret] = useState(false)
    const [saving, setSaving] = useState(false)
    const [copied, setCopied] = useState(false)

    const webhookUrl = `${API_BASE}/campaigns/facebook/webhook/${org.id}`
    const verifyToken = `matra-fb-${org.id}`

    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        })
    }

    async function handleSave() {
        setSaving(true)
        try {
            const { data } = await api.patch('/organizations/current', {
                fbAppId:     fbAppId.trim()     || null,
                fbAppSecret: fbAppSecret.trim() || null,
            })
            onSaved(data)
            toast.success('Credenciais do Facebook salvas.')
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Erro ao salvar.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold">Integração Facebook</h2>
                <p className="text-sm text-muted-foreground">
                    Configure o seu Facebook App para receber leads automaticamente via webhook.
                </p>
            </div>
            <Separator />

            {/* Webhook info */}
            <div className="rounded-lg border bg-muted/40 p-4 space-y-3 max-w-lg">
                <p className="text-sm font-medium">Configuração do Webhook no Meta</p>
                <p className="text-xs text-muted-foreground">
                    No Meta for Developers → seu App → Webhooks → Lead Ads, configure:
                </p>

                <div className="space-y-2">
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">URL do Callback</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                value={webhookUrl}
                                readOnly
                                className="bg-background font-mono text-xs h-8"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={() => copyToClipboard(webhookUrl)}
                            >
                                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Token de Verificação</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                value={verifyToken}
                                readOnly
                                className="bg-background font-mono text-xs h-8"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={() => copyToClipboard(verifyToken)}
                            >
                                <Copy className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* App credentials */}
            <div className="grid gap-4 max-w-md">
                <p className="text-sm font-medium -mb-1">Credenciais do App</p>
                <p className="text-xs text-muted-foreground -mt-1">
                    Encontre no Meta for Developers → Configurações do App → Básico.
                </p>

                <div className="space-y-1.5">
                    <Label htmlFor="fb-app-id">App ID</Label>
                    <Input
                        id="fb-app-id"
                        value={fbAppId}
                        onChange={(e) => setFbAppId(e.target.value)}
                        placeholder="1234567890"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="fb-app-secret">App Secret</Label>
                    <div className="relative">
                        <Input
                            id="fb-app-secret"
                            type={showSecret ? 'text' : 'password'}
                            value={fbAppSecret}
                            onChange={(e) => setFbAppSecret(e.target.value)}
                            placeholder="••••••••••••••••"
                            className="pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowSecret((v) => !v)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            {showSecret
                                ? <EyeOff className="h-4 w-4" />
                                : <Eye className="h-4 w-4" />
                            }
                        </button>
                    </div>
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-fit">
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Salvar credenciais
                </Button>
            </div>
        </div>
    )
}

// ─── Aba: Templates de E-mail ─────────────────────────────────────────────────

const EMAIL_TEMPLATE_TYPES: Record<string, { label: string; vars: string[] }> = {
    'verification':        { label: 'Verificação de e-mail',   vars: ['{{name}}', '{{url}}'] },
    'magic-link':          { label: 'Link mágico',             vars: ['{{url}}'] },
    'reset-password':      { label: 'Redefinição de senha',    vars: ['{{name}}', '{{url}}'] },
    'otp-sign-in':         { label: 'Código OTP (login)',       vars: ['{{otp}}'] },
    'otp-verification':    { label: 'Código OTP (verificação)', vars: ['{{otp}}'] },
    'otp-forget-password': { label: 'Código OTP (senha)',       vars: ['{{otp}}'] },
}

// Editor Unlayer carregado apenas no cliente (não tem suporte a SSR)
const EmailEditor = dynamic(() => import('react-email-editor'), { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> })

function EmailTemplatesTab({ org }: { org: Org }) {
    const [selectedType, setSelectedType] = useState(Object.keys(EMAIL_TEMPLATE_TYPES)[0])
    const [subject, setSubject] = useState('')
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [hasCustom, setHasCustom] = useState(false)
    const editorRef = useRef<EditorRef>(null)

    // Carrega template existente quando o tipo muda
    useEffect(() => {
        setHasCustom(false)
        setSubject('')
        api.get(`/email-templates/${selectedType}`)
            .then(({ data }) => {
                if (data) {
                    setSubject(data.subject)
                    setHasCustom(true)
                    if (data.design && editorRef.current?.editor) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        editorRef.current.editor.loadDesign(data.design as any)
                    }
                }
            })
            .catch(() => null)
    }, [selectedType, org.id])

    async function handleSave() {
        if (!editorRef.current?.editor) return
        setSaving(true)
        editorRef.current.editor.exportHtml(async ({ html, design }: { html: string; design: object }) => {
            try {
                await api.put(`/email-templates/${selectedType}`, {
                    subject: subject || EMAIL_TEMPLATE_TYPES[selectedType].label,
                    html,
                    design,
                })
                setHasCustom(true)
                toast.success('Template salvo com sucesso!')
            } catch {
                toast.error('Erro ao salvar template.')
            } finally {
                setSaving(false)
            }
        })
    }

    async function handleDelete() {
        setDeleting(true)
        try {
            await api.delete(`/email-templates/${selectedType}`)
            setHasCustom(false)
            setSubject('')
            toast.success('Template removido. Usando padrão do sistema.')
        } catch {
            toast.error('Erro ao remover template.')
        } finally {
            setDeleting(false)
        }
    }

    const typeInfo = EMAIL_TEMPLATE_TYPES[selectedType]

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold">Templates de E-mail</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Personalize os e-mails enviados pelo sistema usando o editor visual.
                    Use as variáveis disponíveis para inserir dados dinâmicos.
                </p>
            </div>

            {/* Seletor de tipo */}
            <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-1.5 min-w-[220px]">
                    <Label>Tipo de e-mail</Label>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(EMAIL_TEMPLATE_TYPES).map(([key, { label }]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5 flex-1 min-w-[200px]">
                    <Label>Assunto do e-mail</Label>
                    <Input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder={`ex: ${typeInfo.label} - Matra Chat`}
                    />
                </div>
            </div>

            {/* Variáveis disponíveis */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Variáveis disponíveis:</span>
                {typeInfo.vars.map((v) => (
                    <code
                        key={v}
                        className="text-xs bg-muted px-2 py-0.5 rounded font-mono cursor-pointer hover:bg-primary/10"
                        title="Clique para copiar"
                        onClick={() => { navigator.clipboard.writeText(v); toast.success(`${v} copiado!`) }}
                    >
                        {v}
                    </code>
                ))}
            </div>

            {/* Editor Unlayer */}
            <div className="rounded-lg border overflow-hidden" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
                <EmailEditor
                    ref={editorRef}
                    minHeight={600}
                    options={{ locale: 'pt-BR', features: { textEditor: { spellChecker: false } } }}
                />
            </div>

            {/* Ações */}
            <div className="flex items-center gap-3">
                <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Salvar template
                </Button>
                {hasCustom && (
                    <Button variant="outline" onClick={handleDelete} disabled={deleting}>
                        {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Restaurar padrão
                    </Button>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                    {hasCustom ? '✅ Template personalizado ativo' : 'Usando template padrão do sistema'}
                </span>
            </div>
        </div>
    )
}

// ─── Aba: Aparência do Login ───────────────────────────────────────────────────

const BG_PRESETS = [
    { label: 'Cinza (padrão)', value: '#f4f4f5' },
    { label: 'Branco', value: '#ffffff' },
    { label: 'Azul escuro', value: '#0f172a' },
    { label: 'Roxo', value: '#1e1b4b' },
    { label: 'Verde escuro', value: '#052e16' },
    { label: 'Vermelho escuro', value: '#450a0a' },
]

const SIDE_FIT_OPTIONS: { value: 'contain' | 'cover' | 'fill'; label: string; desc: string }[] = [
    { value: 'cover',   label: 'Preencher', desc: 'Ocupa todo o espaço' },
    { value: 'contain', label: 'Conter',    desc: 'Imagem inteira visível' },
    { value: 'fill',    label: 'Esticar',   desc: 'Ignora proporção' },
]

function AppearanceTab({ org, onSaved }: { org: Org; onSaved: (updated: Org) => void }) {
    const [sideImage, setSideImage]     = useState(org.authSideImage ?? '')
    const [sideMode, setSideMode]       = useState<'upload' | 'url'>(
        org.authSideImage?.startsWith('data:') ? 'upload' : 'url'
    )
    const [sideFit, setSideFit]         = useState<'contain' | 'cover' | 'fill'>('cover')
    const [sideImgDims, setSideImgDims] = useState<{ w: number; h: number } | null>(null)
    const [authBg, setAuthBg]           = useState(org.authBg ?? '#f4f4f5')
    const [imgError, setImgError]       = useState(false)
    const [saving, setSaving]           = useState(false)

    // Load persisted values from localStorage as fallback
    useEffect(() => {
        const cached = JSON.parse(localStorage.getItem('matrachat.appearance') || '{}')
        if (!org.authSideImage && cached.authSideImage) {
            setSideImage(cached.authSideImage)
            setSideMode(cached.authSideImage.startsWith('data:') ? 'upload' : 'url')
        }
        if (!org.authBg && cached.authBg) setAuthBg(cached.authBg)
        if (cached.authSideFit) setSideFit(cached.authSideFit as 'contain' | 'cover' | 'fill')
    }, [org.authSideImage, org.authBg])

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 3 * 1024 * 1024) {
            toast.error('Imagem muito grande. Máximo 3 MB.')
            return
        }
        const reader = new FileReader()
        reader.onload = () => { setSideImage(reader.result as string); setImgError(false); setSideImgDims(null) }
        reader.readAsDataURL(file)
    }

    function handleImgLoad(e: React.SyntheticEvent<HTMLImageElement>) {
        const img = e.currentTarget
        setSideImgDims({ w: img.naturalWidth, h: img.naturalHeight })
    }

    async function handleSave() {
        setSaving(true)
        try {
            const { data } = await api.patch('/organizations/current', {
                authSideImage: sideImage.trim() || null,
                authBg: authBg || null,
            })
            onSaved(data)
            // Persist locally in case the GET endpoint doesn't return these fields
            const prev = JSON.parse(localStorage.getItem('matrachat.appearance') || '{}')
            localStorage.setItem('matrachat.appearance', JSON.stringify({
                ...prev,
                authBg:        authBg || null,
                authSideImage: sideImage.trim() || null,
                authSideFit:   sideFit !== 'cover' ? sideFit : null,
            }))
            toast.success('Aparência salva.')
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Erro ao salvar.')
        } finally {
            setSaving(false)
        }
    }

    const hasSide = sideImage.trim().length > 0
    const previewFitClass = sideFit === 'contain' ? 'object-contain' : sideFit === 'fill' ? 'object-fill' : 'object-cover'

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold">Aparência do Login</h2>
                <p className="text-sm text-muted-foreground">
                    Personalize as páginas de login e cadastro com a identidade visual da sua empresa.
                </p>
            </div>
            <Separator />

            {/* Preview miniatura */}
            <div className="rounded-xl border overflow-hidden w-fit shadow-sm">
                <div
                    className="flex items-center justify-center p-4"
                    style={{ backgroundColor: authBg || '#f4f4f5' }}
                >
                    <div className="flex rounded-lg overflow-hidden border shadow-md w-56 h-32 bg-white text-[6px]">
                        {/* form side */}
                        <div className="flex-1 flex flex-col items-center justify-center gap-1 p-2 bg-white">
                            {org.logo && (
                                <img src={org.logo} alt="logo" className="h-4 w-auto object-contain mb-0.5" />
                            )}
                            <div className="w-12 h-1.5 rounded bg-muted" />
                            <div className="w-16 h-1 rounded bg-muted/60" />
                            <div className="w-16 h-2 rounded border bg-muted/30 mt-1" />
                            <div className="w-16 h-2 rounded border bg-muted/30" />
                            <div className="w-10 h-2 rounded bg-primary mt-1" />
                        </div>
                        {/* image side */}
                        <div className="w-24 bg-muted relative overflow-hidden">
                            {hasSide && !imgError ? (
                                <img
                                    src={sideImage}
                                    alt="side"
                                    className={`absolute inset-0 h-full w-full ${previewFitClass}`}
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">
                                    <Upload className="h-4 w-4" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <p className="text-[10px] text-center text-muted-foreground py-1 bg-muted/30">Pré-visualização</p>
            </div>

            <div className="grid gap-6 max-w-lg">
                {/* Imagem lateral */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label>Imagem lateral <span className="text-muted-foreground font-normal">(painel direito)</span></Label>
                        <div className="flex items-center gap-0.5 rounded-md border p-0.5 text-xs">
                            <button type="button" onClick={() => setSideMode('upload')}
                                className={cn('flex items-center gap-1 rounded px-2 py-1 transition-colors',
                                    sideMode === 'upload' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                                <Upload className="h-3 w-3" />Upload
                            </button>
                            <button type="button" onClick={() => setSideMode('url')}
                                className={cn('flex items-center gap-1 rounded px-2 py-1 transition-colors',
                                    sideMode === 'url' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                                <Link2 className="h-3 w-3" />URL
                            </button>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        {/* Thumbnail preview com dimensões */}
                        <div className="shrink-0 space-y-1">
                            <div className="h-24 w-36 rounded-lg border bg-muted overflow-hidden flex items-center justify-center">
                                {hasSide && !imgError ? (
                                    <img
                                        src={sideImage}
                                        alt="preview"
                                        className={cn('h-full w-full', {
                                            'object-cover':   sideFit === 'cover',
                                            'object-contain': sideFit === 'contain',
                                            'object-fill':    sideFit === 'fill',
                                        })}
                                        onLoad={handleImgLoad}
                                        onError={() => { setImgError(true); setSideImgDims(null) }}
                                    />
                                ) : (
                                    <ImageOff className="h-5 w-5 text-muted-foreground/40" />
                                )}
                            </div>
                            {sideImgDims && (
                                <p className="text-[10px] text-center text-muted-foreground font-mono">
                                    {sideImgDims.w}×{sideImgDims.h}px
                                </p>
                            )}
                        </div>

                        <div className="flex-1 space-y-2">
                            {sideMode === 'upload' ? (
                                <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border bg-muted/30 px-4 py-3 text-center hover:border-primary/50 hover:bg-muted/60 transition-colors">
                                    <Upload className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                        Clique para selecionar<br />
                                        <span className="text-[10px]">JPG, PNG, WebP · Máx. 3 MB</span>
                                    </span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                </label>
                            ) : (
                                <Input
                                    value={sideImage}
                                    onChange={(e) => { setSideImage(e.target.value); setImgError(false); setSideImgDims(null) }}
                                    placeholder="https://exemplo.com/imagem.jpg"
                                    className="text-xs"
                                />
                            )}
                            {hasSide && (
                                <button type="button"
                                    onClick={() => { setSideImage(''); setImgError(false); setSideImgDims(null) }}
                                    className="flex items-center gap-1 text-xs text-destructive hover:underline">
                                    <ImageOff className="h-3 w-3" />Remover imagem
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Ajuste da imagem — só aparece quando tem imagem */}
                    {hasSide && !imgError && (
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Ajuste da imagem</Label>
                            <div className="flex gap-1.5">
                                {SIDE_FIT_OPTIONS.map((f) => (
                                    <button
                                        key={f.value}
                                        type="button"
                                        title={f.desc}
                                        onClick={() => setSideFit(f.value)}
                                        className={cn(
                                            'flex flex-col items-center gap-0.5 rounded-lg border px-3 py-2 text-center transition-colors',
                                            sideFit === f.value
                                                ? 'border-primary bg-primary/5 text-primary'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        )}
                                    >
                                        <span className="text-xs font-medium">{f.label}</span>
                                        <span className="text-[10px] opacity-70">{f.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Cor de fundo da página */}
                <div className="space-y-2">
                    <Label>Cor de fundo da página</Label>
                    <div className="flex flex-wrap gap-2 items-center">
                        {BG_PRESETS.map((p) => (
                            <button
                                key={p.value}
                                type="button"
                                title={p.label}
                                onClick={() => setAuthBg(p.value)}
                                className={cn(
                                    'h-7 w-7 rounded-full border-2 transition-all',
                                    authBg === p.value ? 'border-primary scale-110 shadow-sm' : 'border-transparent hover:border-muted-foreground/40'
                                )}
                                style={{ backgroundColor: p.value }}
                            />
                        ))}
                        {/* Custom color picker */}
                        <label className="relative h-7 w-7 rounded-full border-2 border-dashed border-border cursor-pointer overflow-hidden hover:border-primary transition-colors" title="Cor personalizada">
                            <div className="absolute inset-0 rounded-full" style={{ backgroundColor: authBg }} />
                            <input type="color" value={authBg} onChange={(e) => setAuthBg(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                        </label>
                        <span className="text-xs text-muted-foreground font-mono">{authBg}</span>
                    </div>
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-fit">
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Salvar aparência
                </Button>
            </div>
        </div>
    )
}

// ─── Aba: Perfil ───────────────────────────────────────────────────────────────

function ProfileTab() {
    const [user, setUser] = useState<{ id: string; name: string; email: string; signature?: string | null } | null>(null)
    const [notifications, setNotifications] = useState<{
        notifyNewMessage: boolean
        notifyAssigned: boolean
        notifyMention: boolean
        notifyResolved: boolean
    } | null>(null)
    const [loading, setLoading] = useState(true)
    const [signature, setSignature] = useState('')
    const [savingSignature, setSavingSignature] = useState(false)
    const [savingNotifications, setSavingNotifications] = useState(false)

    const load = useCallback(() => {
        setLoading(true)
        Promise.all([
            api.get('/users/me'),
            api.get('/users/me/notifications'),
        ]).then(([userRes, notifRes]) => {
            setUser(userRes.data)
            setSignature(userRes.data.signature || '')
            setNotifications(notifRes.data)
        }).catch(() => {
            toast.error('Erro ao carregar configurações.')
        }).finally(() => {
            setLoading(false)
        })
    }, [])

    useEffect(() => { load() }, [load])

    async function handleSaveSignature() {
        setSavingSignature(true)
        try {
            await api.patch('/users/me/signature', { signature })
            toast.success('Assinatura atualizada.')
        } catch {
            toast.error('Erro ao salvar assinatura.')
        } finally {
            setSavingSignature(false)
        }
    }

    async function handleSaveNotifications() {
        if (!notifications) return
        setSavingNotifications(true)
        try {
            await api.patch('/users/me/notifications', notifications)
            toast.success('Preferências de notificação atualizadas.')
        } catch {
            toast.error('Erro ao salvar preferências.')
        } finally {
            setSavingNotifications(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-8 max-w-3xl">
            {/* Assinatura */}
            <div className="space-y-4">
                <div>
                    <h2 className="text-lg font-semibold">Assinatura Eletrônica</h2>
                    <p className="text-sm text-muted-foreground">
                        Configure uma assinatura que será adicionada automaticamente às suas mensagens.
                        Use variáveis: <code className="text-xs bg-muted px-1 py-0.5 rounded">{'{{name}}'}</code>,{' '}
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">{'{{email}}'}</code>,{' '}
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">{'{{phone}}'}</code>
                    </p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="signature">Assinatura</Label>
                    <textarea
                        id="signature"
                        value={signature}
                        onChange={(e) => setSignature(e.target.value)}
                        placeholder="Ex: Atenciosamente,&#10;{{name}}&#10;{{email}}"
                        className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {user?.name && (
                        <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 p-3 rounded-md border">
                            <p className="font-medium">Pré-visualização:</p>
                            <p className="whitespace-pre-wrap">
                                {signature
                                    .replace(/\{\{name\}\}/g, user.name)
                                    .replace(/\{\{email\}\}/g, user.email)
                                    .replace(/\{\{phone\}\}/g, user.email) // Substituir por phone se disponível
                                }
                            </p>
                        </div>
                    )}
                </div>
                <Button onClick={handleSaveSignature} disabled={savingSignature}>
                    {savingSignature && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Salvar Assinatura
                </Button>
            </div>

            <Separator />

            {/* Notificações */}
            <div className="space-y-4">
                <div>
                    <h2 className="text-lg font-semibold">Preferências de Notificação</h2>
                    <p className="text-sm text-muted-foreground">
                        Configure quando você deseja receber notificações no sistema.
                    </p>
                </div>
                {notifications && (
                    <div className="space-y-3">
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={notifications.notifyNewMessage}
                                onChange={(e) => setNotifications({ ...notifications, notifyNewMessage: e.target.checked })}
                                className="mt-1 h-4 w-4 rounded border-input"
                            />
                            <div className="flex-1">
                                <p className="text-sm font-medium">Novas mensagens</p>
                                <p className="text-xs text-muted-foreground">Receba notificações quando chegarem novas mensagens.</p>
                            </div>
                        </label>

                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={notifications.notifyAssigned}
                                onChange={(e) => setNotifications({ ...notifications, notifyAssigned: e.target.checked })}
                                className="mt-1 h-4 w-4 rounded border-input"
                            />
                            <div className="flex-1">
                                <p className="text-sm font-medium">Atribuição de conversas</p>
                                <p className="text-xs text-muted-foreground">Notificar quando uma conversa for atribuída a você.</p>
                            </div>
                        </label>

                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={notifications.notifyMention}
                                onChange={(e) => setNotifications({ ...notifications, notifyMention: e.target.checked })}
                                className="mt-1 h-4 w-4 rounded border-input"
                            />
                            <div className="flex-1">
                                <p className="text-sm font-medium">Menções</p>
                                <p className="text-xs text-muted-foreground">Receba notificações quando for mencionado (@seu-nome) em conversas.</p>
                            </div>
                        </label>

                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={notifications.notifyResolved}
                                onChange={(e) => setNotifications({ ...notifications, notifyResolved: e.target.checked })}
                                className="mt-1 h-4 w-4 rounded border-input"
                            />
                            <div className="flex-1">
                                <p className="text-sm font-medium">Conversas resolvidas</p>
                                <p className="text-xs text-muted-foreground">Notificar quando conversas atribuídas a você forem marcadas como resolvidas.</p>
                            </div>
                        </label>
                    </div>
                )}
                <Button onClick={handleSaveNotifications} disabled={savingNotifications}>
                    {savingNotifications && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Salvar Preferências
                </Button>
            </div>
        </div>
    )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
    const { data: perms } = usePermissions()
    const [tab, setTab] = useState<Tab>('profile')
    const [org, setOrg] = useState<Org | null>(null)
    const [currentUserId, setCurrentUserId] = useState<string>('')
    const [myRole, setMyRole] = useState<Role>('member')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([
            api.get('/organizations/current'),
            api.get('/users/me'),
        ]).then(([orgRes, userRes]) => {
            const org = orgRes.data
            const uid: string = userRes.data.id
            setCurrentUserId(uid)
            setOrg(org)
            // Determina o papel do usuário logado nesta org via membros
            const mine = org.members?.find((m: { user: { id: string }; role: Role }) => m.user.id === uid)
            if (mine) setMyRole(mine.role)
        }).catch(() => null).finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const canSettings   = !perms || perms.permissions.canManageSettings
    const canMembers    = !perms || perms.permissions.canManageMembers
    const canTags       = !perms || perms.permissions.canManageTags

    if (perms && !canSettings && !canMembers && !canTags) return <NoPermission />

    return (
        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-52 shrink-0 border-r px-3 py-6 flex flex-col gap-1">
                <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Configurações
                </p>
                <SidebarItem
                    icon={UserCog}
                    label="Perfil"
                    active={tab === 'profile'}
                    onClick={() => setTab('profile')}
                />
                {canSettings && (
                    <SidebarItem
                        icon={Building2}
                        label="Organização"
                        active={tab === 'organization'}
                        onClick={() => setTab('organization')}
                    />
                )}
                {canMembers && (
                    <SidebarItem
                        icon={Users}
                        label="Membros"
                        active={tab === 'members'}
                        onClick={() => setTab('members')}
                    />
                )}
                {canMembers && (
                    <SidebarItem
                        icon={Layers}
                        label="Papéis"
                        active={tab === 'roles'}
                        onClick={() => setTab('roles')}
                    />
                )}
                {canTags && (
                    <SidebarItem
                        icon={Tag}
                        label="Tags"
                        active={tab === 'tags'}
                        onClick={() => setTab('tags')}
                    />
                )}
                {canSettings && (
                    <SidebarItem
                        icon={Facebook}
                        label="Facebook"
                        active={tab === 'facebook'}
                        onClick={() => setTab('facebook')}
                    />
                )}
                {canSettings && (
                    <SidebarItem
                        icon={Upload}
                        label="Aparência"
                        active={tab === 'appearance'}
                        onClick={() => setTab('appearance')}
                    />
                )}
                {canSettings && (
                    <SidebarItem
                        icon={Mail}
                        label="E-mails"
                        active={tab === 'email-templates'}
                        onClick={() => setTab('email-templates')}
                    />
                )}
            </aside>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-8 py-8">
                {!org ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                        <Settings className="h-8 w-8 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">Nenhuma organização encontrada.</p>
                    </div>
                ) : (
                    <>
                        {tab === 'profile' && <ProfileTab />}
                        {tab === 'organization' && (canSettings ? <OrgTab org={org} onSaved={(updated) => setOrg((prev) => prev ? { ...prev, ...updated } : updated)} /> : <NoPermission />)}
                        {tab === 'members' && (canMembers ? <MembersTab org={org} currentUserId={currentUserId} /> : <NoPermission />)}
                        {tab === 'roles' && (canMembers ? <RolesTab org={org} myRole={myRole} /> : <NoPermission />)}
                        {tab === 'tags' && (canTags ? <TagsTab org={org} /> : <NoPermission />)}
                        {tab === 'facebook' && (canSettings ? <FacebookTab org={org} onSaved={(updated) => setOrg((prev) => prev ? { ...prev, ...updated } : updated)} /> : <NoPermission />)}
                        {tab === 'appearance' && (canSettings ? <AppearanceTab org={org} onSaved={(updated) => setOrg((prev) => prev ? { ...prev, ...updated } : updated)} /> : <NoPermission />)}
                        {tab === 'email-templates' && (canSettings ? <EmailTemplatesTab org={org} /> : <NoPermission />)}
                    </>
                )}
            </div>
        </div>
    )
}
