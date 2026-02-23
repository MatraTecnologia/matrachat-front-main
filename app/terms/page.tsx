import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Mail, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Termos de Serviço - MatraChat',
  description: 'Termos de serviço da plataforma MatraChat',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-muted/20 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader className="space-y-4 border-b">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-3xl">Termos de Serviço</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Última atualização: {new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="prose prose-sm max-w-none mt-6 space-y-6">
            {/* Introdução */}
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Aceitação dos Termos</h2>
              <p className="text-muted-foreground leading-relaxed">
                Bem-vindo ao MatraChat, uma plataforma de mensageria multi-tenant desenvolvida pela Matra Tecnologia LTDA
                ("Matra", "nós", "nosso" ou "MatraChat"). Ao acessar ou usar nossa plataforma, você concorda em estar
                vinculado a estes Termos de Serviço ("Termos"). Se você não concorda com estes Termos, não utilize nossos serviços.
              </p>
            </section>

            {/* Descrição do Serviço */}
            <section>
              <h2 className="text-xl font-semibold mb-3">2. Descrição do Serviço</h2>
              <p className="text-muted-foreground mb-2">
                O MatraChat é uma plataforma SaaS (Software as a Service) que oferece:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Integração com WhatsApp Business API oficial do Meta/Facebook</li>
                <li>Gerenciamento de conversas e contatos</li>
                <li>Criação e execução de campanhas de marketing</li>
                <li>Sistema de chatbot e automação (Copilot)</li>
                <li>Gestão multi-usuário e multi-organização</li>
                <li>Relatórios e análises de atendimento</li>
              </ul>
            </section>

            {/* Elegibilidade e Conta */}
            <section>
              <h2 className="text-xl font-semibold mb-3">3. Elegibilidade e Conta</h2>

              <h3 className="text-lg font-medium mb-2 mt-4">3.1 Elegibilidade</h3>
              <p className="text-muted-foreground">
                Você deve ter pelo menos 18 anos e capacidade legal para celebrar contratos para usar nossos serviços.
                Ao criar uma conta, você declara e garante que todas as informações fornecidas são verdadeiras,
                precisas e completas.
              </p>

              <h3 className="text-lg font-medium mb-2 mt-4">3.2 Segurança da Conta</h3>
              <p className="text-muted-foreground">Você é responsável por:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Manter a confidencialidade de suas credenciais de acesso</li>
                <li>Todas as atividades que ocorram sob sua conta</li>
                <li>Notificar-nos imediatamente sobre qualquer uso não autorizado</li>
                <li>Garantir que suas informações de conta estejam atualizadas</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">3.3 Organizações</h3>
              <p className="text-muted-foreground">
                Cada conta está associada a uma organização. Administradores da organização têm controle sobre
                usuários, permissões e configurações. Você concorda em respeitar as políticas estabelecidas
                pelos administradores da sua organização.
              </p>
            </section>

            {/* Uso Aceitável */}
            <section>
              <h2 className="text-xl font-semibold mb-3">4. Uso Aceitável</h2>

              <h3 className="text-lg font-medium mb-2 mt-4">4.1 Uso Permitido</h3>
              <p className="text-muted-foreground">
                Você pode usar o MatraChat exclusivamente para fins comerciais legítimos de comunicação com clientes
                através do WhatsApp Business API.
              </p>

              <h3 className="text-lg font-medium mb-2 mt-4">4.2 Uso Proibido</h3>
              <p className="text-muted-foreground mb-2">Você NÃO pode usar nossa plataforma para:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Enviar spam, mensagens não solicitadas ou em massa sem consentimento</li>
                <li>Violar direitos de propriedade intelectual de terceiros</li>
                <li>Transmitir conteúdo ilegal, ofensivo, difamatório ou prejudicial</li>
                <li>Assediar, ameaçar ou prejudicar outras pessoas</li>
                <li>Violar políticas do WhatsApp Business ou Meta/Facebook</li>
                <li>Fazer engenharia reversa ou tentar acessar nossos sistemas de forma não autorizada</li>
                <li>Interferir no funcionamento da plataforma</li>
                <li>Revender ou redistribuir nossos serviços sem autorização</li>
                <li>Usar para atividades fraudulentas ou enganosas</li>
              </ul>
            </section>

            {/* Conformidade com WhatsApp Business */}
            <section>
              <h2 className="text-xl font-semibold mb-3">5. Conformidade com WhatsApp Business</h2>
              <p className="text-muted-foreground mb-2">
                Ao usar o MatraChat para integração com WhatsApp Business API, você concorda em:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Cumprir as <a href="https://www.whatsapp.com/legal/business-terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Políticas Comerciais do WhatsApp</a></li>
                <li>Cumprir as <a href="https://www.whatsapp.com/legal/commerce-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Políticas de Comércio do WhatsApp</a></li>
                <li>Respeitar as limitações de taxa e volume de mensagens</li>
                <li>Obter consentimento adequado dos usuários antes de enviar mensagens</li>
                <li>Fornecer opção de cancelamento (opt-out) em suas comunicações</li>
                <li>Manter a qualidade da conta e evitar bloqueios ou restrições</li>
              </ul>
              <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Importante:</strong> Violações das políticas do WhatsApp podem
                  resultar na suspensão ou banimento da sua conta WhatsApp Business. A Matra Tecnologia não se
                  responsabiliza por penalidades aplicadas pelo Meta/WhatsApp.
                </p>
              </div>
            </section>

            {/* Pagamento e Faturamento */}
            <section>
              <h2 className="text-xl font-semibold mb-3">6. Pagamento e Faturamento</h2>

              <h3 className="text-lg font-medium mb-2 mt-4">6.1 Planos e Preços</h3>
              <p className="text-muted-foreground">
                Os preços e planos estão disponíveis em nosso site. Reservamo-nos o direito de modificar
                preços mediante aviso prévio de 30 dias.
              </p>

              <h3 className="text-lg font-medium mb-2 mt-4">6.2 Faturamento</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Assinaturas são cobradas antecipadamente em ciclos mensais ou anuais</li>
                <li>Pagamentos são processados automaticamente no início de cada ciclo</li>
                <li>Você é responsável por manter informações de pagamento válidas</li>
                <li>Atrasos no pagamento podem resultar na suspensão do serviço</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">6.3 Reembolsos</h3>
              <p className="text-muted-foreground">
                Não oferecemos reembolsos para pagamentos já processados, exceto quando exigido por lei.
                Cancelamentos entram em vigor no final do período de faturamento atual.
              </p>

              <h3 className="text-lg font-medium mb-2 mt-4">6.4 Custos do WhatsApp Business API</h3>
              <p className="text-muted-foreground">
                Custos relacionados ao uso da WhatsApp Business API do Meta (como taxas por conversação) são
                cobrados diretamente pelo Meta/Facebook e não estão inclusos em nossa assinatura.
              </p>
            </section>

            {/* Propriedade Intelectual */}
            <section>
              <h2 className="text-xl font-semibold mb-3">7. Propriedade Intelectual</h2>

              <h3 className="text-lg font-medium mb-2 mt-4">7.1 Propriedade da Matra</h3>
              <p className="text-muted-foreground">
                Todo o conteúdo da plataforma MatraChat, incluindo software, design, texto, gráficos, logotipos
                e código-fonte, é propriedade da Matra Tecnologia e protegido por leis de direitos autorais e
                propriedade intelectual.
              </p>

              <h3 className="text-lg font-medium mb-2 mt-4">7.2 Seus Dados</h3>
              <p className="text-muted-foreground">
                Você mantém todos os direitos sobre o conteúdo que você envia, posta ou exibe através do MatraChat
                (seus "Dados"). Ao usar nossa plataforma, você nos concede uma licença limitada para processar
                e armazenar seus Dados conforme necessário para fornecer o serviço.
              </p>
            </section>

            {/* Limitação de Responsabilidade */}
            <section>
              <h2 className="text-xl font-semibold mb-3">8. Limitação de Responsabilidade</h2>

              <h3 className="text-lg font-medium mb-2 mt-4">8.1 Disponibilidade do Serviço</h3>
              <p className="text-muted-foreground">
                Embora nos esforcemos para manter a plataforma disponível 24/7, não garantimos operação
                ininterrupta ou livre de erros. Podemos realizar manutenções programadas mediante aviso prévio.
              </p>

              <h3 className="text-lg font-medium mb-2 mt-4">8.2 Limitações</h3>
              <p className="text-muted-foreground mb-2">
                Na máxima extensão permitida por lei, a Matra Tecnologia NÃO será responsável por:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Danos indiretos, incidentais ou consequenciais</li>
                <li>Perda de lucros, receitas, dados ou oportunidades de negócio</li>
                <li>Bloqueios ou suspensões aplicadas pelo Meta/WhatsApp</li>
                <li>Falhas na entrega de mensagens devido a problemas externos</li>
                <li>Ações de terceiros, incluindo destinatários de mensagens</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">8.3 Limites de Responsabilidade</h3>
              <p className="text-muted-foreground">
                Nossa responsabilidade total para com você por quaisquer reivindicações relacionadas ao serviço
                não excederá o valor pago por você nos 12 meses anteriores ao evento que deu origem à reivindicação.
              </p>
            </section>

            {/* Privacidade e Proteção de Dados */}
            <section>
              <h2 className="text-xl font-semibold mb-3">9. Privacidade e Proteção de Dados</h2>
              <p className="text-muted-foreground">
                Nossa coleta, uso e proteção de dados pessoais são regidos pela nossa{' '}
                <Link href="/privacy" className="text-primary hover:underline">
                  Política de Privacidade
                </Link>
                . Ao usar o MatraChat, você concorda com o tratamento de dados conforme descrito na Política de Privacidade.
              </p>

              <h3 className="text-lg font-medium mb-2 mt-4">9.1 Conformidade com LGPD</h3>
              <p className="text-muted-foreground">
                Comprometemo-nos a cumprir a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) e outras
                legislações aplicáveis de proteção de dados.
              </p>

              <h3 className="text-lg font-medium mb-2 mt-4">9.2 Responsabilidade pelos Dados</h3>
              <p className="text-muted-foreground">
                Você é o controlador dos dados dos seus clientes/contatos e é responsável por:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Obter consentimentos necessários para processamento de dados</li>
                <li>Cumprir todas as leis de proteção de dados aplicáveis</li>
                <li>Fornecer avisos de privacidade adequados aos seus usuários</li>
                <li>Respeitar direitos de titulares de dados (acesso, correção, exclusão)</li>
              </ul>
            </section>

            {/* Suspensão e Encerramento */}
            <section>
              <h2 className="text-xl font-semibold mb-3">10. Suspensão e Encerramento</h2>

              <h3 className="text-lg font-medium mb-2 mt-4">10.1 Por Você</h3>
              <p className="text-muted-foreground">
                Você pode cancelar sua conta a qualquer momento através das configurações da plataforma ou
                entrando em contato conosco. O cancelamento entrará em vigor no final do período de faturamento atual.
              </p>

              <h3 className="text-lg font-medium mb-2 mt-4">10.2 Por Nós</h3>
              <p className="text-muted-foreground mb-2">
                Podemos suspender ou encerrar sua conta imediatamente se:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Você violar estes Termos de Serviço</li>
                <li>Houver uso fraudulento ou abusivo da plataforma</li>
                <li>Seu pagamento estiver em atraso por mais de 30 dias</li>
                <li>Formos obrigados por lei ou autoridades competentes</li>
                <li>Você violar políticas do WhatsApp/Meta</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">10.3 Efeitos do Encerramento</h3>
              <p className="text-muted-foreground">
                Após o encerramento, seu acesso será revogado. Podemos reter seus dados por período limitado
                conforme exigências legais, mas não somos obrigados a mantê-los indefinidamente.
              </p>
            </section>

            {/* Alterações nos Termos */}
            <section>
              <h2 className="text-xl font-semibold mb-3">11. Alterações nos Termos</h2>
              <p className="text-muted-foreground">
                Podemos modificar estes Termos a qualquer momento. Notificaremos você sobre alterações materiais
                através da plataforma ou por e-mail com pelo menos 30 dias de antecedência. O uso continuado
                após as alterações constituirá sua aceitação dos novos Termos.
              </p>
            </section>

            {/* Lei Aplicável */}
            <section>
              <h2 className="text-xl font-semibold mb-3">12. Lei Aplicável e Foro</h2>
              <p className="text-muted-foreground">
                Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa
                relacionada a estes Termos será submetida ao foro da comarca da sede da Matra Tecnologia,
                com exclusão de qualquer outro, por mais privilegiado que seja.
              </p>
            </section>

            {/* Disposições Gerais */}
            <section>
              <h2 className="text-xl font-semibold mb-3">13. Disposições Gerais</h2>

              <h3 className="text-lg font-medium mb-2 mt-4">13.1 Integralidade do Acordo</h3>
              <p className="text-muted-foreground">
                Estes Termos, juntamente com a Política de Privacidade, constituem o acordo completo entre
                você e a Matra Tecnologia.
              </p>

              <h3 className="text-lg font-medium mb-2 mt-4">13.2 Renúncia</h3>
              <p className="text-muted-foreground">
                A não aplicação de qualquer disposição destes Termos não constitui renúncia do direito de
                aplicá-la posteriormente.
              </p>

              <h3 className="text-lg font-medium mb-2 mt-4">13.3 Divisibilidade</h3>
              <p className="text-muted-foreground">
                Se qualquer disposição destes Termos for considerada inválida, as demais permanecerão em pleno vigor.
              </p>

              <h3 className="text-lg font-medium mb-2 mt-4">13.4 Cessão</h3>
              <p className="text-muted-foreground">
                Você não pode ceder seus direitos sob estes Termos sem nosso consentimento prévio por escrito.
                Podemos ceder nossos direitos a qualquer afiliada ou sucessor.
              </p>
            </section>

            {/* Contato */}
            <section>
              <h2 className="text-xl font-semibold mb-3">14. Contato</h2>
              <p className="text-muted-foreground mb-4">
                Para questões sobre estes Termos de Serviço, entre em contato:
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Mail className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">E-mail</p>
                    <a href="mailto:legal@matratecnologia.com" className="text-primary hover:underline">
                      legal@matratecnologia.com
                    </a>
                  </div>
                </div>
              </div>
            </section>

            {/* Declaração de Conformidade */}
            <section className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Declaração de Conformidade</h3>
              <p className="text-muted-foreground text-sm">
                O MatraChat é uma plataforma independente que utiliza a WhatsApp Business API oficial do Meta/Facebook.
                Não somos afiliados, endossados ou patrocinados pelo WhatsApp, Meta ou Facebook. WhatsApp é uma marca
                registrada da WhatsApp LLC, uma subsidiária da Meta Platforms, Inc.
              </p>
            </section>
          </CardContent>

          <div className="p-6 border-t bg-muted/30">
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/privacy">
                <Button variant="outline" className="w-full sm:w-auto">
                  Ver Política de Privacidade
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
