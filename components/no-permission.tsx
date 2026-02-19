import { ShieldOff } from 'lucide-react'

export function NoPermission() {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <ShieldOff className="h-10 w-10 opacity-40" />
            <p className="text-sm font-medium">Sem permissão</p>
            <p className="text-xs opacity-60 text-center max-w-xs">
                Você não tem permissão para acessar esta seção.
                Contate o administrador da organização.
            </p>
        </div>
    )
}
