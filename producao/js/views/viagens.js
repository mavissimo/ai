// Viagens: o bloco logístico. Cada ida e volta com quem vai, o que já está
// fechado (voo, hotel, carro) e quanto custou de verdade contra o orçado.
import { store, nomeMembro, membros } from '../store.js';
import { can } from '../perms.js';
import { el, abrirForm, sheet, toast, btnOlho } from '../ui.js';
import {
  esc, fmtMoney, fmtMoneyShort, fmtData, ordenar, soma, iniciais,
  diasAte, valoresOcultos
} from '../utils.js';

export const ST_VIAGEM = {
  prevista: { t: 'Data prevista', tag: 'warn' },
  confirmada: { t: 'Confirmada', tag: 'ok' },
  feita: { t: 'Já rodou', tag: 'mut' }
};
const st = (v) => ST_VIAGEM[v] || ST_VIAGEM.prevista;

// O que toda viagem precisa ter fechado antes de embarcar.
const ITENS = [
  { k: 'passagens', icone: '✈️', t: 'Voo' },
  { k: 'hospedagem', icone: '🏨', t: 'Hotel' },
  { k: 'transporte', icone: '🚗', t: 'Carro' }
];

const noPeriodo = (data, v) => Boolean(data) && data >= v.ida && data <= (v.volta || v.ida);

/** Contas amarradas na viagem — por vínculo explícito ou pela data. */
export function contasDaViagem(v) {
  return store.doProjeto('contas').filter((c) => c.tipo === 'pagar'
    && (c.viagem_id === v.id || (!c.viagem_id && noPeriodo(c.venc, v))));
}

export function eventosDaViagem(v) {
  return ordenar(store.doProjeto('eventos').filter((e) => e.viagem_id === v.id || noPeriodo(e.data, v)),
    (e) => e.data);
}

/** Orçado, fechado e já gasto de uma viagem. */
export function contaDaViagem(v) {
  const contas = contasDaViagem(v);
  const gastos = store.doProjeto('lancamentos').filter((l) => l.tipo === 'saida'
    && l.status !== 'rejeitado' && (l.viagem_id === v.id || (!l.viagem_id && noPeriodo(l.data, v))));
  const fechado = soma(contas, (c) => c.valor_cents);
  return {
    contas, gastos, fechado,
    orcado: v.orcado_cents || 0,
    gasto: soma(gastos, (l) => l.valor_cents),
    aPagar: soma(contas.filter((c) => c.status === 'aberto'), (c) => c.valor_cents),
    faltando: ITENS.filter((i) => !contas.some((c) => c.categoria === i.k))
  };
}

export function render() {
  const u = store.user;
  const editar = can(u, 'agenda.edit');
  const vs = ordenar(store.doProjeto('viagens'), (v) => v.ida);
  const node = el('<div></div>');

  const proximas = vs.filter((v) => v.status !== 'feita');
  const totalOrcado = soma(vs, (v) => v.orcado_cents || 0);
  const totalFechado = soma(vs, (v) => contaDaViagem(v).fechado);

  node.innerHTML = `
    <div class="sec" style="margin-top:4px"><div class="sec-t">Viagens</div>${btnOlho(valoresOcultos())}</div>
    <div class="grid">
      <div class="kpi"><div class="l">Viagens</div><div class="v">${vs.length}</div>
        <div class="h">${proximas.length} ainda por rodar</div></div>
      <div class="kpi"><div class="l">Orçado</div><div class="v">${fmtMoneyShort(totalOrcado)}</div>
        <div class="h">fechado ${fmtMoneyShort(totalFechado)}</div></div>
    </div>
    ${vs.length ? vs.map((v) => cartao(v, u)).join('') : '<div class="empty">Nenhuma viagem cadastrada.</div>'}`;

  node.querySelectorAll('[data-viagem]').forEach((n) => {
    n.onclick = () => abrir(store.get('viagens', n.dataset.viagem), editar);
  });

  return {
    titulo: 'Viagens',
    node,
    fab: editar ? { label: '+', onClick: () => editarViagem({}) } : null
  };
}

