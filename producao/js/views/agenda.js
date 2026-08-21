// Agenda: diárias, reuniões, viagens e entregas — com confirmação de presença.
import { store, membros, nomeMembro } from '../store.js';
import { can, ehEquipe } from '../perms.js';
import { el, abrirForm, sheet, toast, escolher } from '../ui.js';
import { esc, fmtData, prazoTxt, prazoTag, diaSemana, diasAte, groupBy, ordenar } from '../utils.js';
import { tipoEvento } from './dash.js';

let aba = 'proximos';

const TIPOS = [
  { v: 'diaria', t: 'Diária de gravação' }, { v: 'reuniao', t: 'Reunião' },
  { v: 'viagem', t: 'Viagem / deslocamento' }, { v: 'entrega', t: 'Entrega' },
  { v: 'outro', t: 'Outro compromisso' }
];
const ST_ENTREGA = [
  { v: 'pendente', t: 'A fazer', tag: 'mut' }, { v: 'fazendo', t: 'Em produção', tag: 'info' },
  { v: 'aprovacao', t: 'Com o cliente', tag: 'warn' }, { v: 'entregue', t: 'Entregue', tag: 'ok' }
];
export const stEntrega = (v) => ST_ENTREGA.find((s) => s.v === v) || ST_ENTREGA[0];

export function render() {
  const u = store.user;
  const editar = can(u, 'agenda.edit');
  const soMinha = ehEquipe(u) && !can(u, 'agenda.ver');
  const node = el('<div></div>');

  let eventos = store.doProjeto('eventos');
  if (soMinha || aba === 'minha') eventos = eventos.filter((e) => (e.participantes || []).includes(u?.id));
  eventos = ordenar(eventos, (e) => `${e.data} ${e.hora_inicio || ''}`);

  const futuros = eventos.filter((e) => (diasAte(e.data) ?? 0) >= 0);
  const passados = eventos.filter((e) => (diasAte(e.data) ?? 0) < 0).reverse();
  const mostrar = aba === 'passados' ? passados : futuros;

  const entregas = ordenar(store.doProjeto('entregas'), (e) => e.prazo || '9999');

  const porDia = groupBy(mostrar, (e) => e.data || 'sem data');
  const agendaHTML = Object.keys(porDia).length ? Object.entries(porDia).map(([dia, its]) => `
    <div class="sec"><div class="sec-t">${dia === 'sem data' ? 'Sem data' :
      `${diaSemana(dia)} · ${fmtData(dia, { longo: true })}`}</div>
      <span class="small ${prazoTag(dia) === 'bad' ? 'muted' : 'muted'}">${dia === 'sem data' ? '' : prazoTxt(dia)}</span></div>
    <div class="card">${its.map((e) => linhaEvento(e, u)).join('')}</div>`).join('')
    : '<div class="empty">Nada por aqui.</div>';

  node.innerHTML = `
    <div class="chips">
      <button class="chip ${aba === 'proximos' ? 'on' : ''}" data-aba="proximos">Próximos</button>
      ${soMinha ? '' : `<button class="chip ${aba === 'minha' ? 'on' : ''}" data-aba="minha">Minha agenda</button>`}
      <button class="chip ${aba === 'passados' ? 'on' : ''}" data-aba="passados">Já passou</button>
      <button class="chip ${aba === 'entregas' ? 'on' : ''}" data-aba="entregas">Entregas</button>
    </div>
    ${aba === 'entregas' ? blocoEntregas(entregas) : agendaHTML}`;

  node.querySelectorAll('[data-aba]').forEach((b) => { b.onclick = () => { aba = b.dataset.aba; store.emit(); }; });
  node.querySelectorAll('[data-ev]').forEach((n) => { n.onclick = () => abrirEvento(store.get('eventos', n.dataset.ev)); });
  node.querySelectorAll('[data-entrega]').forEach((n) => {
    n.onclick = () => abrirEntrega(store.get('entregas', n.dataset.entrega), can(u, 'entregas.edit'));
  });

  return {
    titulo: 'Agenda',
    node,
    fab: editar ? {
      label: '+',
      onClick: async () => {
        const o = await escolher('Adicionar', [
          { v: 'ev', t: 'Compromisso', sub: 'Diária, reunião, viagem…' },
          { v: 'en', t: 'Entrega', sub: 'Corte, master, versão…' }
        ]);
        if (o === 'ev') novoEvento();
        if (o === 'en') novaEntrega();
      }
    } : null
  };
}

