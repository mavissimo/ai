// Painel: status do projeto, o que trava, o que vence, quanto sobra.
// No celular os blocos empilham; a partir de 900px eles se distribuem em
// colunas, como um quadro de produção.
import { store } from '../store.js';
import { can } from '../perms.js';
import { el, btnOlho, toast } from '../ui.js';
import { esc, fmtMoneyShort, pct, fmtData, prazoTxt, prazoTag, diasAte, valoresOcultos } from '../utils.js';
import { financeiro } from '../calc.js';
import { FASES, statusEtapa, faseSimbolo } from '../seed.js';
import { alertas, perguntas } from '../notify.js';

const PERIODOS = [
  { v: 1, t: '24h' }, { v: 3, t: '3 dias' }, { v: 7, t: 'Semana' }, { v: 30, t: 'Mês' }
];
let periodo = 7;

export function render() {
  const u = store.user;
  const p = store.projeto;
  const node = el('<div class="dash"></div>');
  if (!p) {
    node.innerHTML = '<div class="empty">Nenhum projeto ativo. Crie um em Ajustes.</div>';
    return { titulo: 'Painel', node };
  }

  const etapas = store.doProjeto('etapas');
  const feitas = etapas.filter((e) => e.status === 'feito').length;
  const f = financeiro();
  const al = alertas();
  const qs = perguntas();
  const verGrana = can(u, 'orcamento.ver');
  const verLucro = can(u, 'lucro.ver') || can(u, 'contratos.valores');

  /* ---- cabeçalho ---- */
  const cabecalho = `<section class="bloco largo topo">
    <div class="card tight" style="display:flex;align-items:center;gap:12px">
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.nome)}</div>
        <div class="small muted">${esc(p.cliente || 'sem cliente')} · ${esc(p.formato || 'audiovisual')}</div>
      </div>
      <span class="tag ${feitas === etapas.length && etapas.length ? 'ok' : 'info'}">${pct(feitas, etapas.length || 1)}%</span>
    </div>
  </section>`;

  /* ---- decisões rápidas: no máximo três, resolvidas no toque ---- */
  const perguntasHTML = !qs.length ? '' : `<section class="bloco largo perguntas">
    <div class="sec"><div class="sec-t">Resolve agora</div>
      <span class="small muted">${qs.length === 1 ? '1 pergunta' : qs.length + ' perguntas'}</span></div>
    <div class="grid3">${qs.map((q) => `
      <div class="pergunta" data-q="${q.id}">
        <div class="p-cab">
          <span class="ico ${q.urg >= 3 ? 'urg' : 'med'}">${q.icone}</span>
          <span class="p-txt">${esc(q.pergunta)}</span>
        </div>
        <div class="p-ctx">${esc(q.contexto || '')}</div>
        <div class="btns" style="margin-top:auto;padding-top:var(--s3)">
          <button class="btn sm pri" style="flex:1" data-sim>${esc(q.sim || 'Sim')}</button>
          <button class="btn sm gho" data-nao>${esc(q.nao || 'Agora não')}</button>
        </div>
      </div>`).join('')}</div>
  </section>`;

  /* ---- alertas ---- */
  const alertaHTML = !al.length ? '' : `<section class="bloco">
    <div class="sec"><div class="sec-t">Precisa de você</div>
      <span class="small muted">${al.length}</span></div>
    <div class="card lista">
      ${al.slice(0, 6).map((a) => `
        <a class="row act alto" href="${a.rota}" style="text-decoration:none;color:inherit">
          <span class="ico ${a.urg >= 3 ? 'urg' : a.urg === 2 ? 'med' : ''}">${a.icone || '•'}</span>
          <span class="g"><span class="t">${esc(a.texto)}</span>
            ${a.detalhe ? `<span class="s">${esc(a.detalhe)}</span>` : ''}</span>
        </a>`).join('')}
      ${al.length > 6 ? `<a class="row act" href="#/tarefas" style="text-decoration:none;color:inherit">
        <span class="g"><span class="t" style="color:var(--ac2)">Ver os outros ${al.length - 6}</span></span></a>` : ''}
    </div>
  </section>`;

  /* ---- fases ---- */
  const fasesHTML = `<section class="bloco">
    <div class="sec"><div class="sec-t">Etapas</div><a href="#/etapas" class="small">abrir</a></div>
    <div class="card">${FASES.map((fase) => {
      const lista = etapas.filter((e) => e.fase === fase.k);
      if (!lista.length) return '';
      const ok = lista.filter((e) => e.status === 'feito').length;
      const trav = lista.filter((e) => e.status === 'travado').length;
      const p100 = pct(ok, lista.length);
      return `<div style="margin-bottom:13px">
        <div style="display:flex;align-items:center;gap:9px">
          <span class="ico">${fase.simbolo}</span>
          <span style="flex:1;font-weight:650;font-size:14px">${esc(fase.nome)}</span>
          ${trav ? `<span class="tag bad">${trav} travado${trav > 1 ? 's' : ''}</span>` : ''}
          <span class="small muted mono">${ok}/${lista.length}</span>
        </div>
        <div class="bar"><i class="${p100 === 100 ? 'ok' : trav ? 'bad' : ''}" style="width:${p100}%"></i></div>
      </div>`;
    }).join('') || '<div class="empty">Sem etapas cadastradas.</div>'}</div>
  </section>`;

  /* ---- dinheiro ---- */
  let granaHTML = '';
  if (verGrana) {
    const usado = pct(f.comprometido, f.orcado || 1);
    granaHTML = `<section class="bloco largo dinheiro">
      <div class="sec"><div class="sec-t">Dinheiro</div>
        ${btnOlho(valoresOcultos())}<a href="#/financeiro" class="small" style="margin-left:8px">ver tudo</a></div>
      <div class="grid">
        ${verLucro ? `<div class="kpi"><div class="l">Contratado</div>
          <div class="v">${fmtMoneyShort(f.contratado)}</div>
          <div class="h">recebido ${fmtMoneyShort(f.recebido)}</div></div>` : ''}
        <div class="kpi ${f.estouro > 0 ? 'bad' : ''}"><div class="l">Orçado</div>
          <div class="v">${fmtMoneyShort(f.orcado)}</div>
          <div class="h">${usado}% comprometido</div></div>
        <div class="kpi"><div class="l">Já negociado</div><div class="v">${fmtMoneyShort(f.negociado)}</div>
          <div class="h">falta fechar ${fmtMoneyShort(f.aNegociar)}</div></div>
        <div class="kpi ${f.saldoOrcamento < 0 ? 'bad' : ''}"><div class="l">Ainda posso gastar</div>
          <div class="v">${fmtMoneyShort(f.saldoOrcamento)}</div>
          <div class="h">orçado − comprometido</div></div>
        ${verLucro ? `<div class="kpi ${f.economia < 0 ? 'bad' : 'ok'}"><div class="l">Economia negociada</div>
          <div class="v">${fmtMoneyShort(f.economia)}</div>
          <div class="h">orçado − fechado, no que já fechou</div></div>
        <div class="kpi ${f.lucroSeFechar < 0 ? 'bad' : 'ok'}"><div class="l">Lucro hoje</div>
          <div class="v">${fmtMoneyShort(f.lucroSeFechar)}</div>
          <div class="h">se o resto fechar no orçado</div></div>` : ''}
        ${can(u, 'contas.ver') ? `<div class="kpi"><div class="l">A pagar</div>
          <div class="v">${fmtMoneyShort(f.aPagar)}</div></div>
        <div class="kpi"><div class="l">A receber</div>
          <div class="v">${fmtMoneyShort(f.aReceber)}</div></div>` : ''}
      </div>
      <div class="bar" style="margin-top:2px"><i class="${usado > 100 ? 'bad' : usado > 85 ? 'warn' : 'ok'}"
        style="width:${Math.min(usado, 100)}%"></i></div>
    </section>`;
  }

  /* ---- próximos, com período escolhido ---- */
  const eventos = store.doProjeto('eventos')
    .map((e) => ({ ...e, d: diasAte(e.data) }))
    .filter((e) => e.d !== null && e.d >= 0 && e.d <= periodo)
    .sort((a, b) => a.d - b.d);
  const entregas = store.doProjeto('entregas')
    .map((e) => ({ ...e, d: diasAte(e.prazo) }))
    .filter((e) => e.status !== 'entregue' && e.d !== null && e.d >= 0 && e.d <= periodo)
    .sort((a, b) => a.d - b.d);

  const agendaHTML = `<section class="bloco">
    <div class="sec"><div class="sec-t">Próximos</div><a href="#/agenda" class="small">agenda</a></div>
    <div class="chips">${PERIODOS.map((x) => `<button class="chip ${periodo === x.v ? 'on' : ''}"
      data-periodo="${x.v}">${x.t}</button>`).join('')}</div>
    <div class="card">
      ${!eventos.length && !entregas.length
        ? `<div class="empty">Nada marcado ${periodo === 1 ? 'para as próximas 24 horas' : `nos próximos ${periodo} dias`}.</div>` : ''}
      ${eventos.map((e) => `<div class="row">
        <span class="ico ${e.d === 0 ? 'urg' : e.d <= 2 ? 'med' : ''}">${
          e.tipo === 'viagem' ? '✈️' : e.tipo === 'diaria' ? '🎬' : e.tipo === 'entrega' ? '📦' : '📍'}</span>
        <span class="g"><span class="t">${esc(e.titulo)}</span>
        <span class="s">${esc(fmtData(e.data, { ano: false }))} · ${esc(prazoTxt(e.data))}${e.local ? ' · ' + esc(e.local) : ''}</span></span>
      </div>`).join('')}
      ${entregas.map((e) => `<div class="row">
        <span class="ico ${prazoTag(e.prazo, false) === 'bad' ? 'urg' : 'med'}">📦</span>
        <span class="g"><span class="t">${esc(e.titulo)}</span>
        <span class="s">entrega · ${esc(fmtData(e.prazo))} · ${esc(prazoTxt(e.prazo))}</span></span>
      </div>`).join('')}
    </div>
  </section>`;

  /* ---- travado e próximas etapas ---- */
  const travadas = etapas.filter((e) => e.status === 'travado');
  const proximas = etapas.filter((e) => e.status === 'fazendo' || (e.status === 'nao' && e.prazo))
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0)).slice(0, 6);

  const travadoHTML = !travadas.length ? '' : `<section class="bloco">
    <div class="sec"><div class="sec-t">Travado</div></div>
    <div class="card">${travadas.map((e) => `<div class="row">
      <span class="ico urg">⛔</span>
      <span class="g"><span class="t">${esc(e.nome)}</span>
      <span class="s">${esc(e.obs || 'sem observação')}</span></span></div>`).join('')}</div>
  </section>`;

  const proximasHTML = `<section class="bloco">
    <div class="sec"><div class="sec-t">Próximas etapas</div></div>
    <div class="card">${proximas.length ? proximas.map((e) => `<div class="row">
        <span class="ico">${faseSimbolo(e.fase)}</span>
        <span class="g"><span class="t">${esc(e.nome)}</span>
        <span class="s">${esc(statusEtapa(e.status).t)}${e.prazo ? ' · ' + esc(fmtData(e.prazo)) + ' · ' + esc(prazoTxt(e.prazo)) : ''}</span></span>
      </div>`).join('') : '<div class="empty">Marque prazos nas etapas para aparecerem aqui.</div>'}</div>
  </section>`;

  node.innerHTML = cabecalho + perguntasHTML + alertaHTML + fasesHTML + granaHTML
    + agendaHTML + travadoHTML + proximasHTML;

  // Responder uma pergunta grava e some com o cartão, sem trocar de tela.
  node.querySelectorAll('[data-q]').forEach((n) => {
    const q = qs.find((x) => x.id === n.dataset.q);
    if (!q) return;
    const responder = async (fn) => {
      n.classList.add('indo');
      try { if (fn) await fn(); } catch (e) { console.error(e); toast('Não consegui salvar: ' + e.message); }
      setTimeout(() => store.emit(), 180);
    };
    n.querySelector('[data-sim]').onclick = () => responder(q.aoSim);
    n.querySelector('[data-nao]').onclick = () => responder(q.aoNao);
  });
  node.querySelectorAll('[data-periodo]').forEach((b) => {
    b.onclick = () => { periodo = Number(b.dataset.periodo); store.emit(); };
  });

  return { titulo: 'Painel', sub: p.nome, node };
}

export const tipoEvento = (t) => ({
  diaria: 'Diária de gravação', reuniao: 'Reunião', entrega: 'Entrega',
  viagem: 'Viagem', outro: 'Compromisso'
}[t] || 'Compromisso');