function cartao(v, u) {
  const c = contaDaViagem(v);
  const s = st(v.status);
  const meu = (v.participantes || []).includes(u?.id);
  const dias = diasAte(v.ida);
  const quando = v.status === 'feita' ? 'já rodou'
    : dias === 0 ? 'é hoje' : dias > 0 ? `em ${dias} dia${dias > 1 ? 's' : ''}` : 'em curso';

  return `<div class="card act" data-viagem="${v.id}" style="cursor:pointer">
    <div style="display:flex;gap:11px;align-items:flex-start">
      <span class="ico ${dias === 0 ? 'urg' : ''}">${v.numero || '✈️'}</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:650;font-size:15px">${esc(v.titulo)}</div>
        <div class="small muted" style="margin-top:2px">
          ${esc(fmtData(v.ida))} → ${esc(fmtData(v.volta || v.ida))} · ${esc(quando)}</div>
      </div>
      <span class="tag ${s.tag}">${esc(s.t)}</span>
    </div>
    <div class="row" style="border:0;padding:9px 0 0">
      <span class="g"><span class="s">Orçado ${fmtMoney(c.orcado)}</span>
        <span class="t">${c.fechado ? `fechado ${fmtMoney(c.fechado)}` : 'nada fechado ainda'}</span></span>
      ${c.aPagar ? `<span class="r"><span class="v" style="color:var(--warn)">${fmtMoney(c.aPagar)}</span>
        <div class="small muted">a pagar</div></span>` : ''}
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
      ${ITENS.map((i) => {
        const ok = !c.faltando.some((f) => f.k === i.k);
        return `<span class="tag ${ok ? 'ok' : 'warn'}">${i.icone} ${esc(i.t)}${ok ? '' : ' —'}</span>`;
      }).join('')}
      ${(v.participantes || []).map((id) => `<span class="avatar sm">${esc(iniciais(nomeMembro(id)))}</span>`).join('')}
      ${meu ? '<span class="tag info">você vai</span>' : ''}
    </div>`
    + '</div>';
}

