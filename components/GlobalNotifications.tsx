'use client'

import { useRef, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { Send } from 'lucide-react'
import { useAgentSse, type SseNewMessage } from '@/hooks/useAgentSse'
import { api } from '@/lib/api'

// ─── Mini reply form rendered inside the Sonner toast ────────────────────────

function ReplyForm({
    contactName,
    contactId,
    channelId,
    externalId,
    orgId,
    toastId,
}: {
    contactName: string
    contactId: string
    channelId: string
    externalId: string
    orgId: string
    toastId: string | number
}) {
    const [text, setText] = useState('')
    const [sending, setSending] = useState(false)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    async function handleSend() {
        const msg = text.trim()
        if (!msg || sending) return
        setSending(true)
        try {
            // Send via Evolution API
            await api.post(`/channels/${channelId}/whatsapp/send`, {
                number: externalId,
                text:   msg,
            })
            // Save to DB
            await api.post('/messages', {
                orgId,
                contactId,
                channelId,
                direction: 'outbound',
                type:      'text',
                content:   msg,
                status:    'sent',
            })
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
        <div className="mt-2 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
            <textarea
                ref={inputRef}
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

// ─── Global WebSocket listener ────────────────────────────────────────────────

export function GlobalNotifications({ orgId, userId }: { orgId: string | null; userId: string | null }) {
    const pathname = usePathname()
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
        const preview     = ev.message.content.slice(0, 80) + (ev.message.content.length > 80 ? '…' : '')
        const channelId   = ev.channelId
        const externalId  = ev.externalId

        toast.custom(
            (id) => (
                <div className="pointer-events-auto w-[360px] rounded-xl border bg-background shadow-lg p-3">
                    {/* Header */}
                    <div className="flex items-start gap-2.5">
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
                            <p className="text-sm font-semibold leading-none truncate">{contactName}</p>
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{preview}</p>
                        </div>
                        <button
                            onClick={() => toast.dismiss(id)}
                            className="shrink-0 text-muted-foreground hover:text-foreground text-lg leading-none"
                            title="Fechar"
                        >
                            ×
                        </button>
                    </div>

                    {/* Reply form */}
                    <ReplyForm
                        contactName={contactName}
                        contactId={ev.contactId}
                        channelId={channelId}
                        externalId={externalId}
                        orgId={orgId}
                        toastId={id}
                    />
                </div>
            ),
            { duration: 20000, id: `msg-${ev.contactId}` }
        )
    }, [pathname, orgId, userId])

    useAgentSse(orgId, { onNewMessage: handleNewMessage })

    return null
}
