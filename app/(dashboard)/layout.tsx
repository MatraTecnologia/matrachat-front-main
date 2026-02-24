'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { GlobalNotifications } from '@/components/GlobalNotifications'
import {
    MessageSquare,
    Hash,
    Bot,
    Users,
    BarChart2,
    Megaphone,
    BookOpen,
    Settings,
    PanelLeftClose,
    PanelLeftOpen,
    ChevronDown,
    Globe,
    Mail,
    MessageCircle,
    Phone,
    Wifi,
    WifiOff,
    FlaskConical,
    Sparkles,
    Zap,
    Kanban,
    ListTodo,
    FileText,
    Layers,

} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { PermissionsContext, type OrgPermissions } from '@/contexts/permissions-context'
import { PresenceProvider, usePresenceContext } from '@/contexts/presence-context'
import { OnlineUsersPanel } from '@/components/OnlineUsersPanel'
import { ThemeToggle } from '@/components/theme-toggle'
// import { GlobalEventCapture } from '@/components/GlobalEventCapture' // TODO: Reativar quando implementar supervisão

// ── Tipos ─────────────────────────────────────────────────────────────────

type Channel = {
    id: string
    name: string
    type: string
    status: string
}

type SidebarTag = {
    id: string
    name: string
    color: string
}

function channelIcon(type: string) {
    switch (type) {
        case 'whatsapp': return MessageCircle
        case 'email': return Mail
        case 'phone': return Phone
        case 'api': return Globe
        default: return Hash
    }
}

function statusDot(status: string) {
    if (status === 'connected') return 'bg-green-500'
    if (status === 'disconnected') return 'bg-red-500'
    return null
}

// ── Componente de item simples ─────────────────────────────────────────────

