import { permanentRedirect } from 'next/navigation'

// Redireciona raiz para o dashboard
export default function RootPage() {
    permanentRedirect('/dashboard')
}
