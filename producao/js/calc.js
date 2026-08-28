// Todo o cálculo de dinheiro do projeto num lugar só.
import { store } from './store.js';
import { soma, diasAte } from './utils.js';

export const ST_LANC = {
  pendente: { t: 'Aguardando aprovação', tag: 'warn' },
  aprovado: { t: 'Aprovado', tag: 'info' },
  pago: { t: 'Pago', tag: 'ok' },
  recebido: { t: 'Recebido', tag: 'ok' },
  rejeitado: { t: 'Rejeitado', tag: 'bad' }
};
export const ST_CONTA = {
  aberto: { t: 'Em aberto', tag: 'warn' },
  quitado: { t: 'Quitado', tag: 'ok' },
  cancelado: { t: 'Cancelado', tag: 'mut' }
};

export function financeiro() {
  const p = store.projeto || {};
  const orc = store.doProjeto('orcamento');
  const lan = store.doProjeto('lancamentos');
  const con = store.doProjeto('contas');
  const ctr = store.doProjeto('contratos');

  const saidas = lan.filter((l) => l.tipo === 'saida' && l.status !== 'rejeitado');
  const entradas = lan.filter((l) => l.tipo === 'entrada' && l.status !== 'rejeitado');

  const orcado = soma(orc, (o) => o.previsto_cents);
  const negociado = soma(orc, (o) => o.negociado_cents);
  const realizado = soma(saidas.filter((l) => l.status === 'pago' || l.status === 'aprovado'), (l) => l.valor_cents);
  const pendente = soma(saidas.filter((l) => l.status === 'pendente'), (l) => l.valor_cents);
  const pago = soma(saidas.filter((l) => l.status === 'pago'), (l) => l.valor_cents);
  const recebido = soma(entradas.filter((l) => l.status === 'recebido' || l.status === 'pago'), (l) => l.valor_cents);

  const aPagar = soma(con.filter((c) => c.tipo === 'pagar' && c.status === 'aberto'), (c) => c.valor_cents);
  const aReceber = soma(con.filter((c) => c.tipo === 'receber' && c.status === 'aberto'), (c) => c.valor_cents);

  const contratosCliente = ctr.filter((c) => c.tipo === 'cliente');
  const contratado = contratosCliente.length
    ? soma(contratosCliente, (c) => c.valor_total_cents)
    : (p.valor_contrato_cents || 0);

  const aliq = Number(p.imposto_aliquota || 0) / 100;
  const impostoPrevisto = Math.round(contratado * aliq);
  const impostoRealizado = Math.round(recebido * aliq);

  const custoPrevistoTotal = orcado + impostoPrevisto;
  const lucroPrevisto = contratado - custoPrevistoTotal;
  const lucroRealizado = recebido - realizado - impostoRealizado;
  const caixa = recebido - pago;
  const comprometido = realizado + pendente + aPagar;

  return {
    contratado, orcado, negociado, realizado, pendente, pago, recebido,
    aNegociar: orcado - negociado,
    aPagar, aReceber, impostoPrevisto, impostoRealizado,
    custoPrevistoTotal, lucroPrevisto, lucroRealizado, caixa, comprometido,
    saldoOrcamento: orcado - comprometido,
    estouro: orcado - contratado,
    margemPrevista: contratado ? Math.round((lucroPrevisto / contratado) * 100) : 0,
    aliquota: Number(p.imposto_aliquota || 0)
  };
}

/** Orçado x realizado por rubrica. */
export function porRubrica() {
  const orc = store.doProjeto('orcamento');
  const lan = store.doProjeto('lancamentos')
    .filter((l) => l.tipo === 'saida' && l.status !== 'rejeitado');
  const mapa = new Map();
  orc.forEach((o) => mapa.set(o.rubrica, {
    rubrica: o.rubrica, id: o.id, previsto: o.previsto_cents || 0,
    negociado: o.negociado_cents || 0, real: 0, pago: 0, pend: 0, obs: o.obs
  }));
  lan.forEach((l) => {
    const r = l.rubrica || 'Outros';
    if (!mapa.has(r)) mapa.set(r, { rubrica: r, id: null, previsto: 0, negociado: 0, real: 0, pago: 0, pend: 0 });
    const m = mapa.get(r);
    if (l.status === 'pendente') m.pend += l.valor_cents || 0;
    else {
      m.real += l.valor_cents || 0;
      if (l.status === 'pago') m.pago += l.valor_cents || 0;
    }
  });
  return [...mapa.values()].sort((a, b) => (b.previsto + b.real) - (a.previsto + a.real));
}

