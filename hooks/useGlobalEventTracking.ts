'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import type { Socket } from 'socket.io-client'

// Throttle helper para limitar frequência de eventos
function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Hook global que captura TODAS as ações do usuário
 * Deve ser usado no layout principal (dashboard)
 *
 * Captura:
 * - Cliques em qualquer elemento
 * - Scroll da página
 * - Digitação em inputs (exceto passwords)
 * - Mudanças de rota
 */
export function useGlobalEventTracking(
  socket: Socket | null,
  enabled: boolean = true
) {
  const pathname = usePathname()
  const socketRef = useRef(socket)

  // Atualiza ref quando socket muda
  useEffect(() => {
    socketRef.current = socket
  }, [socket])

  // Captura de cliques globais
  useEffect(() => {
    if (!enabled || !socketRef.current?.connected) return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // Dados do clique
      const clickData = {
        x: e.clientX,
        y: e.clientY,
        element: target.tagName,
        className: target.className,
        text: target.textContent?.substring(0, 50) || '',
        route: pathname,
        timestamp: new Date().toISOString()
      }

      console.log('🖱️ [TRACKING] Clique capturado:', clickData)
      socketRef.current?.emit('user_click', clickData)
    }

    // Usa capture phase para pegar todos os eventos
    document.addEventListener('click', handleClick, true)

    return () => {
      document.removeEventListener('click', handleClick, true)
    }
  }, [pathname, enabled])

  // Captura de scroll (com throttle de 500ms)
  useEffect(() => {
    if (!enabled || !socketRef.current?.connected) return

    const handleScroll = throttle(() => {
      const scrollData = {
        x: window.scrollX,
        y: window.scrollY,
        route: pathname,
        timestamp: new Date().toISOString()
      }

      console.log('📜 [TRACKING] Scroll capturado:', scrollData)
      socketRef.current?.emit('user_scroll', scrollData)
    }, 500)

    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [pathname, enabled])

  // Captura de inputs globais
  useEffect(() => {
    if (!enabled || !socketRef.current?.connected) return

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement

      // SEGURANÇA: NUNCA capturar passwords
      if (target.type === 'password') {
        console.log('🔒 [TRACKING] Input de senha ignorado (segurança)')
        return
      }

      // Ignorar campos marcados como sensíveis
      if (target.hasAttribute('data-no-capture')) {
        console.log('🚫 [TRACKING] Campo sensível ignorado:', target.name)
        return
      }

      const inputData = {
        field: target.name || target.id || 'unnamed',
        value: target.value,
        type: target.type,
        route: pathname,
        timestamp: new Date().toISOString()
      }

      console.log('⌨️ [TRACKING] Input capturado:', { ...inputData, value: inputData.value.substring(0, 20) })
      socketRef.current?.emit('user_input', inputData)
    }

    // Usa capture phase para pegar todos os eventos
    document.addEventListener('input', handleInput, true)

    return () => {
      document.removeEventListener('input', handleInput, true)
    }
  }, [pathname, enabled])

  // Notifica mudança de rota
  useEffect(() => {
    if (!enabled || !socketRef.current?.connected) return

    console.log('🗺️ [TRACKING] Navegação detectada:', pathname)
    socketRef.current?.emit('navigate', { route: pathname })
  }, [pathname, enabled])

  return {
    pathname,
    isTracking: enabled && socketRef.current?.connected
  }
}
