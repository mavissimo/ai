// O que sai: contas a pagar organizadas por vencimento e por pessoa.
// Cada pessoa tem um plano próprio — na Têmpora o combinado é caso a caso —
// então o plano é uma lista de parcelas com data e valor livres.
import { store, membros, nomeMembro } from '../store.js';
import { can } from '../perms.js';
import { el, abrirForm, sheet, toast, btnOlho } from '../ui.js';
import {
  esc, fmtMoney, fmtMoneyShort, fmtData, prazoTxt, prazoTag, hoje,
  ordenar, soma, diasAte, iniciais, valoresOcultos
} from '../utils.js';
import { ST_CONTA } from '../calc.js';
import { abrirConta } from './contas.js';

let aba = 'aberto';

const aPagar = () => store.doProjeto('contas').filter((c) => c.tipo === 'pagar');

/** Parcelas de uma pessoa, com o que já saiu e o que falta. */
export function planoDe(membroId) {
  const itens = ordenar(aPagar().filter((c) => c.membro_id === membroId), (c) => c.venc || '9999');
  const total = soma(itens, (c) => c.valor_cents);
  const pago = soma(itens.filter((c) => c.status === 'quitado'), (c) => c.valor_cents);
  return { itens, total, pago, falta: total - pago };
}

/** Faixa de vencimento, para agrupar a lista. */
function faixa(c) {
  const d = diasAte(c.venc);
  if (d === null) return { k: '4-sem', t: 'Sem data marcada' };
  if (d < 0) return { k: '0-vencido', t: 'Vencido' };
  if (d <= 7) return { k: '1-semana', t: 'Esta semana' };
  if (d <= 14) return { k: '2-quinze', t: 'Próxima semana' };
  return { k: '3-depois', t: 'Mais para frente' };
}

export function render() {
  const u = store.user;
  const node = el('<div></div>');
  if (!can(u, 'contas.ver')) {
    node.innerHTML = '<div class="empty">Sem acesso aos pagamentos.</div>';
    return { titulo: 'Pagamentos', node };
  }
  const editar = can(u, 'contas.edit');
  const todas = aPagar();
  const abertas = todas.filter((c) => c.status === 'aberto');
  const vencidas = abertas.filter((c) => (diasAte(c.venc) ?? 99) < 0);
  const semana = abertas.filter((c) => { const d = diasAte(c.venc); return d !== null && d >= 0 && d <= 7; });
  const semData = abertas.filter((c) => !c.venc);

  node.innerHTML = `
    <div class="sec" style="margin-top:4px"><div class="sec-t">O que sai</div>${btnOlho(valoresOcultos())}</div>
    <div class="grid3">
      <div class="kpi ${vencidas.length ? 'bad' : ''}"><div class="l">Vencido</div>
        <div class="v">${fmtMoneyShort(soma(vencidas, (c) => c.valor_cents))}</div>
        <div class="h">${vencidas.length} conta(s)</div></div>
      <div class="kpi ${semana.length ? 'warn' : ''}"><div class="l">Esta semana</div>
        <div class="v">${fmtMoneyShort(soma(semana, (c) => c.valor_cents))}</div>
        <div class="h">${semana.length} conta(s)</div></div>
      <div class="kpi"><div class="l">Total em aberto</div>
        <div class="v">${fmtMoneyShort(soma(abertas, (c) => c.valor_cents))}</div>
        <div class="h">${abertas.length} conta(s)</div></div>
    </div>
    ${semData.length ? `<div class="banner warn small">${semData.length} pagamento(s) ainda sem data.
      Enquanto não tiverem vencimento, eles não entram no que vence esta semana.</div>` : ''}
    <div class="chips">
      <button class="chip ${aba === 'aberto' ? 'on' : ''}" data-p="aberto">Em aberto</button>
      <button class="chip ${aba === 'pessoa' ? 'on' : ''}" data-p="pessoa">Por pessoa</button>
      <button class="chip ${aba === 'pagos' ? 'on' : ''}" data-p="pagos">Já pagos</button>
    </div>
    ${aba === 'pessoa' ? blocoPessoas() : blocoLista(aba === 'pagos' ? todas.filter((c) => c.status === 'quitado') : abertas)}`;

  node.querySelectorAll('[data-p]').forEach((b) => { b.onclick = () => { aba = b.dataset.p; store.emit(); }; });
  node.querySelectorAll('[data-conta]').forEach((n) => {
    n.onclick = () => abrirConta(store.get('contas', n.dataset.conta), editar);
  });
  node.querySelectorAll('[data-plano]').forEach((n) => { n.onclick = () => abrirPlano(n.dataset.plano, editar); });

  return {
    titulo: 'Pagamentos',
    node,
    fab: editar ? { label: '+', onClick: () => novaParcela() } : null
  };
}

