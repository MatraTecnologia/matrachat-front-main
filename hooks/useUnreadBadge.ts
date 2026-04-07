'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAgentSse, type SseNewMessage, type SseConvReadStatus } from './useAgentSse'
import { api } from '../lib/api'

export const useUnreadBadge = (orgId: string | null, userId: string | null) => {
    const [count, setCount] = useState(0)

    useEffect(() => {
        if (!orgId) return
        api.get<{ count: number }>('/contacts/unread-count')
            .then((res) => setCount(res.data.count))
            .catch(() => {})
    }, [orgId])

    const handleNewMessage = useCallback((ev: SseNewMessage) => {
        if (ev.message.direction !== 'inbound') return
        if (ev.assignedToId === userId || !ev.assignedToId) {
            setCount((prev) => prev + 1)
        }
    }, [userId])

    const handleConvReadStatus = useCallback((ev: SseConvReadStatus) => {
        if (ev.userId !== userId) return
        setCount((prev) => ev.isUnread ? prev + 1 : Math.max(0, prev - 1))
    }, [userId])

    useAgentSse(orgId, { onNewMessage: handleNewMessage, onConvReadStatus: handleConvReadStatus })

    const decrement = useCallback(() => {
        setCount((prev) => Math.max(0, prev - 1))
    }, [])

    return { count, decrement }
}