function linhaEvento(e, u) {
  const meu = (e.participantes || []).includes(u?.id);
  const conf = store.doProjeto('confirmacoes')
    .filter((c) => c.ref_id === e.id && c.tipo === 'presenca');
  const okN = conf.filter((c) => c.status === 'confirmado').length;
  return `<div class="row act" data-ev="${e.id}">
    <span class="tag ${e.tipo === 'diaria' ? 'ok' : e.tipo === 'viagem' ? 'warn' : 'info'}">
      ${e.hora_inicio || tipoEvento(e.tipo).slice(0, 3)}</span>
    <span class="g"><span class="t">${esc(e.titulo)}${meu ? ' ·<span class="small"> você</span>' : ''}</span>
      <span class="s">${esc([tipoEvento(e.tipo), e.local, conf.length ? `${okN}/${conf.length} confirmados` : '']
        .filter(Boolean).join(' · '))}</span></span>
  </div>`;
}

function blocoEntregas(entregas) {
  if (!entregas.length) return '<div class="empty">Nenhuma entrega cadastrada.</div>';
  return `<div class="card">${entregas.map((e) => {
    const s = stEntrega(e.status);
    return `<div class="row act" data-entrega="${e.id}">
      <span class="tag ${e.status === 'entregue' ? 'ok' : prazoTag(e.prazo)}">${esc(s.t)}</span>
      <span class="g"><span class="t">${esc(e.titulo)}</span>
        <span class="s">${e.prazo ? fmtData(e.prazo) + ' · ' + prazoTxt(e.prazo) : 'sem prazo'}
          ${e.responsavel_id ? ' · ' + esc(nomeMembro(e.responsavel_id)) : ''}</span></span>
    </div>`;
  }).join('')}</div>`;
}

