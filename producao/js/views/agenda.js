// Agenda: diárias, viagens, reuniões e entregas — com ordem do dia completa,
// horário de chamada por pessoa e confirmação de presença.
import { store, membros, nomeMembro } from '../store.js';
import { can, ehEquipe } from '../perms.js';
import { el, abrirForm, sheet, toast, escolher } from '../ui.js';
import { esc, fmtData, prazoTxt, prazoTag, diaSemana, diasAte, groupBy, ordenar } from '../utils.js';
import { tipoEvento } from './dash.js';
import { custoDoEvento } from '../calc.js';
import { fmtMoney } from '../utils.js';
import { abrirLancamento, camposLancamento, salvarLancamento, lerNotaNoForm, conferirComprovante } from './financeiro.js';
import { podeVerTudo } from '../perms.js';

let aba = 'proximos';
let modo = 'detalhe';   // detalhe = cartão completo, lista = linha compacta

const TIPOS = [
  { v: 'diaria', t: 'Diária de gravação' }, { v: 'viagem', t: 'Viagem / deslocamento' },
  { v: 'reuniao', t: 'Reunião' }, { v: 'entrega', t: 'Entrega' },
  { v: 'outro', t: 'Outro compromisso' }
];
const ST_ENTREGA = [
  { v: 'pendente', t: 'A fazer', tag: 'mut' }, { v: 'fazendo', t: 'Em produção', tag: 'info' },
  { v: 'aprovacao', t: 'Com o cliente', tag: 'warn' }, { v: 'entregue', t: 'Entregue', tag: 'ok' }
];
export const stEntrega = (v) => ST_ENTREGA.find((s) => s.v === v) || ST_ENTREGA[0];

