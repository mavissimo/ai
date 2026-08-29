// Alertas do projeto + notificação do navegador (funciona com o app instalado
// na tela inicial). Sem servidor, o aviso dispara quando o app está aberto;
// no modo Supabase dá para plugar e-mail/push por Edge Function (ver README).
import { store } from './store.js';
import { can } from './perms.js';
import { diasAte, prazoTxt, fmtMoney } from './utils.js';
import { saldoCaixa, statusFonte } from './calc.js';

const VISTOS = 'unit0:alertas-vistos';

export function alertas() {
  const u = store.user;
  const out = [];
  const add = (o) => out.push(o);

  // Confirmações que a pessoa precisa dar (presença, passagem, hospedagem…)
  store.doProjeto('confirmacoes')
    .filter((c) => c.status === 'pendente' && (c.membro_id === u?.id || can(u, 'equipe.edit')))
    .forEach((c) => add({
      id: 'conf_' + c.id,
      urg: c.membro_id === u?.id ? 2 : 1,
      icone: c.membro_id === u?.id ? '🙋' : '⏳',
      texto: c.titulo,
      detalhe: c.membro_id === u?.id ? 'Confirme' : `${nome(c.membro_id)} ainda não confirmou`,
      rota: c.membro_id === u?.id ? '#/meu' : '#/equipe'
    }));

  // Contas vencendo
  if (can(u, 'contas.ver')) {
    store.doProjeto('contas').filter((c) => c.status === 'aberto').forEach((c) => {
      const d = diasAte(c.venc);
      if (d === null || d > 5) return;
      add({
        id: 'conta_' + c.id, urg: d < 0 ? 3 : 2, icone: c.tipo === 'pagar' ? '💸' : '💰',
        texto: `${c.tipo === 'pagar' ? 'Pagar' : 'Receber'} ${fmtMoney(c.valor_cents)}`,
        detalhe: `${c.descricao} · ${prazoTxt(c.venc)}`,
        rota: '#/contas'
      });
    });
  }

  // Gastos aguardando aprovação
  if (can(u, 'lanc.aprovar')) {
    const pend = store.doProjeto('lancamentos').filter((l) => l.status === 'pendente');
    if (pend.length) add({
      id: 'aprov_' + pend.length, urg: 2, icone: '🧾',
      texto: `${pend.length} lançamento(s) para aprovar`, detalhe: 'Gastos lançados pela equipe',
      rota: '#/financeiro'
    });
  }

  // Entregas próximas
  store.doProjeto('entregas').filter((e) => e.status !== 'entregue').forEach((e) => {
    const d = diasAte(e.prazo);
    if (d === null || d > 5) return;
    add({ id: 'entr_' + e.id, urg: d < 0 ? 3 : 2, icone: '📦', texto: e.titulo,
      detalhe: `Entrega · ${prazoTxt(e.prazo)}`, rota: '#/agenda' });
  });

  // Rodadas de aprovação que passaram do prazo (silêncio = aceite pelo contrato)
  if (can(u, 'entregas.edit')) {
    store.doProjeto('aprovacoes').filter((a) => a.status === 'enviado').forEach((a) => {
      const d = diasAte(a.prazo);
      if (d === null) return;
      if (d < 0) add({
        id: 'apv_' + a.id, urg: 3, icone: '⏰',
        texto: a.titulo, detalhe: 'Prazo de aceite venceu sem resposta',
        rota: '#/aprovacoes'
      });
      else if (d <= 2) add({
        id: 'apvp_' + a.id, urg: 1, icone: '👀',
        texto: a.titulo,
        detalhe: `Cliente tem ${d === 0 ? 'até hoje' : d + ' dia(s)'} para responder`,
        rota: '#/aprovacoes'
      });
    });
  }

  // Caixinha sem prestação de contas
  {
    const ids = [...new Set(store.doProjeto('caixa').map((m) => m.membro_id))];
    ids.forEach((id) => {
      if (!can(u, 'lanc.aprovar') && id !== u?.id) return;
      const c = saldoCaixa(id);
      if (c.saldo > 0) add({
        id: 'caixa_' + id, urg: id === u?.id ? 2 : 1, icone: '👛',
        texto: `${fmtMoney(c.saldo)} de caixinha em aberto`,
        detalhe: id === u?.id ? 'Comprove ou devolva' : `Com ${nome(id)}`,
        rota: '#/caixa'
      });
    });
  }

  // Tarefas: atrasadas, cobradas e as de hoje
  store.doProjeto('tarefas').forEach((t) => {
    const aberto = (t.status || (t.feito ? 'feita' : 'aberta')) !== 'feita';
    if (!aberto) return;
    const meu = t.responsavel_id === u?.id;
    if (!meu && !can(u, 'lanc.ver')) return;
    if (t.cobrado_em && meu) {
      add({ id: 'tcob_' + t.id, urg: 3, icone: '⚡', texto: t.titulo,
        detalhe: 'Cobraram você', rota: '#/tarefas' });
      return;
    }
    const d = diasAte(t.prazo);
    if (d === null) return;
    if (d < 0) add({
      id: 'tatr_' + t.id, urg: meu ? 3 : 2, icone: '⏱',
      texto: t.titulo,
      detalhe: meu ? `Atrasada · ${prazoTxt(t.prazo)}` : `${nome(t.responsavel_id)} · atrasada ${prazoTxt(t.prazo)}`,
      rota: '#/tarefas'
    });
    else if (d === 0 && meu) add({
      id: 'thoje_' + t.id, urg: 2, icone: '✅', texto: t.titulo, detalhe: 'Para hoje', rota: '#/tarefas'
    });
  });

  // Etapas travadas
  store.doProjeto('etapas').filter((e) => e.status === 'travado').forEach((e) => {
    add({ id: 'trav_' + e.id, urg: 2, icone: '⛔', texto: e.nome, detalhe: 'Etapa travada', rota: '#/etapas' });
  });

  // Compromissos de hoje/amanhã
  store.doProjeto('eventos').forEach((ev) => {
    const d = diasAte(ev.data);
    if (d !== 0 && d !== 1) return;
    const meu = (ev.participantes || []).includes(u?.id);
    if (!meu && !can(u, 'agenda.ver')) return;
    add({
      id: 'ev_' + ev.id, urg: d === 0 ? 3 : 1, icone: ev.tipo === 'viagem' ? '✈️' : ev.tipo === 'diaria' ? '🎬' : '📍',
      texto: ev.titulo,
      detalhe: `${d === 0 ? 'Hoje' : 'Amanhã'}${ev.hora_inicio ? ' às ' + ev.hora_inicio : ''}`
        + (ev.confirmado === false ? ' · data a confirmar' : ''),
      rota: '#/agenda'
    });
  });

  // Fontes de fora (planilha, agenda) que ninguém reconfere há tempo demais.
  if (can(u, 'projeto.edit')) {
    store.doProjeto('fontes').forEach((f) => {
      const st = statusFonte(f);
      if (!st.vencida) return;
      add({
        id: 'fonte_' + f.id, urg: 2, icone: '🔗', texto: f.titulo,
        detalhe: `Reconferir — ${st.txt}`, rota: '#/fontes'
      });
    });
  }

  return out.sort((a, b) => b.urg - a.urg);
}

const nome = (id) => store.get('membros', id)?.nome || 'Alguém';

export async function pedirPermissao() {
  if (!('Notification' in window)) return 'indisponivel';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

export function dispararNovos() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  let vistos = [];
  try { vistos = JSON.parse(localStorage.getItem(VISTOS) || '[]'); } catch { vistos = []; }
  const atuais = alertas().filter((a) => a.urg >= 2);
  const novos = atuais.filter((a) => !vistos.includes(a.id));
  novos.slice(0, 3).forEach((a) => {
    try {
      new Notification('Unit0 — ' + (store.projeto?.nome || 'Produção'), {
        body: a.detalhe ? `${a.texto} — ${a.detalhe}` : a.texto, icon: 'icon.svg', tag: a.id
      });
    } catch (e) { console.warn(e); }
  });
  localStorage.setItem(VISTOS, JSON.stringify(atuais.map((a) => a.id).slice(0, 200)));
}

export function iniciarMonitor() {
  dispararNovos();
  setInterval(dispararNovos, 15 * 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') dispararNovos();
  });
}
