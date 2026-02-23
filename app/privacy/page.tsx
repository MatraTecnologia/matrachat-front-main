import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, Mail, Phone, MapPin } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Política de Privacidade - MatraChat',
  description: 'Política de privacidade da plataforma MatraChat',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-muted/20 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader className="space-y-4 border-b">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-3xl">Política de Privacidade</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Última atualização: {new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="prose prose-sm max-w-none mt-6 space-y-6">
            {/* Introdução */}
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introdução</h2>
              <p className="text-muted-foreground leading-relaxed">
                A Matra Tecnologia ("nós", "nosso" ou "MatraChat") está comprometida em proteger sua privacidade.
                Esta Política de Privacidade explica como coletamos, usamos, divulgamos e protegemos suas informações
                quando você utiliza nossa plataforma de mensageria multi-tenant MatraChat.
              </p>
            </section>

            {/* Informações que Coletamos */}
            <section>
              <h2 className="text-xl font-semibold mb-3">2. Informações que Coletamos</h2>

              <h3 className="text-lg font-medium mb-2 mt-4">2.1 Informações de Cadastro</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Nome completo</li>
                <li>Endereço de e-mail</li>
                <li>Senha (armazenada de forma criptografada)</li>
                <li>Informações da organização</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">2.2 Informações de Uso</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Mensagens enviadas e recebidas através da plataforma</li>
                <li>Contatos e listas de distribuição</li>
                <li>Campanhas de marketing criadas</li>
                <li>Logs de acesso e atividades</li>
                <li>Dados de uso da plataforma (páginas visitadas, tempo de sessão)</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">2.3 Informações Técnicas</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Endereço IP</li>
                <li>Tipo de navegador e dispositivo</li>
                <li>Sistema operacional</li>
                <li>Cookies e tecnologias similares</li>
              </ul>
            </section>

            {/* Como Usamos suas Informações */}
            <section>
              <h2 className="text-xl font-semibold mb-3">3. Como Usamos suas Informações</h2>
              <p className="text-muted-foreground mb-2">Utilizamos suas informações para:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Fornecer e manter nossos serviços</li>
                <li>Processar e entregar mensagens via WhatsApp Business API</li>
                <li>Gerenciar sua conta e organização</li>
                <li>Melhorar e personalizar sua experiência</li>
                <li>Enviar notificações importantes sobre o serviço</li>
                <li>Detectar, prevenir e resolver problemas técnicos</li>
                <li>Cumprir obrigações legais e regulatórias</li>
                <li>Analisar o uso da plataforma para melhorias</li>
              </ul>
            </section>

            {/* Compartilhamento de Informações */}
            <section>
              <h2 className="text-xl font-semibold mb-3">4. Compartilhamento de Informações</h2>

              <h3 className="text-lg font-medium mb-2 mt-4">4.1 Provedores de Serviço</h3>
              <p className="text-muted-foreground">
                Compartilhamos informações com provedores terceiros que nos ajudam a operar a plataforma:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
                <li><strong>Meta/Facebook:</strong> Para integração com WhatsApp Business API</li>
                <li><strong>Provedores de hospedagem:</strong> Para armazenamento de dados</li>
                <li><strong>Serviços de e-mail:</strong> Para comunicações transacionais</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">4.2 Requisitos Legais</h3>
              <p className="text-muted-foreground">
                Podemos divulgar suas informações quando exigido por lei ou para proteger nossos direitos legais.
              </p>

              <h3 className="text-lg font-medium mb-2 mt-4">4.3 Transferências de Negócio</h3>
              <p className="text-muted-foreground">
                Em caso de fusão, aquisição ou venda de ativos, suas informações podem ser transferidas.
              </p>
            </section>

            {/* Segurança dos Dados */}
            <section>
              <h2 className="text-xl font-semibold mb-3">5. Segurança dos Dados</h2>
              <p className="text-muted-foreground mb-2">
                Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Criptografia SSL/TLS para transmissão de dados</li>
                <li>Senhas criptografadas com bcrypt</li>
                <li>Controles de acesso baseados em função (RBAC)</li>
                <li>Backups regulares e seguros</li>
                <li>Monitoramento contínuo de segurança</li>
                <li>Conformidade com práticas de segurança da indústria</li>
              </ul>
            </section>

            {/* Retenção de Dados */}
            <section>
              <h2 className="text-xl font-semibold mb-3">6. Retenção de Dados</h2>
              <p className="text-muted-foreground">
                Mantemos suas informações pelo tempo necessário para fornecer nossos serviços e cumprir obrigações legais.
                Mensagens e logs são retidos conforme nossa política de retenção e requisitos regulatórios.
              </p>
            </section>

            {/* Seus Direitos (LGPD) */}
            <section>
              <h2 className="text-xl font-semibold mb-3">7. Seus Direitos (LGPD)</h2>
              <p className="text-muted-foreground mb-2">
                De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem o direito de:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Confirmar a existência de tratamento de dados</li>
                <li>Acessar seus dados pessoais</li>
                <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
                <li>Solicitar anonimização, bloqueio ou eliminação de dados</li>
                <li>Solicitar portabilidade de dados</li>
                <li>Revogar consentimento</li>
                <li>Opor-se ao tratamento de dados</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Para exercer esses direitos, entre em contato através dos canais indicados abaixo.
              </p>
            </section>

            {/* Cookies e Tecnologias Similares */}
            <section>
              <h2 className="text-xl font-semibold mb-3">8. Cookies e Tecnologias Similares</h2>
              <p className="text-muted-foreground">
                Utilizamos cookies e tecnologias similares para melhorar sua experiência, incluindo:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
                <li><strong>Cookies essenciais:</strong> Necessários para o funcionamento da plataforma</li>
                <li><strong>Cookies de preferência:</strong> Armazenam suas configurações (tema, idioma)</li>
                <li><strong>Cookies de sessão:</strong> Mantêm você autenticado</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Você pode gerenciar cookies através das configurações do seu navegador.
              </p>
            </section>

            {/* Alterações nesta Política */}
            <section>
              <h2 className="text-xl font-semibold mb-3">9. Alterações nesta Política</h2>
              <p className="text-muted-foreground">
                Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre mudanças
                significativas através da plataforma ou por e-mail. A data da última atualização será sempre
                indicada no topo desta página.
              </p>
            </section>

            {/* Contato */}
            <section>
              <h2 className="text-xl font-semibold mb-3">10. Contato</h2>
              <p className="text-muted-foreground mb-4">
                Para questões sobre esta Política de Privacidade ou sobre o tratamento de seus dados pessoais,
                entre em contato conosco:
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Mail className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">E-mail</p>
                    <a href="mailto:privacy@matratecnologia.com" className="text-primary hover:underline">
                      privacy@matratecnologia.com
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <MapPin className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Endereço</p>
                    <p>Matra Tecnologia LTDA</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Data Protection Officer */}
            <section className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Encarregado de Proteção de Dados (DPO)</h3>
              <p className="text-muted-foreground">
                Para questões específicas sobre proteção de dados e LGPD, contate nosso DPO:
              </p>
              <a href="mailto:dpo@matratecnologia.com" className="text-primary hover:underline mt-1 inline-block">
                dpo@matratecnologia.com
              </a>
            </section>
          </CardContent>

          <div className="p-6 border-t bg-muted/30">
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/terms">
                <Button variant="outline" className="w-full sm:w-auto">
                  Ver Termos de Serviço
                </Button>
              </Link>
              <Link href="/">
                <Button variant="default" className="w-full sm:w-auto">
                  Voltar para o Site
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