function abrir(v, editar) {
  if (!v) return;
  const c = contaDaViagem(v);
  const evs = eventosDaViagem(v);
  const s = st(v.status);
  const diff = c.orcado - c.fechado;

  const corpo = `
    <div class="card tight">
    <div class="row"><span class="g"><span class="s">Quando</span>
      <span class="t">${esc(fmtData(v.ida))} → ${esc(fmtData(v.volta || v.ida))}</span></span>
      <span class="r"><span class="tag ${s.tag}">${esc(s.t)}</span></span></div>
    ${v.origem || v.destino ? `<div class="row"><span class="g"><span class="s">Trajeto</span>
      <span class="t">${esc([v.origem, v.destino].filter(Boolean).join(' → '))}</span></span></div>` : ''}
    ${(v.participantes || []).length ? `<div class="row"><span class="g"><span class="s">Quem vai</span>
      <span class="t">${esc((v.participantes || []).map(nomeMembro).join(', '))}</span></span></div>` : ''}
    ${v.obs ? `<div class="row"><span class="g"><span class="s">Observação</span>
      <span class="t" style="white-space:normal">${esc(v.obs)}</span></span></div>` : ''}
    </div>

    <div class="sec"><div class="sec-t">Dinheiro</div></div>
    <div class="card">
      <div class="row"><span class="g"><span class="t">Orçado</span></span>
        <span class="r"><span class="v">${fmtMoney(c.orcado)}</span></span></div>
      <div class="row"><span class="g"><span class="t">Já fechado</span>
        <span class="s">${c.contas.length} compromisso(s)</span></span>
        <span class="r"><span class="v">${fmtMoney(c.fechado)}</span></span></div>
      <div class="row"><span class="g"><span class="t">${diff >= 0 ? 'Sobra do orçado' : 'Estouro'}</span>
        <span class="s">orçado − fechado</span></span>
        <span class="r"><span class="v" style="color:${diff < 0 ? 'var(--bad)' : 'var(--ok)'}">${fmtMoney(Math.abs(diff))}</span></span></div>
      ${c.gasto ? `<div class="row"><span class="g"><span class="t">Já saiu do caixa</span>
        <span class="s">inclui os compromissos pagos + notas e caixinha</span></span>
        <span class="r"><span class="v">${fmtMoney(c.gasto)}</span></span></div>` : ''}
    </div>

    ${c.faltando.length ? `<div class="banner warn small">Falta fechar:
      ${c.faltando.map((i) => `<b>${esc(i.t)}</b>`).join(' · ')}.</div>` : ''}

    ${c.contas.length ? `<div class="sec"><div class="sec-t">Compromissos</div></div>
      <div class="card lista">${c.contas.map((x) => `<div class="row">
        <span class="tag ${x.status === 'quitado' ? 'ok' : 'warn'}">${x.status === 'quitado' ? 'pago' : 'aberto'}</span>
        <span class="g"><span class="t">${esc(x.descricao)}</span>
          <span class="s">${esc(x.contraparte || '')}</span></span>
        <span class="r"><span class="v">${fmtMoney(x.valor_cents)}</span></span></div>`).join('')}</div>` : ''}

    ${evs.length ? `<div class="sec"><div class="sec-t">Na agenda</div></div>
      <div class="card lista">${evs.map((e) => `<div class="row">
        <span class="tag ${e.tipo === 'diaria' ? 'ok' : 'info'}">${esc(fmtData(e.data).slice(0, 5))}</span>
        <span class="g"><span class="t">${esc(e.titulo)}</span>
          <span class="s">${esc(e.local || '')}</span></span></div>`).join('')}</div>` : ''}`;

  const nodeCorpo = el(`<div>${corpo}
    ${editar ? '<button class="btn wide gho" data-edit>Editar viagem</button>' : ''}</div>`);
  const sh = sheet({ titulo: `${v.numero ? 'Viagem ' + v.numero + ' — ' : ''}${v.titulo}`, corpo: nodeCorpo });
  nodeCorpo.querySelector('[data-edit]')?.addEventListener('click', () => { sh.close(); editarViagem(v); });
}

function editarViagem(v) {
  const nova = !v.id;
  abrirForm({
    titulo: nova ? 'Nova viagem' : 'Editar viagem',
    campos: [
      { k: 'numero', label: 'Nº', type: 'texto', valor: v.numero || '', meia: true },
      {
        k: 'status', label: 'Situação', type: 'select', meia: true, valor: v.status || 'prevista',
        opts: Object.entries(ST_VIAGEM).map(([k, o]) => ({ v: k, t: o.t }))
      },
      { k: 'titulo', label: 'Viagem', type: 'texto', req: true, valor: v.titulo || '' },
      { k: 'ida', label: 'Ida', type: 'data', req: true, valor: v.ida || '', meia: true },
      { k: 'volta', label: 'Volta', type: 'data', valor: v.volta || '', meia: true },
      { k: 'origem', label: 'Sai de', type: 'texto', valor: v.origem || '', meia: true },
      { k: 'destino', label: 'Vai para', type: 'texto', valor: v.destino || '', meia: true },
      {
        k: 'participantes', label: 'Quem vai', type: 'multi', valor: v.participantes || [],
        opts: membros().map((m) => ({ v: m.id, t: m.nome }))
      },
      { k: 'orcado_cents', label: 'Orçado', type: 'dinheiro', valor: v.orcado_cents || 0 },
      { k: 'obs', label: 'Observação', type: 'area', valor: v.obs || '' }
    ],
    onSave: async (dados) => {
      if (nova) await store.insert('viagens', dados);
      else await store.update('viagens', v.id, dados);
      toast(nova ? 'Viagem criada.' : 'Viagem atualizada.');
    },
    onDelete: nova ? null : async () => { await store.remove('viagens', v.id); toast('Viagem apagada.'); }
  });
}
