# Revisão de segurança, experiência e dados — Hexa Infinity

Revisão do código presente no workspace em 22/09/2026. As alterações locais foram implementadas; o banco remoto, as contas dos provedores e o aplicativo Android publicado não foram alterados. As reorganizações de arquivos e mudanças Android que já existiam no workspace foram preservadas.

## Diagnóstico e correções implementadas

| Problema confirmado | Mudança |
| --- | --- |
| Ranking preenchido com competidores fictícios e percentis estimados apresentados como globais | Remoção das sementes; cache novo somente de respostas do servidor; distinção entre dados online, cache e indisponibilidade; comparação estatística somente quando há dados reais suficientes. |
| Painel substituía falhas e banco vazio por jogadores, receitas e pedidos inventados | Remoção de demonstrações; falhas explícitas; manutenção da última leitura sem alegar atualização bem-sucedida. |
| Compra Android liberava saldo mesmo quando o SDK falhava/cancelava | Fluxo desativado antes de cobrar. A reativação depende de integração de validação e entrega no servidor. |
| Pix permitia simulação enviada pelo navegador e Stripe aceitava JSON sem assinatura | Remoção da simulação; verificação HMAC de Stripe e Mercado Pago; validação do valor, moeda, gateway e identidade do pedido. |
| Cliente podia alterar inventário e status de pagamentos por políticas abertas | Nova migração com RLS por usuário, autenticação real de convidados e gravações de inventário/pagamento restritas ao servidor. |
| Crédito e pagamento eram escritos separadamente; repetição podia duplicar itens | Função transacional com bloqueio do pedido; uma única entrega por pedido. Consumo atômico com saldo mínimo zero. |
| Não havia trilha de alterações do saldo | Tabela `inventory_events`: créditos e consumos escritos pelas funções do banco, com leitura do próprio jogador ou administrador. Não reconstrói o histórico antigo. |
| Senha do administrador era incluída no JavaScript e havia fallback `admin123` | Supabase Auth com senha de conta; autorização por `app_metadata.role = admin`, também exigida pelas políticas de leitura no banco. |
| Loja anunciava 4 usos/8+8, checkout e backend operavam com 10 | Catálogo único compartilhado: avulso R$ 0,25, 4 usos R$ 1,00 e combo 8+8 R$ 2,99. Pedidos antigos mantêm sua quantidade registrada. |
| Falhas de envio eram apresentadas como pontuação sincronizada | Mensagens distintas para salvamento local e envio confirmado. Pontuação não enviada não entra no cache do ranking global. |
| Controles cobriam a navegação no desktop e casas do tabuleiro no celular | Ajuste responsivo dos docks; rótulos simples; resumo de compra consistente; botão de tentar novamente para Pix. |
| Modais não mantinham foco e telas ocultas continuavam acessíveis durante transições | Gerenciamento de foco, retorno ao acionador, fechamento por Escape, isolamento das telas e indicação da aba ativa. |
| Cronômetro avançava fora da partida | Pausa ao navegar, abrir modal ou ocultar a página; renderização ociosa reduzida fora do jogo. |
| CSV interpolava conteúdo de usuário sem tratamento adequado | Escape de aspas e proteção contra células que iniciam fórmulas. |

O painel informa que trabalha sobre os 500 registros mais recentes por tabela. Seus totais representam esse recorte, não o histórico completo. O indicador de contas com Google ainda se baseia no preenchimento de email; deve ser substituído por um indicador calculado sobre identidades de autenticação.

## Validação feita

- `npm test`: testes de banco com PostgreSQL embarcado (PGlite), permissões por usuário, recusa de escrita de saldo/pedido, consumo sem saldo, crédito único, auditoria, rollback e assinaturas dos provedores. Inclui consistência do catálogo.
- `npm run build`: compilação de produção concluída. Permanece aviso de bundle principal acima de 500 kB; não foi ocultado.
- `npx deno check` nas quatro Edge Functions: checagem concluída.
- `npm audit --omit=dev`: zero vulnerabilidades reportadas nas dependências de produção na verificação feita.
- Auditoria completa: três alertas moderados na cadeia de desenvolvimento `@capacitor/cli → xcode → uuid`. Não foi aplicado downgrade automático do Capacitor.
- Navegador local, sem conexão ao banco remoto: navegação, uma jogada real, ranking indisponível sem dados fictícios, loja, resumo de compra, erro/repetição do Pix, fechamento por Escape e retorno do foco. Inspeção visual em desktop e viewport de 390 × 844.

Esses testes não substituem homologação de pagamentos nos ambientes de teste oficiais, testes do aplicativo em aparelho Android e validação das políticas efetivamente instaladas no Supabase remoto.

## Implantação necessária

