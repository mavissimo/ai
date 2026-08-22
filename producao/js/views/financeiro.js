// Dinheiro: resumo, orçamento por rubrica e lançamentos (com nota anexada).
import { store, membros, nomeMembro } from '../store.js';
import { can, podeVerTudo } from '../perms.js';
import { el, abrirForm, sheet, toast, confirmar, escolher, btnOlho } from '../ui.js';
import { esc, fmtMoney, fmtMoneyShort, pct, fmtData, hoje, ordenar, soma, parseMoney, valoresOcultos } from '../utils.js';
import * as vContas from './contas.js';
import * as vCaixa from './caixa.js';
import { financeiro, porRubrica, ST_LANC } from '../calc.js';
import { RUBRICAS } from '../seed.js';
import { salvarArquivo, abrirArquivo } from '../files.js';
import { lerNotaDaImagem, leitorDisponivel, resumo as resumoNota } from '../nota.js';

let aba = 'resumo';

const FONTE = { empresa: 'pago pela produção', caixinha: 'caixinha', proprio: 'reembolso' };

// Quem está em campo não precisa ver as 22 rubricas do orçamento. Cada função
// enxerga o punhado que ela realmente gasta, e a produção reclassifica se
// precisar na hora de aprovar.
const RUBRICAS_CAMPO = [
  'Alimentação', 'Combustível e estacionamento', 'Locação de carro',
  'Hospedagem', 'Excesso de bagagem', 'Verba de produção (caixinha)', 'Outros'
];
const RUBRICAS_POR_FUNCAO = [
  [/c[âa]mera|foto|dit|assistente de c/i, ['Equipamento de câmera', 'HDs e armazenamento',
    'Material de produção e som', 'Alimentação', 'Combustível e estacionamento', 'Excesso de bagagem', 'Outros']],
  [/som|[áa]udio|boom/i, ['Material de produção e som', 'Alimentação',
    'Combustível e estacionamento', 'Excesso de bagagem', 'Outros']],
  [/arte|figurino|cen/i, ['Material de produção e som', 'Alimentação',
    'Combustível e estacionamento', 'Locação de carro', 'Outros']],
  [/dire[çc]/i, ['Alimentação', 'Combustível e estacionamento', 'Locação de carro',
    'Hospedagem', 'Material de produção e som', 'Outros']]
];

/** Lista de rubricas que faz sentido para quem está lançando. */
export function rubricasPara(u) {
  const doOrcamento = store.doProjeto('orcamento').map((o) => o.rubrica);
  if (podeVerTudo(u)) {
    // As rubricas do orçamento do projeto são a verdade. A lista genérica só
    // entra quando o projeto ainda não tem orçamento montado.
    const base = doOrcamento.length ? doOrcamento : RUBRICAS;
    return [...new Set([...base, 'Alimentação', 'Outros'])];
  }
  const f = u?.funcao || '';
  const achou = RUBRICAS_POR_FUNCAO.find(([re]) => re.test(f));
  return achou ? achou[1] : RUBRICAS_CAMPO;
}
let filtroLanc = 'todos';

export const irPara = (nova) => { aba = nova; };

const ABAS = [
  { v: 'resumo', t: 'Resumo', cap: null },
  { v: 'gastos', t: 'Gastos', cap: null },
  { v: 'contas', t: 'Contas', cap: 'contas.ver' },
  { v: 'caixa', t: 'Caixinha', cap: null },
  { v: 'orcamento', t: 'Orçamento', cap: 'orcamento.ver' }
];

function chipsHTML(u) {
  return `<div class="chips">${ABAS.filter((a) => !a.cap || can(u, a.cap))
    .map((a) => `<button class="chip ${aba === a.v ? 'on' : ''}" data-aba="${a.v}">${a.t}</button>`).join('')}</div>`;
}
function ligarChips(node) {
  node.querySelectorAll('[data-aba]').forEach((b) => {
    b.onclick = () => { aba = b.dataset.aba; store.emit(); };
  });
}

