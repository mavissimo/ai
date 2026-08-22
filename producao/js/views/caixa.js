// Caixinha de produção: dinheiro adiantado para alguém e a prestação de contas.
import { store, membros, nomeMembro } from '../store.js';
import { can } from '../perms.js';
import { el, abrirForm, sheet, toast } from '../ui.js';
import { esc, fmtMoney, fmtMoneyShort, fmtData, hoje, ordenar, soma, iniciais } from '../utils.js';
import { saldoCaixa, caixasAbertos, ST_LANC } from '../calc.js';

export function render() {
  const u = store.user;
  const node = el('<div></div>');
  const gestor = can(u, 'lanc.aprovar');

  // Quem não é gestão vê só a própria caixinha.
  const lista = gestor ? caixasAbertos() : [{ membro_id: u?.id, ...saldoCaixa(u?.id) }];

  const totalAdiantado = soma(lista, (c) => c.adiantado);
  const totalAberto = soma(lista, (c) => c.saldo);

  node.innerHTML = `
    <div class="grid">
      <div class="kpi"><div class="l">Adiantado</div><div class="v">${fmtMoneyShort(totalAdiantado)}</div>
        <div class="h">${lista.filter((c) => c.adiantado).length} pessoa(s)</div></div>
      <div class="kpi ${totalAberto > 0 ? 'warn' : 'ok'}"><div class="l">A comprovar</div>
        <div class="v">${fmtMoneyShort(totalAberto)}</div>
        <div class="h">nota ou devolução</div></div>
    </div>
    <div class="card">${lista.filter((c) => c.adiantado || c.gasto).length
      ? lista.filter((c) => c.adiantado || c.gasto).map((c) => `<div class="row act" data-caixa="${c.membro_id}">
        <span class="avatar">${esc(iniciais(nomeMembro(c.membro_id)))}</span>
        <span class="g"><span class="t">${esc(nomeMembro(c.membro_id))}</span>
          <span class="s">adiantado ${fmtMoney(c.adiantado)} · comprovado ${fmtMoney(c.gasto)}</span></span>
        <span class="r"><span class="v" style="color:${c.saldo > 0 ? 'var(--warn)' : 'var(--ok)'}">${fmtMoney(c.saldo)}</span>
          <div class="small muted">na mão</div></span>
      </div>`).join('')
      : '<div class="empty">Nenhum adiantamento em aberto.</div>'}</div>
    <div class="banner small">Quem recebe adiantamento lança o gasto marcando <b>“da caixinha”</b>.
      O saldo cai sozinho e o que sobrar volta como devolução.</div>`;

  node.querySelectorAll('[data-caixa]').forEach((n) => {
    n.onclick = () => abrirCaixa(n.dataset.caixa, gestor);
  });

  return {
    titulo: 'Caixinha',
    node,
    fab: gestor ? { label: '+', onClick: () => novoAdiantamento() } : null
  };
}

function novoAdiantamento(membroId) {
  abrirForm({
    titulo: 'Novo adiantamento',
    subtitulo: 'Dinheiro entregue para alguém gastar em nome da produção.',
    campos: [
      {
        k: 'membro_id', label: 'Para quem', type: 'select', req: true, valor: membroId || '',
        opts: membros().map((m) => ({ v: m.id, t: m.nome }))
      },
      { k: 'valor_cents', label: 'Valor', type: 'dinheiro', req: true },
      { k: 'data', label: 'Data', type: 'data', valor: hoje() },
      {
        k: 'forma', label: 'Como foi entregue', type: 'select', valor: 'pix',
        opts: [{ v: 'pix', t: 'Pix' }, { v: 'dinheiro', t: 'Dinheiro' },
        { v: 'transferencia', t: 'Transferência' }, { v: 'cartao', t: 'Cartão da produção' }]
      },
      { k: 'obs', label: 'Para quê', type: 'area', ph: 'Alimentação e transporte da diária em Conceição' }
    ],
    onSave: async (v) => {
      await store.insert('caixa', { ...v, tipo: 'adiantamento' });
      await store.log(`Adiantamento de ${fmtMoney(v.valor_cents)} para ${nomeMembro(v.membro_id)}`, 'caixa');
      toast('Adiantamento registrado.');
    }
  });
}

