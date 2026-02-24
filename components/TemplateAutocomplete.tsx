'use client'

import { useEffect, useState, useRef } from 'react'
import { FileText, Hash } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

type MessageTemplate = {
    id: string
    shortcut: string
    name: string
    content: string
}

type Contact = {
    name: string
    phone?: string | null
}

interface TemplateAutocompleteProps {
    value: string
    contact: Contact | null
    onSelect: (content: string) => void
    textareaRef: React.RefObject<HTMLTextAreaElement>
}

export function TemplateAutocomplete({
    value,
    contact,
    onSelect,
    textareaRef,
}: TemplateAutocompleteProps) {
    const [templates, setTemplates] = useState<MessageTemplate[]>([])
    const [showDropdown, setShowDropdown] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [searchQuery, setSearchQuery] = useState('')
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Detecta quando usuário digita "/" no início da linha ou após espaço
    useEffect(() => {
        const text = value
        const cursorPos = textareaRef.current?.selectionStart || 0

        // Pega o texto antes do cursor
        const textBeforeCursor = text.slice(0, cursorPos)

        // Verifica se termina com "/" ou "/palavra"
        const match = textBeforeCursor.match(/(?:^|\s)\/([\w-]*)$/)

        if (match) {
            const query = match[1] || ''
            setSearchQuery(query)
            searchTemplates(query)
            setShowDropdown(true)
            setSelectedIndex(0)
        } else {
            setShowDropdown(false)
        }
    }, [value])

    async function searchTemplates(query: string) {
        try {
            if (query) {
                const { data } = await api.get(`/message-templates/search?q=${encodeURIComponent(query)}`)
                setTemplates(data)
            } else {
                const { data } = await api.get('/message-templates')
                setTemplates(data.slice(0, 10))
            }
        } catch {
            setTemplates([])
        }
    }

    function replaceVariables(content: string): string {
        let result = content

        if (contact) {
            result = result.replace(/\{\{name\}\}/g, contact.name || 'Cliente')
            result = result.replace(/\{\{phone\}\}/g, contact.phone || '')
        } else {
            result = result.replace(/\{\{name\}\}/g, 'Cliente')
            result = result.replace(/\{\{phone\}\}/g, '')
        }

        return result
    }

    function handleSelectTemplate(template: MessageTemplate) {
        const textarea = textareaRef.current
        if (!textarea) return

        const cursorPos = textarea.selectionStart
        const textBeforeCursor = value.slice(0, cursorPos)
        const textAfterCursor = value.slice(cursorPos)

        // Remove o "/" e a palavra digitada
        const beforeMatch = textBeforeCursor.replace(/(?:^|\s)\/[\w-]*$/, '')

        // Insere o conteúdo do template com variáveis substituídas
        const templateContent = replaceVariables(template.content)
        const newText = beforeMatch + (beforeMatch && !beforeMatch.endsWith('\n') ? ' ' : '') + templateContent + textAfterCursor

        onSelect(newText)
        setShowDropdown(false)

        // Foca no textarea após inserir
        setTimeout(() => textarea.focus(), 0)
    }

    // Navegação por teclado
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (!showDropdown || templates.length === 0) return

            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedIndex((prev) => (prev + 1) % templates.length)
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedIndex((prev) => (prev - 1 + templates.length) % templates.length)
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                if (templates[selectedIndex]) {
                    e.preventDefault()
                    handleSelectTemplate(templates[selectedIndex])
                }
            } else if (e.key === 'Escape') {
                setShowDropdown(false)
            }
        }

        const textarea = textareaRef.current
        if (textarea) {
            textarea.addEventListener('keydown', handleKeyDown)
            return () => textarea.removeEventListener('keydown', handleKeyDown)
        }
    }, [showDropdown, templates, selectedIndex])

    // Rola para o item selecionado
    useEffect(() => {
        if (showDropdown && dropdownRef.current) {
            const selectedElement = dropdownRef.current.querySelector(`[data-index="${selectedIndex}"]`)
            selectedElement?.scrollIntoView({ block: 'nearest' })
        }
    }, [selectedIndex, showDropdown])

    if (!showDropdown || templates.length === 0) return null

    return (
        <div
            ref={dropdownRef}
            className="absolute bottom-full left-0 mb-2 w-full max-w-md rounded-lg border bg-popover shadow-lg z-50"
        >
            <div className="p-2 border-b bg-muted/50">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-3 w-3" />
                    Templates disponíveis {searchQuery && `(/${searchQuery})`}
                </p>
            </div>
            <div className="max-h-64 overflow-y-auto">
                {templates.map((template, index) => (
                    <button
                        key={template.id}
                        data-index={index}
                        onClick={() => handleSelectTemplate(template)}
                        className={cn(
                            'w-full text-left px-3 py-2 transition-colors',
                            index === selectedIndex
                                ? 'bg-primary/10 text-primary'
                                : 'hover:bg-muted'
                        )}
                    >
                        <div className="flex items-start gap-2">
                            <Hash className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{template.name}</span>
                                    <code className="text-xs text-muted-foreground font-mono">
                                        /{template.shortcut}
                                    </code>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                    {replaceVariables(template.content)}
                                </p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
            <div className="p-2 border-t bg-muted/50">
                <p className="text-[10px] text-muted-foreground text-center">
                    ↑↓ para navegar • Enter/Tab para selecionar • Esc para fechar
                </p>
            </div>
        </div>
    )
}
