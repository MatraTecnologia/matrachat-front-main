'use client'

import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldX } from 'lucide-react'

export default function UnauthorizedPage() {
    const searchParams = useSearchParams()
    const domain = searchParams.get('domain')

    const handleSignOut = () => {
        // Redireciona para sign-in
        window.location.href = '/sign-in'
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                        <ShieldX className="w-6 h-6 text-destructive" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl">Acesso Negado</CardTitle>
                        <CardDescription className="mt-2">
                            Você não tem permissão para acessar esta organização
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {domain && (
                        <div className="bg-muted rounded-lg p-3 text-sm">
                            <p className="text-muted-foreground">Domínio solicitado:</p>
                            <p className="font-mono font-medium">{domain}</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                            Você está autenticado, mas não é membro da organização deste subdomínio.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Entre em contato com o administrador da organização para solicitar acesso.
                        </p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Button onClick={handleSignOut} variant="default" className="w-full">
                            Fazer Login com Outra Conta
                        </Button>
                        <Button
                            onClick={() => window.history.back()}
                            variant="outline"
                            className="w-full"
                        >
                            Voltar
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
