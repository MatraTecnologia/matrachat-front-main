'use client'

import { useEffect, useState } from 'react'
import { Loader2, LogOut, User, Upload, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

// ─── Types ─────────────────────────────────────────────────────────────────────

type UserProfile = {
    id: string
    name: string
    email: string
    image?: string
    createdAt: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AccountPage() {
    const router = useRouter()
    const [user, setUser] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [name, setName]         = useState('')
    const [image, setImage]       = useState('')
    const [imageMode, setImageMode] = useState<'upload' | 'url'>('url')
    const [saving, setSaving]     = useState(false)
    const [loggingOut, setLoggingOut] = useState(false)

    useEffect(() => {
        api.get('/users/me')
            .then(({ data }) => {
                setUser(data)
                setName(data.name ?? '')
                const img = data.image ?? ''
                setImage(img)
                setImageMode(img.startsWith('data:') ? 'upload' : 'url')
            })
            .catch(() => null)
            .finally(() => setLoading(false))
    }, [])

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Imagem muito grande. Máximo 2 MB.')
            return
        }
        const reader = new FileReader()
        reader.onload = () => setImage(reader.result as string)
        reader.readAsDataURL(file)
    }

    async function handleSave() {
        setSaving(true)
        try {
            const { data } = await api.patch('/users/me', {
                name: name.trim() || undefined,
                image: image.trim() || undefined,
            })
            setUser((prev) => prev ? { ...prev, ...data } : data)
            toast.success('Perfil atualizado.')
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Erro ao salvar.')
        } finally {
            setSaving(false)
        }
    }

    async function handleLogout() {
        setLoggingOut(true)
        try {
            await api.post('/auth/sign-out')
        } catch {
            // ignora erros de logout
        } finally {
            router.push('/login')
        }
    }

    if (loading) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!user) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-muted-foreground">Não foi possível carregar o perfil.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-lg px-6 py-10 space-y-8">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                        {image && <AvatarImage src={image} alt={user.name} />}
                        <AvatarFallback className="text-lg bg-primary/10 text-primary">
                            {user.name ? initials(user.name) : <User className="h-6 w-6" />}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-xl font-semibold">{user.name}</h1>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                </div>

                <Separator />

                {/* Formulário */}
                <div className="space-y-6">
                    <div>
                        <h2 className="text-base font-semibold">Informações pessoais</h2>
                        <p className="text-sm text-muted-foreground">Atualize seu nome e foto de perfil.</p>
                    </div>

                    <div className="grid gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="name">Nome</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Seu nome"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="email">E-mail</Label>
                            <Input
                                id="email"
                                value={user.email}
                                readOnly
                                className="bg-muted cursor-not-allowed"
                            />
                            <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado.</p>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Foto de perfil <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                                <div className="flex items-center gap-0.5 rounded-md border p-0.5 text-xs">
                                    <button type="button" onClick={() => setImageMode('upload')}
                                        className={cn('flex items-center gap-1 rounded px-2 py-1 transition-colors',
                                            imageMode === 'upload' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                                        <Upload className="h-3 w-3" />Upload
                                    </button>
                                    <button type="button" onClick={() => setImageMode('url')}
                                        className={cn('flex items-center gap-1 rounded px-2 py-1 transition-colors',
                                            imageMode === 'url' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                                        <Link2 className="h-3 w-3" />URL
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                {/* Preview */}
                                <Avatar className="h-14 w-14 shrink-0">
                                    {image && <AvatarImage src={image} alt="preview" />}
                                    <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                                        {name ? initials(name) : <User className="h-4 w-4" />}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="flex-1 space-y-1.5">
                                    {imageMode === 'upload' ? (
                                        <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border bg-muted/30 px-4 py-3 text-center hover:border-primary/50 hover:bg-muted/60 transition-colors">
                                            <Upload className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-xs text-muted-foreground">
                                                Clique para selecionar<br />
                                                <span className="text-[10px]">PNG, JPG · Máx. 2 MB</span>
                                            </span>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                        </label>
                                    ) : (
                                        <Input
                                            value={image}
                                            onChange={(e) => setImage(e.target.value)}
                                            placeholder="https://exemplo.com/foto.jpg"
                                            className="text-xs"
                                        />
                                    )}
                                    {image && (
                                        <button type="button" onClick={() => setImage('')}
                                            className="text-xs text-destructive hover:underline">
                                            Remover foto
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <Button onClick={handleSave} disabled={saving} className="w-fit">
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Salvar alterações
                        </Button>
                    </div>
                </div>

                <Separator />

                {/* Sair */}
                <div className="space-y-3">
                    <div>
                        <h2 className="text-base font-semibold">Sessão</h2>
                        <p className="text-sm text-muted-foreground">Encerre sua sessão atual.</p>
                    </div>
                    <Button
                        variant="outline"
                        className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
                        onClick={handleLogout}
                        disabled={loggingOut}
                    >
                        {loggingOut
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <LogOut className="h-4 w-4" />
                        }
                        Sair da conta
                    </Button>
                </div>
            </div>
        </div>
    )
}