export function render() {
  const u = store.user;
  if (!can(u, 'orcamento.ver') && !podeVerTudo(u)) {
    const n = el('<div class="empty">Seus gastos ficam em “Meu painel”.</div>');
    return { titulo: 'Dinheiro', node: n };
  }

  // As telas de contas e caixinha vivem dentro de Dinheiro, para o dinheiro
  // todo ficar num lugar só em vez de espalhado pelo menu.
  if (aba === 'contas' && can(u, 'contas.ver')) return embutir(vContas.render(), u);
  if (aba === 'caixa') return embutir(vCaixa.render(), u);

  const f = financeiro();
  const verLucro = can(u, 'lucro.ver') || can(u, 'contratos.valores');
  const node = el('<div></div>');
  node.innerHTML = `
    ${chipsHTML(u)}
    ${aba === 'resumo' ? blocoResumo(f, verLucro, u) : ''}
    ${aba === 'orcamento' ? blocoOrcamento(u) : ''}
    ${aba === 'gastos' ? blocoLancamentos(u) : ''}`;

  ligarChips(node);
  node.querySelectorAll('[data-rub]').forEach((n) => {
    n.onclick = () => editarRubrica(store.get('orcamento', n.dataset.rub), can(u, 'orcamento.edit'));
  });
  node.querySelectorAll('[data-lanc]').forEach((n) => { n.onclick = () => abrirLancamento(store.get('lancamentos', n.dataset.lanc)); });
  node.querySelectorAll('[data-flanc]').forEach((b) => { b.onclick = () => { filtroLanc = b.dataset.flanc; store.emit(); }; });
  node.querySelector('[data-imposto]')?.addEventListener('click', () => editarImposto());
  node.querySelector('[data-nova-rubrica]')?.addEventListener('click', () => novaRubrica());

  return {
    titulo: 'Dinheiro',
    node,
    fab: can(u, 'lanc.edit') && aba !== 'orcamento'
      ? { label: '+', onClick: () => novoLancamento(u, 'saida') }
      : null
  };
}

/** Aproveita a tela de contas ou caixinha dentro do hub de Dinheiro. */
function embutir(v, u) {
  v.node.prepend(el(chipsHTML(u)));
  ligarChips(v.node);
  return { titulo: 'Dinheiro', node: v.node, fab: v.fab };
}

