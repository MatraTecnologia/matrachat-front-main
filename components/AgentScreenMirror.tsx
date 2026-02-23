'use client'

import { useEffect, useState } from 'react'
import { usePresenceContext, type UserPresence } from '@/contexts/presence-context'
import { Activity, MapPin, MousePointer2, Scroll, Keyboard, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type AgentScreenMirrorProps = {
  agentUserId: string
}

/**
 * Componente que mostra a tela de um agente em tempo real
 * Dashboard com visualização completa da atividade
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
    <div className="relative flex h-full flex-col overflow-hidden rounded-lg border-2 border-primary/20 bg-background">
      {/* Header mostrando rota atual */}
      <div className="flex items-center gap-2 border-b bg-primary/10 px-4 py-3 shrink-0">
        <MapPin className="h-5 w-5 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            Página atual: <span className="font-mono text-xs">{agent.currentRoute}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
          </span>
          <span className="text-xs font-medium text-green-600">Ao Vivo</span>
        </div>
      </div>

      {/* Corpo principal - Dashboard de atividades */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-4 max-w-6xl mx-auto">
          {/* Card de Última Ação */}
          {agent.screenState?.lastAction && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Última Ação Realizada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">{agent.screenState.lastAction}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(agent.lastActivity).toLocaleTimeString('pt-BR')}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Grid de informações em tempo real */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Cliques Recentes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MousePointer2 className="h-5 w-5 text-blue-500" />
                  Cliques Recentes
                  {agent.screenState?.clicks && agent.screenState.clicks.length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {agent.screenState.clicks.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {agent.screenState?.clicks && agent.screenState.clicks.length > 0 ? (
                  <div className="space-y-2">
                    {agent.screenState.clicks.slice().reverse().map((click, idx) => (
                      <div
                        key={`${click.timestamp}-${idx}`}
                        className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 border"
                      >
                        <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                          <MousePointer2 className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{click.element}</p>
                          <p className="text-xs text-muted-foreground">
                            Posição: {click.x}, {click.y}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(click.timestamp).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MousePointer2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aguardando cliques...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Posição de Scroll */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Scroll className="h-5 w-5 text-purple-500" />
                  Posição de Scroll
                </CardTitle>
              </CardHeader>
              <CardContent>
                {agent.screenState?.currentScroll ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Horizontal (X)</p>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 transition-all duration-300"
                            style={{ width: `${Math.min((agent.screenState.currentScroll.x / 1000) * 100, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs font-mono mt-1">{agent.screenState.currentScroll.x}px</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Vertical (Y)</p>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 transition-all duration-300"
                            style={{ width: `${Math.min((agent.screenState.currentScroll.y / 1000) * 100, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs font-mono mt-1">{agent.screenState.currentScroll.y}px</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Scroll className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aguardando scroll...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Formulários Sendo Preenchidos */}
          {agent.screenState?.formData && Object.keys(agent.screenState.formData).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Keyboard className="h-5 w-5 text-orange-500" />
                  Formulários em Preenchimento
                  <Badge variant="secondary" className="ml-auto">
                    {Object.keys(agent.screenState.formData).length} campos
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(agent.screenState.formData).map(([field, value]) => (
                    <div key={field} className="p-3 rounded-lg bg-muted/30 border">
                      <p className="text-xs text-muted-foreground mb-1">Campo: {field}</p>
                      <p className="text-sm font-medium truncate">{value as string}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Informação de Visualização */}
          {agent.currentContactId && (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-5 w-5 text-green-500" />
                  Visualizando Conversa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  ID do Contato: <span className="font-mono font-medium">{agent.currentContactId}</span>
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Rodapé com informações */}
      <div className="border-t bg-muted/30 px-4 py-2 shrink-0">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Última atividade: {new Date(agent.lastActivity).toLocaleTimeString('pt-BR')}
          </span>
          <span>
            Online há: {getTimeOnline(agent.connectedAt)}
          </span>
        </div>
      </div>
    </div>
  )
}

function getTimeOnline(connectedAt: Date | string): string {
  const now = new Date()
  const connected = connectedAt instanceof Date ? connectedAt : new Date(connectedAt)
  const diff = Math.floor((now.getTime() - connected.getTime()) / 1000)

  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  return `${Math.floor(diff / 3600)}h${Math.floor((diff % 3600) / 60)}m`
}
