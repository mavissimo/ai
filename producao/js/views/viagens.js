// Viagens: o bloco logístico. Cada ida e volta com quem vai, o que já está
// fechado (voo, hotel, carro) e quanto custou de verdade contra o orçado.
import { store, nomeMembro, membros } from '../store.js';
import { caixaMapaHTML, ligarMapaViagens, cidadeDaViagem } from '../mapaviagens.js';
import { can } from '../perms.js';
import { estadoPedido } from './pedidosnf.js';
import { el, abrirForm, sheet, toast, confirmar, btnOlho } from '../ui.js';
import {
  esc, fmtMoney, fmtMoneyShort, fmtData, ordenar, soma, iniciais,
  diasAte, prazoTxt, hoje, valoresOcultos
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

/** Tarefas da viagem. Só o vínculo explícito conta: tarefa de projeto que por
    acaso vence na semana da viagem não é pendência da viagem. */
export function tarefasDaViagem(v) {
  return ordenar(store.doProjeto('tarefas').filter((t) => t.viagem_id === v.id),
    (t) => t.prazo || '9999');
}

const aberta = (t) => (t.status || (t.feito ? 'feita' : 'aberta')) !== 'feita';

/** Tudo que falta resolver nesta viagem, de onde quer que venha. */
export function pendencias(v) {
  const c = contaDaViagem(v);
  const out = [];

  for (const t of tarefasDaViagem(v).filter(aberta)) {
    out.push({
      tipo: 'tarefa', id: t.id, texto: t.titulo,
      quem: t.responsavel_id, prazo: t.prazo,
      resolver: async () => { await store.update('tarefas', t.id, { status: 'feita', feito: true }); }
    });
  }
  // Conta sem pessoa amarrada é pagamento da direção — quem aperta o botão.
  const quemPaga = store.doProjeto('membros').find((m) => can(m, 'pagamento.executar'))?.id || null;
  for (const x of c.contas.filter((y) => y.status === 'aberto')) {
    out.push({
      tipo: 'conta', id: x.id, texto: `Pagar ${fmtMoney(x.valor_cents)} — ${x.descricao}`,
      quem: x.membro_id || quemPaga, prazo: x.venc, valor: x.valor_cents
    });
  }
  // Só nota que a produção realmente cobra: passagem e hotel emitem sozinhos.
  for (const x of c.contas.filter((y) => estadoPedido(y))) {
    out.push({
      tipo: 'nf', id: 'nf' + x.id, texto: `Cobrar a NF — ${x.contraparte || x.descricao}`,
      quem: x.membro_id, prazo: x.venc
    });
  }
  const evs = eventosDaViagem(v).map((e) => e.id);
  for (const cf of store.doProjeto('confirmacoes').filter((x) => x.status === 'pendente'
    && evs.includes(x.ref_id))) {
    out.push({
      tipo: 'confirmacao', id: cf.id, texto: cf.titulo, quem: cf.membro_id,
      resolver: async () => {
        await store.update('confirmacoes', cf.id, { status: 'confirmado', respondido_em: hoje() });
      }
    });
  }
  for (const i of c.faltando) {
    out.push({ tipo: 'logistica', id: 'log' + i.k, texto: `${i.t} ainda não fechado`, quem: null });
  }
  return out;
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

  const pend = soma(vs, (v) => pendencias(v).length);
  node.innerHTML = `
    <div class="sec" style="margin-top:4px"><div class="sec-t">Onze viagens</div>${btnOlho(valoresOcultos())}</div>
    ${caixaMapaHTML()}
    <div class="grid3" style="margin-top:var(--s3)">
      <div class="kpi"><div class="l">Por rodar</div><div class="v">${proximas.length}</div>
        <div class="h">de ${vs.length} viagens</div></div>
      <div class="kpi ${pend ? 'warn' : ''}"><div class="l">Pendências</div><div class="v">${pend || '—'}</div>
        <div class="h">somando todas</div></div>
      <div class="kpi"><div class="l">Orçado</div><div class="v">${fmtMoneyShort(totalOrcado)}</div>
        <div class="h">fechado ${fmtMoneyShort(totalFechado)}</div></div>
    </div>
    ${vs.length ? vs.map((v) => cartao(v, u)).join('') : '<div class="empty">Nenhuma viagem cadastrada.</div>'}`;

  // O mapa acende o cartão e o cartão aproxima o mapa; o segundo toque abre.
  ligarMapaViagens(node, {
    alturaMax: 300,
    aoAbrir: (id) => abrir(store.get('viagens', id), editar)
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
  const pend = pendencias(v);
  const minhas = pend.filter((x) => x.quem === u?.id).length;
  const emCurso = hoje() >= v.ida && hoje() <= (v.volta || v.ida);
  const quando = v.status === 'feita' ? 'já rodou'
    : dias === 0 ? 'é hoje' : dias > 0 ? `em ${dias} dia${dias > 1 ? 's' : ''}` : 'em curso';

  return `<div class="card act ${emCurso ? 'ativa' : ''}" data-viagem="${v.id}"
    data-cidade="${esc(cidadeDaViagem(v))}" style="cursor:pointer">
    ${emCurso ? '<div class="faixa-ativa">Em curso agora</div>' : ''}
    <div style="display:flex;gap:11px;align-items:flex-start">
      <span class="ico ${dias === 0 || emCurso ? 'urg' : ''}">${v.numero || '✈️'}</span>
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
    ${pend.length ? `<div class="row" style="border:0;padding:8px 0 0">
      <span class="g"><span class="s">Falta resolver</span>
        <span class="t">${pend.length} pendência${pend.length > 1 ? 's' : ''}${minhas
          ? ` · <span style="color:var(--ac)">${minhas} sua${minhas > 1 ? 's' : ''}</span>` : ''}</span></span>
    </div>` : `<div class="row" style="border:0;padding:8px 0 0">
      <span class="g"><span class="t" style="color:var(--ok)">✓ Nada pendente</span></span></div>`}
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
      ${ITENS.map((i) => {
        const ok = !c.faltando.some((f) => f.k === i.k);
        // O símbolo passa por `.ico` para virar traço como no resto do app —
        // emoji solto dentro da etiqueta escapava da troca.
        return `<span class="tag ${ok ? 'ok' : 'warn'}"><i class="ico ico-inline">${i.icone}</i>${esc(i.t)}${ok ? '' : ' —'}</span>`;
      }).join('')}
      ${(v.participantes || []).map((id) => `<span class="avatar sm">${esc(iniciais(nomeMembro(id)))}</span>`).join('')}
      ${meu ? '<span class="tag info">você vai</span>' : ''}
    </div>`
    + '</div>';
}

function abrir(v, editar) {
  if (!v) return;
  const u = store.user;
  const corpo = el('<div></div>');
  let sh;

  const pintar = () => {
    const c = contaDaViagem(v);
    const evs = eventosDaViagem(v);
    const s = st(v.status);
    const diff = c.orcado - c.fechado;
    const pend = pendencias(v);
    const emCurso = hoje() >= v.ida && hoje() <= (v.volta || v.ida);
    const passou = hoje() > (v.volta || v.ida);
    // Cada um vê primeiro o que é dele; o resto vem depois, agrupado por dono.
    const porDono = new Map();
    for (const p of pend) {
      const k = p.quem || '';
      porDono.set(k, [...(porDono.get(k) || []), p]);
    }
    const ordemDonos = [...porDono.keys()].sort((a, b) => {
      if (a === u?.id) return -1;
      if (b === u?.id) return 1;
      return String(nomeMembro(a)).localeCompare(String(nomeMembro(b)));
    });

    corpo.innerHTML = `
      ${emCurso ? '<div class="banner warn small"><b>Esta viagem está acontecendo agora.</b></div>'
    : passou && pend.length ? `<div class="banner warn small"><b>A viagem já voltou</b> e ainda tem
        ${pend.length} coisa${pend.length > 1 ? 's' : ''} em aberto. Feche o que dá e marque o resto.</div>` : ''}

      ${pend.length ? `<div class="sec" style="margin-top:0"><div class="sec-t">Pendências</div>
          <span class="small muted">${pend.length}</span></div>
        ${ordemDonos.map((dono) => `
          <div class="small muted" style="margin:var(--s3) 0 var(--s2);font-weight:650">
            ${dono === u?.id ? 'Você' : dono ? esc(nomeMembro(dono)) : 'Sem dono'}
            <span style="font-weight:400">· ${porDono.get(dono).length}</span></div>
          <div class="card lista">${porDono.get(dono).map((p) => `
            <div class="row ${p.resolver ? 'act sem-seta' : ''}" ${p.resolver ? `data-ok="${p.id}"` : ''}>
              <span class="ico">${p.tipo === 'tarefa' ? '☑️' : p.tipo === 'conta' ? '💸'
    : p.tipo === 'nf' ? '🧾' : p.tipo === 'confirmacao' ? '🙋' : '⚠️'}</span>
              <span class="g"><span class="t" style="white-space:normal">${esc(p.texto)}</span>
                ${p.prazo ? `<span class="s">${esc(prazoTxt(p.prazo))}</span>` : ''}</span>
              ${p.resolver ? '<span class="r"><span class="tag ok">feito?</span></span>' : ''}
            </div>`).join('')}</div>`).join('')}
        <button class="btn wide pri" data-tudo>Tudo perfeito — marcar ${pend.filter((p) => p.resolver).length} como resolvido</button>
        <div class="small muted" style="margin-top:6px;text-align:center">
          Pagamentos e notas fiscais não entram: eles se resolvem na conta.</div>`
    : '<div class="banner small" style="border-color:var(--ok)"><b>Nada pendente nesta viagem.</b></div>'}

      <div class="sec"><div class="sec-t">A viagem</div></div>
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
      <div class="card tight">
        <div class="row"><span class="g"><span class="t">Orçado</span></span>
          <span class="r"><span class="v">${fmtMoney(c.orcado)}</span></span></div>
        <div class="row"><span class="g"><span class="t">Já fechado</span>
          <span class="s">${c.contas.length} compromisso(s)</span></span>
          <span class="r"><span class="v">${fmtMoney(c.fechado)}</span></span></div>
        <div class="row"><span class="g"><span class="t">${diff >= 0 ? 'Sobra do orçado' : 'Estouro'}</span></span>
          <span class="r"><span class="v" style="color:${diff < 0 ? 'var(--bad)' : 'var(--ok)'}">${fmtMoney(Math.abs(diff))}</span></span></div>
        ${c.gasto ? `<div class="row"><span class="g"><span class="t">Já saiu do caixa</span>
          <span class="s">compromissos pagos + notas e caixinha</span></span>
          <span class="r"><span class="v">${fmtMoney(c.gasto)}</span></span></div>` : ''}
      </div>

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
            <span class="s">${esc(e.local || '')}</span></span></div>`).join('')}</div>` : ''}

      ${editar ? '<button class="btn wide gho" data-edit>Editar viagem</button>' : ''}`;

    corpo.querySelectorAll('[data-ok]').forEach((n) => {
      n.onclick = async () => {
        const p = pend.find((x) => x.id === n.dataset.ok);
        if (!p?.resolver) return;
        await p.resolver();
        pintar(); store.emit();
      };
    });
    corpo.querySelector('[data-tudo]')?.addEventListener('click', async () => {
      const resolvíveis = pend.filter((p) => p.resolver);
      const ok = await confirmar(
        `Marcar ${resolvíveis.length} pendência(s) desta viagem como resolvidas? `
        + 'Tarefas e confirmações fecham; contas a pagar e notas fiscais continuam como estão.',
        { ok: 'Tudo perfeito' }
      );
      if (!ok) return;
      for (const p of resolvíveis) await p.resolver();
      await store.log(`Viagem ${v.numero} — ${resolvíveis.length} pendência(s) fechadas de uma vez.`, 'viagem');
      toast('Viagem em dia.');
      pintar(); store.emit();
    });
    corpo.querySelector('[data-edit]')?.addEventListener('click', () => { sh.close(); editarViagem(v); });
  };

  pintar();
  sh = sheet({ titulo: `${v.numero ? 'Viagem ' + v.numero + ' — ' : ''}${v.titulo}`, corpo });
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