const mapaURL = (txt) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(txt);

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
    <div class="sec"><div class="sec-t">${dia === 'sem data' ? 'Sem data'
      : `${diaSemana(dia)} · ${fmtData(dia, { longo: true })}`}</div>
      <span class="small muted">${dia === 'sem data' ? '' : prazoTxt(dia)}</span></div>
    ${modo === 'lista' ? `<div class="card">${its.map((e) => linhaEvento(e, u)).join('')}</div>`
      : its.map((e) => cartaoEvento(e, u)).join('')}`).join('')
    : '<div class="empty">Nada por aqui.</div>';

  node.innerHTML = `
    <div class="chips">
      <button class="chip ${aba === 'proximos' ? 'on' : ''}" data-aba="proximos">Próximos</button>
      ${soMinha ? '' : `<button class="chip ${aba === 'minha' ? 'on' : ''}" data-aba="minha">Minha agenda</button>`}
      <button class="chip ${aba === 'passados' ? 'on' : ''}" data-aba="passados">Já passou</button>
      <button class="chip ${aba === 'entregas' ? 'on' : ''}" data-aba="entregas">Entregas</button>
    </div>
    ${aba === 'entregas' ? '' : `<div class="seg" style="margin-bottom:12px">
      <button data-modo="detalhe" class="${modo === 'detalhe' ? 'on' : ''}">Detalhes</button>
      <button data-modo="lista" class="${modo === 'lista' ? 'on' : ''}">Lista</button>
    </div>`}
    ${aba === 'entregas' ? blocoEntregas(entregas) : agendaHTML}`;

  node.querySelectorAll('[data-aba]').forEach((b) => { b.onclick = () => { aba = b.dataset.aba; store.emit(); }; });
  node.querySelectorAll('[data-modo]').forEach((b) => { b.onclick = () => { modo = b.dataset.modo; store.emit(); }; });
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
          { v: 'ev', t: 'Compromisso', sub: 'Diária, viagem, reunião…' },
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
  const minhaChamada = (e.chamadas || []).find((c) => c.membro_id === u?.id)?.hora;
  const conf = store.doProjeto('confirmacoes').filter((c) => c.ref_id === e.id && c.tipo === 'presenca');
  const okN = conf.filter((c) => c.status === 'confirmado').length;
  return `<div class="row act" data-ev="${e.id}">
    <span class="tag ${e.tipo === 'diaria' ? 'ok' : e.tipo === 'viagem' ? 'warn' : e.tipo === 'entrega' ? 'bad' : 'info'}">
      ${esc(minhaChamada || e.hora_inicio || tipoEvento(e.tipo).slice(0, 3))}</span>
    <span class="g"><span class="t">${esc(e.titulo)}${meu ? ' · <span class="small">você</span>' : ''}${
      e.confirmado === false ? ' <span class="tag warn">a confirmar</span>' : ''}</span>
      <span class="s">${esc([tipoEvento(e.tipo), e.local, conf.length ? `${okN}/${conf.length} confirmados` : '']
        .filter(Boolean).join(' · '))}</span></span>
  </div>`;
}

/** Cartão com o que a pessoa precisa saber sem abrir: hora, chamada, local, equipe. */
function cartaoEvento(e, u) {
  const meu = (e.participantes || []).includes(u?.id);
  const minha = (e.chamadas || []).find((c) => c.membro_id === u?.id);
  const confs = store.doProjeto('confirmacoes').filter((c) => c.ref_id === e.id && c.tipo === 'presenca');
  const ok = confs.filter((c) => c.status === 'confirmado').length;
  const lugar = e.endereco || e.local;
  const simbolo = e.tipo === 'viagem' ? '✈️' : e.tipo === 'diaria' ? '🎬'
    : e.tipo === 'entrega' ? '📦' : e.tipo === 'reuniao' ? '💬' : '📍';
  return `<div class="card act" data-ev="${e.id}" style="cursor:pointer">
    <div style="display:flex;gap:11px;align-items:flex-start">
      <span class="ico ${diasAte(e.data) === 0 ? 'urg' : ''}">${simbolo}</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:650;font-size:15px">${esc(e.titulo)}${
          e.confirmado === false ? ' <span class="tag warn">data a confirmar</span>' : ''}</div>
        <div class="small muted" style="margin-top:2px">${esc([tipoEvento(e.tipo),
          e.hora_inicio ? e.hora_inicio + (e.hora_fim ? '–' + e.hora_fim : '') : ''].filter(Boolean).join(' · '))}</div>
      </div>
      ${meu ? '<span class="tag info">você</span>' : ''}
    </div>
    ${minha?.hora ? `<div class="row" style="border:0;padding:10px 0 0">
      <span class="g"><span class="s">Sua chamada</span>
        <span class="t" style="color:var(--ac);font-size:17px">${esc(minha.hora)}${minha.obs ? ` <span class="small muted">${esc(minha.obs)}</span>` : ''}</span></span></div>` : ''}
    <div class="hr"></div>
    <div class="small" style="display:flex;flex-wrap:wrap;gap:6px 14px;color:var(--tx2)">
      ${lugar ? `<span>📍 ${esc(lugar)}</span>` : ''}
      ${confs.length ? `<span>👥 ${ok}/${confs.length} confirmados</span>` : ''}
      ${e.contato_nome ? `<span>☎️ ${esc(e.contato_nome)}</span>` : ''}
      ${e.roteiro_dia ? '<span>🗒 tem roteiro do dia</span>' : ''}
    </div>
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
          ${e.formato ? ' · ' + esc(e.formato) : ''}</span></span>
    </div>`;
  }).join('')}</div>`;
}

/** O que esta diária consumiu, para comparar cidade a cidade depois. */
function blocoCusto(e, u) {
  const c = custoDoEvento(e.id);
  return `<div class="sec"><div class="sec-t">Custo desta diária</div>
      <button class="btn sm gho" data-gasto-diaria>+ gasto</button></div>
    <div class="card">
      <div class="row"><span class="g"><span class="t">Gasto até agora</span>
        <span class="s">${c.itens.length} lançamento(s)${c.pendente ? ' · ' + fmtMoney(c.pendente) + ' a aprovar' : ''}</span></span>
        <span class="r"><span class="v">${fmtMoney(c.total)}</span></span></div>
      ${c.itens.slice(0, 8).map((l) => `<div class="row act" data-lanc="${l.id}">
        <span class="g"><span class="t">${esc(l.descricao)}</span>
          <span class="s">${esc([l.rubrica, l.membro_id ? nomeMembro(l.membro_id) : ''].filter(Boolean).join(' · '))}</span></span>
        <span class="r"><span class="v">${fmtMoney(l.valor_cents)}</span></span></div>`).join('')}
    </div>`;
}