function abrirCaixa(membroId, gestor) {
  const corpo = el('<div></div>');
  const pintar = () => {
    const c = saldoCaixa(membroId);
    const mov = ordenar(store.doProjeto('caixa').filter((m) => m.membro_id === membroId), (m) => m.data, -1);
    const gastos = ordenar(store.doProjeto('lancamentos')
      .filter((l) => l.membro_id === membroId && l.fonte === 'caixinha'), (l) => l.data, -1);
    corpo.innerHTML = `
      <div class="center" style="padding:6px 0 14px">
        <div class="small muted">Está na mão</div>
        <div style="font-size:30px;font-weight:700;letter-spacing:-.5px;color:${c.saldo > 0 ? 'var(--warn)' : 'var(--ok)'}">
          ${fmtMoney(c.saldo)}</div>
      </div>
      <div class="card tight">
        <div class="row"><span class="g"><span class="t">Adiantado</span></span>
          <span class="r"><span class="v">${fmtMoney(c.adiantado)}</span></span></div>
        <div class="row"><span class="g"><span class="t">Gasto comprovado</span>
          <span class="s">${gastos.length} lançamento(s)</span></span>
          <span class="r"><span class="v">− ${fmtMoney(c.gasto)}</span></span></div>
        <div class="row"><span class="g"><span class="t">Devolvido</span></span>
          <span class="r"><span class="v">− ${fmtMoney(c.devolvido)}</span></span></div>
      </div>
      <div class="sec"><div class="sec-t">Gastos da caixinha</div></div>
      <div class="card">${gastos.length ? gastos.map((l) => {
        const st = ST_LANC[l.status] || ST_LANC.pendente;
        const doc = store.doProjeto('documentos').find((d) => d.lancamento_id === l.id);
        return `<div class="row">
          <span class="tag ${st.tag}">${esc(st.t.split(' ')[0])}</span>
          <span class="g"><span class="t">${esc(l.descricao)}</span>
            <span class="s">${esc(fmtData(l.data))}${doc ? ' · 📎 nota' : ' · sem nota'}</span></span>
          <span class="r"><span class="v">${fmtMoney(l.valor_cents)}</span></span></div>`;
      }).join('') : '<div class="empty">Nada gasto ainda.</div>'}</div>
      <div class="sec"><div class="sec-t">Movimentos</div></div>
      <div class="card">${mov.map((m) => `<div class="row">
        <span class="tag ${m.tipo === 'adiantamento' ? 'info' : 'ok'}">${m.tipo === 'adiantamento' ? 'entrou' : 'devolveu'}</span>
        <span class="g"><span class="t">${esc(m.obs || (m.tipo === 'adiantamento' ? 'Adiantamento' : 'Devolução'))}</span>
          <span class="s">${esc(fmtData(m.data))}${m.forma ? ' · ' + esc(m.forma) : ''}</span></span>
        <span class="r"><span class="v">${fmtMoney(m.valor_cents)}</span></span></div>`).join('')}</div>
      <div class="btns" style="margin-top:6px">
        ${c.saldo > 0 ? '<button class="btn pri" style="flex:1" data-devolver>Devolver saldo</button>' : ''}
        ${gestor ? '<button class="btn gho" style="flex:1" data-mais>Novo adiantamento</button>' : ''}
      </div>`;

    corpo.querySelector('[data-devolver]')?.addEventListener('click', () => abrirForm({
      titulo: 'Devolver saldo',
      campos: [
        { k: 'valor_cents', label: 'Quanto está devolvendo', type: 'dinheiro', req: true, valor: c.saldo },
        { k: 'data', label: 'Data', type: 'data', valor: hoje() },
        { k: 'obs', label: 'Observação', type: 'texto' }
      ],
      onSave: async (v) => {
        await store.insert('caixa', { ...v, membro_id: membroId, tipo: 'devolucao' });
        await store.log(`${nomeMembro(membroId)} devolveu ${fmtMoney(v.valor_cents)} da caixinha`, 'caixa');
        toast('Devolução registrada.'); pintar(); store.emit();
      }
    }));
    corpo.querySelector('[data-mais]')?.addEventListener('click', () => novoAdiantamento(membroId));
  };
  pintar();
  sheet({ titulo: nomeMembro(membroId), corpo });
}
