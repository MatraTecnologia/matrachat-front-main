'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAgentSse, type SseNewMessage, type SseConvReadStatus } from './useAgentSse'
import { api } from '../lib/api'

export const useUnreadBadge = (orgId: string | null, userId: string | null) => {
    const [count, setCount] = useState(0)
    const unreadSetRef = useRef<Set<string>>(new Set())

    useEffect(() => {
        if (!orgId) return
        api.get<{ count: number }>('/contacts/unread-count')
            .then((res) => {
                setCount(res.data.count)
                unreadSetRef.current.clear()
            })
            .catch(() => {})
    }, [orgId])

    const handleNewMessage = useCallback((ev: SseNewMessage) => {
        if (ev.message.direction !== 'inbound') return
        const isAssignedOrUnassigned = ev.assignedToId === userId || !ev.assignedToId
        if (isAssignedOrUnassigned && !unreadSetRef.current.has(ev.contactId)) {
            unreadSetRef.current.add(ev.contactId)
            setCount((prev) => prev + 1)
        }
    }, [userId])

    const handleConvReadStatus = useCallback((ev: SseConvReadStatus) => {
        if (ev.userId !== userId) return
        if (ev.isUnread) {
            if (!unreadSetRef.current.has(ev.contactId)) {
                unreadSetRef.current.add(ev.contactId)
                setCount((prev) => prev + 1)
            }
        } else {
            if (unreadSetRef.current.has(ev.contactId)) {
                unreadSetRef.current.delete(ev.contactId)
                setCount((prev) => Math.max(0, prev - 1))
            }
        }
    }, [userId])

    useAgentSse(orgId, { onNewMessage: handleNewMessage, onConvReadStatus: handleConvReadStatus })

    const decrement = useCallback((contactId?: string) => {
        if (contactId) {
            unreadSetRef.current.delete(contactId)
        }
        setCount((prev) => Math.max(0, prev - 1))
    }, [])

    return { count, decrement }
}
