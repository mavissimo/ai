// Dinheiro: resumo, orçamento por rubrica e lançamentos (com nota anexada).
import { store, membros, nomeMembro } from '../store.js';
import { can, podeVerTudo } from '../perms.js';
import { el, abrirForm, sheet, toast, confirmar } from '../ui.js';
import { esc, fmtMoney, fmtMoneyShort, pct, fmtData, hoje, ordenar, soma } from '../utils.js';
import { financeiro, porRubrica, ST_LANC } from '../calc.js';
import { RUBRICAS } from '../seed.js';
import { salvarArquivo, abrirArquivo } from '../files.js';

let aba = 'resumo';

const FONTE = { empresa: 'pago pela produção', caixinha: 'caixinha', proprio: 'reembolso' };
let filtroLanc = 'todos';

export function render() {
  const u = store.user;
  const node = el('<div></div>');
  if (!can(u, 'orcamento.ver') && !podeVerTudo(u)) {
    node.innerHTML = '<div class="empty">Seus lançamentos ficam em “Meu painel”.</div>';
    return { titulo: 'Dinheiro', node };
  }
  const f = financeiro();
  const verLucro = can(u, 'lucro.ver') || can(u, 'contratos.valores');

  node.innerHTML = `
    <div class="chips">
      <button class="chip ${aba === 'resumo' ? 'on' : ''}" data-aba="resumo">Resumo</button>
      <button class="chip ${aba === 'orcamento' ? 'on' : ''}" data-aba="orcamento">Orçamento</button>
      <button class="chip ${aba === 'lanc' ? 'on' : ''}" data-aba="lanc">Lançamentos</button>
    </div>
    ${aba === 'resumo' ? blocoResumo(f, verLucro, u) : ''}
    ${aba === 'orcamento' ? blocoOrcamento(u) : ''}
    ${aba === 'lanc' ? blocoLancamentos(u) : ''}`;

  node.querySelectorAll('[data-aba]').forEach((b) => { b.onclick = () => { aba = b.dataset.aba; store.emit(); }; });
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
    fab: can(u, 'lanc.edit') ? { label: '+', onClick: () => novoLancamento(u) } : null
  };
}

/* ---------------- resumo ---------------- */
function blocoResumo(f, verLucro, u) {
  const usado = pct(f.realizado, f.orcado || 1);
  const rub = porRubrica().filter((r) => r.previsto || r.real || r.pend);
  return `
    <div class="grid">
      ${verLucro ? `<div class="kpi"><div class="l">Contratado</div><div class="v">${fmtMoneyShort(f.contratado)}</div>
        <div class="h">recebido ${fmtMoneyShort(f.recebido)}</div></div>` : ''}
      <div class="kpi"><div class="l">Orçado</div><div class="v">${fmtMoneyShort(f.orcado)}</div>
        <div class="h">${usado}% usado</div></div>
      <div class="kpi ${f.saldoOrcamento < 0 ? 'bad' : 'ok'}"><div class="l">Sobra do orçamento</div>
        <div class="v">${fmtMoneyShort(f.saldoOrcamento)}</div>
        <div class="h">pendente ${fmtMoneyShort(f.pendente)}</div></div>
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
      const p = pct(r.real + r.pend, r.previsto || (r.real + r.pend) || 1);
      return `<div style="padding:9px 0;border-bottom:1px solid var(--line)">
        <div style="display:flex;gap:8px;align-items:baseline">
          <span style="flex:1;font-weight:600;font-size:14px">${esc(r.rubrica)}</span>
          <span class="small mono muted">${fmtMoneyShort(r.real + r.pend)} / ${fmtMoneyShort(r.previsto)}</span>
        </div>
        <div class="bar"><i class="${p > 100 ? 'bad' : p > 85 ? 'warn' : 'ok'}" style="width:${Math.min(p, 100)}%"></i></div>
      </div>`;
    }).join('') : '<div class="empty">Preencha o orçamento para acompanhar aqui.</div>'}</div>`;
}

/* ---------------- orçamento ---------------- */
function blocoOrcamento(u) {
  const rub = porRubrica();
  const total = soma(rub, (r) => r.previsto);
  const gasto = soma(rub, (r) => r.real + r.pend);
  return `
    <div class="grid">
      <div class="kpi"><div class="l">Total orçado</div><div class="v">${fmtMoneyShort(total)}</div></div>
      <div class="kpi ${gasto > total ? 'bad' : ''}"><div class="l">Comprometido</div><div class="v">${fmtMoneyShort(gasto)}</div></div>
    </div>
    <div class="sec"><div class="sec-t">Rubricas</div>
      ${can(u, 'orcamento.edit') ? '<button class="btn sm gho" data-nova-rubrica>+ rubrica</button>' : ''}</div>
    <div class="card">${rub.map((r) => `
      <div class="row ${r.id ? 'act' : ''}" ${r.id ? `data-rub="${r.id}"` : ''}>
        <span class="g"><span class="t">${esc(r.rubrica)}</span>
          <span class="s">gasto ${fmtMoney(r.real)}${r.pend ? ' · pendente ' + fmtMoney(r.pend) : ''}</span></span>
        <span class="r"><span class="v">${fmtMoney(r.previsto)}</span>
          <div class="small ${r.real + r.pend > r.previsto ? 'muted' : 'muted'}" style="color:${r.real + r.pend > r.previsto && r.previsto ? 'var(--bad)' : ''}">
            ${r.previsto ? pct(r.real + r.pend, r.previsto) + '%' : '—'}</div></span>
      </div>`).join('')}</div>`;
}