/* ---------------- ordem do dia ---------------- */
export function ordemDoDia(e) {
  const confs = store.doProjeto('confirmacoes').filter((c) => c.ref_id === e.id && c.tipo === 'presenca');
  const chamada = (id) => (e.chamadas || []).find((c) => c.membro_id === id);
  const lugar = e.endereco || e.local;
  const linhas = String(e.roteiro_dia || '').split('\n').filter((l) => l.trim());
  const corpo = el(`<div>
    <div class="card tight">
      <div class="row"><span class="g"><span class="s">Quando</span>
        <span class="t">${esc(diaSemana(e.data))}, ${esc(fmtData(e.data, { longo: true }))}
        ${e.hora_inicio ? ' · ' + esc(e.hora_inicio) : ''}${e.hora_fim ? ' às ' + esc(e.hora_fim) : ''}</span></span></div>
      ${lugar ? `<div class="row"><span class="g"><span class="s">Onde</span>
        <span class="t" style="white-space:normal">${esc(lugar)}</span></span>
        <span class="r"><a class="btn sm" href="${esc(e.mapa || mapaURL(lugar))}" target="_blank" rel="noopener">mapa</a></span></div>` : ''}
      ${e.contato_nome ? `<div class="row"><span class="g"><span class="s">Contato no local</span>
        <span class="t">${esc(e.contato_nome)}</span></span>
        ${e.contato_tel ? `<span class="r"><a class="btn sm gho" href="tel:${esc(e.contato_tel)}">ligar</a></span>` : ''}</div>` : ''}
    </div>
    ${linhas.length ? `<div class="sec"><div class="sec-t">Roteiro do dia</div></div>
      <div class="card"><div class="tl">${linhas.map((l) => `<div class="n"><div class="row">
        <span class="g"><span class="t" style="white-space:normal;font-weight:500">${esc(l)}</span></span></div></div>`).join('')}</div></div>` : ''}
    <div class="sec"><div class="sec-t">Chamada da equipe</div></div>
    <div class="card">${(e.participantes || []).length ? (e.participantes || []).map((id) => {
      const c = chamada(id);
      const cf = confs.find((x) => x.membro_id === id);
      const m = store.get('membros', id);
      return `<div class="row">
        <span class="tag ${cf?.status === 'confirmado' ? 'ok' : cf?.status === 'recusado' ? 'bad' : 'warn'}">
          ${esc(c?.hora || '—')}</span>
        <span class="g"><span class="t">${esc(nomeMembro(id))}</span>
          <span class="s">${esc([m?.funcao, c?.obs, m?.telefone].filter(Boolean).join(' · '))}</span></span>
      </div>`;
    }).join('') : '<div class="empty">Ninguém convocado.</div>'}</div>
    ${e.levar ? `<div class="sec"><div class="sec-t">O que levar</div></div>
      <div class="card"><div class="small" style="white-space:pre-wrap;line-height:1.6">${esc(e.levar)}</div></div>` : ''}
    ${e.obs ? `<div class="sec"><div class="sec-t">Observações</div></div>
      <div class="card"><div class="small" style="white-space:pre-wrap;line-height:1.6">${esc(e.obs)}</div></div>` : ''}
    <button class="btn wide gho" data-copiar>Copiar para mandar no grupo</button>
  </div>`);

  corpo.querySelector('[data-copiar]').onclick = async () => {
    const txt = textoOrdemDoDia(e);
    try { await navigator.clipboard.writeText(txt); toast('Copiado.'); }
    catch { toast('Não consegui copiar neste navegador.'); }
  };
  sheet({ titulo: 'Ordem do dia', corpo });
}

