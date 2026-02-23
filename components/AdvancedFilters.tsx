'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export type FilterCondition = {
  id: string
  field: 'status' | 'assignedTo' | 'tags' | 'channel' | 'priority'
  operator: 'equals' | 'not_equals' | 'contains'
  value: string
}

type AdvancedFiltersProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (conditions: FilterCondition[]) => void
  // Opções disponíveis
  members: Array<{ id: string; name: string }>
  tags: Array<{ id: string; name: string; color: string }>
  channels: Array<{ id: string; name: string }>
}

const FIELD_LABELS = {
  status: 'Status',
  assignedTo: 'Agente atribuído',
  tags: 'Tags',
  channel: 'Canal',
  priority: 'Prioridade',
}

const OPERATOR_LABELS = {
  equals: 'Igual a',
  not_equals: 'Diferente de',
  contains: 'Contém',
}

const STATUS_OPTIONS = [
  { value: 'open', label: 'Abertas' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'resolved', label: 'Resolvidas' },
]

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' },
]

export function AdvancedFilters({
  open,
  onOpenChange,
  onApply,
  members,
  tags,
  channels,
}: AdvancedFiltersProps) {
  const [conditions, setConditions] = useState<FilterCondition[]>([
    {
      id: '1',
      field: 'status',
      operator: 'equals',
      value: '',
    },
  ])

  // Adicionar nova condição
  function addCondition() {
    setConditions([
      ...conditions,
      {
        id: Date.now().toString(),
        field: 'status',
        operator: 'equals',
        value: '',
      },
    ])
  }

  // Remover condição
  function removeCondition(id: string) {
    if (conditions.length > 1) {
      setConditions(conditions.filter(c => c.id !== id))
    }
  }

  // Atualizar campo
  function updateCondition(id: string, updates: Partial<FilterCondition>) {
    setConditions(
      conditions.map(c =>
        c.id === id ? { ...c, ...updates, value: '' } : c
      )
    )
  }

  // Limpar filtros
  function clearFilters() {
    setConditions([
      {
        id: '1',
        field: 'status',
        operator: 'equals',
        value: '',
      },
    ])
  }

  // Aplicar filtros
  function applyFilters() {
    const validConditions = conditions.filter(c => c.value !== '')
    onApply(validConditions)
    onOpenChange(false)
  }

  // Obter opções de valor baseado no campo
  function getValueOptions(field: FilterCondition['field']) {
    switch (field) {
      case 'status':
        return STATUS_OPTIONS
      case 'assignedTo':
        return members.map(m => ({ value: m.id, label: m.name }))
      case 'tags':
        return tags.map(t => ({ value: t.id, label: t.name }))
      case 'channel':
        return channels.map(c => ({ value: c.id, label: c.name }))
      case 'priority':
        return PRIORITY_OPTIONS
      default:
        return []
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Filtrar conversas</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {conditions.map((condition, index) => (
            <div key={condition.id}>
              {/* Operador lógico "E" entre condições */}
              {index > 0 && (
                <div className="flex items-center gap-2 py-2">
                  <div className="h-px flex-1 bg-border" />
                  <Badge variant="secondary" className="text-xs">
                    E
                  </Badge>
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}

              <div className="flex items-start gap-2">
                {/* Campo */}
                <Select
                  value={condition.field}
                  onValueChange={(value) =>
                    updateCondition(condition.id, { field: value as FilterCondition['field'] })
                  }
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FIELD_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Operador */}
                <Select
                  value={condition.operator}
                  onValueChange={(value) =>
                    updateCondition(condition.id, { operator: value as FilterCondition['operator'] })
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(OPERATOR_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Valor */}
                <Select
                  value={condition.value}
                  onValueChange={(value) =>
                    updateCondition(condition.id, { value })
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione uma opção..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getValueOptions(condition.field).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Botão remover */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCondition(condition.id)}
                  disabled={conditions.length === 1}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {/* Botão adicionar condição */}
          <Button
            variant="outline"
            size="sm"
            onClick={addCondition}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar condição
          </Button>
        </div>

        {/* Botões de ação */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="ghost" onClick={clearFilters}>
            Limpar filtros
          </Button>
          <Button onClick={applyFilters}>
            Aplicar filtros
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
