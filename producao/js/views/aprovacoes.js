// Rodadas de aprovação com o cliente. O contrato deste projeto dá 5 dias úteis
// para resposta e trata silêncio como aceite — o app conta esse prazo sozinho.
import { store, nomeMembro } from '../store.js';
import { can } from '../perms.js';
import { el, abrirForm, sheet, toast, confirmar } from '../ui.js';
import { esc, fmtData, prazoTxt, diasAte, hoje, somarDiasUteis, somarDias, ordenar } from '../utils.js';
import { ST_APROV } from '../calc.js';

const cfg = () => {
  const p = store.projeto || {};
  return {
    dias: Number(p.aceite_dias ?? 5),
    uteis: p.aceite_uteis !== false,
    max: Number(p.rodadas_max ?? 3)
  };
};
const calcPrazo = (envio) => {
  const c = cfg();
  return c.uteis ? somarDiasUteis(envio, c.dias) : somarDias(envio, c.dias);
};

export function render() {
  const u = store.user;
  const editar = can(u, 'entregas.edit');
  const node = el('<div></div>');
  const entregas = store.doProjeto('entregas');
  const todas = ordenar(store.doProjeto('aprovacoes'), (a) => a.enviado_em, -1);
  const abertas = todas.filter((a) => a.status === 'enviado');
  const vencidas = abertas.filter((a) => a.prazo && diasAte(a.prazo) < 0);
  const c = cfg();

  node.innerHTML = `
    <div class="grid">
      <div class="kpi"><div class="l">Com o cliente</div><div class="v">${abertas.length}</div>
        <div class="h">prazo de ${c.dias} dia(s) ${c.uteis ? 'úteis' : 'corridos'}</div></div>
      <div class="kpi ${vencidas.length ? 'ok' : ''}"><div class="l">Prazo vencido</div>
        <div class="v">${vencidas.length}</div><div class="h">silêncio = aceite</div></div>
    </div>
    ${vencidas.length ? `<div class="banner">${vencidas.length} rodada(s) passaram do prazo sem resposta.
      Pelo contrato isso vale como aceite — registre para valer.</div>` : ''}
    ${entregas.map((e) => {
      const rod = todas.filter((a) => a.entrega_id === e.id);
      if (!rod.length) return '';
      return `<div class="sec"><div class="sec-t">${esc(e.titulo)}</div>
          <span class="small muted">${rod.length}/${c.max} rodadas</span></div>
        <div class="card">${rod.map((a) => linha(a)).join('')}</div>`;
    }).join('')}
    ${!todas.length ? '<div class="empty">Nenhuma rodada enviada ainda.<br>Registre quando mandar um corte para o cliente.</div>' : ''}`;

  node.querySelectorAll('[data-ap]').forEach((n) => { n.onclick = () => abrir(store.get('aprovacoes', n.dataset.ap), editar); });

  return { titulo: 'Aprovações', node, fab: editar ? { label: '+', onClick: () => nova() } : null };
}

function linha(a) {
  const s = ST_APROV[a.status] || ST_APROV.enviado;
  const venceu = a.status === 'enviado' && a.prazo && diasAte(a.prazo) < 0;
  return `<div class="row act" data-ap="${a.id}">
    <span class="tag ${venceu ? 'ok' : s.tag}">${a.rodada}ª</span>
    <span class="g"><span class="t">${esc(venceu ? 'Prazo vencido — vale como aceite' : s.t)}</span>
      <span class="s">${esc([
        a.enviado_em ? 'enviado ' + fmtData(a.enviado_em) : '',
        a.prazo ? 'prazo ' + fmtData(a.prazo) + ' · ' + prazoTxt(a.prazo) : ''
      ].filter(Boolean).join(' · '))}</span></span>
  </div>`;
}

function nova() {
  const entregas = store.doProjeto('entregas');
  if (!entregas.length) return toast('Cadastre uma entrega primeiro.');
  const c = cfg();
  abrirForm({
    titulo: 'Nova rodada de aprovação',
    subtitulo: `O prazo de resposta é calculado em ${c.dias} dia(s) ${c.uteis ? 'úteis' : 'corridos'} a partir do envio.`,
    campos: [
      {
        k: 'entrega_id', label: 'Qual entrega', type: 'select', req: true,
        opts: entregas.map((e) => ({ v: e.id, t: e.titulo }))
      },
      { k: 'titulo', label: 'Versão enviada', type: 'texto', req: true, ph: 'Primeiro corte · v1' },
      { k: 'link', label: 'Link do material', type: 'texto', ph: 'Frame.io, Drive, Vimeo…' },
      { k: 'enviado_em', label: 'Enviado em', type: 'data', valor: hoje() },
      { k: 'obs', label: 'O que foi pedido ao cliente', type: 'area', ph: 'Feedback único e consolidado do gestor.' }
    ],
    onSave: async (v) => {
      const anteriores = store.doProjeto('aprovacoes').filter((a) => a.entrega_id === v.entrega_id);
      const rodada = anteriores.length + 1;
      if (rodada > c.max) {
        toast(`Atenção: esta é a ${rodada}ª rodada e o contrato prevê ${c.max}.`);
      }
      await store.insert('aprovacoes', {
        ...v, rodada, status: 'enviado', prazo: calcPrazo(v.enviado_em || hoje()), feedback: '', respondido_em: ''
      });
      await store.update('entregas', v.entrega_id, { status: 'aprovacao' });
      await store.log(`Rodada ${rodada} enviada ao cliente: ${v.titulo}`, 'aprovacao');
      toast('Rodada registrada.');
    }
  });
}

