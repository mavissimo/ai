// Pedidos de nota fiscal: quem já foi cobrado, há quantos dias, e quem precisa
// ser cobrado de novo. O app não sabe se a pessoa abriu o e-mail — ninguém sabe
// sem rastrear. O que ele sabe é quando você mandou, e cobra de volta em 3 dias.
import { store, nomeMembro } from '../store.js';
import { can } from '../perms.js';
import { el, sheet, toast, confirmar } from '../ui.js';
import { esc, fmtMoney, fmtData, hoje, diasAte, ordenar, soma } from '../utils.js';
import { abrirConta } from './contas.js';
import { textoPedido, linkEmail, linkWhats } from '../nf.js';

/** Depois de três dias sem a nota, é hora de cobrar de novo. */
export const DIAS_FOLLOWUP = 3;

const diasDesde = (d) => (d ? Math.abs(diasAte(d) ?? 0) : null);

/* Prestador que a produção contrata e de quem se cobra nota: pessoa da equipe,
   cachê, pós, drone, reembolso. Passagem, hotel e locadora emitem a nota junto
   com a compra — não faz sentido "pedir" nem cobrar follow-up. */
const CATEGORIAS_PEDIDO = ['cachê', 'pós', 'reembolso'];
const seCobra = (c) => Boolean(c.membro_id) || CATEGORIAS_PEDIDO.includes(c.categoria);

export function estadoPedido(c) {
  if (c.nf_status !== 'a_receber') return null;
  if (!c.nf_pedido_em) {
    return seCobra(c) ? { k: 'a_pedir', t: 'Ainda não pedida', tag: 'mut', urg: 1 } : null;
  }
  const desde = diasDesde(c.nf_cobrado_em || c.nf_pedido_em);
  if (desde >= DIAS_FOLLOWUP) {
    return {
      k: 'cobrar', tag: 'bad', urg: 3,
      t: `Sem resposta há ${desde} dias`, desde
    };
  }
  return {
    k: 'esperando', tag: 'warn', urg: 2, desde,
    t: desde === 0 ? 'Pedida hoje' : `Pedida há ${desde} dia${desde > 1 ? 's' : ''}`
  };
}

/** As contas que estão esperando nota fiscal de alguém. */
export function pedidos() {
  return store.doProjeto('contas')
    .filter((c) => c.tipo === 'pagar' && c.status !== 'cancelado' && c.nf_status === 'a_receber')
    .map((c) => ({ conta: c, est: estadoPedido(c) }))
    .filter((x) => x.est)
    .sort((a, b) => b.est.urg - a.est.urg || (b.est.desde || 0) - (a.est.desde || 0));
}

export const paraCobrar = () => pedidos().filter((x) => x.est.k === 'cobrar');

export function render() {
  const u = store.user;
  const node = el('<div></div>');
  if (!can(u, 'contas.ver')) {
    node.innerHTML = '<div class="empty">Sem acesso aos pedidos de nota fiscal.</div>';
    return { titulo: 'Pedidos de NF', node };
  }
  const lista = pedidos();
  const cobrar = lista.filter((x) => x.est.k === 'cobrar');
  const pedir = lista.filter((x) => x.est.k === 'a_pedir');

  node.innerHTML = `
    <div class="grid">
      <div class="kpi ${cobrar.length ? 'bad' : 'ok'}"><div class="l">Para cobrar de novo</div>
        <div class="v">${cobrar.length}</div>
        <div class="h">sem resposta há ${DIAS_FOLLOWUP}+ dias</div></div>
      <div class="kpi"><div class="l">Esperando nota</div>
        <div class="v">${fmtMoneyCurto(soma(lista, (x) => x.conta.valor_cents))}</div>
        <div class="h">${lista.length} pedido(s)</div></div>
    </div>

    ${cobrar.length ? `<div class="sec"><div class="sec-t">Cobrar de novo</div>
        <span class="small muted">${cobrar.length}</span></div>
      <div class="card lista">${cobrar.map(linha).join('')}</div>` : ''}

    ${pedir.length ? `<div class="sec"><div class="sec-t">Ainda não pedidas</div>
        <span class="small muted">${pedir.length}</span></div>
      <div class="card lista">${pedir.map(linha).join('')}</div>` : ''}

    ${lista.filter((x) => x.est.k === 'esperando').length ? `<div class="sec">
        <div class="sec-t">No prazo</div></div>
      <div class="card lista">${lista.filter((x) => x.est.k === 'esperando').map(linha).join('')}</div>` : ''}

    ${!lista.length ? '<div class="empty">Nenhuma nota fiscal pendente.</div>' : ''}

    <div class="banner small">O app não tem como saber se a pessoa abriu o e-mail — ninguém tem, sem
      rastrear. O que ele guarda é <b>quando você mandou</b>, e depois de ${DIAS_FOLLOWUP} dias sem a
      nota chegar ele te lembra de cobrar.</div>`;

  node.querySelectorAll('[data-pedido]').forEach((n) => {
    n.onclick = () => abrirPedido(store.get('contas', n.dataset.pedido));
  });
  return { titulo: 'Pedidos de NF', node };
}

const fmtMoneyCurto = (v) => fmtMoney(v);

