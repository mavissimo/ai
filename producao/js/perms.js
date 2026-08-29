// Alçadas: o que cada papel vê e edita.
// Regra de ouro: todo mundo sempre pode mexer no que é DELE (própria agenda,
// próprios gastos, próprias notas, próprias confirmações) — isso não depende do papel.

export const PAPEIS = {
  master: {
    nome: 'Master Admin',
    curto: 'Master',
    desc: 'Acesso total, sem restrição: dados, alçadas, contratos, margem e configuração do sistema.',
    cor: 'bad'
  },
  admin: {
    nome: 'Produtor / Admin',
    curto: 'Produção executiva',
    desc: 'Vê e edita tudo: contrato, valores, lucro, impostos e todas as etapas.',
    cor: 'ok'
  },
  diretor: {
    nome: 'Direção / Sócio',
    curto: 'Direção',
    desc: 'Dirige e assina pela produtora: paga, emite nota fiscal, assina contrato e vê a margem. '
      + 'É quem aperta o botão no dinheiro.',
    cor: 'info'
  },
  coord: {
    nome: 'Produção',
    curto: 'Produção',
    desc: 'Organiza o projeto: negocia valores, monta as contas, cuida de contratos e autorizações, '
      + 'agenda e equipe. Não paga nem vê a margem.',
    cor: 'ok'
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
  master: ['*'],
  admin: ['*'],
  // Direção / sócio: manda no dinheiro que sai e no que a produtora assina.
  diretor: [
    'projeto.ver', 'projeto.edit',
    'etapas.ver', 'etapas.edit',
    'agenda.ver', 'agenda.edit',
    'entregas.ver', 'entregas.edit',
    'equipe.ver', 'equipe.edit',
    'orcamento.ver', 'orcamento.edit',
    'lanc.ver', 'lanc.edit', 'lanc.aprovar',
    'contas.ver', 'contas.edit', 'pagamento.executar', 'nf.emitir',
    'docs.ver', 'docs.edit',
    'contratos.ver', 'contratos.valores', 'contratos.assinar',
    'lucro.ver', 'imposto.edit'
  ],
  // Produção: negocia e organiza tudo, mas quem paga é a direção.
  coord: [
    'projeto.ver', 'projeto.edit',
    'etapas.ver', 'etapas.edit',
    'agenda.ver', 'agenda.edit',
    'entregas.ver', 'entregas.edit',
    'equipe.ver', 'equipe.edit',
    'orcamento.ver', 'orcamento.edit',
    'lanc.ver', 'lanc.edit', 'lanc.aprovar',
    'contas.ver', 'contas.edit',
    'docs.ver', 'docs.edit',
    'contratos.ver', 'contratos.edit', 'autorizacoes.edit'
  ],
  fin: [
    'projeto.ver',
    'etapas.ver',
    'agenda.ver',
    'entregas.ver',
    'equipe.ver',
    'orcamento.ver', 'orcamento.edit',
    'lanc.ver', 'lanc.edit', 'lanc.aprovar',
    'contas.ver', 'contas.edit', 'pagamento.executar', 'nf.emitir',
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

// Quem faz o quê, em uma frase, para aparecer no perfil de cada pessoa.
export const RESPONSA = {
  master: 'Cria e cuida de tudo no sistema.',
  admin: 'Vê e edita tudo do projeto.',
  diretor: 'Paga, assina e emite as notas fiscais.',
  coord: 'Organiza o projeto, negocia e cuida de contratos e autorizações.',
  fin: 'Cuida das contas, das notas e do imposto.',
  equipe: 'Confirma o que é dela, lança os próprios gastos e sobe as notas.'
};

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
