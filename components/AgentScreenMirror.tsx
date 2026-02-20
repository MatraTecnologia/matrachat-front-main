'use client'

import { useEffect, useState } from 'react'
import { usePresenceContext, type UserPresence } from '@/contexts/presence-context'
import { Activity, MapPin } from 'lucide-react'

type AgentScreenMirrorProps = {
  agentUserId: string
}

/**
 * Componente que mostra a tela de um agente em tempo real
 * Exibe a rota atual, ações recentes, cliques, e scroll
 */
export function AgentScreenMirror({ agentUserId }: AgentScreenMirrorProps) {
  const { onlineUsers } = usePresenceContext()
  const [agent, setAgent] = useState<UserPresence | null>(null)

  // Atualiza agente quando onlineUsers muda
  useEffect(() => {
    const foundAgent = onlineUsers.find(u => u.userId === agentUserId)
    setAgent(foundAgent || null)
  }, [onlineUsers, agentUserId])

  if (!agent) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/10">
        <div className="text-center">
          <Activity className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-sm text-muted-foreground">
            Agente offline ou não encontrado
          </p>
        </div>
      </div>
    )
  }

  if (!agent.currentRoute) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-primary/20 bg-primary/5">
        <div className="text-center">
          <MapPin className="mx-auto h-12 w-12 text-primary/40" />
          <p className="mt-4 text-sm font-medium">{agent.userName}</p>
          <p className="text-xs text-muted-foreground">
            Agente navegando no sistema...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-lg border-2 border-primary/20">
      {/* Header mostrando rota atual */}
      <div className="flex items-center gap-2 border-b bg-primary/10 px-4 py-2">
        <MapPin className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">
          {agent.userName} está em: <span className="font-mono text-xs">{agent.currentRoute}</span>
        </span>
        <div className="ml-auto flex items-center gap-1">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-500"></span>
          <span className="text-xs text-muted-foreground">Ao vivo</span>
        </div>
      </div>

      {/* Corpo principal - Espelho da tela */}
      <div className="relative flex-1 overflow-hidden bg-background">
        {/* IFRAME - Mostra a mesma rota do agente */}
        <iframe
          src={agent.currentRoute}
          className="h-full w-full pointer-events-none"
          sandbox="allow-same-origin allow-scripts"
          title={`Tela de ${agent.userName}`}
        />

        {/* Overlay de ações em tempo real */}
        <ActionOverlay
          clicks={agent.screenState?.clicks}
          scroll={agent.screenState?.currentScroll}
          lastAction={agent.screenState?.lastAction}
        />
      </div>

      {/* Rodapé com informações */}
      <div className="border-t bg-muted/30 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Última atividade: {new Date(agent.lastActivity).toLocaleTimeString('pt-BR')}
          </span>
          {agent.currentContactId && (
            <span>
              👁️ Visualizando conversa
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Overlay que mostra ações em tempo real
 * - Cliques como círculos pulsantes
 * - Indicador de scroll
 * - Última ação realizada
 */
function ActionOverlay({
  clicks,
  scroll,
  lastAction
}: {
  clicks?: Array<{ x: number; y: number; timestamp: string; element: string }>
  scroll?: { x: number; y: number }
  lastAction?: string
}) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Mostrar cliques como círculos pulsantes */}
      {clicks?.map((click, idx) => (
        <div
          key={`${click.timestamp}-${idx}`}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{
            left: click.x,
            top: click.y,
          }}
        >
          {/* Círculo pulsante */}
          <div className="relative h-8 w-8">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex h-8 w-8 rounded-full bg-blue-500 opacity-80"></span>
          </div>
          {/* Label com elemento clicado */}
          <div className="absolute left-10 top-0 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-xs text-white">
            {click.element}
          </div>
        </div>
      ))}

      {/* Indicador de scroll */}
      {scroll && (
        <div className="absolute right-2 top-0 h-full w-1 bg-primary/20">
          <div
            className="w-full rounded-full bg-primary transition-all duration-300"
            style={{
              height: '48px',
              transform: `translateY(${Math.min(scroll.y / 10, window.innerHeight - 48)}px)`,
            }}
          />
        </div>
      )}

      {/* Última ação realizada */}
      {lastAction && (
        <div className="absolute bottom-4 left-4 rounded-lg border border-primary/20 bg-background/95 px-3 py-2 shadow-lg">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium">{lastAction}</span>
          </div>
        </div>
      )}
    </div>
  )
}