/* ---------------- resumo ---------------- */
function blocoResumo(f, verLucro, u) {
  const usado = pct(f.comprometido, f.orcado || 1);
  const rub = porRubrica().filter((r) => r.previsto || r.negociado || r.real || r.pend);
  return `
    ${verLucro && f.contratado && f.estouro > 0 ? `<div class="banner bad">
      O orçamento está <b>${fmtMoney(f.estouro)}</b> acima do valor contratado
      (${fmtMoney(f.orcado)} orçado contra ${fmtMoney(f.contratado)} de contrato), e isso ainda é antes do imposto.
      Do total, ${fmtMoney(f.negociado)} já foi fechado — a diferença é onde dá para cortar.</div>` : ''}
    <div class="sec" style="margin-top:4px"><div class="sec-t">O dinheiro do projeto</div>${btnOlho(valoresOcultos())}</div>
    <div class="grid">
      ${verLucro ? `<div class="kpi"><div class="l">Contratado</div><div class="v">${fmtMoneyShort(f.contratado)}</div>
        <div class="h">recebido ${fmtMoneyShort(f.recebido)}</div></div>` : ''}
      <div class="kpi ${f.estouro > 0 ? 'bad' : ''}"><div class="l">Orçado</div>
        <div class="v">${fmtMoneyShort(f.orcado)}</div>
        <div class="h">${usado}% comprometido</div></div>
      <div class="kpi"><div class="l">Já negociado</div><div class="v">${fmtMoneyShort(f.negociado)}</div>
        <div class="h">falta fechar ${fmtMoneyShort(f.aNegociar)}</div></div>
      <div class="kpi ${f.saldoOrcamento < 0 ? 'bad' : 'ok'}"><div class="l">Ainda posso gastar</div>
        <div class="v">${fmtMoneyShort(f.saldoOrcamento)}</div>
        <div class="h">orçado − comprometido</div></div>
      <div class="kpi"><div class="l">Caixa</div><div class="v">${fmtMoneyShort(f.caixa)}</div>
        <div class="h">recebido − pago</div></div>
      ${can(u, 'contas.ver') ? `<div class="kpi"><div class="l">A pagar</div><div class="v">${fmtMoneyShort(f.aPagar)}</div></div>
      <div class="kpi"><div class="l">A receber</div><div class="v">${fmtMoneyShort(f.aReceber)}</div></div>` : ''}
    </div>
    ${verLucro ? `
    <div class="sec"><div class="sec-t">Imposto e lucro</div>
      ${can(u, 'imposto.edit') ? '<button class="btn sm gho" data-imposto>ajustar</button>' : ''}</div>
    <div class="card tight">
      <div class="row"><span class="g"><span class="t">Imposto previsto</span>
        <span class="s">${f.aliquota ? f.aliquota + '% sobre o contratado' : 'alíquota não configurada'}</span></span>
        <span class="r"><span class="v">${fmtMoney(f.impostoPrevisto)}</span></span></div>
      <div class="row"><span class="g"><span class="t">Imposto sobre o já recebido</span>
        <span class="s">provisionar</span></span>
        <span class="r"><span class="v">${fmtMoney(f.impostoRealizado)}</span></span></div>
      <div class="row"><span class="g"><span class="t">Custo total previsto</span>
        <span class="s">orçamento + imposto</span></span>
        <span class="r"><span class="v">${fmtMoney(f.custoPrevistoTotal)}</span></span></div>
      <div class="row"><span class="g"><span class="t">Lucro previsto</span>
        <span class="s">margem ${f.margemPrevista}%</span></span>
        <span class="r"><span class="v" style="color:${f.lucroPrevisto < 0 ? 'var(--bad)' : 'var(--ok)'}">${fmtMoney(f.lucroPrevisto)}</span></span></div>
      <div class="row"><span class="g"><span class="t">Lucro realizado</span>
        <span class="s">recebido − gasto − imposto</span></span>
        <span class="r"><span class="v" style="color:${f.lucroRealizado < 0 ? 'var(--bad)' : 'var(--ok)'}">${fmtMoney(f.lucroRealizado)}</span></span></div>
    </div>` : ''}
    <div class="sec"><div class="sec-t">Orçado × gasto por rubrica</div></div>
    <div class="card">${rub.length ? rub.map((r) => {
      const base = r.negociado || r.previsto || (r.real + r.pend) || 1;
      const p = pct(r.real + r.pend, base);
      return `<div style="padding:9px 0;border-bottom:1px solid var(--line)">
        <div style="display:flex;gap:8px;align-items:baseline">
          <span style="flex:1;font-weight:600;font-size:14px">${esc(r.rubrica)}</span>
          <span class="small mono muted">${fmtMoneyShort(r.real + r.pend)} / ${fmtMoneyShort(r.negociado || r.previsto)}</span>
        </div>
        <div class="bar"><i class="${p > 100 ? 'bad' : p > 85 ? 'warn' : 'ok'}" style="width:${Math.min(p, 100)}%"></i></div>
      </div>`;
    }).join('') : '<div class="empty">Preencha o orçamento para acompanhar aqui.</div>'}</div>`;
}