function linha(c) {
  const st = ST_CONTA[c.status] || ST_CONTA.aberto;
  return `<div class="row act" data-conta="${c.id}">
    <span class="tag ${c.status === 'quitado' ? 'ok' : prazoTag(c.venc)}">${c.venc ? esc(fmtData(c.venc, { ano: false })) : '—'}</span>
    <span class="g"><span class="t">${esc(c.contraparte || c.descricao)}</span>
      <span class="s">${esc([c.descricao, c.categoria, c.status === 'aberto' && c.venc ? prazoTxt(c.venc) : st.t]
        .filter(Boolean).join(' · '))}</span></span>
    <span class="r"><span class="v">${fmtMoney(c.valor_cents)}</span></span>
  </div>`;
}

function blocoLista(lista) {
  if (!lista.length) return '<div class="empty">Nada aqui.</div>';
  const grupos = {};
  lista.forEach((c) => {
    const f = faixa(c);
    (grupos[f.k] = grupos[f.k] || { t: f.t, itens: [] }).itens.push(c);
  });
  return Object.keys(grupos).sort().map((k) => {
    const g = grupos[k];
    const its = ordenar(g.itens, (c) => c.venc || '9999');
    return `<div class="sec"><div class="sec-t">${esc(g.t)}</div>
        <span class="small muted mono">${fmtMoney(soma(its, (c) => c.valor_cents))}</span></div>
      <div class="card">${its.map(linha).join('')}</div>`;
  }).join('');
}

function blocoPessoas() {
  const pessoas = membros().filter((m) => aPagar().some((c) => c.membro_id === m.id));
  const outros = aPagar().filter((c) => !c.membro_id);
  if (!pessoas.length && !outros.length) return '<div class="empty">Nenhum pagamento cadastrado.</div>';
  return `<div class="card">${pessoas.map((m) => {
    const p = planoDe(m.id);
    return `<div class="row act" data-plano="${m.id}">
      <span class="avatar">${esc(iniciais(m.nome))}</span>
      <span class="g"><span class="t">${esc(m.nome)}</span>
        <span class="s">${p.itens.length} parcela(s) · pago ${fmtMoney(p.pago)}</span></span>
      <span class="r"><span class="v">${fmtMoney(p.falta)}</span>
        <div class="small muted">a pagar</div></span>
    </div>`;
  }).join('')}</div>
  ${outros.length ? `<div class="sec"><div class="sec-t">Fornecedores e outros</div></div>
    <div class="card">${ordenar(outros, (c) => c.venc || '9999').map(linha).join('')}</div>` : ''}`;
}

