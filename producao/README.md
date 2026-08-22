# Unit0 — gestão de produção audiovisual

Site que roda no celular (dá para instalar na tela de início como app) para tocar
um projeto audiovisual do começo ao fim: negociação, pré, produção, pós e entrega —
com dinheiro, agenda, equipe, contratos e notas fiscais no mesmo lugar.

**No ar:** https://mavissimo.github.io/ai/producao/

## O que dá para fazer

| Área | O que tem |
|---|---|
| **Etapas** | Fases (negociação → pré → produção → pós → entrega), status, responsável, prazo, **dependências** ("essa etapa só anda quando aquela fechar") e checklist por etapa. |
| **Agenda** | Diárias, reuniões, viagens e entregas. Ao marcar quem participa, cada pessoa recebe um **pedido de confirmação de presença** para responder no celular. |
| **Entregas** | Corte, master, versões — com prazo, formato, link e status (a fazer → em produção → com o cliente → entregue). |
| **Dinheiro** | Orçamento por rubrica, orçado × gasto, lançamentos de entrada e saída, aprovação de gasto, **imposto previsto por alíquota**, lucro previsto e lucro realizado, caixa. |
| **Contas** | A pagar e a receber, com vencimento, alerta de vencido, comprovante anexado e baixa (que já lança no fluxo de caixa). |
| **Contratos** | Resumo objetivo do contrato (objeto, entregáveis, direitos, praça, janela, exclusividade, multas, condições de pagamento) + parcelas que viram contas a receber com um toque. |
| **Equipe** | Cachê × diárias, status de contrato, Pix, e as confirmações de cada um (presença, passagem, hospedagem, contrato, pagamento). |
| **Notas e documentos** | NF, recibo, boleto, comprovante, passagem, autorização — foto ou PDF, ou link externo. Cada arquivo fica amarrado ao lançamento/conta/contrato que originou. |
| **Ordem do dia** | Call sheet por diária: horário de **chamada de cada pessoa**, endereço com link de mapa, roteiro do dia, contato no local e o que levar. Cada um vê a própria chamada em destaque; um toque copia tudo formatado para mandar no grupo. |
| **Caixinha** | Adiantamento de produção para alguém, gasto descontado do saldo, devolução do que sobrou e prestação de contas por pessoa. |
| **Retenções e NF** | Cada pessoa é PF (RPA) ou PJ (nota fiscal), com INSS, IRRF, ISS e PIS/COFINS/CSLL configuráveis. O app mostra bruto, retenções e **líquido a pagar**, e controla qual nota já foi emitida ou recebida. |
| **Aprovações** | Rodadas com o cliente, com o prazo de aceite contado automaticamente (dias úteis ou corridos). Quando o prazo vence sem resposta e o contrato trata silêncio como aceite, o app avisa. |
| **Locações e contatos** | Escolas, endereços, autorização, horário permitido e custo. Contatos do cliente, fornecedores e personagens. |
| **Meu painel** | O que é de cada pessoa: própria agenda, próprio cachê líquido, própria caixinha, confirmações a responder, gastos lançados e o que tem a receber. |
| **Avisos** | Alertas de vencimento, entrega próxima, gasto aguardando aprovação, etapa travada e compromisso de hoje/amanhã — com notificação no celular. |

## Alçadas

Cada pessoa entra e vê só o que é da sua alçada:

- **Produtor / Admin** — tudo: contrato, valores, lucro, imposto, todas as etapas.
- **Coordenação / Produção** — etapas, agenda, entregas, equipe, custos e aprovação de gastos. **Não vê** margem nem valor de contrato.
- **Financeiro** — contas a pagar e receber, notas, impostos, fluxo de caixa, lucro.
- **Equipe / Freela / Elenco** — a própria agenda, o próprio cachê, confirma presença e passagem, lança o próprio gasto e sobe a própria nota. Não vê o orçamento nem o dinheiro dos outros.

## Como está funcionando hoje (modo demo)

Sem cadastro e sem servidor: os dados ficam **no próprio aparelho** (localStorage +
IndexedDB para os arquivos). Serve para validar o fluxo inteiro — inclusive trocando
de usuário em "Mais → trocar" para ver o app pelos olhos de cada papel.

Limitação óbvia: cada celular tem a sua própria base. Para a equipe usar junto,
ligue o modo nuvem abaixo. Em "Mais → Dados" dá para baixar um backup `.json` e
restaurar depois.

## Ligando o modo nuvem (Supabase)

1. Crie um projeto grátis em [supabase.com](https://supabase.com).
2. **SQL Editor** → cole e rode [`supabase/schema.sql`](supabase/schema.sql). Isso cria as
   tabelas, o bucket de arquivos e as regras de alçada **dentro do banco** (RLS) — não dá
   para burlar pelo navegador.
3. No fim do arquivo tem o `insert` do primeiro usuário: troque pelo seu nome e pelo
   e-mail que você vai usar no login, e rode.
4. **Authentication → Providers → Email**: deixe ligado (login por link mágico, sem senha).
5. Em `js/config.js`, preencha:

   ```js
   export const SUPABASE = {
     url: 'https://SEUPROJETO.supabase.co',
     anonKey: 'sua-anon-key-publica',
     bucket: 'documentos'
   };
   ```

6. Suba a alteração. O app passa a pedir e-mail no login, e todo mundo com o e-mail
   cadastrado em **Equipe** entra e vê a base compartilhada.

A `anonKey` é pública por design — quem protege os dados são as policies do passo 2.

### Notificação por e-mail / push de verdade

O aviso no celular hoje dispara com o app aberto (ou instalado na tela de início).
Para avisar mesmo com o app fechado, no modo nuvem dá para criar uma Edge Function
agendada que varre `contas`, `entregas` e `confirmacoes` e dispara e-mail — a mesma
lógica de alertas está em [`js/notify.js`](js/notify.js).

## Estrutura

```
producao/
  index.html            casca do app
  css/app.css           estilo (mobile-first, tema escuro)
  js/
    app.js              boot, login e navegação
    store.js            estado central; nenhuma tela fala com o banco direto
    adapters/local.js   modo demo (localStorage)
    adapters/supabase.js modo nuvem (mesmas tabelas)
    perms.js            alçadas por papel
    calc.js             todas as contas de dinheiro
    files.js            arquivos (IndexedDB ou storage do Supabase)
    notify.js           alertas e notificações
    seed.js             estrutura padrão de um projeto
    ui.js               bottom-sheet, formulários, toast
    views/              telas
  supabase/schema.sql   tabelas + RLS + bucket
  tools/                build de arquivo único
```

Sem build, sem dependência: é HTML/CSS/JS puro servido estático.

## Impostos e retenções — leia isto

Os percentuais de retenção vêm com um padrão comum no audiovisual (PF: 11% de INSS;
PJ: 1,5% de IRRF e 4,65% de PIS/COFINS/CSLL) e são **editáveis pessoa a pessoa**.
O app faz a conta, não a assessoria: confirme as alíquotas com a sua contabilidade
antes de usar os números para pagar alguém. A alíquota de imposto sobre a receita
do projeto começa zerada — enquanto ela não for preenchida, o lucro previsto sai
sem imposto.
