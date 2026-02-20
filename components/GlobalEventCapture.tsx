'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { usePresenceContext } from '@/contexts/presence-context'
import { useGlobalEventTracking } from '@/hooks/useGlobalEventTracking'
import { usePageStateCapture } from '@/hooks/usePageStateCapture'

/**
 * Componente que captura eventos globais do usuário
 * para transmitir em tempo real para supervisores
 *
 * Deve ser colocado dentro do PresenceProvider
 */
export function GlobalEventCapture() {
  const { socket, isConnected } = usePresenceContext()
  const pathname = usePathname()

  // Hook que captura cliques, scroll e inputs globalmente
  const { isTracking } = useGlobalEventTracking(socket, isConnected)

  // Hook que captura estado completo da página
  usePageStateCapture(socket, pathname, isConnected)

  // Log de status (apenas em desenvolvimento)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🎯 [GLOBAL CAPTURE] Status: ${isTracking ? 'ATIVO' : 'INATIVO'}`)
      console.log(`📍 [GLOBAL CAPTURE] Rota: ${pathname}`)
      console.log(`🔌 [GLOBAL CAPTURE] Conectado: ${isConnected}`)
    }
  }, [isTracking, pathname, isConnected])

  // Este componente não renderiza nada visualmente
  return null
}
