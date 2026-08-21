// Estrutura inicial de um projeto audiovisual: fases, etapas típicas e rubricas
// de orçamento. Sem valores — os números entram no app, pelo celular.
import { store } from './store.js';
import { uid } from './utils.js';

export const FASES = [
  { k: 'negociacao', nome: 'Negociação', cor: 'info' },
  { k: 'pre', nome: 'Pré-produção', cor: 'warn' },
  { k: 'producao', nome: 'Produção', cor: 'ok' },
  { k: 'pos', nome: 'Pós-produção', cor: 'info' },
  { k: 'entrega', nome: 'Entrega e fechamento', cor: 'mut' }
];
export const faseNome = (k) => FASES.find((f) => f.k === k)?.nome || k;

export const STATUS_ETAPA = [
  { v: 'nao', t: 'Não começou', tag: 'mut' },
  { v: 'fazendo', t: 'Em andamento', tag: 'info' },
  { v: 'travado', t: 'Travado', tag: 'bad' },
  { v: 'feito', t: 'Concluído', tag: 'ok' }
];
export const statusEtapa = (v) => STATUS_ETAPA.find((s) => s.v === v) || STATUS_ETAPA[0];

const ETAPAS_PADRAO = [
  ['negociacao', 'Briefing recebido'],
  ['negociacao', 'Orçamento montado'],
  ['negociacao', 'Orçamento enviado ao cliente'],
  ['negociacao', 'Aprovação do cliente'],
  ['negociacao', 'Contrato assinado'],
  ['negociacao', 'Nota de empenho / PO'],
  ['pre', 'Roteiro / argumento aprovado'],
  ['pre', 'Decupagem e plano de filmagem'],
  ['pre', 'Casting e elenco definidos'],
  ['pre', 'Locação definida e autorizada'],
  ['pre', 'Equipe fechada e contratada'],
  ['pre', 'Cronograma e ordem do dia'],
  ['pre', 'Logística: passagens e hospedagem'],
  ['pre', 'Autorizações, licenças e seguros'],
  ['pre', 'PPM — reunião de pré-produção com cliente'],
  ['producao', 'Diária de gravação'],
  ['producao', 'Backup de mídia (duplo)'],
  ['producao', 'Relatório de diária e continuidade'],
  ['pos', 'Organização e decupagem do material'],
  ['pos', 'Corte offline (v1)'],
  ['pos', 'Aprovação do corte pelo cliente'],
  ['pos', 'Trilha e locução'],
  ['pos', 'Finalização de imagem (color)'],
  ['pos', 'Mixagem de áudio'],
  ['pos', 'Aprovação final'],
  ['entrega', 'Entrega do master e versões'],
  ['entrega', 'Nota fiscal final emitida'],
  ['entrega', 'Recebimento da última parcela'],
  ['entrega', 'Arquivamento e backup do projeto']
];

export const RUBRICAS = [
  'Direção', 'Produção / equipe', 'Elenco e casting', 'Fotografia e câmera',
  'Luz e elétrica', 'Arte e cenografia', 'Figurino e maquiagem', 'Som direto',
  'Locação', 'Alimentação', 'Transporte e logística', 'Hospedagem', 'Passagens',
  'Pós-produção', 'Trilha e locução', 'Seguros e licenças', 'Direitos de uso',
  'Contingência', 'Taxa de produção', 'Outros'
];

/** Cria o projeto do teste com toda a estrutura, sem valores. */
export async function criarProjetoTeste() {
  const projeto = await store.insert('projetos', {
    id: uid('proj'),
    nome: 'Fundação Bradesco — Viviana',
    cliente: 'Fundação Bradesco',
    agencia: '',
    formato: 'Filme institucional',
    status: 'negociacao',
    inicio: '',
    entrega: '',
    valor_contrato_cents: 0,
    imposto_regime: 'simples',
    imposto_aliquota: 0,
    obs: 'Projeto piloto do sistema. Preencha valores, datas e equipe direto por aqui.'
  });
  store.setProjeto(projeto.id);

  let ordem = 0;
  for (const [fase, nome] of ETAPAS_PADRAO) {
    await store.insert('etapas', {
      projeto_id: projeto.id, fase, nome, status: 'nao',
      responsavel_id: null, prazo: '', depende_de: [], ordem: ordem++, obs: ''
    });
  }
  for (const rubrica of RUBRICAS) {
    await store.insert('orcamento', {
      projeto_id: projeto.id, rubrica, descricao: '', previsto_cents: 0, obs: ''
    });
  }
  await store.log('Projeto criado com a estrutura padrão de produção.', 'projeto');
  return projeto;
}

/** Cria o primeiro usuário (produtor) — quem monta o projeto. */
export async function criarProdutor(nome, email) {
  return store.insert('membros', {
    projeto_id: null, nome, email: email || '', papel: 'admin',
    funcao: 'Produção executiva', telefone: '',
    cache_cents: 0, diarias: 0, contrato_status: 'na', ativo: true
  });
}
