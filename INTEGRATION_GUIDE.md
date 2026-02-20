# 🚀 Guia de Integração - Sistema de Presença em Tempo Real

## ✅ Sistema Implementado

- ✅ Backend: Socket.io com gerenciamento de presença
- ✅ Frontend: PresenceProvider global com Context API
- ✅ Room automático por organização
- ✅ Tracking automático de atividade
- ✅ Detecção de online/away/offline

---

## 📋 Como Integrar no App

### 1. Wrappear o App com PresenceProvider

Você precisa envolver sua aplicação com o `PresenceProvider` **DEPOIS** do `AuthProvider`, pois precisa das informações do usuário autenticado.

#### Opção A: No Layout Principal (Recomendado)

```tsx
// app/layout.tsx ou app/(dashboard)/layout.tsx

import { PresenceProvider } from '@/contexts/presence-context'
import { useSession } from '@/hooks/useSession' // ou seu hook de auth

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Pega dados do usuário autenticado
  const session = useSession() // Adapte para seu sistema de auth

  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <PresenceProvider
            userId={session?.user?.id || null}
            userName={session?.user?.name || null}
            userEmail={session?.user?.email || null}
            userImage={session?.user?.image || null}
            userRole={session?.user?.role || null}
            organizationId={session?.organizationId || null}
          >
            {children}
          </PresenceProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
```

#### Opção B: Em um Provider Composto

```tsx
// providers/app-providers.tsx

'use client'

import { ReactNode } from 'react'
import { AuthProvider } from '@/contexts/auth-context'
import { PermissionsProvider } from '@/contexts/permissions-context'
import { PresenceProvider } from '@/contexts/presence-context'

export function AppProviders({ children }: { children: ReactNode }) {
  // Pega dados do contexto de auth
  const { user, organizationId } = useAuth()

  return (
    <AuthProvider>
      <PermissionsProvider>
        <PresenceProvider
          userId={user?.id || null}
          userName={user?.name || null}
          userEmail={user?.email || null}
          userImage={user?.image || null}
          userRole={user?.role || null}
          organizationId={organizationId || null}
        >
          {children}
        </PresenceProvider>
      </PermissionsProvider>
    </AuthProvider>
  )
}
```

---

### 2. Consumir Presença em Qualquer Componente

Agora qualquer componente pode consumir o estado de presença:

```tsx
'use client'

import { usePresenceContext } from '@/contexts/presence-context'

export function MyComponent() {
  const { onlineUsers, isConnected, setViewing, setTyping } = usePresenceContext()

  return (
    <div>
      <p>WebSocket: {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}</p>
      <p>Usuários online: {onlineUsers.length}</p>

      {/* Lista de usuários online */}
      <ul>
        {onlineUsers.map(user => (
          <li key={user.userId}>
            <span className={
              user.status === 'online' ? 'text-green-600' :
              user.status === 'away' ? 'text-yellow-600' :
              'text-gray-600'
            }>
              ●
            </span>
            {user.userName} - {user.status}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

---

### 3. Tracking de Visualização de Conversas

Quando o usuário abrir uma conversa, notifique o sistema:

```tsx
'use client'

import { useEffect } from 'react'
import { usePresenceContext } from '@/contexts/presence-context'

export function ConversationView({ contactId }: { contactId: string }) {
  const { setViewing } = usePresenceContext()

  useEffect(() => {
    // Notifica que está visualizando esta conversa
    setViewing(contactId)

    // Cleanup: notifica que saiu da conversa
    return () => {
      setViewing(null)
    }
  }, [contactId, setViewing])

  return <div>Conversando com {contactId}</div>
}
```

---

### 4. Typing Indicators (Opcional)

```tsx
'use client'

import { useState } from 'react'
import { usePresenceContext } from '@/contexts/presence-context'

export function MessageInput({ contactId }: { contactId: string }) {
  const { setTyping } = usePresenceContext()
  const [message, setMessage] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMessage(e.target.value)

    // Notifica que está digitando
    setTyping(contactId, true)

    // Para de digitar após 2s de inatividade
    clearTimeout(typingTimeout)
    typingTimeout = setTimeout(() => {
      setTyping(contactId, false)
    }, 2000)
  }

  return <input value={message} onChange={handleChange} />
}
```

---

## 🎯 Features Automáticas

O PresenceProvider já faz automaticamente:

1. ✅ **Conecta ao WebSocket** assim que o usuário autentica
2. ✅ **Entra na room da organização** automaticamente
3. ✅ **Heartbeat a cada 15s** mantém online
4. ✅ **Detecta inatividade** marca como "away" após 3min
5. ✅ **Detecta aba em segundo plano** marca como "away"
6. ✅ **Detecta fechar aba** marca como "offline"
7. ✅ **Tracking de navegação** envia rota atual
8. ✅ **Reconexão automática** se cair a conexão

---

## 🐛 Debugging

Para ver os logs do WebSocket no console:

```javascript
// Os logs já estão implementados no PresenceProvider:
// ✅ WebSocket conectado - Registrando presença...
// 🏠 Entrou na room: org:123
// 💓 Heartbeat iniciado (15s)
// ✅ Fulano entrou online
// 😴 Marcado como away (inativo há 3min)
// 🙈 Aba em segundo plano - Away
// 👀 Aba em foco - Online
// 🧭 Navegou para: /conversations
```

---

## 🔧 Variáveis de Ambiente

Certifique-se de configurar:

```env
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001

# Backend (.env)
PORT=3001
FRONTEND_URL=http://localhost:3000
```

---

## 📦 Componentes Prontos

### OnlineUsersPanel
Já está integrado! Só usar:

```tsx
import { OnlineUsersPanel } from '@/components/OnlineUsersPanel'

<OnlineUsersPanel
  orgId={organizationId}
  currentUserId={userId}
  contacts={contacts}
/>
```

---

## 🚀 Próximos Passos

Agora que o sistema está integrado, você pode:

1. ✅ Ver quem está online em tempo real
2. ✅ Ver o que cada usuário está visualizando
3. ✅ Navegar para a mesma conversa que outro usuário
4. ✅ Ver status: online/away/offline
5. ✅ Tracking automático de atividade

**Sistema pronto para uso!** 🎉
