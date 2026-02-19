'use client'

import { useState } from 'react'
import {
    BarChart2,
    MessageSquare,
    Hash,
    Bot,
    Users,
    Megaphone,
    Settings,
    FlaskConical,
    ChevronDown,
    Search,
    BookOpen,
    MessageCircle,
    Mail,
    Globe,
    Phone,
    Tag,
    Bell,
    Shield,
    Zap,
    HelpCircle,
    ArrowRight,
    CheckCircle2,
    Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Tipos ─────────────────────────────────────────────────────────────────

type Section = {
    id: string
    icon: React.ElementType
    color: string
    title: string
    subtitle: string
    topics: Topic[]
}

type Topic = {
    question: string
    answer: string | React.ReactNode
}

// ── Dados de conteúdo ─────────────────────────────────────────────────────

const sections: Section[] = [
    {
        id: 'dashboard',
        icon: BarChart2,
        color: 'text-blue-500',
        title: 'Relatórios',
        subtitle: 'Acompanhe métricas e desempenho da equipe',
        topics: [
            {
                question: 'O que são os Relatórios?',
                answer:
                    'A página de Relatórios exibe métricas em tempo real do seu atendimento: total de conversas, tempo médio de resposta, conversas abertas/fechadas, desempenho por canal e por agente. É o ponto de partida para entender a saúde do seu suporte.',
            },
            {
                question: 'Como interpretar os gráficos de desempenho?',
                answer:
                    'Cada gráfico apresenta dados de um período selecionável. Passe o mouse sobre os pontos para ver detalhes. Os indicadores coloridos mostram se a métrica está dentro do esperado (verde), em atenção (amarelo) ou crítica (vermelho).',
            },
            {
                question: 'Como exportar relatórios?',
                answer:
                    'No canto superior direito da página existe um botão "Exportar". Você pode baixar os dados em CSV ou PDF para análises externas ou compartilhar com sua equipe.',
            },
        ],
    },
    {
        id: 'conversations',
        icon: MessageSquare,
        color: 'text-green-500',
        title: 'Conversas',
        subtitle: 'Gerencie todas as interações com seus clientes',
        topics: [
            {
                question: 'O que é a área de Conversas?',
                answer:
                    'A área de Conversas centraliza todas as mensagens recebidas de diferentes canais (WhatsApp, E-mail, Telefone, API). Você pode responder, transferir, encerrar e etiquetar conversas em um único lugar.',
            },
            {
                question: 'Como filtrar conversas por canal?',
                answer:
                    'No menu lateral, dentro de "Conversas", você verá a lista de canais conectados. Clique em qualquer canal para visualizar apenas as conversas daquele canal. A URL será atualizada automaticamente com o filtro ativo.',
            },
            {
                question: 'Como usar tags (etiquetas) nas conversas?',
                answer:
                    'Tags são rótulos coloridos que ajudam a categorizar conversas. Acesse uma conversa, clique em "Adicionar tag" e selecione ou crie uma etiqueta. No menu lateral você também pode filtrar todas as conversas por tag.',
            },
            {
                question: 'Como transferir uma conversa para outro agente?',
                answer:
                    'Dentro da conversa, clique no botão "Transferir" (ícone de seta). Selecione o agente ou equipe de destino e confirme. O agente receberá uma notificação e a conversa aparecerá na fila dele.',
            },
            {
                question: 'O que significa cada status de conversa?',
                answer: (
                    <ul className="space-y-1.5 text-sm">
                        <li className="flex items-start gap-2"><span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-yellow-400" /><span><strong>Aguardando:</strong> nenhum agente respondeu ainda.</span></li>
                        <li className="flex items-start gap-2"><span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" /><span><strong>Em andamento:</strong> agente está atendendo ativamente.</span></li>
                        <li className="flex items-start gap-2"><span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-green-500" /><span><strong>Resolvida:</strong> conversa encerrada com sucesso.</span></li>
                        <li className="flex items-start gap-2"><span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-gray-400" /><span><strong>Arquivada:</strong> removida da fila ativa, mas ainda acessível no histórico.</span></li>
                    </ul>
                ),
            },
        ],
    },
    {
        id: 'channels',
        icon: Hash,
        color: 'text-purple-500',
        title: 'Canais',
        subtitle: 'Configure os meios de comunicação com seus clientes',
        topics: [
            {
                question: 'O que são Canais?',
                answer:
                    'Canais são as origens de contato dos seus clientes: WhatsApp, E-mail, Telefone ou uma API personalizada. Cada canal tem suas próprias configurações de conexão e pode ser ativado ou desativado independentemente.',
            },
            {
                question: 'Como conectar um canal de WhatsApp?',
                answer:
                    'Em Canais, clique em "Novo Canal" → selecione WhatsApp. Siga o assistente: escaneie o QR Code com o WhatsApp do número desejado ou insira a API key do WhatsApp Business. Após conectado, o status ficará verde.',
            },
            {
                question: 'Como conectar um canal de E-mail?',
                answer:
                    'Selecione E-mail no assistente de novo canal. Informe o endereço, servidor SMTP/IMAP, porta e credenciais. O sistema enviará um e-mail de verificação para confirmar a conexão.',
            },
            {
                question: 'O que é o canal via API?',
                answer:
                    'O canal de API permite que sistemas externos enviem e recebam mensagens programaticamente. Após criar o canal, você receberá um Webhook URL e uma API Key para integrar com seu sistema.',
            },
            {
                question: 'O que indicam os pontos coloridos ao lado do canal?',
                answer:
                    'Verde = canal conectado e funcionando normalmente. Vermelho = canal desconectado, verifique as configurações ou reautentique.',
            },
        ],
    },
    {
        id: 'copilot',
        icon: Bot,
        color: 'text-orange-500',
        title: 'Capitão / Copiloto',
        subtitle: 'Automatize atendimentos com inteligência artificial',
        topics: [
            {
                question: 'O que é o Copiloto?',
                answer:
                    'O Copiloto é um assistente de IA que ajuda os agentes durante o atendimento. Ele sugere respostas, resume conversas longas e pode responder automaticamente a perguntas frequentes, reduzindo o tempo de atendimento.',
            },
            {
                question: 'Como ativar o Copiloto em uma conversa?',
                answer:
                    'Dentro de uma conversa ativa, clique no botão "Copiloto" na barra de ferramentas. Ele analisará o contexto e apresentará sugestões de resposta. Você pode aceitar, editar ou ignorar as sugestões.',
            },
            {
                question: 'O que é o modo Capitão?',
                answer:
                    'No modo Capitão, a IA assume o atendimento de forma autônoma, respondendo às mensagens sem intervenção humana. O agente pode monitorar e interromper a qualquer momento clicando em "Assumir conversa".',
            },
            {
                question: 'Como treinar o Copiloto com minha base de conhecimento?',
                answer:
                    'Em Configurações → Copiloto, você pode adicionar documentos, URLs e respostas pré-cadastradas. Quanto mais material você fornece, mais preciso o Copiloto fica para o seu negócio.',
            },
        ],
    },
    {
        id: 'contacts',
        icon: Users,
        color: 'text-teal-500',
        title: 'Contatos',
        subtitle: 'Gerencie sua base de clientes e leads',
        topics: [
            {
                question: 'O que são os Contatos?',
                answer:
                    'Contatos é a base de dados de todos os clientes e leads que já interagiram com seus canais. Você pode visualizar o histórico de conversas de cada contato, adicionar anotações e campos personalizados.',
            },
            {
                question: 'Como importar contatos em massa?',
                answer:
                    'Clique em "Importar" na página de Contatos e faça upload de um arquivo CSV. O sistema mapeará automaticamente os campos (nome, telefone, e-mail). Você pode baixar o modelo CSV de exemplo para preencher.',
            },
            {
                question: 'Como criar campos personalizados para contatos?',
                answer:
                    'Em Configurações → Contatos → Campos personalizados, você pode adicionar campos extras como "CPF", "Empresa", "Plano contratado", etc. Esses campos aparecerão no perfil de cada contato.',
            },
            {
                question: 'Como segmentar contatos?',
                answer:
                    'Use os filtros avançados na listagem de contatos para segmentar por canal de origem, tag, data de primeiro contato, ou qualquer campo personalizado. Os filtros podem ser salvos como segmentos reutilizáveis.',
            },
        ],
    },
    {
        id: 'campaigns',
        icon: Megaphone,
        color: 'text-pink-500',
        title: 'Campanhas',
        subtitle: 'Envie mensagens em massa para seus contatos',
        topics: [
            {
                question: 'O que são Campanhas?',
                answer:
                    'Campanhas permitem enviar mensagens proativas para uma lista de contatos. Ideal para avisos, promoções, cobranças e reengajamento de clientes inativos via WhatsApp ou outros canais.',
            },
            {
                question: 'Como criar uma campanha?',
                answer:
                    'Clique em "Nova campanha", selecione o canal de envio, defina o segmento de contatos destinatários, redija a mensagem (ou use um template aprovado pelo WhatsApp) e agende ou dispare imediatamente.',
            },
            {
                question: 'O que são templates de mensagem?',
                answer:
                    'Templates são mensagens pré-aprovadas pelo WhatsApp Business necessárias para campanhas outbound. Você pode criar e submeter templates para aprovação diretamente na plataforma em Configurações → Templates.',
            },
            {
                question: 'Como acompanhar os resultados de uma campanha?',
                answer:
                    'Após o disparo, a campanha exibe métricas em tempo real: mensagens enviadas, entregues, lidas e respondidas. Clique em qualquer métrica para ver a lista de contatos naquele estado.',
            },
            {
                question: 'Existe limite de envio de campanhas?',
                answer:
                    'O limite depende do plano contratado e das restrições do canal escolhido. O WhatsApp Business API tem limites progressivos baseados na qualidade do número. Consulte Configurações → Plano para ver seu limite atual.',
            },
        ],
    },
    {
        id: 'settings',
        icon: Settings,
        color: 'text-slate-500',
        title: 'Configurações',
        subtitle: 'Personalize a plataforma para sua equipe',
        topics: [
            {
                question: 'O que posso configurar em Configurações?',
                answer:
                    'Em Configurações você gerencia: membros da equipe e permissões, horários de funcionamento, respostas rápidas, templates de mensagem, webhooks, integrações externas, aparência e preferências da organização.',
            },
            {
                question: 'Como adicionar membros à equipe?',
                answer:
                    'Em Configurações → Membros, clique em "Convidar membro". Insira o e-mail e selecione o papel (Administrador, Agente ou Visualizador). O convidado receberá um e-mail com link de acesso.',
            },
            {
                question: 'Como configurar horário de atendimento?',
                answer:
                    'Em Configurações → Horários, defina os dias e horas em que a equipe está disponível. Fora desse horário, uma mensagem automática pode ser enviada ao cliente informando quando será atendido.',
            },
            {
                question: 'O que são Respostas Rápidas?',
                answer:
                    'Respostas Rápidas são atalhos de texto que os agentes podem usar durante o atendimento. Digite "/" no campo de mensagem para buscar e inserir uma resposta rápida, agilizando respostas a perguntas frequentes.',
            },
            {
                question: 'Como configurar notificações?',
                answer:
                    'Em Configurações → Notificações, você pode ativar alertas sonoros, notificações do navegador e e-mail para novos contatos, transferências e conversas não respondidas após determinado tempo.',
            },
        ],
    },
    {
        id: 'test',
        icon: FlaskConical,
        color: 'text-amber-500',
        title: 'Teste do Widget',
        subtitle: 'Valide o chat widget antes de publicar',
        topics: [
            {
                question: 'O que é o Teste do Widget?',
                answer:
                    'O Teste do Widget permite simular a experiência do seu cliente ao usar o chat widget que você instalará no seu site. Você pode testar o fluxo de atendimento sem precisar publicar o widget em produção.',
            },
            {
                question: 'Como instalar o widget no meu site?',
                answer:
                    'Em Configurações → Widget, copie o código de instalação e cole antes do fechamento da tag </body> do seu site. O widget aparecerá como um botão flutuante para os visitantes iniciarem conversas.',
            },
            {
                question: 'Posso personalizar a aparência do widget?',
                answer:
                    'Sim. Em Configurações → Widget → Aparência, você pode definir a cor primária, o texto de boas-vindas, o ícone do botão e o posicionamento (canto inferior direito ou esquerdo).',
            },
        ],
    },
]

// ── Perguntas frequentes gerais ────────────────────────────────────────────

const generalFaqs: Topic[] = [
    {
        question: 'Como alterar minha senha?',
        answer: 'Acesse Minha Conta (avatar no canto inferior da sidebar) → Segurança → Alterar senha. Você receberá um e-mail de confirmação.',
    },
    {
        question: 'Como trocar o idioma da plataforma?',
        answer: 'Atualmente a plataforma está disponível em português. Novos idiomas serão adicionados em versões futuras.',
    },
    {
        question: 'Onde vejo o histórico de uma conversa encerrada?',
        answer: 'Em Conversas, use o filtro "Status: Resolvida" ou "Arquivada". Você pode pesquisar pelo nome do contato ou conteúdo da mensagem.',
    },
    {
        question: 'Como entrar em contato com o suporte da MatraChat?',
        answer: 'Você pode usar o chat widget disponível nesta página ou enviar um e-mail para suporte@matrachat.com. Nosso horário de atendimento é de segunda a sexta, das 9h às 18h.',
    },
    {
        question: 'Como funcionam os planos e cobrança?',
        answer: 'Acesse Configurações → Plano e Cobrança para ver seu plano atual, histórico de faturas e opções de upgrade. O faturamento é mensal e baseado no número de agentes ativos.',
    },
]

// ── Componente Accordion Item ─────────────────────────────────────────────

function AccordionItem({ topic, defaultOpen = false }: { topic: Topic; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <div className="border-b last:border-b-0">
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium text-foreground hover:text-foreground/80 transition-colors"
            >
                <span>{topic.question}</span>
                <ChevronDown
                    className={cn(
                        'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                        open && 'rotate-180'
                    )}
                />
            </button>
            {open && (
                <div className="pb-4 text-sm text-muted-foreground leading-relaxed">
                    {topic.answer}
                </div>
            )}
        </div>
    )
}

// ── Componente Card de Seção ──────────────────────────────────────────────

function SectionCard({
    section,
    onClick,
    active,
}: {
    section: Section
    onClick: () => void
    active: boolean
}) {
    const Icon = section.icon
    return (
        <button
            onClick={onClick}
            className={cn(
                'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all hover:shadow-md',
                active
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border bg-card hover:border-primary/30'
            )}
        >
            <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg bg-muted', active && 'bg-primary/10')}>
                <Icon className={cn('h-5 w-5', section.color)} />
            </div>
            <div>
                <p className="text-sm font-semibold text-foreground">{section.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{section.subtitle}</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>{section.topics.length} tópico{section.topics.length !== 1 ? 's' : ''}</span>
            </div>
        </button>
    )
}

// ── Página Principal ──────────────────────────────────────────────────────

export default function HelpCenterPage() {
    const [search, setSearch] = useState('')
    const [activeSection, setActiveSection] = useState<string | null>(null)

    const lowerSearch = search.toLowerCase().trim()

    // Filtrar seções e tópicos pela busca
    const filteredSections = sections.map((s) => ({
        ...s,
        topics: s.topics.filter(
            (t) =>
                !lowerSearch ||
                t.question.toLowerCase().includes(lowerSearch) ||
                (typeof t.answer === 'string' && t.answer.toLowerCase().includes(lowerSearch))
        ),
    })).filter((s) => s.topics.length > 0)

    const filteredFaqs = generalFaqs.filter(
        (t) =>
            !lowerSearch ||
            t.question.toLowerCase().includes(lowerSearch) ||
            (typeof t.answer === 'string' && t.answer.toLowerCase().includes(lowerSearch))
    )

    const currentSection = lowerSearch
        ? null
        : activeSection
            ? filteredSections.find((s) => s.id === activeSection) ?? null
            : null

    const showAll = !lowerSearch && !activeSection

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            {/* Header hero */}
            <div className="shrink-0 border-b bg-card px-6 py-8">
                <div className="mx-auto max-w-2xl text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                        <BookOpen className="h-6 w-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Central de Ajuda</h1>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                        Encontre respostas sobre todos os recursos da MatraChat
                    </p>

                    {/* Search */}
                    <div className="relative mt-5">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Pesquisar tópicos, funcionalidades..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value)
                                setActiveSection(null)
                            }}
                            className="w-full rounded-lg border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                        />
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-4xl px-6 py-8">

                    {/* Resultados de busca */}
                    {lowerSearch && (
                        <div className="space-y-6">
                            {filteredSections.length === 0 && filteredFaqs.length === 0 ? (
                                <div className="flex flex-col items-center gap-3 py-16 text-center">
                                    <HelpCircle className="h-10 w-10 text-muted-foreground/40" />
                                    <p className="text-sm font-medium text-foreground">Nenhum resultado encontrado</p>
                                    <p className="text-xs text-muted-foreground">
                                        Tente palavras-chave diferentes ou{' '}
                                        <button
                                            onClick={() => setSearch('')}
                                            className="text-primary underline underline-offset-2"
                                        >
                                            limpe a pesquisa
                                        </button>
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {filteredSections.map((s) => {
                                        const Icon = s.icon
                                        return (
                                            <div key={s.id}>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Icon className={cn('h-4 w-4', s.color)} />
                                                    <h2 className="text-sm font-semibold text-foreground">{s.title}</h2>
                                                </div>
                                                <div className="rounded-xl border bg-card divide-y">
                                                    {s.topics.map((t, i) => (
                                                        <AccordionItem key={i} topic={t} defaultOpen />
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {filteredFaqs.length > 0 && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                                <h2 className="text-sm font-semibold text-foreground">Perguntas Frequentes</h2>
                                            </div>
                                            <div className="rounded-xl border bg-card divide-y">
                                                {filteredFaqs.map((t, i) => (
                                                    <AccordionItem key={i} topic={t} defaultOpen />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Grid de seções */}
                    {!lowerSearch && (
                        <>
                            {/* Cards de navegação */}
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 mb-8">
                                {sections.map((s) => (
                                    <SectionCard
                                        key={s.id}
                                        section={s}
                                        active={activeSection === s.id}
                                        onClick={() =>
                                            setActiveSection((prev) => (prev === s.id ? null : s.id))
                                        }
                                    />
                                ))}
                            </div>

                            {/* Seção ativa */}
                            {currentSection && (
                                <div className="mb-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                                            <currentSection.icon className={cn('h-4 w-4', currentSection.color)} />
                                        </div>
                                        <div>
                                            <h2 className="text-base font-semibold text-foreground">{currentSection.title}</h2>
                                            <p className="text-xs text-muted-foreground">{currentSection.subtitle}</p>
                                        </div>
                                    </div>
                                    <div className="rounded-xl border bg-card divide-y px-2">
                                        {currentSection.topics.map((t, i) => (
                                            <AccordionItem key={i} topic={t} defaultOpen={i === 0} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Visão geral de todas as seções */}
                            {showAll && (
                                <div className="space-y-8">
                                    {sections.map((s) => {
                                        const Icon = s.icon
                                        return (
                                            <div key={s.id} id={s.id}>
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
                                                            <Icon className={cn('h-4 w-4', s.color)} />
                                                        </div>
                                                        <h2 className="text-sm font-semibold text-foreground">{s.title}</h2>
                                                    </div>
                                                    <button
                                                        onClick={() => setActiveSection(s.id)}
                                                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                                                    >
                                                        Ver tudo <ArrowRight className="h-3 w-3" />
                                                    </button>
                                                </div>
                                                <div className="rounded-xl border bg-card divide-y px-2">
                                                    {s.topics.slice(0, 2).map((t, i) => (
                                                        <AccordionItem key={i} topic={t} />
                                                    ))}
                                                    {s.topics.length > 2 && (
                                                        <button
                                                            onClick={() => setActiveSection(s.id)}
                                                            className="flex w-full items-center justify-center gap-1.5 py-3 text-xs text-muted-foreground hover:text-primary transition-colors"
                                                        >
                                                            + {s.topics.length - 2} tópico{s.topics.length - 2 !== 1 ? 's' : ''} a mais
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}

                                    {/* FAQ geral */}
                                    <div>
                                        <div className="flex items-center gap-2.5 mb-3">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
                                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <h2 className="text-sm font-semibold text-foreground">Perguntas Frequentes</h2>
                                        </div>
                                        <div className="rounded-xl border bg-card divide-y px-2">
                                            {generalFaqs.map((t, i) => (
                                                <AccordionItem key={i} topic={t} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* FAQ geral ao ver seção específica */}
                            {currentSection && (
                                <div>
                                    <div className="flex items-center gap-2.5 mb-3">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
                                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <h2 className="text-sm font-semibold text-foreground">Perguntas Frequentes Gerais</h2>
                                    </div>
                                    <div className="rounded-xl border bg-card divide-y px-2">
                                        {generalFaqs.map((t, i) => (
                                            <AccordionItem key={i} topic={t} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Banner de contato */}
                            <div className="mt-8 rounded-xl border bg-card p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                    <MessageCircle className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-foreground">Não encontrou o que procurava?</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Nossa equipe de suporte está disponível de segunda a sexta, das 9h às 18h.
                                    </p>
                                </div>
                                <a
                                    href="mailto:suporte@matrachat.com"
                                    className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                                >
                                    <Mail className="h-3.5 w-3.5" />
                                    Falar com suporte
                                </a>
                            </div>
                        </>
                    )}

                    {/* Rodapé */}
                    <div className="mt-10 border-t pt-6 text-center">
                        <p className="text-xs text-muted-foreground">
                            MatraChat Central de Ajuda · Versão 1.0 · Atualizado em {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