/* ---------------- orçamento ---------------- */
function blocoOrcamento(u) {
  const rub = porRubrica();
  const total = soma(rub, (r) => r.previsto);
  const neg = soma(rub, (r) => r.negociado);
  const gasto = soma(rub, (r) => r.real + r.pend);
  return `
    <div class="sec" style="margin-top:4px"><div class="sec-t">Orçamento</div>${btnOlho(valoresOcultos())}</div>
    <div class="grid3">
      <div class="kpi"><div class="l">Orçado</div><div class="v">${fmtMoneyShort(total)}</div></div>
      <div class="kpi"><div class="l">Negociado</div><div class="v">${fmtMoneyShort(neg)}</div></div>
      <div class="kpi ${gasto > total ? 'bad' : ''}"><div class="l">Gasto</div><div class="v">${fmtMoneyShort(gasto)}</div></div>
    </div>
    <div class="banner small">O <b>orçado</b> é o que foi previsto na planilha. O <b>negociado</b> é o que já
      foi realmente fechado com cada pessoa ou fornecedor. A diferença ainda está em aberto.</div>
    <div class="sec"><div class="sec-t">Rubricas</div>
      ${can(u, 'orcamento.edit') ? '<button class="btn sm gho" data-nova-rubrica>+ rubrica</button>' : ''}</div>
    <div class="card">${rub.map((r) => `
      <div class="row ${r.id ? 'act' : ''}" ${r.id ? `data-rub="${r.id}"` : ''}>
        <span class="g"><span class="t">${esc(r.rubrica)}</span>
          <span class="s">${r.negociado ? 'negociado ' + fmtMoney(r.negociado) : 'nada fechado ainda'}${r.real ? ' · gasto ' + fmtMoney(r.real) : ''}${r.pend ? ' · pendente ' + fmtMoney(r.pend) : ''}</span></span>
        <span class="r"><span class="v">${fmtMoney(r.previsto)}</span>
          <div class="small muted">orçado</div></span>
      </div>`).join('')}</div>`;
}

function novaRubrica() {
  abrirForm({
    titulo: 'Nova rubrica',
    campos: [
      { k: 'rubrica', label: 'Nome da rubrica', type: 'texto', req: true },
      { k: 'previsto_cents', label: 'Valor orçado', type: 'dinheiro' },
      { k: 'negociado_cents', label: 'Valor já negociado', type: 'dinheiro' },
      { k: 'obs', label: 'Observações', type: 'area' }
    ],
    onSave: async (v) => { await store.insert('orcamento', v); toast('Rubrica criada.'); }
  });
}
function editarRubrica(r, editar) {
  if (!r) return;
  if (!editar) return toast('Você não pode editar o orçamento.');
  abrirForm({
    titulo: r.rubrica,
    subtitulo: 'Valor previsto para esta rubrica.',
    campos: [
      { k: 'rubrica', label: 'Rubrica', type: 'texto', req: true, valor: r.rubrica },
      { k: 'previsto_cents', label: 'Orçado', type: 'dinheiro', valor: r.previsto_cents },
      { k: 'negociado_cents', label: 'Já negociado', type: 'dinheiro', valor: r.negociado_cents,
        hint: 'O que foi realmente fechado com a pessoa ou o fornecedor.' },
      { k: 'obs', label: 'Observações', type: 'area', valor: r.obs }
    ],
    onSave: async (v) => { await store.update('orcamento', r.id, v); toast('Orçamento atualizado.'); },
    onDelete: async () => { await store.remove('orcamento', r.id); }
  });
}

function editarImposto() {
  const p = store.projeto;
  abrirForm({
    titulo: 'Imposto',
    subtitulo: 'Usado para prever quanto sai de imposto e qual o lucro real.',
    campos: [
      {
        k: 'imposto_regime', label: 'Regime', type: 'select', valor: p.imposto_regime || 'simples',
        opts: [{ v: 'simples', t: 'Simples Nacional' }, { v: 'presumido', t: 'Lucro presumido' },
        { v: 'real', t: 'Lucro real' }, { v: 'pf', t: 'Pessoa física / RPA' }, { v: 'outro', t: 'Outro' }]
      },
      {
        k: 'imposto_aliquota', label: 'Alíquota efetiva (%)', type: 'numero', step: '0.01',
        valor: p.imposto_aliquota, hint: 'Ex.: 13,5 para 13,5% sobre a receita bruta do projeto.'
      }
    ],
    onSave: async (v) => { await store.update('projetos', p.id, v); toast('Imposto atualizado.'); }
  });
}

