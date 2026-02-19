'use client'

import { createContext, useContext } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type OrgPermissions = {
    role: string
    customRole: string | null
    permissions: {
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
}

// ─── Context ───────────────────────────────────────────────────────────────────

export const PermissionsContext = createContext<{
    data: OrgPermissions | null
    loading: boolean
}>({ data: null, loading: true })

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function usePermissions() {
    return useContext(PermissionsContext)
}
