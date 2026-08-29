// Etapas por fase, com responsável, prazo, dependências e checklist.
import { store, nomeMembro, membros } from '../store.js';
import { can } from '../perms.js';
import { el, abrirForm, sheet, toast } from '../ui.js';
import { esc, fmtData, prazoTxt, prazoTag } from '../utils.js';
import { FASES, faseNome, STATUS_ETAPA, statusEtapa } from '../seed.js';
import * as vTarefas from './tarefas.js';

let filtro = 'todas';
let aba = 'etapas';

export const irPara = (a) => { aba = a; };

const CHIPS = `<div class="seg" style="margin-bottom:var(--s3)">
  <button data-trab="etapas">Etapas</button>
  <button data-trab="tarefas">Tarefas</button>
</div>`;

function ligarTrabalho(node) {
  node.querySelectorAll('[data-trab]').forEach((b) => {
    b.classList.toggle('on', aba === b.dataset.trab);
    b.onclick = () => { aba = b.dataset.trab; store.emit(); };
  });
}

export function render() {
  const u = store.user;
  if (aba === 'tarefas') {
    const v = vTarefas.render();
    v.node.prepend(el(CHIPS));
    ligarTrabalho(v.node);
    return { titulo: 'Trabalho', node: v.node, fab: v.fab };
  }
  const editar = can(u, 'etapas.edit');
  const etapas = store.doProjeto('etapas').sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  const node = el('<div></div>');

  const chips = ['todas', ...FASES.map((f) => f.k)];
  const lista = filtro === 'todas' ? etapas : etapas.filter((e) => e.fase === filtro);

  const grupos = FASES.map((f) => {
    const its = lista.filter((e) => e.fase === f.k);
    if (!its.length) return '';
    const ok = its.filter((e) => e.status === 'feito').length;
    return `<div class="sec"><div class="sec-t">${esc(f.nome)}</div>
        <span class="small muted mono">${ok}/${its.length}</span></div>
      <div class="card"><div class="tl">${its.map((e) => nodeEtapa(e, etapas)).join('')}</div></div>`;
  }).join('');

  node.innerHTML = `
    ${CHIPS}
    <div class="chips">${chips.map((c) => `<button class="chip ${filtro === c ? 'on' : ''}" data-chip="${c}">
      ${c === 'todas' ? 'Todas' : esc(faseNome(c))}</button>`).join('')}</div>
    ${grupos || '<div class="empty">Nenhuma etapa nesta fase.</div>'}`;

  ligarTrabalho(node);
  node.querySelectorAll('[data-chip]').forEach((b) => {
    b.onclick = () => { filtro = b.dataset.chip; store.emit(); };
  });
  node.querySelectorAll('[data-etapa]').forEach((n) => {
    n.onclick = () => abrirEtapa(store.get('etapas', n.dataset.etapa), editar);
  });

  return {
    titulo: 'Trabalho',
    node,
    fab: editar ? { label: '+', onClick: () => novaEtapa() } : null
  };
}

function nodeEtapa(e, todas) {
  const st = statusEtapa(e.status);
  const dep = (e.depende_de || []).map((id) => todas.find((x) => x.id === id)).filter(Boolean);
  const travando = dep.filter((d) => d.status !== 'feito');
  const cls = e.status === 'feito' ? 'done' : e.status === 'fazendo' ? 'doing' : e.status === 'travado' ? 'block' : '';
  const tarefas = store.doProjeto('tarefas').filter((t) => t.etapa_id === e.id);
  const tOk = tarefas.filter((t) => t.feito).length;
  // Etapa que é feita em partes mostra quantas já saíram, não só "fazendo".
  const meta = Number(e.meta || 0);
  const feitos = Math.min(Number(e.feitos || 0), meta || Infinity);
  const p100 = meta ? Math.round((feitos / meta) * 100) : 0;
  return `<div class="n ${cls}"><div class="row act alto" data-etapa="${e.id}">
      <span class="g">
        <span class="t" style="${e.status === 'feito' ? 'opacity:.6' : ''}">${esc(e.nome)}</span>
        <span class="s">${[
          e.responsavel_id ? nomeMembro(e.responsavel_id) : '',
          e.prazo ? fmtData(e.prazo) + ' · ' + prazoTxt(e.prazo) : '',
          tarefas.length ? `checklist ${tOk}/${tarefas.length}` : '',
          travando.length ? '⛔ aguarda: ' + travando.map((d) => d.nome).join(', ') : ''
        ].filter(Boolean).join(' · ') || 'sem responsável'}</span>
        ${meta ? `<span class="bar" style="margin-top:6px;max-width:180px">
          <i class="${p100 === 100 ? 'ok' : ''}" style="width:${p100}%"></i></span>` : ''}
      </span>
      <span class="r">${meta
        ? `<span class="v mono">${feitos}/${meta}</span>
           <div class="small muted">${esc(e.unidade || 'partes')}</div>`
        : `<span class="tag ${e.prazo && e.status !== 'feito' ? prazoTag(e.prazo) : st.tag}">${esc(st.t)}</span>`}</span>
    </div></div>`;
}