/* ---------------- lançamentos ---------------- */
function blocoLancamentos(u) {
  let lan = store.doProjeto('lancamentos');
  if (!podeVerTudo(u)) lan = lan.filter((l) => l.membro_id === u?.id || l.criado_por === u?.id);
  if (filtroLanc === 'pendentes') lan = lan.filter((l) => l.status === 'pendente');
  if (filtroLanc === 'meus') lan = lan.filter((l) => l.membro_id === u?.id || l.criado_por === u?.id);
  if (filtroLanc === 'entradas') lan = lan.filter((l) => l.tipo === 'entrada');
  lan = ordenar(lan, (l) => l.data || l.criado_em, -1);

  const pend = store.doProjeto('lancamentos').filter((l) => l.status === 'pendente').length;

  return `
    <div class="sec" style="margin-top:4px"><div class="sec-t">Gastos e entradas</div>${btnOlho(valoresOcultos())}</div>
    <div class="chips">
      <button class="chip ${filtroLanc === 'todos' ? 'on' : ''}" data-flanc="todos">Todos</button>
      <button class="chip ${filtroLanc === 'pendentes' ? 'on' : ''}" data-flanc="pendentes">Aprovar${pend ? ' (' + pend + ')' : ''}</button>
      <button class="chip ${filtroLanc === 'meus' ? 'on' : ''}" data-flanc="meus">Meus</button>
      <button class="chip ${filtroLanc === 'entradas' ? 'on' : ''}" data-flanc="entradas">Entradas</button>
    </div>
    <div class="card">${lan.length ? lan.map((l) => {
      const st = ST_LANC[l.status] || ST_LANC.pendente;
      const doc = store.doProjeto('documentos').find((d) => d.lancamento_id === l.id);
      return `<div class="row act" data-lanc="${l.id}">
        <span class="tag ${st.tag}">${l.tipo === 'entrada' ? '↓' : '↑'}</span>
        <span class="g"><span class="t">${esc(l.descricao)}</span>
          <span class="s">${esc([l.rubrica, fmtData(l.data), l.membro_id ? nomeMembro(l.membro_id) : '',
            doc ? '📎 nota' : (l.tipo === 'saida' ? '⚠ sem nota' : '')].filter(Boolean).join(' · '))}</span></span>
        <span class="r"><span class="v" style="color:${l.tipo === 'entrada' ? 'var(--ok)' : ''}">${fmtMoney(l.valor_cents)}</span>
          <div class="small muted">${esc(st.t.split(' ')[0])}</div></span>
      </div>`;
    }).join('') : '<div class="empty">Nenhum lançamento.</div>'}</div>`;
}

