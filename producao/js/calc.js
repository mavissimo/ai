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
    contratado, orcado, realizado, pendente, pago, recebido,
    aPagar, aReceber, impostoPrevisto, impostoRealizado,
    custoPrevistoTotal, lucroPrevisto, lucroRealizado, caixa, comprometido,
    saldoOrcamento: orcado - realizado,
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
    rubrica: o.rubrica, id: o.id, previsto: o.previsto_cents || 0, real: 0, pend: 0, obs: o.obs
  }));
  lan.forEach((l) => {
    const r = l.rubrica || 'Outros';
    if (!mapa.has(r)) mapa.set(r, { rubrica: r, id: null, previsto: 0, real: 0, pend: 0 });
    const m = mapa.get(r);
    if (l.status === 'pendente') m.pend += l.valor_cents || 0;
    else m.real += l.valor_cents || 0;
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

/* ==========================================================================
   Retenções de imposto sobre pagamento de equipe e fornecedores.
   Os percentuais são editáveis por pessoa — os padrões abaixo são só um ponto
   de partida comum no audiovisual. Confirme com a sua contabilidade.
   ========================================================================== */
export const RET_PADRAO = {
  pf: { inss: 11, irrf: 0, iss: 0, pcc: 0 },
  pj: { inss: 0, irrf: 1.5, iss: 0, pcc: 4.65 }
};

export function retencoes(pessoa, brutoCents) {
  const tipo = pessoa?.tipo === 'pj' ? 'pj' : 'pf';
  const base = RET_PADRAO[tipo];
  const p = (k) => {
    const v = pessoa?.[`ret_${k}`];
    return v === null || v === undefined || v === '' ? base[k] : Number(v) || 0;
  };
  const bruto = Number(brutoCents) || 0;
  const inss = Math.round(bruto * p('inss') / 100);
  const irrf = Math.round(bruto * p('irrf') / 100);
  const iss = Math.round(bruto * p('iss') / 100);
  const pcc = Math.round(bruto * p('pcc') / 100);
  const total = inss + irrf + iss + pcc;
  return {
    tipo, inss, irrf, iss, pcc, total, liquido: bruto - total,
    percentuais: { inss: p('inss'), irrf: p('irrf'), iss: p('iss'), pcc: p('pcc') }
  };
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