function linha({ conta: c, est }) {
  return `<div class="row act alto" data-pedido="${c.id}">
    <span class="ico ${est.k === 'cobrar' ? 'urg' : est.k === 'esperando' ? 'med' : ''}">🧾</span>
    <span class="g"><span class="t">${esc(c.contraparte || c.descricao)}</span>
      <span class="s">${esc(c.descricao)}</span>
      <span class="s">${esc(est.t)}${c.nf_cobrado_em ? ` · já cobrado em ${fmtData(c.nf_cobrado_em)}` : ''}</span></span>
    <span class="r"><span class="v">${fmtMoney(c.valor_cents)}</span>
      <div class="small"><span class="tag ${est.tag}">${est.k === 'cobrar' ? 'cobrar'
    : est.k === 'a_pedir' ? 'pedir' : 'no prazo'}</span></div></span>
  </div>`;
}

function abrirPedido(c) {
  if (!c) return;
  const corpo = el('<div></div>');
  let sh;
  const pintar = () => {
    const est = estadoPedido(c);
    const texto = textoPedido(c);
    const lembrete = `Oi! Passando para lembrar da nota fiscal de ${fmtMoney(c.valor_cents)} `
      + `referente a ${c.descricao}. Pedimos em ${fmtData(c.nf_pedido_em)} e ainda não chegou. `
      + 'Consegue mandar hoje? Obrigado!';
    corpo.innerHTML = `
      <div class="card tight">
        <div class="row"><span class="g"><span class="s">De quem</span>
          <span class="t">${esc(c.contraparte || nomeMembro(c.membro_id))}</span></span></div>
        <div class="row"><span class="g"><span class="s">Valor</span>
          <span class="t">${fmtMoney(c.valor_cents)}</span></span></div>
        <div class="row"><span class="g"><span class="s">Situação</span>
          <span class="t">${esc(est?.t || '—')}</span></span>
          <span class="r"><span class="tag ${est?.tag || 'mut'}">${esc(est?.k || '')}</span></span></div>
        ${c.nf_pedido_em ? `<div class="row"><span class="g"><span class="s">Pedida em</span>
          <span class="t">${esc(fmtData(c.nf_pedido_em, { longo: true }))}</span></span></div>` : ''}
        ${c.nf_cobrado_em ? `<div class="row"><span class="g"><span class="s">Cobrada de novo em</span>
          <span class="t">${esc(fmtData(c.nf_cobrado_em, { longo: true }))}</span></span></div>` : ''}
      </div>

      ${est?.k === 'cobrar' ? `<div class="banner warn small">
        Passou de ${DIAS_FOLLOWUP} dias. Mande o lembrete abaixo.</div>
        <pre class="pedido">${esc(lembrete)}</pre>
        <div class="btns" style="margin-top:10px">
          <a class="btn pri" style="flex:1" href="${esc(linkEmail(c))}">Cobrar por e-mail</a>
          <a class="btn gho" style="flex:1" href="${esc(linkWhats(c))}" target="_blank" rel="noopener">WhatsApp</a>
        </div>
        <button class="btn wide" style="margin-top:8px" data-cobrei>Cobrei agora</button>`
    : `<pre class="pedido">${esc(texto)}</pre>
        <div class="btns" style="margin-top:10px">
          <a class="btn gho" style="flex:1" href="${esc(linkEmail(c))}">E-mail</a>
          <a class="btn gho" style="flex:1" href="${esc(linkWhats(c))}" target="_blank" rel="noopener">WhatsApp</a>
        </div>
        ${!c.nf_pedido_em ? '<button class="btn wide pri" style="margin-top:8px" data-pedi>Marquei como pedida</button>' : ''}`}

      <button class="btn wide" style="margin-top:8px" data-chegou>A nota chegou</button>
      <button class="btn wide gho" style="margin-top:8px" data-conta>Abrir a conta</button>`;

    corpo.querySelector('[data-pedi]')?.addEventListener('click', async () => {
      await store.update('contas', c.id, { nf_pedido_em: hoje() });
      c.nf_pedido_em = hoje();
      await store.log(`Pedido de NF enviado: ${c.descricao}`, 'conta');
      toast(`Registrado. Se não chegar em ${DIAS_FOLLOWUP} dias, eu te lembro.`);
      pintar(); store.emit();
    });
    corpo.querySelector('[data-cobrei]')?.addEventListener('click', async () => {
      await store.update('contas', c.id, { nf_cobrado_em: hoje() });
      c.nf_cobrado_em = hoje();
      await store.log(`Cobrança de NF: ${c.descricao}`, 'conta');
      toast('Cobrança registrada. Novo lembrete em 3 dias.');
      pintar(); store.emit();
    });
    corpo.querySelector('[data-chegou]')?.addEventListener('click', async () => {
      const ok = await confirmar('Marcar a nota como recebida? Depois dá para anexar o PDF na conta.',
        { ok: 'Chegou' });
      if (!ok) return;
      await store.update('contas', c.id, { nf_status: 'recebida' });
      await store.log(`NF recebida: ${c.descricao}`, 'conta');
      sh.close(); toast('Nota recebida.'); store.emit();
    });
    corpo.querySelector('[data-conta]').onclick = () => { sh.close(); abrirConta(c, true); };
  };
  pintar();
  sh = sheet({ titulo: 'Pedido de nota fiscal', corpo });
}