export function camposLancamento(u, fixo = {}) {
  const rubs = rubricasPara(u);
  const entrada = fixo.tipo === 'entrada';
  return [
    // Obrigatórios primeiro, na ordem em que a pessoa pensa: o que é, quanto,
    // de qual bolo sai. Depois a foto, que é o que ela tem na mão.
    {
      k: 'tipo', label: 'Tipo', type: 'select', req: true, valor: fixo.tipo || 'saida',
      opts: [{ v: 'saida', t: 'Gasto' }, { v: 'entrada', t: 'Entrada de dinheiro' }]
    },
    { k: 'valor_cents', label: 'Valor', type: 'dinheiro', req: true },
    {
      k: 'rubrica', label: 'Rubrica', type: 'select', req: true,
      valor: fixo.rubrica || (rubs.includes('Outros') ? 'Outros' : rubs[0]),
      opts: rubs.map((r) => ({ v: r, t: r })),
      hint: podeVerTudo(u) ? null : 'A produção pode reclassificar depois, se precisar.'
    },
    {
      k: 'arquivo', label: entrada ? 'Comprovante' : 'Foto da notinha', type: 'arquivo',
      hint: leitorDisponivel()
        ? 'Se a nota tiver QR code, o app preenche valor, data, CNPJ e número sozinho.'
        : 'Este navegador não lê o QR automaticamente — os campos abaixo ficam para preencher.'
    },
    entrada ? null : {
      k: 'fonte', label: 'Quem pagou', type: 'select', valor: fixo.fonte || 'empresa',
      opts: [
        { v: 'empresa', t: 'A produção pagou direto' },
        { v: 'caixinha', t: 'Saiu da caixinha que eu recebi' },
        { v: 'proprio', t: 'Paguei do meu bolso — quero reembolso' }
      ]
    },

    { type: 'titulo', label: 'Detalhes — só se precisar', k: '_t_det' },
    { k: 'descricao', label: entrada ? 'De onde veio' : 'O que foi', type: 'texto',
      ph: entrada ? '1ª parcela Fundação Bradesco' : 'Almoço da equipe — diária 1' },
    { k: 'data', label: 'Data', type: 'data', valor: hoje() },
    { k: 'fornecedor', label: entrada ? 'Quem pagou' : 'Fornecedor', type: 'texto' },
    {
      k: 'forma', label: 'Forma de pagamento', type: 'select', valor: 'pix',
      opts: [{ v: 'pix', t: 'Pix' }, { v: 'dinheiro', t: 'Dinheiro' }, { v: 'cartao', t: 'Cartão' },
      { v: 'transferencia', t: 'Transferência' }, { v: 'boleto', t: 'Boleto' }, { v: 'outro', t: 'Outro' }]
    },
    podeVerTudo(u) ? {
      k: 'membro_id', label: entrada ? 'Pessoa relacionada' : 'Quem gastou', type: 'select', valor: u?.id || '',
      opts: [{ v: '', t: '— produção —' }, ...membros().map((m) => ({ v: m.id, t: m.nome }))]
    } : null,
    entrada ? null : { k: 'nf_numero', label: 'Número da nota', type: 'texto' },
    entrada ? null : { k: 'nf_chave', label: 'Chave de acesso', type: 'texto' },
    { k: 'obs', label: 'Observações', type: 'area' }
  ].filter(Boolean);
}

/**
 * Antes de salvar sem foto, pergunta. Devolve false quando a pessoa quer voltar
 * e anexar — nesse caso o formulário fica aberto com o seletor de arquivo aberto.
 */
export async function conferirComprovante(v, api) {
  if (v.arquivo || v.tipo === 'entrada') return true;
  const r = await escolher('Falta o comprovante', [
    { v: 'anexar', t: 'Anexar a foto agora', sub: 'Volta para o formulário' },
    { v: 'sem', t: 'Salvar sem comprovante', sub: 'Fica marcado como sem nota' }
  ]);
  if (r === 'sem') return true;
  api?.escolherArquivo('arquivo');
  return false;
}

/** Lê o QR da notinha e preenche o formulário sozinho. */
export async function lerNotaNoForm(arquivo, api) {
  if (!leitorDisponivel()) {
    api.aviso('Foto salva. Este navegador não lê QR code — preencha os campos abaixo.', 'warn', 'arquivo');
    return;
  }
  api.aviso('Foto salva. Lendo o QR…', 'ok', 'arquivo');
  const d = await lerNotaDaImagem(arquivo);
  if (!d) {
    api.aviso('Foto salva. Não achei QR code nesta nota — preencha os campos abaixo.', 'warn', 'arquivo');
    return;
  }
  if (d.valor) api.set('valor_cents', parseMoney(d.valor));
  if (d.data) api.set('data', d.data);
  if (d.numero) api.set('nf_numero', d.numero);
  if (d.chave) api.set('nf_chave', d.chave);
  if (d.cnpjFmt && !api.valor('fornecedor')) api.set('fornecedor', d.cnpjFmt);
  api.aviso('Foto salva e nota lida: ' + resumoNota(d), 'ok', 'arquivo');
}