function abrir(a, editar) {
  if (!a) return;
  const entrega = store.get('entregas', a.entrega_id);
  const corpo = el('<div></div>');
  const pintar = () => {
    const s = ST_APROV[a.status] || ST_APROV.enviado;
    const venceu = a.status === 'enviado' && a.prazo && diasAte(a.prazo) < 0;
    corpo.innerHTML = `
      <div class="card tight">
        <div class="row"><span class="g"><span class="s">Entrega</span>
          <span class="t">${esc(entrega?.titulo || '—')}</span></span></div>
        <div class="row"><span class="g"><span class="s">Rodada</span><span class="t">${a.rodada}ª</span></span></div>
        <div class="row"><span class="g"><span class="s">Enviado em</span>
          <span class="t">${esc(fmtData(a.enviado_em, { longo: true }))}</span></span></div>
        <div class="row"><span class="g"><span class="s">Prazo de resposta</span>
          <span class="t">${esc(fmtData(a.prazo, { longo: true }))} · ${esc(prazoTxt(a.prazo))}</span></span></div>
        <div class="row"><span class="g"><span class="s">Status</span>
          <span class="t">${esc(venceu ? 'Prazo vencido sem resposta' : s.t)}</span></span></div>
        ${a.link ? `<div class="row"><span class="g"><span class="s">Material</span>
          <a class="t" href="${esc(a.link)}" target="_blank" rel="noopener">abrir</a></span></div>` : ''}
        ${a.obs ? `<div class="row"><span class="g"><span class="s">Enviado com</span>
          <span class="t" style="white-space:normal;font-weight:400">${esc(a.obs)}</span></span></div>` : ''}
        ${a.feedback ? `<div class="row"><span class="g"><span class="s">Resposta do cliente</span>
          <span class="t" style="white-space:normal;font-weight:400">${esc(a.feedback)}</span></span></div>` : ''}
      </div>
      ${venceu ? '<div class="banner">Passou do prazo sem objeção. Pelo contrato, isso equivale a aceite.</div>' : ''}
      ${editar && a.status === 'enviado' ? `<div class="stack">
        <button class="btn wide pri" data-r="aprovado">Cliente aprovou</button>
        <button class="btn wide" data-r="ajustes">Cliente pediu ajustes</button>
        ${venceu ? '<button class="btn wide gho" data-r="tacito">Registrar aceite tácito</button>' : ''}
      </div>` : ''}`;

    corpo.querySelectorAll('[data-r]').forEach((b) => {
      b.onclick = async () => {
        const r = b.dataset.r;
        if (r === 'ajustes') {
          abrirForm({
            titulo: 'Ajustes pedidos',
            campos: [{ k: 'feedback', label: 'O que o cliente pediu', type: 'area', req: true }],
            onSave: async (v) => {
              await store.update('aprovacoes', a.id, { status: 'ajustes', feedback: v.feedback, respondido_em: hoje() });
              await store.update('entregas', a.entrega_id, { status: 'fazendo' });
              Object.assign(a, { status: 'ajustes', feedback: v.feedback });
              await store.log(`Cliente pediu ajustes na rodada ${a.rodada}`, 'aprovacao');
              toast('Registrado.'); pintar(); store.emit();
            }
          });
          return;
        }
        if (r === 'tacito' && !await confirmar('Registrar aceite tácito por decurso de prazo?')) return;
        await store.update('aprovacoes', a.id, { status: r, respondido_em: hoje() });
        await store.update('entregas', a.entrega_id, { status: 'entregue' });
        a.status = r;
        await store.log(`Rodada ${a.rodada} ${r === 'tacito' ? 'aceita por decurso de prazo' : 'aprovada'}`, 'aprovacao');
        toast('Registrado.'); pintar(); store.emit();
      };
    });
  };
  pintar();
  sheet({ titulo: a.titulo, corpo });
}