function textoOrdemDoDia(e) {
  const L = [];
  L.push(`*${e.titulo}*`);
  L.push(`${diaSemana(e.data)}, ${fmtData(e.data, { longo: true })}${e.hora_inicio ? ' · ' + e.hora_inicio : ''}`);
  if (e.endereco || e.local) L.push(`📍 ${e.endereco || e.local}`);
  if (e.contato_nome) L.push(`☎️ ${e.contato_nome}${e.contato_tel ? ' — ' + e.contato_tel : ''}`);
  if (e.roteiro_dia) { L.push(''); L.push('*Roteiro do dia*'); L.push(e.roteiro_dia); }
  const ch = (e.chamadas || []).filter((c) => c.hora);
  if (ch.length) {
    L.push(''); L.push('*Chamada*');
    ch.forEach((c) => L.push(`${c.hora} — ${nomeMembro(c.membro_id)}${c.obs ? ' (' + c.obs + ')' : ''}`));
  }
  if (e.levar) { L.push(''); L.push('*Levar*'); L.push(e.levar); }
  if (e.obs) { L.push(''); L.push(e.obs); }
  return L.join('\n');
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
    const minhaChamada = (e.chamadas || []).find((c) => c.membro_id === u?.id);
    const lugar = e.endereco || e.local;
    corpo.innerHTML = `
      ${minhaChamada?.hora ? `<div class="card tight center" style="background:var(--ac-soft);border-color:var(--ac-line)">
        <div class="small muted">Sua chamada</div>
        <div style="font-size:30px;font-weight:700;letter-spacing:-.5px;color:var(--ac)">${esc(minhaChamada.hora)}</div>
        ${minhaChamada.obs ? `<div class="small">${esc(minhaChamada.obs)}</div>` : ''}</div>` : ''}
      <div class="card tight">
        <div class="row"><span class="g"><span class="s">Quando</span>
          <span class="t">${esc(fmtData(e.data, { longo: true }))}${e.hora_inicio ? ' · ' + esc(e.hora_inicio) : ''}${e.hora_fim ? ' às ' + esc(e.hora_fim) : ''}</span></span></div>
        ${lugar ? `<div class="row"><span class="g"><span class="s">Onde</span>
          <span class="t" style="white-space:normal">${esc(lugar)}</span></span>
          <span class="r"><a class="btn sm gho" href="${esc(e.mapa || mapaURL(lugar))}" target="_blank" rel="noopener">mapa</a></span></div>` : ''}
        <div class="row"><span class="g"><span class="s">Tipo</span><span class="t">${esc(tipoEvento(e.tipo))}</span></span></div>
        ${e.obs ? `<div class="row"><span class="g"><span class="s">Observações</span>
          <span class="t" style="white-space:normal;font-weight:400">${esc(e.obs)}</span></span></div>` : ''}
      </div>
      <button class="btn wide" data-odd>Ver ordem do dia</button>
      ${minha ? `<div class="card" style="margin-top:12px">
        <h2>Sua presença</h2>
        <div class="seg">
          <button data-conf="confirmado" class="${minha.status === 'confirmado' ? 'on' : ''}">Confirmo</button>
          <button data-conf="pendente" class="${minha.status === 'pendente' ? 'on' : ''}">Ainda não sei</button>
          <button data-conf="recusado" class="${minha.status === 'recusado' ? 'on' : ''}">Não posso</button>
        </div></div>` : ''}
      <div class="sec"><div class="sec-t">Equipe convocada</div>
        ${editar ? '<button class="btn sm gho" data-chamadas>chamada</button>' : ''}</div>
      <div class="card">${confs.filter((c) => c.tipo === 'presenca').length
        ? confs.filter((c) => c.tipo === 'presenca').map((c) => {
          const ch = (e.chamadas || []).find((x) => x.membro_id === c.membro_id);
          return `<div class="row">
            <span class="tag mut">${esc(ch?.hora || '—')}</span>
            <span class="g"><span class="t">${esc(nomeMembro(c.membro_id))}</span>
              <span class="s">${esc(store.get('membros', c.membro_id)?.funcao || '')}</span></span>
            <span class="r"><span class="tag ${c.status === 'confirmado' ? 'ok' : c.status === 'recusado' ? 'bad' : 'warn'}">
              ${c.status === 'confirmado' ? 'confirmou' : c.status === 'recusado' ? 'não pode' : 'pendente'}</span></span>
          </div>`;
        }).join('')
        : '<div class="empty">Ninguém convocado.</div>'}</div>
      ${can(u, 'orcamento.ver') || podeVerTudo(u) ? blocoCusto(e, u) : ''}
      ${editar ? '<button class="btn wide gho" data-edit>Editar compromisso</button>' : ''}`;

    corpo.querySelectorAll('[data-lanc]').forEach((n) => {
      n.onclick = () => abrirLancamento(store.get('lancamentos', n.dataset.lanc));
    });
    corpo.querySelector('[data-gasto-diaria]')?.addEventListener('click', () => {
      abrirForm({
        titulo: 'Gasto desta diária',
        subtitulo: e.titulo,
        campos: camposLancamento(u, { tipo: 'saida', evento_id: e.id }),
        onArquivo: lerNotaNoForm,
        onSave: async (v, api) => {
          if (!await conferirComprovante(v, api)) throw new Error('__continuar');
          await salvarLancamento({ ...v, evento_id: e.id, data: v.data || e.data }, u);
          toast('Lançado nesta diária.'); pintar(); store.emit();
        }
      });
    });

    corpo.querySelector('[data-odd]').onclick = () => ordemDoDia(e);
    corpo.querySelectorAll('[data-conf]').forEach((b) => {
      b.onclick = async () => {
        await store.update('confirmacoes', minha.id, { status: b.dataset.conf, respondido_em: new Date().toISOString() });
        await store.log(`${u.nome} — presença em "${e.titulo}": ${b.dataset.conf}`, 'confirmacao');
        toast('Resposta registrada.'); pintar(); store.emit();
      };
    });
    corpo.querySelector('[data-chamadas]')?.addEventListener('click', () => editarChamadas(e, pintar));
    corpo.querySelector('[data-edit]')?.addEventListener('click', () => { sh.close(); editarEvento(e); });
  };
  pintar();
  const sh = sheet({ titulo: e.titulo, corpo });
}