/** Contas vencendo/vencidas em até `dias`. */
export function contasCriticas(dias = 7) {
  return store.doProjeto('contas')
    .filter((c) => c.status === 'aberto')
    .map((c) => ({ ...c, dias: diasAte(c.venc) }))
    .filter((c) => c.dias !== null && c.dias <= dias)
    .sort((a, b) => a.dias - b.dias);
}

/* ---------------- caixinha (adiantamento de produção) ---------------- */
/** Saldo de quem está com dinheiro da produção na mão. */
export function saldoCaixa(membroId) {
  const mov = store.doProjeto('caixa').filter((m) => m.membro_id === membroId);
  const adiantado = soma(mov.filter((m) => m.tipo === 'adiantamento'), (m) => m.valor_cents);
  const devolvido = soma(mov.filter((m) => m.tipo === 'devolucao'), (m) => m.valor_cents);
  const gasto = soma(store.doProjeto('lancamentos').filter(
    (l) => l.membro_id === membroId && l.fonte === 'caixinha' && l.status !== 'rejeitado'
  ), (l) => l.valor_cents);
  const aprovado = soma(store.doProjeto('lancamentos').filter(
    (l) => l.membro_id === membroId && l.fonte === 'caixinha' && (l.status === 'aprovado' || l.status === 'pago')
  ), (l) => l.valor_cents);
  return {
    adiantado, devolvido, gasto, aprovado,
    aComprovar: adiantado - devolvido - gasto,
    saldo: adiantado - devolvido - gasto
  };
}

export function caixasAbertos() {
  const ids = [...new Set(store.doProjeto('caixa').map((m) => m.membro_id))];
  return ids.map((id) => ({ membro_id: id, ...saldoCaixa(id) }))
    .filter((c) => c.adiantado > 0)
    .sort((a, b) => b.saldo - a.saldo);
}

/* ---------------- aprovações do cliente ---------------- */
export const ST_APROV = {
  enviado: { t: 'Com o cliente', tag: 'warn' },
  aprovado: { t: 'Aprovado', tag: 'ok' },
  tacito: { t: 'Aceite tácito', tag: 'ok' },
  ajustes: { t: 'Pediu ajustes', tag: 'bad' }
};

/** Rodadas que passaram do prazo sem resposta — pelo contrato, viram aceite. */
export function aprovacoesVencidas() {
  return store.doProjeto('aprovacoes')
    .filter((a) => a.status === 'enviado' && a.prazo && diasAte(a.prazo) < 0);
}

/* ---------------- custo por diária e por cidade ---------------- */
const gastosValidos = () => store.doProjeto('lancamentos')
  .filter((l) => l.tipo === 'saida' && l.status !== 'rejeitado');

/** Quanto já foi gasto numa diária, contando o que está pendente à parte. */
export function custoDoEvento(eventoId) {
  const its = gastosValidos().filter((l) => l.evento_id === eventoId);
  return {
    itens: its,
    total: soma(its.filter((l) => l.status !== 'pendente'), (l) => l.valor_cents),
    pendente: soma(its.filter((l) => l.status === 'pendente'), (l) => l.valor_cents)
  };
}

/** Agrupa o gasto pelas cidades das diárias, para comparar bloco a bloco. */
export function custoPorCidade() {
  const eventos = store.doProjeto('eventos');
  const porEvento = {};
  gastosValidos().forEach((l) => {
    if (!l.evento_id) return;
    porEvento[l.evento_id] = (porEvento[l.evento_id] || 0) + (l.valor_cents || 0);
  });
  const mapa = new Map();
  eventos.forEach((e) => {
    const cidade = (e.local || '').trim() || 'Sem cidade';
    const m = mapa.get(cidade) || { cidade, gasto: 0, diarias: 0, eventos: 0 };
    m.eventos++;
    if (e.tipo === 'diaria') m.diarias++;
    m.gasto += porEvento[e.id] || 0;
    mapa.set(cidade, m);
  });
  const solto = soma(gastosValidos().filter((l) => !l.evento_id), (l) => l.valor_cents);
  return {
    cidades: [...mapa.values()].filter((c) => c.gasto || c.diarias).sort((a, b) => b.gasto - a.gasto),
    semDiaria: solto
  };
}
