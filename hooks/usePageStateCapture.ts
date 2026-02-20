'use client'

import { useEffect } from 'react'
import type { Socket } from 'socket.io-client'

// Debounce helper para evitar muitas atualizações
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return function(this: any, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(this, args), wait)
  }
}

/**
 * Captura valores de formulários na página
 * NUNCA captura passwords ou campos sensíveis
 */
function captureFormValues(): Record<string, any> {
  const inputs = document.querySelectorAll('input, select, textarea')
  const data: Record<string, any> = {}

  inputs.forEach(input => {
    const el = input as HTMLInputElement

    // SEGURANÇA: Ignorar passwords e campos sensíveis
    if (
      el.type === 'password' ||
      el.hasAttribute('data-no-capture') ||
      el.name?.includes('password') ||
      el.name?.includes('token') ||
      el.name?.includes('secret')
    ) {
      return
    }

    if (el.name) {
      data[el.name] = el.value
    }
  })

  return data
}

/**
 * Captura texto visível em elementos marcados
 */
function captureVisibleContent(): Array<{ id: string; text: string }> {
  // Procura elementos com data-capture attribute
  const containers = document.querySelectorAll('[data-capture]')

  return Array.from(containers).map(el => ({
    id: el.id || 'unnamed',
    text: el.textContent?.substring(0, 500) || ''
  }))
}

/**
 * Captura estado da UI (modals abertos, tabs ativos, etc.)
 */
function captureUIState(): Record<string, any> {
  return {
    // Conta modals/dialogs abertos
    openModals: document.querySelectorAll('[role="dialog"]').length,

    // Tab ativo (se houver)
    activeTab: document.querySelector('[role="tab"][aria-selected="true"]')?.textContent || null,

    // Dropdowns abertos
    openDropdowns: document.querySelectorAll('[role="menu"][aria-hidden="false"]').length,

    // Tooltips visíveis
    visibleTooltips: document.querySelectorAll('[role="tooltip"][aria-hidden="false"]').length
  }
}

/**
 * Hook que captura o estado completo da página atual
 * Serializa dados para transmitir via WebSocket
 *
 * Captura:
 * - Valores de formulários (exceto passwords)
 * - Conteúdo visível marcado com data-capture
 * - Estado de UI (modals, tabs, dropdowns)
 * - Metadata da página
 */
export function usePageStateCapture(
  socket: Socket | null,
  route: string,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled || !socket?.connected) return

    // Função que captura o estado completo
    const capturePageState = () => {
      const state = {
        route,
        title: document.title,
        formData: captureFormValues(),
        visibleText: captureVisibleContent(),
        uiState: captureUIState(),
        timestamp: new Date().toISOString()
      }

      console.log('📊 [PAGE STATE] Estado capturado:', {
        route: state.route,
        formFields: Object.keys(state.formData).length,
        visibleElements: state.visibleText.length,
        uiState: state.uiState
      })

      socket.emit('page_state', { route, state })
    }

    // Captura inicial ao carregar a página
    const initialTimeout = setTimeout(() => {
      capturePageState()
      socket.emit('page_loaded', {
        route,
        state: {
          title: document.title,
          timestamp: new Date().toISOString()
        }
      })
    }, 1000)

    // Re-captura quando há mudanças no DOM (debounced)
    const debouncedCapture = debounce(capturePageState, 2000)

    const observer = new MutationObserver(() => {
      debouncedCapture()
    })

    // Observa mudanças no body
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value', 'aria-selected', 'aria-hidden', 'open']
    })

    return () => {
      clearTimeout(initialTimeout)
      observer.disconnect()
    }
  }, [socket, route, enabled])
}