1. Em homologação, faça backup e inventarie jogadores, pedidos pendentes e saldos existentes. O sistema antigo aceitava alterações de saldo/status pelo cliente; é necessário reconciliar compras com os comprovantes dos provedores. Não considerar o status antigo `paid` prova suficiente de pagamento.
2. Aplique `supabase/migrations/20260922000000_secure_data_access.sql` depois das três migrações anteriores. A migração substitui políticas de acesso nas quatro tabelas existentes e cria funções de consumo/entrega e a trilha de inventário. Ela não apaga os registros existentes.
3. Habilite **Anonymous Sign-Ins** no Supabase Auth para os jogadores convidados. A configuração do repositório é local e não garante que o serviço hospedado já esteja configurado. Configure também Google OAuth e suas URLs de retorno para cada ambiente.
4. Crie ou escolha a conta administrativa no Supabase Auth. Atribua `app_metadata.role = admin` somente por ferramenta administrativa confiável ou API administrativa no servidor. Não use `user_metadata`, o navegador nem variável `VITE_` para conceder privilégios.
5. Configure os segredos das funções: `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` e `APP_URL` (URL pública real de retorno do Stripe). As funções de criação devem recusar cobranças quando as chaves necessárias não estão disponíveis.
6. Publique as quatro funções e os módulos em `_shared`. Os webhooks têm `verify_jwt = false` no arquivo de configuração porque autenticam a mensagem pela assinatura do próprio provedor. As funções de criação validam a sessão do jogador e não confiam em `playerId` enviado no corpo.
7. Configure os webhooks nos provedores. No Mercado Pago, use notificações `payment` assinadas, com `data.id` na URL e cabeçalhos `x-signature` e `x-request-id`. No Stripe, inclua os eventos de conclusão e pagamento assíncrono suportados pelo handler. Valide entrega repetida, atraso de confirmação, valor divergente e erro temporário do banco usando ferramentas oficiais de teste.
8. Publique o frontend compatível com a migração. O cliente anterior escreve diretamente no saldo e deixará de funcionar com as novas permissões. Coordenar backend e frontend; não reabrir políticas como solução de compatibilidade.
9. Homologue duas contas distintas, login/logout, uma conta administrativa, confirmação de compra e consumo. Programe a expiração de pedidos com a função existente por rotina do servidor; o painel não altera mais pedidos ao ser aberto.

### Compatibilidade de contas e saldos

- Os antigos IDs de convidados em `localStorage` não provam propriedade de uma conta. Não foi implementada associação automática desses saldos a uma nova identidade.
- O inventário local antigo é ignorado como fonte de saldo. Valores do servidor passam a ser a fonte de verdade.
- Login Google pode trocar a identidade anônima por uma conta existente. União de contas, transferência de compras de convidado e recuperação em outro dispositivo precisam de um fluxo verificado no servidor antes de ampliar vendas para convidados. Pontuações locais permanecem no dispositivo.
- Não foi implementado salvamento/retomada do tabuleiro. Um recarregamento ou retorno de OAuth pode iniciar uma nova partida.
- Compras Android estão bloqueadas nesta revisão. Não publicar a versão como loja Android operacional antes de validar recibos, identidade RevenueCat, catálogo, restauração e entrega transacional.

## Próximas prioridades

| Prazo sugerido | Entrega | Critério de conclusão |
| --- | --- | --- |
| Antes da publicação | Aplicar/homologar segurança e reconciliar dados legados | Duas contas isoladas; cobranças reais de teste entregues uma vez; saldos antigos auditados. |
| Antes de reativar IAP | Validação de transações RevenueCat/Google Play no servidor | Compra cancelada não credita; repetição não duplica; produto/preço vêm da loja; identidade e restauração verificadas. |
| Curto prazo: 1–2 semanas | Salvar e retomar partida, inclusive em retorno de OAuth | Tabuleiro, deque, pontuação e boosters restaurados após reinício sem duplicar itens. |
| Curto prazo: 1–2 semanas | União verificada de conta convidada e Google | Login em conta existente preserva direitos comprovados sem confiar em UUID ou saldo do navegador. |
| Curto prazo: 1–2 semanas | Controle de abuso, erros e tentativas pendentes | Limites de criação de pedidos/pontuações; logs com identificadores sem segredos; confirmação recuperável após queda de rede. |
| Curto prazo: 1–2 semanas | Painel com paginação, filtros no servidor e agregados globais | Totalizações independentes do limite de linhas; identidade de login obtida da fonte correta; exportação do recorte explicitada. |
| Médio prazo: 3–6 semanas | Separar regras do jogo, renderização e estado de UI | Regras de fusão testáveis sem WebGL; serviços com contratos e tratamento uniforme de falhas. |
| Médio prazo: 3–6 semanas | Desempenho em Android real | Medir FPS, consumo de memória/bateria e tempo até jogar; qualidade gráfica ajustável; revisar descarte de recursos 3D. |
| Médio prazo: 3–6 semanas | Integridade competitiva e observabilidade | Pontuação validada por regras do servidor/replay, prevenção de abuso e métricas de retenção baseadas em eventos reais. |
| Médio prazo: 3–6 semanas | Gestão do ciclo de vida dos dados | Política implementada de retenção, recuperação, exportação/exclusão de conta e teste de restauração de backup. |

Referências técnicas usadas: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [autenticação anônima](https://supabase.com/docs/guides/auth/auth-anonymous), [assinatura Stripe](https://docs.stripe.com/webhooks/signature) e [assinatura Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/wallet-connect/notifications).