/* ---------------- plano de uma pessoa ---------------- */
export function abrirPlano(membroId, editar) {
  const m = store.get('membros', membroId);
  if (!m) return;
  const corpo = el('<div></div>');
  const pintar = () => {
    const p = planoDe(membroId);
    const bruto = (m.cache_cents || 0) * (m.diarias || 0);
    const combinado = bruto + (m.perdiem_cents || 0);
    corpo.innerHTML = `
      <div class="grid">
        <div class="kpi"><div class="l">Combinado</div><div class="v">${fmtMoneyShort(combinado)}</div>
          <div class="h">cachê e per diem</div></div>
        <div class="kpi ${p.falta > 0 ? 'warn' : 'ok'}"><div class="l">Falta pagar</div>
          <div class="v">${fmtMoneyShort(p.falta)}</div>
          <div class="h">de ${fmtMoneyShort(p.total)} em parcelas</div></div>
      </div>
      ${combinado && p.total !== combinado ? `<div class="banner warn small">
        As parcelas somam ${fmtMoney(p.total)} e o combinado com ${esc(m.nome.split(' ')[0])} é
        ${fmtMoney(combinado)}. Diferença de ${fmtMoney(Math.abs(combinado - p.total))}.</div>` : ''}
      <div class="card tight">
        <div class="row"><span class="g"><span class="s">Como recebe</span>
          <span class="t">${esc(m.chave_pix ? 'Pix · ' + m.chave_pix : (m.banco ? m.banco : 'não informado'))}</span></span></div>
        ${m.banco ? `<div class="row"><span class="g"><span class="s">Conta</span>
          <span class="t">${esc([m.banco, m.agencia && 'ag. ' + m.agencia, m.conta_banco && 'c/c ' + m.conta_banco]
            .filter(Boolean).join(' · '))}</span></span></div>` : ''}
        ${m.doc ? `<div class="row"><span class="g"><span class="s">CPF / CNPJ</span><span class="t">${esc(m.doc)}</span></span></div>` : ''}
      </div>
      <div class="sec"><div class="sec-t">Parcelas</div>
        ${editar ? '<button class="btn sm gho" data-nova>+ parcela</button>' : ''}</div>
      <div class="card">${p.itens.length ? p.itens.map(linha).join('')
        : '<div class="empty">Nenhuma parcela combinada ainda.</div>'}</div>
      ${editar && !p.itens.length && combinado ? '<button class="btn wide gho" data-sugerir>Criar parcela única com o valor combinado</button>' : ''}`;

    corpo.querySelectorAll('[data-conta]').forEach((n) => {
      n.onclick = () => { sh.close(); abrirConta(store.get('contas', n.dataset.conta), editar); };
    });
    corpo.querySelector('[data-nova]')?.addEventListener('click', () => novaParcela(membroId, pintar));
    corpo.querySelector('[data-sugerir]')?.addEventListener('click', async () => {
      await store.insert('contas', {
        tipo: 'pagar', descricao: `Pagamento — ${m.nome}`, contraparte: m.nome,
        valor_cents: combinado, venc: '', status: 'aberto', membro_id: membroId,
        categoria: 'cachê', nf_status: m.tipo === 'pj' ? 'a_receber' : 'na'
      });
      toast('Parcela criada. Ajuste a data.'); pintar(); store.emit();
    });
  };
  pintar();
  const sh = sheet({ titulo: `Pagamento — ${m.nome}`, corpo });
}

export function novaParcela(membroId, aoSalvar) {
  const m = membroId ? store.get('membros', membroId) : null;
  abrirForm({
    titulo: 'Nova parcela a pagar',
    subtitulo: m ? `Combinado com ${m.nome}. Data e valor livres.` : null,
    campos: [
      {
        k: 'membro_id', label: 'Para quem', type: 'select', valor: membroId || '',
        opts: [{ v: '', t: '— fornecedor, escreva abaixo —' }, ...membros().map((x) => ({ v: x.id, t: x.nome }))]
      },
      { k: 'contraparte', label: 'Nome no pagamento', type: 'texto', valor: m?.nome || '' },
      { k: 'descricao', label: 'Do que se trata', type: 'texto', req: true, ph: '1ª de 2 — cachê' },
      { k: 'valor_cents', label: 'Valor', type: 'dinheiro', req: true },
      { k: 'venc', label: 'Quando paga', type: 'data' },
      { k: 'categoria', label: 'Categoria', type: 'texto', valor: m ? 'cachê' : '', ph: 'cachê, per diem, fornecedor' },
      { k: 'obs', label: 'Observações', type: 'area' }
    ],
    onSave: async (v) => {
      const p = v.membro_id ? store.get('membros', v.membro_id) : null;
      await store.insert('contas', {
        ...v, tipo: 'pagar', status: 'aberto',
        contraparte: v.contraparte || p?.nome || '',
        nf_status: p?.tipo === 'pj' ? 'a_receber' : 'na'
      });
      toast('Parcela criada.');
      aoSalvar && aoSalvar();
    }
  });
}