function abrirEtapa(e, editar) {
  if (!e) return;
  const todas = store.doProjeto('etapas');
  const tarefas = () => store.doProjeto('tarefas').filter((t) => t.etapa_id === e.id);

  const corpo = el('<div></div>');
  const pintar = () => {
    const dep = (e.depende_de || []).map((id) => todas.find((x) => x.id === id)).filter(Boolean);
    corpo.innerHTML = `
      <div class="small muted" style="margin-bottom:10px">${esc(faseNome(e.fase))}</div>
      <div class="seg" style="margin-bottom:14px">${STATUS_ETAPA.map((s) =>
        `<button data-st="${s.v}" class="${e.status === s.v ? 'on' : ''}">${esc(s.t)}</button>`).join('')}</div>
      ${Number(e.meta || 0) ? `<div class="card">
        <div class="row" style="border:0;padding:0">
          <span class="g"><span class="s">Já saíram</span>
            <span class="t" style="font-size:22px;font-family:var(--titulo)">${e.feitos || 0} de ${e.meta}
              <span class="small muted" style="font-weight:400">${esc(e.unidade || 'partes')}</span></span></span>
          ${editar ? `<span class="r" style="display:flex;gap:6px">
            <button class="btn sm gho" data-menos ${(e.feitos || 0) <= 0 ? 'disabled' : ''}>−</button>
            <button class="btn sm pri" data-mais ${(e.feitos || 0) >= e.meta ? 'disabled' : ''}>+1</button>
          </span>` : ''}
        </div>
        <div class="bar"><i class="${(e.feitos || 0) >= e.meta ? 'ok' : ''}"
          style="width:${Math.round(((e.feitos || 0) / e.meta) * 100)}%"></i></div>
      </div>` : ''}
      <div class="card tight">
        <div class="row"><span class="g"><span class="s">Responsável</span>
          <span class="t">${esc(e.responsavel_id ? nomeMembro(e.responsavel_id) : '—')}</span></span></div>
        <div class="row"><span class="g"><span class="s">Prazo</span>
          <span class="t">${e.prazo ? esc(fmtData(e.prazo, { longo: true }) + ' · ' + prazoTxt(e.prazo)) : '—'}</span></span></div>
        ${dep.length ? `<div class="row"><span class="g"><span class="s">Depende de</span>
          <span class="t" style="white-space:normal">${dep.map((d) =>
            `${esc(d.nome)} ${d.status === 'feito' ? '✅' : '⏳'}`).join('<br>')}</span></span></div>` : ''}
        ${e.obs ? `<div class="row"><span class="g"><span class="s">Observações</span>
          <span class="t" style="white-space:normal;font-weight:400">${esc(e.obs)}</span></span></div>` : ''}
      </div>
      <div class="sec"><div class="sec-t">Checklist</div>
        ${editar ? '<button class="btn sm gho" data-nova-tarefa>+ item</button>' : ''}</div>
      <div class="card">${tarefas().length ? tarefas().map((t) => `
        <label class="check" style="border-bottom:1px solid var(--line)">
          <input type="checkbox" data-tar="${t.id}" ${t.feito ? 'checked' : ''} ${editar ? '' : 'disabled'}>
          <span style="flex:1;${t.feito ? 'opacity:.55;text-decoration:line-through' : ''}">${esc(t.titulo)}
            ${t.responsavel_id || t.prazo ? `<span class="small muted" style="display:block">${esc([
              t.responsavel_id ? nomeMembro(t.responsavel_id) : '',
              t.prazo ? fmtData(t.prazo) : ''].filter(Boolean).join(' · '))}</span>` : ''}</span>
          ${editar ? `<button class="btn sm gho" data-del-tar="${t.id}">×</button>` : ''}
        </label>`).join('') : '<div class="empty">Sem itens.</div>'}</div>
      ${editar ? '<button class="btn wide gho" data-edit>Editar etapa</button>' : ''}`;

    const mexer = async (delta) => {
      const novo = Math.max(0, Math.min(Number(e.meta || 0), (Number(e.feitos) || 0) + delta));
      // Chegar na meta fecha a etapa; sair dela reabre.
      const status = novo >= Number(e.meta) ? 'feito' : novo > 0 ? 'fazendo' : e.status;
      await store.update('etapas', e.id, { feitos: novo, status });
      Object.assign(e, { feitos: novo, status });
      pintar(); store.emit();
    };
    corpo.querySelector('[data-mais]')?.addEventListener('click', () => mexer(1));
    corpo.querySelector('[data-menos]')?.addEventListener('click', () => mexer(-1));

    corpo.querySelectorAll('[data-st]').forEach((b) => {
      b.onclick = async () => {
        if (!editar) return toast('Você não tem permissão para mudar o status.');
        await store.update('etapas', e.id, { status: b.dataset.st });
        await store.log(`Etapa "${e.nome}" → ${statusEtapa(b.dataset.st).t}`, 'etapa');
        pintar(); store.emit();
      };
    });
    corpo.querySelectorAll('[data-tar]').forEach((c) => {
      c.onchange = async () => { await store.update('tarefas', c.dataset.tar, { feito: c.checked }); pintar(); store.emit(); };
    });
    corpo.querySelectorAll('[data-del-tar]').forEach((b) => {
      b.onclick = async (ev) => {
        ev.preventDefault();
        await store.remove('tarefas', b.dataset.delTar); pintar(); store.emit();
      };
    });
    const nt = corpo.querySelector('[data-nova-tarefa]');
    if (nt) nt.onclick = () => abrirForm({
      titulo: 'Nova tarefa desta etapa',
      campos: [
        { k: 'titulo', label: 'O que precisa ser feito', type: 'texto', req: true },
        {
          k: 'responsavel_id', label: 'Quem faz', type: 'select', valor: '',
          opts: [{ v: '', t: '— ninguém ainda —' }, ...membros().map((m) => ({ v: m.id, t: m.nome }))]
        },
        { k: 'prazo', label: 'Para quando', type: 'data' }
      ],
      onSave: async (v) => {
        await store.insert('tarefas', { ...v, etapa_id: e.id, status: 'aberta', feito: false });
        pintar(); store.emit();
      }
    });
    const ed = corpo.querySelector('[data-edit]');
    if (ed) ed.onclick = () => { sh.close(); editarEtapa(e); };
  };
  pintar();
  const sh = sheet({ titulo: e.nome, corpo });
}

