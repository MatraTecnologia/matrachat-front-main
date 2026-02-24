'use client'

import { useRef, useCallback } from 'react'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { Send } from 'lucide-react'
import { useAgentSse, type SseNewMessage } from '@/hooks/useAgentSse'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

// ─── Mini reply form rendered inside the Sonner toast ────────────────────────

function ReplyForm({
    contactName,
    contactId,
    channelId,
    externalId,
    orgId,
    toastId,
    onSent,
}: {
    contactName: string
    contactId: string
    channelId: string
    externalId: string
    orgId: string
    toastId: string | number
    onSent?: () => void
}) {
    const [text, setText] = useState('')
    const [sending, setSending] = useState(false)

    async function handleSend() {
        const msg = text.trim()
        if (!msg || sending) return
        setSending(true)
        try {
            await api.post(`/channels/${channelId}/whatsapp/send`, {
                number: externalId,
                text:   msg,
            })
            await api.post('/messages', {
                orgId,
                contactId,
                channelId,
                direction: 'outbound',
                type:      'text',
                content:   msg,
                status:    'sent',
            })
            onSent?.()
            toast.dismiss(toastId)
        } catch {
            setSending(false)
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Responder para ${contactName}…`}
                rows={1}
                className="flex-1 resize-none rounded-md border border-input bg-background px-2.5 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                style={{ minHeight: '32px', maxHeight: '80px' }}
                autoFocus
            />
            <button
                onClick={handleSend}
                disabled={!text.trim() || sending}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
                title="Enviar (Enter)"
            >
                <Send className="h-3.5 w-3.5" />
            </button>
        </div>
    )
}

// ─── Acumulação de mensagens por contato ──────────────────────────────────────

type AccumState = { count: number; previews: string[] }

// Labels para tipos de mídia
const MEDIA_LABELS: Record<string, string> = {
    image:    '🖼️ Imagem',
    audio:    '🎵 Áudio',
    video:    '🎬 Vídeo',
    document: '📄 Documento',
    sticker:  '🎭 Sticker',
}

function getPreviewText(content: string, type: string) {
    if (MEDIA_LABELS[type]) return MEDIA_LABELS[type]
    const trimmed = content.slice(0, 80)
    return trimmed + (content.length > 80 ? '…' : '')
}

// ─── Global WebSocket listener ────────────────────────────────────────────────

export function GlobalNotifications({ orgId, userId }: { orgId: string | null; userId: string | null }) {
    const pathname = usePathname()

    // Mapa de acumulação por contactId — persiste entre re-renders
    const accumRef = useRef<Map<string, AccumState>>(new Map())

    const handleNewMessage = useCallback((ev: SseNewMessage) => {
        // Conversations page manages its own notifications — avoid duplicates
        if (pathname.startsWith('/conversations')) return
        // Only show for inbound messages
        if (ev.message.direction !== 'inbound') return
        // Need channelId + externalId to allow reply
        if (!ev.channelId || !ev.externalId || !orgId) return
        // Only notify if the conversation is assigned to the current user
        if (ev.assignedToId !== userId) return

        const contactName = ev.contactName ?? ev.contact?.name ?? 'Novo contato'
        const avatarUrl   = ev.contactAvatarUrl ?? ev.contact?.avatarUrl ?? null
        const channelId   = ev.channelId
        const externalId  = ev.externalId

        // Acumula mensagens para este contato
        const prev    = accumRef.current.get(ev.contactId) ?? { count: 0, previews: [] }
        const preview = getPreviewText(ev.message.content, ev.message.type)
        const updated: AccumState = {
            count:    prev.count + 1,
            previews: [...prev.previews, preview].slice(-4), // mantém as últimas 4
        }
        accumRef.current.set(ev.contactId, updated)

        const { count, previews } = updated
        const toastId = `msg-${ev.contactId}`

        const clearAccum = () => accumRef.current.delete(ev.contactId)

        toast.custom(
            (id) => (
                <div className="pointer-events-auto w-[360px] rounded-xl border bg-background shadow-lg overflow-hidden">
                    {/* Header: avatar + nome + badge de contagem */}
                    <div className="flex items-start gap-2.5 px-3 pt-3 pb-2.5">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={contactName}
                                className="h-8 w-8 rounded-full object-cover shrink-0 mt-0.5"
                            />
                        ) : (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-semibold mt-0.5">
                                {contactName.charAt(0).toUpperCase()}
                            </div>
                        )}

                        <div className="min-w-0 flex-1">
                            {/* Nome + badge de quantidade */}
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold leading-none truncate">{contactName}</p>
                                {count > 1 && (
                                    <span className="shrink-0 inline-flex items-center rounded-full bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">
                                        {count} msgs
                                    </span>
                                )}
                            </div>

                            {/* Lista de mensagens acumuladas (mais antiga → mais recente) */}
                            <div className="mt-1.5 space-y-0.5">
                                {previews.map((text, i) => (
                                    <p
                                        key={i}
                                        className={cn(
                                            'text-xs truncate',
                                            i === previews.length - 1
                                                ? 'text-foreground'          // mais recente: destaque
                                                : 'text-muted-foreground/70' // anteriores: apagadas
                                        )}
                                    >
                                        {text}
                                    </p>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => { clearAccum(); toast.dismiss(id) }}
                            className="shrink-0 text-muted-foreground hover:text-foreground text-lg leading-none mt-0.5"
                            title="Fechar"
                        >
                            ×
                        </button>
                    </div>

                    {/* Reply form */}
                    <div className="border-t px-3 pt-2.5 pb-3">
                        <ReplyForm
                            contactName={contactName}
                            contactId={ev.contactId}
                            channelId={channelId}
                            externalId={externalId}
                            orgId={orgId}
                            toastId={id}
                            onSent={clearAccum}
                        />
                    </div>
                </div>
            ),
            {
                duration:    20000,
                id:          toastId,
                onDismiss:   clearAccum,
                onAutoClose: clearAccum,
            }
        )
    }, [pathname, orgId, userId])

    useAgentSse(orgId, { onNewMessage: handleNewMessage })

    return null
}
