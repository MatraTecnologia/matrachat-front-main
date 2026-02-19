import { permanentRedirect } from 'next/navigation'

export default function DashboardRootPage() {
    permanentRedirect('/dashboard')
}
