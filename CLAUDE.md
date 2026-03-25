# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Dev server at http://localhost:3000
npm run build    # Production build (standalone output)
npm start        # Start production server
npm run lint     # ESLint check
```

No test suite configured.

Environment: create `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:3333`.

## Architecture

**Next.js 16 App Router** SaaS multi-tenant chat platform. Routes split into two groups:
- `app/(auth)/` — public sign-in/sign-up/password reset pages
- `app/(dashboard)/` — protected routes (conversations, channels, contacts, campaigns, kanban, settings)

**Middleware** (`middleware.ts`): validates `better-auth.session_token` cookie, redirects unauthenticated users to `/sign-in`, and validates tenant via `GET /users/me/validate-tenant`.

**State management**: React Context only (no Redux/Zustand).
- `contexts/presence-context.tsx` — Socket.io WebSocket presence (online/away/offline per org room, heartbeat every 15s, idle after 3min)
- `contexts/permissions-context.tsx` — RBAC permissions fetched from `/organizations/{orgId}/my-permissions`

**API calls**: Axios wrapper at `lib/api.ts` — sets `baseURL` from `NEXT_PUBLIC_API_URL`, uses `withCredentials: true`. No React Query/SWR; direct `useEffect` + `useState` fetching throughout.

**Real-time**: Socket.io for presence tracking; `useAgentSse.ts` (SSE) for AI copilot responses.

**UI**: shadcn/ui components in `components/ui/` (Radix UI primitives + Tailwind CSS v4). Icons via Lucide React. Toasts via Sonner.

**Forms**: React Hook Form + Zod validation.

**Performance**: TanStack React Virtual for large conversation lists; Next.js standalone output for Docker deploys.

**Copilot route** (`app/(dashboard)/copilot/`) only appears in navigation when `NODE_ENV === 'development'`.

## Key files
- `middleware.ts` — auth + tenant routing logic
- `app/(dashboard)/layout.tsx` — sidebar layout + PresenceProvider wrapper
- `lib/api.ts` — shared Axios instance
- `app/(dashboard)/conversations/page.tsx` — main messaging UI (complex, large component)
