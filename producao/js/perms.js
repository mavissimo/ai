// Alçadas: o que cada papel vê e edita.
// Regra de ouro: todo mundo sempre pode mexer no que é DELE (própria agenda,
// próprios gastos, próprias notas, próprias confirmações) — isso não depende do papel.

export const PAPEIS = {
  admin: {
    nome: 'Produtor / Admin',
    curto: 'Produção executiva',
    desc: 'Vê e edita tudo: contrato, valores, lucro, impostos e todas as etapas.',
    cor: 'ok'
  },
  coord: {
    nome: 'Coordenação / Produção',
    curto: 'Coordenação',
    desc: 'Etapas, agenda, entregas, equipe e custos. Não vê margem nem valor de contrato.',
    cor: 'info'
  },
  fin: {
    nome: 'Financeiro',
    curto: 'Financeiro',
    desc: 'Contas a pagar e receber, notas fiscais, impostos e fluxo de caixa.',
    cor: 'warn'
  },
  equipe: {
    nome: 'Equipe / Freela / Elenco',
    curto: 'Equipe',
    desc: 'Vê a própria agenda e o próprio cachê, confirma presença e passagem, lança gasto e sobe nota.',
    cor: 'mut'
  }
};

const CAPS = {
  admin: ['*'],
  coord: [
    'projeto.ver', 'projeto.edit',
    'etapas.ver', 'etapas.edit',
    'agenda.ver', 'agenda.edit',
    'entregas.ver', 'entregas.edit',
    'equipe.ver', 'equipe.edit',
    'orcamento.ver', 'orcamento.edit',
    'lanc.ver', 'lanc.edit', 'lanc.aprovar',
    'contas.ver',
    'docs.ver', 'docs.edit',
    'contratos.ver'
  ],
  fin: [
    'projeto.ver',
    'etapas.ver',
    'agenda.ver',
    'entregas.ver',
    'equipe.ver',
    'orcamento.ver', 'orcamento.edit',
    'lanc.ver', 'lanc.edit', 'lanc.aprovar',
    'contas.ver', 'contas.edit',
    'docs.ver', 'docs.edit',
    'contratos.ver', 'contratos.valores',
    'lucro.ver', 'imposto.edit'
  ],
  equipe: [
    'projeto.ver.basico',
    'etapas.ver',
    'agenda.ver.propria',
    'entregas.ver'
  ]
};

// Capacidades que envolvem dinheiro "de cima" (contrato, lucro, imposto).
export const SIGILOSAS = ['contratos.valores', 'lucro.ver', 'imposto.edit'];

export function can(user, cap) {
  if (!user) return false;
  const lista = CAPS[user.papel] || [];
  return lista.includes('*') || lista.includes(cap);
}

export const ehEquipe = (user) => !user || user.papel === 'equipe';
export const podeVerTudo = (user) => can(user, 'lanc.ver');

// Filtra uma lista de registros pelo escopo do usuário: quem não tem 'lanc.ver'
// só enxerga registros ligados ao próprio cadastro.
export function meus(user, lista, campo = 'member_id') {
  if (podeVerTudo(user)) return lista;
  return lista.filter((r) => r[campo] === user?.id || r.criado_por === user?.id);
}