export async function salvarLancamento(v, u) {
  const podeAprovar = can(u, 'lanc.aprovar');
  const status = (v.tipo || 'saida') === 'entrada'
    ? (podeAprovar ? 'recebido' : 'pendente')
    : (podeAprovar ? 'aprovado' : 'pendente');
  const lanc = await store.insert('lancamentos', {
    tipo: v.tipo || 'saida',
    descricao: v.descricao || v.rubrica || (v.tipo === 'entrada' ? 'Entrada' : 'Gasto'), valor_cents: v.valor_cents, rubrica: v.rubrica,
    data: v.data || hoje(), fornecedor: v.fornecedor || '', forma: v.forma || '',
    membro_id: v.membro_id !== undefined ? (v.membro_id || null) : (u?.id || null),
    fonte: v.fonte || 'empresa', reembolso: v.fonte === 'proprio',
    sem_comprovante: !v.arquivo && (v.tipo || 'saida') === 'saida',
    obs: v.obs || '', status, aprovado_por: podeAprovar ? u?.id : null
  });
  if (v.arquivo) {
    const meta = await salvarArquivo(v.arquivo, { pasta: 'notas' });
    await store.insert('documentos', {
      tipo: 'nf', titulo: v.descricao, valor_cents: v.valor_cents, data: v.data || hoje(),
      emissor: v.fornecedor || '', numero: v.nf_numero || '', chave: v.nf_chave || '',
      lancamento_id: lanc.id, membro_id: lanc.membro_id,
      path: meta.path, nome: meta.nome, tamanho: meta.tamanho, mime: meta.tipo
    });
  }
  if (lanc.fonte === 'proprio' && lanc.membro_id) {
    await store.insert('contas', {
      tipo: 'pagar', descricao: `Reembolso — ${v.descricao}`, contraparte: nomeMembro(lanc.membro_id),
      valor_cents: v.valor_cents, venc: v.data || hoje(), status: 'aberto',
      membro_id: lanc.membro_id, lancamento_id: lanc.id, categoria: 'reembolso'
    });
  }
  await store.log(`${u?.nome || 'Alguém'} lançou ${fmtMoney(v.valor_cents)} — ${v.descricao}`, 'lancamento');
  return lanc;
}

function novoLancamento(u, tipo = 'saida') {
  abrirForm({
    titulo: tipo === 'entrada' ? 'Entrada de dinheiro' : 'Novo gasto',
    subtitulo: tipo === 'entrada' ? null
      : (can(u, 'lanc.aprovar') ? null : 'A produção recebe para aprovar.'),
    campos: camposLancamento(u, { tipo }),
    onArquivo: lerNotaNoForm,
    onSave: async (v, api) => {
      if (!await conferirComprovante(v, api)) throw new Error('__continuar');
      await salvarLancamento(v, u);
      toast(can(u, 'lanc.aprovar') ? 'Lançado.' : 'Enviado para aprovação.');
    }
  });
}