/** Define o horário de chamada de cada pessoa convocada. */
function editarChamadas(e, aoSalvar) {
  const ids = e.participantes || [];
  if (!ids.length) return toast('Convoque a equipe primeiro, em Editar compromisso.');
  const atual = (id) => (e.chamadas || []).find((c) => c.membro_id === id) || {};
  const campos = [];
  ids.forEach((id) => {
    campos.push({ type: 'titulo', label: nomeMembro(id), k: '_t_' + id });
    campos.push({ k: 'hora_' + id, label: 'Horário de chamada', type: 'hora', valor: atual(id).hora, meia: true });
    campos.push({ k: 'obs_' + id, label: 'Onde / observação', type: 'texto', valor: atual(id).obs, ph: 'Portão 3 do aeroporto' });
  });
  abrirForm({
    titulo: 'Chamada da equipe',
    subtitulo: 'Cada pessoa vê a própria chamada em destaque no celular.',
    campos,
    onSave: async (v) => {
      const chamadas = ids.map((id) => ({ membro_id: id, hora: v['hora_' + id] || '', obs: v['obs_' + id] || '' }));
      await store.update('eventos', e.id, { chamadas });
      e.chamadas = chamadas;
      toast('Chamada definida.'); aoSalvar && aoSalvar(); store.emit();
    }
  });
}

