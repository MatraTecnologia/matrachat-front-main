'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, Pencil, Trash2, FileText, Loader2, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { usePermissions } from '@/contexts/permissions-context'
import { NoPermission } from '@/components/no-permission'

type MessageTemplate = {
    id: string
    shortcut: string
    name: string
    content: string
    createdAt: string
    updatedAt: string
}

export default function TemplatesPage() {
    const { data: perms } = usePermissions()
    const [templates, setTemplates] = useState<MessageTemplate[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)
    const [deleteTemplate, setDeleteTemplate] = useState<MessageTemplate | null>(null)

    // Form state
    const [shortcut, setShortcut] = useState('')
    const [name, setName] = useState('')
    const [content, setContent] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        loadTemplates()
    }, [])

    async function loadTemplates() {
        setLoading(true)
        try {
            const { data } = await api.get('/message-templates')
            setTemplates(data)
        } catch {
            toast.error('Erro ao carregar templates.')
        } finally {
            setLoading(false)
        }
    }

    function handleAdd() {
        setEditingTemplate(null)
        setShortcut('')
        setName('')
        setContent('')
        setDialogOpen(true)
    }

    function handleEdit(template: MessageTemplate) {
        setEditingTemplate(template)
        setShortcut(template.shortcut)
        setName(template.name)
        setContent(template.content)
        setDialogOpen(true)
    }

    async function handleSave() {
        if (!shortcut.trim() || !name.trim() || !content.trim()) {
            toast.error('Preencha todos os campos.')
            return
        }

        setSaving(true)
        try {
            if (editingTemplate) {
                // Atualizar
                await api.patch(`/message-templates/${editingTemplate.id}`, { name, content })
                toast.success('Template atualizado!')
            } else {
                // Criar
                await api.post('/message-templates', { shortcut, name, content })
                toast.success('Template criado!')
            }
            loadTemplates()
            setDialogOpen(false)
        } catch (error: any) {
            const message = error.response?.data?.error || 'Erro ao salvar template.'
            toast.error(message)
        } finally {
            setSaving(false)
        }
    }

    async function confirmDelete() {
        if (!deleteTemplate) return
        try {
            await api.delete(`/message-templates/${deleteTemplate.id}`)
            setTemplates((prev) => prev.filter((t) => t.id !== deleteTemplate.id))
            toast.success('Template removido.')
            setDeleteTemplate(null)
        } catch {
            toast.error('Erro ao remover template.')
        }
    }

    const filtered = templates.filter((t) =>
        t.shortcut.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.content.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (perms && !perms.permissions.canManageChannels) return <NoPermission />

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
                <div>
                    <h1 className="text-lg font-semibold">Templates de Mensagem</h1>
                    <p className="text-sm text-muted-foreground">
                        Crie atalhos rápidos para mensagens frequentes. Use "/" no chat para inserir.
                    </p>
                </div>
                <Button onClick={handleAdd}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Template
                </Button>
            </div>

            {/* Search */}
            <div className="border-b px-6 py-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Buscar templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-1 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-1 items-center justify-center">
                    <div className="flex flex-col items-center gap-4 text-center px-8">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="font-semibold text-base">
                                {searchQuery ? 'Nenhum template encontrado' : 'Nenhum template criado'}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                {searchQuery
                                    ? 'Tente outra busca'
                                    : 'Crie templates para agilizar suas respostas.'}
                            </p>
                        </div>
                        {!searchQuery && (
                            <Button onClick={handleAdd}>
                                <Plus className="mr-2 h-4 w-4" />
                                Criar Primeiro Template
                            </Button>
                        )}
                    </div>
                </div>
            ) : (
                <ScrollArea className="flex-1">
                    <div className="px-6 py-6 max-w-4xl space-y-3">
                        {filtered.map((template) => (
                            <div
                                key={template.id}
                                className="flex items-start gap-4 rounded-xl border bg-background p-4 shadow-sm transition-shadow hover:shadow-md"
                            >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                    <Hash className="h-5 w-5 text-primary" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium">{template.name}</h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Badge variant="outline" className="text-xs font-mono">
                                                    /{template.shortcut}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                                        {template.content}
                                    </p>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleEdit(template)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => setDeleteTemplate(template)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingTemplate ? 'Editar Template' : 'Novo Template'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingTemplate
                                ? 'Atualize o nome e conteúdo do template.'
                                : 'Crie um atalho para inserir mensagens rapidamente. Use variáveis: {{name}}, {{phone}}'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="shortcut">Atalho *</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">
                                    /
                                </span>
                                <Input
                                    id="shortcut"
                                    value={shortcut}
                                    onChange={(e) => setShortcut(e.target.value)}
                                    placeholder="boas-vindas"
                                    className="pl-6 font-mono"
                                    disabled={!!editingTemplate}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {editingTemplate
                                    ? 'O atalho não pode ser alterado.'
                                    : 'Apenas letras, números e hífens. Será convertido automaticamente.'}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Nome *</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Mensagem de Boas-vindas"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="content">Mensagem *</Label>
                            <Textarea
                                id="content"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Olá {{name}}! Bem-vindo à nossa empresa..."
                                rows={8}
                                className="resize-none"
                            />
                            <p className="text-xs text-muted-foreground">
                                Variáveis disponíveis: <code className="px-1 py-0.5 rounded bg-muted">{'{{name}}'}</code>,{' '}
                                <code className="px-1 py-0.5 rounded bg-muted">{'{{phone}}'}</code>
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Salvando...
                                </>
                            ) : editingTemplate ? (
                                'Atualizar'
                            ) : (
                                'Criar Template'
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteTemplate} onOpenChange={() => setDeleteTemplate(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remover Template</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja remover o template <strong>/{deleteTemplate?.shortcut}</strong>?
                            Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setDeleteTemplate(null)}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete}>
                            Remover
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