export function abrirLancamento(l) {
  if (!l) return;
  const u = store.user;
  const podeAprovar = can(u, 'lanc.aprovar');
  const corpo = el('<div></div>');

  const pintar = () => {
    const st = ST_LANC[l.status] || ST_LANC.pendente;
    const doc = store.doProjeto('documentos').find((d) => d.lancamento_id === l.id);
    corpo.innerHTML = `
      <div class="center" style="padding:6px 0 14px">
        <div style="font-size:30px;font-weight:700;letter-spacing:-.5px;color:${l.tipo === 'entrada' ? 'var(--ok)' : 'var(--tx)'}">
          ${l.tipo === 'entrada' ? '' : '−'}${fmtMoney(l.valor_cents)}</div>
        <span class="tag ${st.tag}" style="margin-top:8px">${esc(st.t)}</span>
      </div>
      <div class="card tight">
        <div class="row"><span class="g"><span class="s">Rubrica</span><span class="t">${esc(l.rubrica || '—')}</span></span></div>
        <div class="row"><span class="g"><span class="s">Data</span><span class="t">${esc(fmtData(l.data, { longo: true }))}</span></span></div>
        <div class="row"><span class="g"><span class="s">Fornecedor / pagador</span><span class="t">${esc(l.fornecedor || '—')}</span></span></div>
        <div class="row"><span class="g"><span class="s">Lançado por</span>
          <span class="t">${esc(nomeMembro(l.criado_por || l.membro_id))}${FONTE[l.fonte] ? ' · ' + FONTE[l.fonte] : ''}</span></span></div>
        ${l.obs ? `<div class="row"><span class="g"><span class="s">Observações</span>
          <span class="t" style="white-space:normal;font-weight:400">${esc(l.obs)}</span></span></div>` : ''}
      </div>
      <div class="card tight">
        <div class="row"><span class="g"><span class="s">Nota fiscal / comprovante</span>
          <span class="t" style="${doc ? '' : 'color:var(--warn)'}">${doc ? esc(doc.nome || 'anexo') : 'lançado sem comprovante'}</span></span>
          <span class="r">${doc ? '<button class="btn sm" data-ver>abrir</button>'
        : '<button class="btn sm gho" data-anexar>anexar</button>'}</span></div>
      </div>
      ${podeAprovar && l.status === 'pendente' ? `<div class="btns" style="margin-top:6px">
        <button class="btn pri" style="flex:1" data-ap="aprovado">Aprovar</button>
        <button class="btn danger" style="flex:1" data-ap="rejeitado">Rejeitar</button></div>` : ''}
      ${podeAprovar && (l.status === 'aprovado') ? `<button class="btn wide" data-ap="${l.tipo === 'entrada' ? 'recebido' : 'pago'}">
        Marcar como ${l.tipo === 'entrada' ? 'recebido' : 'pago'}</button>` : ''}
      ${podeAprovar ? '<button class="btn wide danger gho" style="margin-top:8px" data-del>Excluir lançamento</button>' : ''}`;

    corpo.querySelector('[data-ver]')?.addEventListener('click', async () => {
      try { if (!await abrirArquivo(doc)) toast('Arquivo não encontrado neste aparelho.'); }
      catch (e) { toast('Não consegui abrir: ' + e.message); }
    });
    corpo.querySelector('[data-anexar]')?.addEventListener('click', () => abrirForm({
      titulo: 'Anexar nota',
      campos: [{ k: 'arquivo', label: 'Foto da notinha', type: 'arquivo', req: true },
      { k: 'numero', label: 'Número da NF', type: 'texto' },
      { k: 'chave', label: 'Chave de acesso', type: 'texto' }],
      onArquivo: async (arq, api) => {
        const d = await lerNotaDaImagem(arq);
        if (!d) { api.aviso('Sem QR code legível nesta foto.', 'warn'); return; }
        api.set('numero', d.numero); api.set('chave', d.chave);
        api.aviso('Nota lida: ' + resumoNota(d));
      },
      onSave: async (v) => {
        const meta = await salvarArquivo(v.arquivo, { pasta: 'notas' });
        await store.insert('documentos', {
          tipo: 'nf', titulo: l.descricao, valor_cents: l.valor_cents, data: l.data,
          emissor: l.fornecedor || '', numero: v.numero || '', chave: v.chave || '', lancamento_id: l.id,
          membro_id: l.membro_id, path: meta.path, nome: meta.nome, tamanho: meta.tamanho, mime: meta.tipo
        });
        toast('Nota anexada.'); pintar(); store.emit();
      }
    }));
    corpo.querySelectorAll('[data-ap]').forEach((b) => {
      b.onclick = async () => {
        await store.update('lancamentos', l.id, { status: b.dataset.ap, aprovado_por: u.id });
        l.status = b.dataset.ap;
        await store.log(`${u.nome} marcou "${l.descricao}" como ${b.dataset.ap}`, 'lancamento');
        toast('Atualizado.'); pintar(); store.emit();
      };
    });
    corpo.querySelector('[data-del]')?.addEventListener('click', async () => {
      if (!await confirmar('Excluir este lançamento?', { ok: 'Excluir', perigo: true })) return;
      await store.remove('lancamentos', l.id); sh.close(); toast('Excluído.');
    });
  };
  pintar();
  const sh = sheet({ titulo: l.descricao, corpo });
}