/* ---------------- detalhe do compromisso ---------------- */
function abrirEvento(e) {
  if (!e) return;
  const u = store.user;
  const editar = can(u, 'agenda.edit');
  const corpo = el('<div></div>');

  const pintar = () => {
    const confs = store.doProjeto('confirmacoes').filter((c) => c.ref_id === e.id);
    const minha = confs.find((c) => c.membro_id === u?.id && c.tipo === 'presenca');
    corpo.innerHTML = `
      <div class="card tight">
        <div class="row"><span class="g"><span class="s">Quando</span>
          <span class="t">${esc(fmtData(e.data, { longo: true }))}${e.hora_inicio ? ' · ' + esc(e.hora_inicio) : ''}${e.hora_fim ? ' às ' + esc(e.hora_fim) : ''}</span></span></div>
        <div class="row"><span class="g"><span class="s">Onde</span>
          <span class="t" style="white-space:normal">${esc(e.local || '—')}</span></span></div>
        <div class="row"><span class="g"><span class="s">Tipo</span>
          <span class="t">${esc(tipoEvento(e.tipo))}</span></span></div>
        ${e.obs ? `<div class="row"><span class="g"><span class="s">Observações</span>
          <span class="t" style="white-space:normal;font-weight:400">${esc(e.obs)}</span></span></div>` : ''}
      </div>
      ${minha ? `<div class="card">
        <h2>Sua presença</h2>
        <div class="seg">
          <button data-conf="confirmado" class="${minha.status === 'confirmado' ? 'on' : ''}">Confirmo</button>
          <button data-conf="pendente" class="${minha.status === 'pendente' ? 'on' : ''}">Ainda não sei</button>
          <button data-conf="recusado" class="${minha.status === 'recusado' ? 'on' : ''}">Não posso</button>
        </div></div>` : ''}
      <div class="sec"><div class="sec-t">Equipe convocada</div></div>
      <div class="card">${confs.filter((c) => c.tipo === 'presenca').length
        ? confs.filter((c) => c.tipo === 'presenca').map((c) => `<div class="row">
            <span class="g"><span class="t">${esc(nomeMembro(c.membro_id))}</span>
              <span class="s">${esc(store.get('membros', c.membro_id)?.funcao || '')}</span></span>
            <span class="r"><span class="tag ${c.status === 'confirmado' ? 'ok' : c.status === 'recusado' ? 'bad' : 'warn'}">
              ${c.status === 'confirmado' ? 'confirmou' : c.status === 'recusado' ? 'não pode' : 'pendente'}</span></span>
          </div>`).join('')
        : '<div class="empty">Ninguém convocado.</div>'}</div>
      ${editar ? '<button class="btn wide gho" data-edit>Editar compromisso</button>' : ''}`;

    corpo.querySelectorAll('[data-conf]').forEach((b) => {
      b.onclick = async () => {
        await store.update('confirmacoes', minha.id, { status: b.dataset.conf, respondido_em: new Date().toISOString() });
        await store.log(`${u.nome} — presença em "${e.titulo}": ${b.dataset.conf}`, 'confirmacao');
        toast('Resposta registrada.'); pintar(); store.emit();
      };
    });
    const ed = corpo.querySelector('[data-edit]');
    if (ed) ed.onclick = () => { sh.close(); editarEvento(e); };
  };
  pintar();
  const sh = sheet({ titulo: e.titulo, corpo });
}

function camposEvento(e = {}) {
  return [
    { k: 'titulo', label: 'Título', type: 'texto', req: true, valor: e.titulo, ph: 'Diária 1 — escola Bradesco' },
    { k: 'tipo', label: 'Tipo', type: 'select', valor: e.tipo || 'diaria', opts: TIPOS },
    { k: 'data', label: 'Data', type: 'data', req: true, valor: e.data },
    { k: 'hora_inicio', label: 'Início', type: 'hora', valor: e.hora_inicio, meia: true },
    { k: 'hora_fim', label: 'Fim', type: 'hora', valor: e.hora_fim, meia: true },
    { k: 'local', label: 'Local', type: 'texto', valor: e.local, ph: 'Endereço ou ponto de encontro' },
    {
      k: 'participantes', label: 'Quem participa', type: 'multi', valor: e.participantes || [],
      opts: membros().map((m) => ({ v: m.id, t: `${m.nome}${m.funcao ? ' — ' + m.funcao : ''}` })),
      hint: 'Cada pessoa marcada recebe um pedido de confirmação de presença.'
    },
    { k: 'obs', label: 'Observações', type: 'area', valor: e.obs, ph: 'Ordem do dia, o que levar, contato no local…' }
  ];
}

async function sincronizarPresencas(ev) {
  const atuais = store.doProjeto('confirmacoes').filter((c) => c.ref_id === ev.id && c.tipo === 'presenca');
  const ids = ev.participantes || [];
  for (const id of ids) {
    if (!atuais.find((c) => c.membro_id === id)) {
      await store.insert('confirmacoes', {
        membro_id: id, tipo: 'presenca', ref_id: ev.id,
        titulo: `Presença — ${ev.titulo} (${fmtData(ev.data)})`, status: 'pendente', obs: ''
      });
    }
  }
  for (const c of atuais) if (!ids.includes(c.membro_id)) await store.remove('confirmacoes', c.id);
}