function NavItem({
    href,
    icon: Icon,
    label,
    active,
    expanded,
    badge,
}: {
    href: string
    icon: React.ElementType
    label: string
    active: boolean
    expanded: boolean
    badge?: number
}) {
    const link = (
        <Link
            href={href}
            className={cn(
                'flex items-center gap-3 rounded-lg px-2 py-2 transition-colors',
                expanded ? 'w-full' : 'w-10 justify-center',
                active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
        >
            <Icon className="h-5 w-5 shrink-0" />
            {expanded && (
                <>
                    <span className="flex-1 truncate text-sm font-medium">{label}</span>
                    {badge !== undefined && badge > 0 && (
                        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] font-semibold text-primary">
                            {badge}
                        </span>
                    )}
                </>
            )}
        </Link>
    )

    if (expanded) return link
    return (
        <Tooltip>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
    )
}

// ── Componente de item com submenu (canais) ────────────────────────────────

function NavItemCollapsible({
    href,
    icon: Icon,
    label,
    active,
    expanded,
    children,
}: {
    href: string
    icon: React.ElementType
    label: string
    active: boolean
    expanded: boolean
    children: React.ReactNode
}) {
    const [open, setOpen] = useState(true)

    if (!expanded) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <Link
                        href={href}
                        className={cn(
                            'flex w-10 items-center justify-center rounded-lg py-2 transition-colors',
                            active
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                    >
                        <Icon className="h-5 w-5 shrink-0" />
                    </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
        )
    }

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <div className={cn(
                'flex w-full items-center rounded-lg transition-colors',
                active
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}>
                {/* Link — navega para a página */}
                <Link
                    href={href}
                    className="flex flex-1 items-center gap-3 px-2 py-2 min-w-0"
                >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="flex-1 truncate text-sm font-medium">{label}</span>
                </Link>
                {/* Chevron — apenas abre/fecha o submenu */}
                <CollapsibleTrigger asChild>
                    <button className="flex h-8 w-7 items-center justify-center rounded-md hover:bg-muted/60 transition-colors mr-1">
                        <ChevronDown
                            className={cn(
                                'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
                                open && 'rotate-180'
                            )}
                        />
                    </button>
                </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-none">
                <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l pl-3">
                    {children}
                </div>
            </CollapsibleContent>
        </Collapsible>
    )
}

// ── Subitem de canal ───────────────────────────────────────────────────────

function ChannelSubItem({ channel, active }: { channel: Channel; active: boolean }) {
    const Icon = channelIcon(channel.type)
    const dot = statusDot(channel.status)
    return (
        <Link
            href={`/conversations?channelId=${channel.id}`}
            className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
                active
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
        >
            <div className="relative shrink-0">
                <Icon className="h-3.5 w-3.5" />
                {dot && (
                    <span className={cn('absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full border border-background', dot)} />
                )}
            </div>
            <span className="flex-1 truncate">{channel.name}</span>
        </Link>
    )
}

// ── Sidebar Content ────────────────────────────────────────────────────────

function SidebarContent({
    expanded,
    setExpanded,
    pathname,
    activeChannelId,
    orgId,
    orgName,
    orgLogo,
    orgLogoBg,
    orgLogoFit,
    permissions,
    sidebarChannels,
    sidebarTags,
    userName,
    userImage,
    userId,
}: {
    expanded: boolean
    setExpanded: (v: boolean | ((v: boolean) => boolean)) => void
    pathname: string
    activeChannelId: string | null
    orgId: string | null
    orgName: string
    orgLogo: string
    orgLogoBg: string | null
    orgLogoFit: 'contain' | 'cover' | 'fill'
    permissions: OrgPermissions | null
    sidebarChannels: Channel[]
    sidebarTags: SidebarTag[]
    userName: string
    userImage: string
    userId: string | null
}) {
    const { isConnected, onlineUsers } = usePresenceContext()

    return (
        <aside
            className={cn(
                'flex shrink-0 flex-col border-r bg-background py-3 transition-all duration-200 ease-in-out overflow-hidden',
                expanded ? 'w-52 items-stretch px-2' : 'w-14 items-center px-0'
            )}
        >
            {/* Logo + WiFi + toggle */}
            <div className={cn(
                'flex items-center mb-2',
                expanded ? 'justify-between px-1' : 'flex-col gap-2'
            )}>
                <div
                    className={cn(
                        'flex shrink-0 items-center justify-center rounded-lg overflow-hidden font-bold select-none',
                        expanded ? 'h-8 w-8 text-sm' : 'h-10 w-10 text-lg',
                        !orgLogo && 'bg-primary text-primary-foreground'
                    )}
                    style={orgLogo && orgLogoBg ? { backgroundColor: orgLogoBg } : undefined}
                >
                    {orgLogo ? (
                        <img
                            src={orgLogo}
                            alt={orgName || 'Logo'}
                            className={cn('h-full w-full dark-mode-logo-invert', {
                                'object-contain p-1': orgLogoFit === 'contain',
                                'object-cover': orgLogoFit === 'cover',
                                'object-fill': orgLogoFit === 'fill',
                            })}
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                        />
                    ) : (
                        (orgName || 'M').charAt(0).toUpperCase()
                    )}
                </div>

                <div className={cn('flex items-center', expanded ? 'gap-1' : 'gap-2')}>
                    {/* WiFi Indicator */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className={cn(
                                'flex h-8 w-8 items-center justify-center rounded-lg',
                                isConnected ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                            )}>
                                {isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                            {isConnected ? `🟢 Conectado (${onlineUsers.length} online)` : '🔴 Desconectado'}
                        </TooltipContent>
                    </Tooltip>

                    <ThemeToggle />
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => setExpanded((v) => !v)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            >
                                {expanded
                                    ? <PanelLeftClose className="h-4 w-4" />
                                    : <PanelLeftOpen className="h-4 w-4" />
                                }
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                            {expanded ? 'Recolher menu' : 'Expandir menu'}
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>

            <div className={cn('h-px bg-border mb-2', expanded ? 'mx-1' : 'w-8')} />

            {/* Main nav */}
            <nav className={cn(
                'flex flex-1 flex-col gap-0.5 overflow-y-auto',
                expanded ? 'items-stretch' : 'items-center'
            )}>
                {/* Relatórios */}
                {permissions?.permissions.canViewDashboard !== false && (
                    <NavItem
                        href="/dashboard"
                        icon={BarChart2}
                        label="Relatórios"
                        active={pathname.startsWith('/dashboard')}
                        expanded={expanded}
                    />
                )}

                {/* Conversas com submenus de canais */}
                {permissions?.permissions.canViewConversations !== false && (
                <NavItemCollapsible
                    href="/conversations"
                    icon={MessageSquare}
                    label="Conversas"
                    active={pathname.startsWith('/conversations')}
                    expanded={expanded}
                >
                    {sidebarChannels.length === 0 && sidebarTags.length === 0 && (
                        <span className="px-2 py-1.5 text-xs text-muted-foreground/60 italic">
                            Nenhum canal ativo
                        </span>
                    )}
                    {sidebarChannels.map((ch) => (
                        <ChannelSubItem
                            key={ch.id}
                            channel={ch}
                            active={activeChannelId === ch.id}
                        />
                    ))}

                    {/* Tags abaixo dos canais */}
                    {sidebarTags.length > 0 && (
                        <>
                            {sidebarChannels.length > 0 && (
                                <div className="my-1 h-px bg-border/60" />
                            )}
                            {sidebarTags.map((tag) => {
                                const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
                                const activeTagId = searchParams?.get('tagId')
                                return (
                                    <Link
                                        key={tag.id}
                                        href={`/conversations?tagId=${tag.id}`}
                                        className={cn(
                                            'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
                                            activeTagId === tag.id
                                                ? 'bg-primary/10 text-primary font-medium'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        )}
                                    >
                                        <span
                                            className="h-2 w-2 shrink-0 rounded-full"
                                            style={{ backgroundColor: tag.color }}
                                        />
                                        <span className="flex-1 truncate">{tag.name}</span>
                                    </Link>
                                )
                            })}
                        </>
                    )}
                </NavItemCollapsible>
                )}

                {/* Canais */}
                {permissions?.permissions.canManageChannels !== false && (
                    <NavItem
                        href="/channels"
                        icon={Hash}
                        label="Canais"
                        active={pathname.startsWith('/channels')}
                        expanded={expanded}
                    />
                )}

                {/* Templates */}
                {permissions?.permissions.canManageChannels !== false && (
                    <NavItem
                        href="/templates"
                        icon={FileText}
                        label="Templates"
                        active={pathname.startsWith('/templates')}
                        expanded={expanded}
                    />
                )}

                {/* Copiloto — visível apenas em desenvolvimento local */}
                {process.env.NODE_ENV === 'development' && (
                <NavItemCollapsible
                    href="/copilot"
                    icon={Bot}
                    label="Capitão / Copiloto"
                    active={pathname.startsWith('/copilot')}
                    expanded={expanded}
                >
                    <Link
                        href="/copilot"
                        className={cn(
                            'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
                            pathname === '/copilot'
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                    >
                        <Sparkles className="h-3.5 w-3.5 shrink-0" />
                        <span className="flex-1 truncate">Agentes</span>
                    </Link>
                    <Link
                        href="/copilot/rules"
                        className={cn(
                            'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
                            pathname.startsWith('/copilot/rules')
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                    >
                        <Zap className="h-3.5 w-3.5 shrink-0" />
                        <span className="flex-1 truncate">Regras</span>
                    </Link>
                </NavItemCollapsible>
                )}

                {/* Contatos */}
                {permissions?.permissions.canManageContacts !== false && (
                    <NavItem
                        href="/contacts"
                        icon={Users}
                        label="Contatos"
                        active={pathname.startsWith('/contacts')}
                        expanded={expanded}
                    />
                )}

                {/* Kanban */}
                {permissions?.permissions.canViewConversations !== false && (
                    <NavItem
                        href="/kanban"
                        icon={Kanban}
                        label="Kanban"
                        active={pathname.startsWith('/kanban')}
                        expanded={expanded}
                    />
                )}

                {/* Campanhas */}
                {permissions?.permissions.canManageCampaigns !== false && (
                    <NavItem
                        href="/campaigns"
                        icon={Megaphone}
                        label="Campanhas"
                        active={pathname.startsWith('/campaigns')}
                        expanded={expanded}
                    />
                )}

                {/* Monitor de Filas — apenas admin/owner */}
                {(permissions?.role === 'admin' || permissions?.role === 'owner') && (
                    <NavItem
                        href="/queue"
                        icon={Layers}
                        label="Monitor de Filas"
                        active={pathname.startsWith('/queue')}
                        expanded={expanded}
                    />
                )}

                {/* Central de Ajuda */}
                <NavItem
                    href="/help-center"
                    icon={BookOpen}
                    label="Central de Ajuda"
                    active={pathname.startsWith('/help-center')}
                    expanded={expanded}
                />

                {/* Changelog / Logs */}
                <NavItem
                    href="/logs"
                    icon={ListTodo}
                    label="Changelog"
                    active={pathname.startsWith('/logs')}
                    expanded={expanded}
                />

                {/* Teste do Widget */}
                <NavItem
                    href="/test"
                    icon={FlaskConical}
                    label="Teste do Widget"
                    active={pathname.startsWith('/test')}
                    expanded={expanded}
                />
            </nav>

            {/* Online Users Panel */}
            {expanded && orgId && userId && (
                <>
                    <div className="h-px bg-border my-2 mx-1" />
                    <div className="px-1 max-h-48 overflow-y-auto">
                        <OnlineUsersPanel
                            orgId={orgId}
                            currentUserId={userId}
                            contacts={[]}
                        />
                    </div>
                </>
            )}

            {/* Bottom */}
            <div className={cn(
                'flex flex-col gap-0.5 pt-2',
                expanded ? 'items-stretch' : 'items-center'
            )}>
                <div className={cn('h-px bg-border mb-2', expanded ? 'mx-1' : 'w-8')} />

                {(permissions === null || permissions.permissions.canManageSettings || permissions.permissions.canManageMembers || permissions.permissions.canManageTags) && (
                    <NavItem
                        href="/settings"
                        icon={Settings}
                        label="Configurações"
                        active={pathname.startsWith('/settings')}
                        expanded={expanded}
                    />
                )}

                {/* User avatar */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Link
                            href="/account"
                            className={cn(
                                'mt-1 flex items-center gap-2 rounded-lg p-1.5 ring-2 ring-transparent hover:ring-primary transition-all',
                                expanded ? 'w-full' : '',
                                pathname.startsWith('/account') && 'ring-primary'
                            )}
                        >
                            <Avatar className="h-7 w-7 shrink-0">
                                {userImage && <AvatarImage src={userImage} alt={userName} />}
                                <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                    {userName ? userName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() : '?'}
                                </AvatarFallback>
                            </Avatar>
                            {expanded && (
                                <span className="truncate text-sm font-medium text-foreground">
                                    {userName || 'Minha conta'}
                                </span>
                            )}
                        </Link>
                    </TooltipTrigger>
                    {!expanded && (
                        <TooltipContent side="right">Minha conta</TooltipContent>
                    )}
                </Tooltip>
            </div>
        </aside>
    )
}

// ── Layout ─────────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const activeChannelId = searchParams?.get('channelId')

    const [expanded, setExpanded] = useState(true)

    // Organização
    const [orgId, setOrgId] = useState<string | null>(null)
    const [orgName, setOrgName] = useState('')
    const [orgLogo, setOrgLogo] = useState('')
    const [orgLogoBg, setOrgLogoBg] = useState<string | null>(null)
    const [orgLogoFit, setOrgLogoFit] = useState<'contain' | 'cover' | 'fill'>('contain')

    // Atualiza favicon e título da aba com base na organização
    useEffect(() => {
        if (!orgName && !orgLogo) return

        // Título da aba
        if (orgName) document.title = orgName

        // Favicon
        if (orgLogo) {
            let link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
            if (!link) {
                link = document.createElement('link')
                link.rel = 'icon'
                document.head.appendChild(link)
            }
            link.href = orgLogo
        }
    }, [orgName, orgLogo])

    // Permissões do usuário na organização
    const [permissions, setPermissions] = useState<OrgPermissions | null>(null)
    const [permissionsLoading, setPermissionsLoading] = useState(true)

    // Usuário logado
    const [userId, setUserId]       = useState<string | null>(null)
    const [userName, setUserName]   = useState('')
    const [userEmail, setUserEmail] = useState('')
    const [userImage, setUserImage] = useState('')

    useEffect(() => {
        api.get('/users/me')
            .then(({ data }) => {
                setUserId(data.id ?? null)
                setUserName(data.name ?? '')
                setUserEmail(data.email ?? '')
                setUserImage(data.image ?? '')
            })
            .catch(() => null)
    }, [])

    // Canais ativos e tags para o submenu de Conversas
    const [sidebarChannels, setSidebarChannels] = useState<Channel[]>([])
    const [sidebarTags, setSidebarTags] = useState<SidebarTag[]>([])

    useEffect(() => {
        api.get('/organizations/current')
            .then(({ data }) => {
                const org = data
                const cached = JSON.parse(localStorage.getItem('matrachat.appearance') || '{}')
                setOrgId(org.id)
                setOrgName(org.name ?? '')
                setOrgLogo(org.logo ?? cached.logo ?? '')
                setOrgLogoBg(org.logoBg ?? cached.logoBg ?? null)
                setOrgLogoFit(org.logoFit ?? cached.logoFit ?? 'contain')
                const orgId = org.id
                return Promise.all([
                    api.get('/channels'),
                    api.get('/tags'),
                    api.get(`/organizations/${orgId}/my-permissions`),
                ]).then(([chRes, tagRes, permRes]) => {
                    const all = chRes.data as Channel[]
                    setSidebarChannels(
                        all.filter((c) => c.status === 'connected' || c.status === 'disconnected')
                    )
                    setSidebarTags(tagRes.data as SidebarTag[])
                    setPermissions(permRes.data as OrgPermissions)
                    setPermissionsLoading(false)
                })
            })
            .catch(() => null)
    }, [])

    return (
        <TooltipProvider delayDuration={200}>
            <PresenceProvider
                userId={userId}
                userName={userName}
                userEmail={userEmail}
                userImage={userImage}
                userRole={permissions?.role || null}
                organizationId={orgId}
            >
                {/* TODO: Reativar quando implementar supervisão */}
                {/* <GlobalEventCapture /> */}

                <div className="flex h-svh overflow-hidden bg-background">
                {/* ── Sidebar ── */}
                <SidebarContent
                    expanded={expanded}
                    setExpanded={setExpanded}
                    pathname={pathname}
                    activeChannelId={activeChannelId ?? null}
                    orgId={orgId}
                    orgName={orgName}
                    orgLogo={orgLogo}
                    orgLogoBg={orgLogoBg}
                    orgLogoFit={orgLogoFit}
                    permissions={permissions}
                    sidebarChannels={sidebarChannels}
                    sidebarTags={sidebarTags}
                    userName={userName}
                    userImage={userImage}
                    userId={userId}
                />

                {/* ── Page content ── */}
                <PermissionsContext.Provider value={{ data: permissions, loading: permissionsLoading }}>
                    <main className="flex flex-1 overflow-hidden">
                        {children}
                    </main>
                </PermissionsContext.Provider>
            </div>

            {/* Global real-time notifications (active on all pages except /conversations) */}
            <GlobalNotifications orgId={orgId} />
            </PresenceProvider>
        </TooltipProvider>
    )
}