function camposEvento(e = {}) {
  const locs = store.doProjeto('locacoes');
  return [
    { k: 'titulo', label: 'Título', type: 'texto', req: true, valor: e.titulo, ph: 'Diária 1 — Conceição do Araguaia' },
    { k: 'tipo', label: 'Tipo', type: 'select', valor: e.tipo || 'diaria', opts: TIPOS },
    { k: 'data', label: 'Data', type: 'data', req: true, valor: e.data },
    { k: 'confirmado', label: 'Data confirmada pelo cliente', type: 'check', valor: e.confirmado !== false },
    { k: 'hora_inicio', label: 'Início', type: 'hora', valor: e.hora_inicio, meia: true },
    { k: 'hora_fim', label: 'Fim', type: 'hora', valor: e.hora_fim, meia: true },
    { k: 'local', label: 'Cidade / local', type: 'texto', valor: e.local },
    {
      k: 'locacao_id', label: 'Locação cadastrada', type: 'select', valor: e.locacao_id || '',
      opts: [{ v: '', t: '— nenhuma —' }, ...locs.map((l) => ({ v: l.id, t: `${l.nome} (${l.cidade})` }))]
    },
    {
      k: 'participantes', label: 'Quem participa', type: 'multi', valor: e.participantes || [],
      opts: membros().map((m) => ({ v: m.id, t: `${m.nome}${m.funcao ? ' — ' + m.funcao : ''}` })),
      hint: 'Cada pessoa marcada recebe um pedido de confirmação de presença.'
    },
    { type: 'titulo', label: 'Ordem do dia', k: '_t_odd' },
    { k: 'endereco', label: 'Endereço completo', type: 'texto', valor: e.endereco, ph: 'Rua, número, bairro, cidade' },
    { k: 'mapa', label: 'Link do mapa (opcional)', type: 'texto', valor: e.mapa, hint: 'Em branco, o app monta o link do Google Maps pelo endereço.' },
    { k: 'contato_nome', label: 'Contato no local', type: 'texto', valor: e.contato_nome },
    { k: 'contato_tel', label: 'Telefone do contato', type: 'tel', valor: e.contato_tel },
    { k: 'roteiro_dia', label: 'Roteiro do dia', type: 'area', valor: e.roteiro_dia, ph: '07:00 café\n08:00 set de pé\n12:30 almoço' },
    { k: 'levar', label: 'O que levar', type: 'area', valor: e.levar },
    { k: 'obs', label: 'Observações', type: 'area', valor: e.obs }
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
      const ev = await store.insert('eventos', { ...v, chamadas: [] });
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
    { k: 'titulo', label: 'O que é a entrega', type: 'texto', req: true, valor: e.titulo },
    { k: 'prazo', label: 'Prazo', type: 'data', valor: e.prazo },
    { k: 'status', label: 'Status', type: 'select', valor: e.status || 'pendente', opts: ST_ENTREGA.map((s) => ({ v: s.v, t: s.t })) },
    {
      k: 'responsavel_id', label: 'Responsável', type: 'select', valor: e.responsavel_id || '',
      opts: [{ v: '', t: '— ninguém —' }, ...membros().map((m) => ({ v: m.id, t: m.nome }))]
    },
    { k: 'formato', label: 'Formato / especificação', type: 'texto', valor: e.formato },
    { k: 'link', label: 'Link (Drive, Frame.io…)', type: 'texto', valor: e.link },
    { k: 'obs', label: 'Observações', type: 'area', valor: e.obs }
  ];
}
function novaEntrega() {
  abrirForm({ titulo: 'Nova entrega', campos: camposEntrega(), onSave: async (v) => { await store.insert('entregas', v); toast('Entrega criada.'); } });
}
function abrirEntrega(e, editar) {
  if (!e) return;
  const s = stEntrega(e.status);
  const rodadas = store.doProjeto('aprovacoes').filter((a) => a.entrega_id === e.id);
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
      <div class="row"><span class="g"><span class="s">Aprovação</span>
        <span class="t">${rodadas.length} rodada(s) enviada(s)</span></span>
        <span class="r"><a class="btn sm gho" href="#/aprovacoes">ver</a></span></div>
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
