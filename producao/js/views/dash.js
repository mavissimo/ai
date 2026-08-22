// Painel: status do projeto, o que trava, o que vence, quanto sobra.
import { store } from '../store.js';
import { can } from '../perms.js';
import { el, btnOlho } from '../ui.js';
import { esc, fmtMoneyShort, pct, fmtData, prazoTxt, prazoTag, diasAte, valoresOcultos } from '../utils.js';
import { financeiro } from '../calc.js';
import { FASES, statusEtapa } from '../seed.js';
import { alertas } from '../notify.js';

export function render() {
  const u = store.user;
  const p = store.projeto;
  const node = el('<div></div>');
  if (!p) {
    node.innerHTML = '<div class="empty">Nenhum projeto ativo. Crie um em Ajustes.</div>';
    return { titulo: 'Painel', node };
  }

  const etapas = store.doProjeto('etapas');
  const feitas = etapas.filter((e) => e.status === 'feito').length;
  const f = financeiro();
  const al = alertas();
  const verGrana = can(u, 'orcamento.ver');
  const verLucro = can(u, 'lucro.ver') || can(u, 'contratos.valores');

  /* alertas */
  const alertaHTML = !al.length ? '' : `
    <div class="card">
      <h2>Precisa de você (${al.length})</h2>
      <div class="stack">
        ${al.slice(0, 6).map((a) => `
          <a class="row act" href="${a.rota}" style="text-decoration:none;color:inherit">
            <span class="tag ${a.urg >= 3 ? 'bad' : a.urg === 2 ? 'warn' : 'info'}">${a.urg >= 3 ? '!' : '•'}</span>
            <span class="g"><span class="t" style="white-space:normal">${esc(a.texto)}</span></span>
          </a>`).join('')}
      </div>
    </div>`;

  /* fases */
  const fasesHTML = FASES.map((fase) => {
    const lista = etapas.filter((e) => e.fase === fase.k);
    if (!lista.length) return '';
    const ok = lista.filter((e) => e.status === 'feito').length;
    const trav = lista.filter((e) => e.status === 'travado').length;
    const p100 = pct(ok, lista.length);
    return `<div style="margin-bottom:13px">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="flex:1;font-weight:650;font-size:14px">${esc(fase.nome)}</span>
        ${trav ? `<span class="tag bad">${trav} travado${trav > 1 ? 's' : ''}</span>` : ''}
        <span class="small muted mono">${ok}/${lista.length}</span>
      </div>
      <div class="bar"><i class="${p100 === 100 ? 'ok' : trav ? 'bad' : ''}" style="width:${p100}%"></i></div>
    </div>`;
  }).join('');

  /* financeiro */
  let granaHTML = '';
  if (verGrana) {
    const usado = pct(f.comprometido, f.orcado || 1);
    granaHTML = `
      <div class="sec"><div class="sec-t">Dinheiro</div>
        ${btnOlho(valoresOcultos())}<a href="#/financeiro" class="small" style="margin-left:8px">ver tudo</a></div>
      <div class="grid">
        ${verLucro ? kpi('Contratado', fmtMoneyShort(f.contratado), '', '') : ''}
        <div class="kpi"><div class="l">Orçado</div><div class="v">${fmtMoneyShort(f.orcado)}</div>
          <div class="h">gasto ${fmtMoneyShort(f.realizado)} (${usado}%)</div></div>
        <div class="kpi ${f.saldoOrcamento < 0 ? 'bad' : ''}"><div class="l">Ainda posso gastar</div>
          <div class="v">${fmtMoneyShort(f.saldoOrcamento)}</div>
          <div class="h">${f.negociado ? fmtMoneyShort(f.negociado) + ' já fechado' : 'nada fechado'}</div></div>
        ${verLucro ? `<div class="kpi ${f.lucroPrevisto < 0 ? 'bad' : 'ok'}"><div class="l">Lucro previsto</div>
          <div class="v">${fmtMoneyShort(f.lucroPrevisto)}</div>
          <div class="h">margem ${f.margemPrevista}% · imposto ${fmtMoneyShort(f.impostoPrevisto)}</div></div>` : ''}
        ${can(u, 'contas.ver') ? `<div class="kpi"><div class="l">A pagar</div>
          <div class="v">${fmtMoneyShort(f.aPagar)}</div></div>
        <div class="kpi"><div class="l">A receber</div>
          <div class="v">${fmtMoneyShort(f.aReceber)}</div></div>` : ''}
      </div>
      <div class="bar" style="margin-top:2px"><i class="${usado > 100 ? 'bad' : usado > 85 ? 'warn' : 'ok'}"
        style="width:${Math.min(usado, 100)}%"></i></div>`;
  }

  /* próximos compromissos */
  const eventos = store.doProjeto('eventos')
    .map((e) => ({ ...e, d: diasAte(e.data) }))
    .filter((e) => e.d !== null && e.d >= 0 && e.d <= 14)
    .sort((a, b) => a.d - b.d).slice(0, 5);
  const entregas = store.doProjeto('entregas')
    .filter((e) => e.status !== 'entregue')
    .sort((a, b) => String(a.prazo).localeCompare(String(b.prazo))).slice(0, 4);

  const agendaHTML = `
    <div class="sec"><div class="sec-t">Próximos 14 dias</div><a href="#/agenda" class="small">agenda</a></div>
    <div class="card">
      ${!eventos.length && !entregas.length ? '<div class="empty">Nada marcado ainda.</div>' : ''}
      ${eventos.map((e) => `<div class="row">
        <span class="tag ${e.d === 0 ? 'bad' : e.d <= 2 ? 'warn' : 'mut'}">${fmtData(e.data, { ano: false })}</span>
        <span class="g"><span class="t">${esc(e.titulo)}</span>
        <span class="s">${esc(e.local || tipoEvento(e.tipo))}${e.hora_inicio ? ' · ' + e.hora_inicio : ''}</span></span>
      </div>`).join('')}
      ${entregas.map((e) => `<div class="row">
        <span class="tag ${prazoTag(e.prazo, false)}">entrega</span>
        <span class="g"><span class="t">${esc(e.titulo)}</span>
        <span class="s">${e.prazo ? fmtData(e.prazo) + ' · ' + prazoTxt(e.prazo) : 'sem prazo'}</span></span>
      </div>`).join('')}
    </div>`;

  /* dependências travando */
  const travadas = etapas.filter((e) => e.status === 'travado');
  const proximas = etapas.filter((e) => e.status === 'fazendo' || (e.status === 'nao' && e.prazo))
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0)).slice(0, 5);

  node.innerHTML = `
    <div class="card tight" style="display:flex;align-items:center;gap:12px">
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.nome)}</div>
        <div class="small muted">${esc(p.cliente || 'sem cliente')} · ${esc(p.formato || 'audiovisual')}</div>
      </div>
      <span class="tag ${feitas === etapas.length && etapas.length ? 'ok' : 'info'}">${pct(feitas, etapas.length || 1)}%</span>
    </div>
    ${alertaHTML}
    <div class="sec"><div class="sec-t">Etapas</div><a href="#/etapas" class="small">abrir</a></div>
    <div class="card">${fasesHTML || '<div class="empty">Sem etapas cadastradas.</div>'}</div>
    ${granaHTML}
    ${agendaHTML}
    ${travadas.length ? `<div class="sec"><div class="sec-t">Travado / dependências</div></div>
      <div class="card">${travadas.map((e) => `<div class="row">
        <span class="tag bad">!</span>
        <span class="g"><span class="t">${esc(e.nome)}</span>
        <span class="s">${esc(e.obs || 'sem observação')}</span></span></div>`).join('')}</div>` : ''}
    <div class="sec"><div class="sec-t">Próximas etapas</div></div>
    <div class="card">${proximas.length ? proximas.map((e) => `<div class="row">
        <span class="tag ${statusEtapa(e.status).tag}">${esc(statusEtapa(e.status).t)}</span>
        <span class="g"><span class="t">${esc(e.nome)}</span>
        <span class="s">${e.prazo ? fmtData(e.prazo) + ' · ' + prazoTxt(e.prazo) : 'sem prazo'}</span></span>
      </div>`).join('') : '<div class="empty">Marque prazos nas etapas para aparecerem aqui.</div>'}</div>`;

  return { titulo: 'Painel', sub: p.nome, node };
}

const kpi = (l, v, h, cls) => `<div class="kpi ${cls}"><div class="l">${esc(l)}</div>
  <div class="v">${esc(v)}</div>${h ? `<div class="h">${esc(h)}</div>` : ''}</div>`;

export const tipoEvento = (t) => ({
  diaria: 'Diária de gravação', reuniao: 'Reunião', entrega: 'Entrega',
  viagem: 'Viagem', outro: 'Compromisso'
}[t] || 'Compromisso');