function novoEvento() {
  abrirForm({
    titulo: 'Novo compromisso',
    campos: camposEvento(),
    onSave: async (v) => {
      const ev = await store.insert('eventos', v);
      await sincronizarPresencas(ev);
      toast('Compromisso criado.');
    }
  });
}
function editarEvento(e) {
  abrirForm({
    titulo: 'Editar compromisso',
    campos: camposEvento(e),
    onSave: async (v) => { await store.update('eventos', e.id, v); await sincronizarPresencas({ ...e, ...v }); toast('Atualizado.'); },
    onDelete: async () => {
      for (const c of store.doProjeto('confirmacoes').filter((c) => c.ref_id === e.id)) await store.remove('confirmacoes', c.id);
      await store.remove('eventos', e.id); toast('Excluído.');
    }
  });
}

/* ---------------- entregas ---------------- */
function camposEntrega(e = {}) {
  return [
    { k: 'titulo', label: 'O que é a entrega', type: 'texto', req: true, valor: e.titulo, ph: 'Corte 1 · 60s' },
    { k: 'prazo', label: 'Prazo', type: 'data', valor: e.prazo },
    { k: 'status', label: 'Status', type: 'select', valor: e.status || 'pendente', opts: ST_ENTREGA.map((s) => ({ v: s.v, t: s.t })) },
    {
      k: 'responsavel_id', label: 'Responsável', type: 'select', valor: e.responsavel_id || '',
      opts: [{ v: '', t: '— ninguém —' }, ...membros().map((m) => ({ v: m.id, t: m.nome }))]
    },
    { k: 'formato', label: 'Formato / especificação', type: 'texto', valor: e.formato, ph: '1080p 16:9, legendado, .mp4' },
    { k: 'link', label: 'Link (Drive, Frame.io, WeTransfer…)', type: 'texto', valor: e.link },
    { k: 'obs', label: 'Observações', type: 'area', valor: e.obs }
  ];
}
function novaEntrega() {
  abrirForm({ titulo: 'Nova entrega', campos: camposEntrega(), onSave: async (v) => { await store.insert('entregas', v); toast('Entrega criada.'); } });
}
function abrirEntrega(e, editar) {
  if (!e) return;
  const s = stEntrega(e.status);
  const corpo = el(`<div>
    <div class="card tight">
      <div class="row"><span class="g"><span class="s">Status</span><span class="t">${esc(s.t)}</span></span></div>
      <div class="row"><span class="g"><span class="s">Prazo</span>
        <span class="t">${e.prazo ? esc(fmtData(e.prazo, { longo: true }) + ' · ' + prazoTxt(e.prazo)) : '—'}</span></span></div>
      <div class="row"><span class="g"><span class="s">Responsável</span>
        <span class="t">${esc(e.responsavel_id ? nomeMembro(e.responsavel_id) : '—')}</span></span></div>
      ${e.formato ? `<div class="row"><span class="g"><span class="s">Formato</span><span class="t">${esc(e.formato)}</span></span></div>` : ''}
      ${e.link ? `<div class="row"><span class="g"><span class="s">Link</span>
        <a class="t" href="${esc(e.link)}" target="_blank" rel="noopener">abrir</a></span></div>` : ''}
      ${e.obs ? `<div class="row"><span class="g"><span class="s">Observações</span>
        <span class="t" style="white-space:normal;font-weight:400">${esc(e.obs)}</span></span></div>` : ''}
    </div>
    ${editar ? '<button class="btn wide gho" data-edit>Editar entrega</button>' : ''}
  </div>`);
  const sh = sheet({ titulo: e.titulo, corpo });
  corpo.querySelector('[data-edit]')?.addEventListener('click', () => {
    sh.close();
    abrirForm({
      titulo: 'Editar entrega', campos: camposEntrega(e),
      onSave: async (v) => { await store.update('entregas', e.id, v); toast('Atualizada.'); },
      onDelete: async () => { await store.remove('entregas', e.id); toast('Excluída.'); }
    });
  });
}