function camposEtapa(e = {}) {
  const outras = store.doProjeto('etapas').filter((x) => x.id !== e.id);
  return [
    { k: 'nome', label: 'Nome da etapa', type: 'texto', req: true, valor: e.nome },
    { k: 'fase', label: 'Fase', type: 'select', valor: e.fase || 'pre', opts: FASES.map((f) => ({ v: f.k, t: f.nome })) },
    { k: 'status', label: 'Status', type: 'select', valor: e.status || 'nao', opts: STATUS_ETAPA.map((s) => ({ v: s.v, t: s.t })) },
    {
      k: 'responsavel_id', label: 'Responsável', type: 'select', valor: e.responsavel_id || '',
      opts: [{ v: '', t: '— ninguém —' }, ...membros().map((m) => ({ v: m.id, t: m.nome }))]
    },
    { k: 'prazo', label: 'Prazo', type: 'data', valor: e.prazo },
    { k: 'meta', label: 'Feita em quantas partes', type: 'numero', valor: e.meta || 0, meia: true,
      hint: 'Ex.: 6 escolas. Deixe 0 se for uma coisa só.' },
    { k: 'unidade', label: 'Nome das partes', type: 'texto', valor: e.unidade || '', meia: true,
      ph: 'escolas, viagens, peças…' },
    {
      k: 'depende_de', label: 'Depende de', type: 'multi', valor: e.depende_de || [],
      opts: outras.map((x) => ({ v: x.id, t: `${faseNome(x.fase)} · ${x.nome}` })),
      hint: 'A etapa fica marcada como aguardando enquanto as escolhidas não estiverem concluídas.'
    },
    { k: 'obs', label: 'Observações', type: 'area', valor: e.obs }
  ];
}

function novaEtapa() {
  abrirForm({
    titulo: 'Nova etapa',
    campos: camposEtapa(),
    onSave: async (v) => {
      const ordem = Math.max(0, ...store.doProjeto('etapas').map((x) => x.ordem || 0)) + 1;
      await store.insert('etapas', { ...v, ordem });
      toast('Etapa criada.');
    }
  });
}

function editarEtapa(e) {
  abrirForm({
    titulo: 'Editar etapa',
    campos: camposEtapa(e),
    onSave: async (v) => { await store.update('etapas', e.id, v); toast('Etapa atualizada.'); },
    onDelete: async () => { await store.remove('etapas', e.id); toast('Etapa excluída.'); }
  });
}