function novaRubrica() {
  abrirForm({
    titulo: 'Nova rubrica',
    campos: [
      { k: 'rubrica', label: 'Nome da rubrica', type: 'texto', req: true },
      { k: 'previsto_cents', label: 'Valor previsto', type: 'dinheiro' },
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
      { k: 'previsto_cents', label: 'Previsto', type: 'dinheiro', valor: r.previsto_cents },
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
          <span class="s">${esc([l.rubrica, fmtData(l.data), l.membro_id ? nomeMembro(l.membro_id) : '', doc ? '📎 nota' : '']
            .filter(Boolean).join(' · '))}</span></span>
        <span class="r"><span class="v" style="color:${l.tipo === 'entrada' ? 'var(--ok)' : ''}">${fmtMoney(l.valor_cents)}</span>
          <div class="small muted">${esc(st.t.split(' ')[0])}</div></span>
      </div>`;
    }).join('') : '<div class="empty">Nenhum lançamento.</div>'}</div>`;
}

export function camposLancamento(u, fixo = {}) {
  const rubs = [...new Set([...RUBRICAS, ...store.doProjeto('orcamento').map((o) => o.rubrica)])];
  return [
    {
      k: 'tipo', label: 'Tipo', type: 'select', valor: fixo.tipo || 'saida',
      opts: [{ v: 'saida', t: 'Saída (gasto)' }, { v: 'entrada', t: 'Entrada (recebimento)' }]
    },
    { k: 'descricao', label: 'Descrição', type: 'texto', req: true, ph: 'Almoço da equipe — diária 1' },
    { k: 'valor_cents', label: 'Valor', type: 'dinheiro', req: true },
    { k: 'rubrica', label: 'Rubrica', type: 'select', valor: fixo.rubrica || 'Outros', opts: rubs.map((r) => ({ v: r, t: r })) },
    { k: 'data', label: 'Data', type: 'data', valor: hoje() },
    { k: 'fornecedor', label: 'Fornecedor / pagador', type: 'texto' },
    {
      k: 'forma', label: 'Forma', type: 'select', valor: 'pix',
      opts: [{ v: 'pix', t: 'Pix' }, { v: 'dinheiro', t: 'Dinheiro' }, { v: 'cartao', t: 'Cartão' },
      { v: 'transferencia', t: 'Transferência' }, { v: 'boleto', t: 'Boleto' }, { v: 'outro', t: 'Outro' }]
    },
    podeVerTudo(u) ? {
      k: 'membro_id', label: 'Quem gastou/recebeu', type: 'select', valor: u?.id || '',
      opts: [{ v: '', t: '— produção —' }, ...membros().map((m) => ({ v: m.id, t: m.nome }))]
    } : null,
    {
      k: 'fonte', label: 'De onde saiu o dinheiro', type: 'select', valor: fixo.fonte || 'empresa',
      opts: [
        { v: 'empresa', t: 'Pago direto pela produção' },
        { v: 'caixinha', t: 'Da caixinha (adiantamento que recebi)' },
        { v: 'proprio', t: 'Do meu bolso — quero reembolso' }
      ],
      hint: 'Caixinha desconta do seu saldo. Reembolso vira uma conta a pagar para você.'
    },
    { k: 'arquivo', label: 'Nota fiscal / comprovante', type: 'arquivo', hint: 'Foto da notinha ou PDF. Fica anexado ao lançamento.' },
    { k: 'obs', label: 'Observações', type: 'area' }
  ].filter(Boolean);
}

export async function salvarLancamento(v, u) {
  const podeAprovar = can(u, 'lanc.aprovar');
  const status = v.tipo === 'entrada'
    ? (podeAprovar ? 'recebido' : 'pendente')
    : (podeAprovar ? 'aprovado' : 'pendente');
  const lanc = await store.insert('lancamentos', {
    tipo: v.tipo, descricao: v.descricao, valor_cents: v.valor_cents, rubrica: v.rubrica,
    data: v.data || hoje(), fornecedor: v.fornecedor || '', forma: v.forma || '',
    membro_id: v.membro_id !== undefined ? (v.membro_id || null) : (u?.id || null),
    fonte: v.fonte || 'empresa', reembolso: v.fonte === 'proprio',
    obs: v.obs || '', status, aprovado_por: podeAprovar ? u?.id : null
  });
  if (v.arquivo) {
    const meta = await salvarArquivo(v.arquivo, { pasta: 'notas' });
    await store.insert('documentos', {
      tipo: 'nf', titulo: v.descricao, valor_cents: v.valor_cents, data: v.data || hoje(),
      emissor: v.fornecedor || '', numero: '', lancamento_id: lanc.id,
      membro_id: lanc.membro_id, path: meta.path, nome: meta.nome, tamanho: meta.tamanho, mime: meta.tipo
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

function novoLancamento(u) {
  abrirForm({
    titulo: 'Novo lançamento',
    campos: camposLancamento(u),
    onSave: async (v) => {
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
          <span class="t">${doc ? esc(doc.nome || 'anexo') : 'sem anexo'}</span></span>
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
      campos: [{ k: 'arquivo', label: 'Arquivo', type: 'arquivo', req: true },
      { k: 'numero', label: 'Número da NF', type: 'texto' }],
      onSave: async (v) => {
        const meta = await salvarArquivo(v.arquivo, { pasta: 'notas' });
        await store.insert('documentos', {
          tipo: 'nf', titulo: l.descricao, valor_cents: l.valor_cents, data: l.data,
          emissor: l.fornecedor || '', numero: v.numero || '', lancamento_id: l.id,
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
