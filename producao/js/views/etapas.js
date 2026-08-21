// Etapas por fase, com responsável, prazo, dependências e checklist.
import { store, nomeMembro, membros } from '../store.js';
import { can } from '../perms.js';
import { el, abrirForm, sheet, toast } from '../ui.js';
import { esc, fmtData, prazoTxt, prazoTag } from '../utils.js';
import { FASES, faseNome, STATUS_ETAPA, statusEtapa } from '../seed.js';

let filtro = 'todas';

export function render() {
  const u = store.user;
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
    <div class="chips">${chips.map((c) => `<button class="chip ${filtro === c ? 'on' : ''}" data-chip="${c}">
      ${c === 'todas' ? 'Todas' : esc(faseNome(c))}</button>`).join('')}</div>
    ${grupos || '<div class="empty">Nenhuma etapa nesta fase.</div>'}`;

  node.querySelectorAll('[data-chip]').forEach((b) => {
    b.onclick = () => { filtro = b.dataset.chip; store.emit(); };
  });
  node.querySelectorAll('[data-etapa]').forEach((n) => {
    n.onclick = () => abrirEtapa(store.get('etapas', n.dataset.etapa), editar);
  });

  return {
    titulo: 'Etapas',
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
  return `<div class="n ${cls}"><div class="row act" data-etapa="${e.id}">
      <span class="g">
        <span class="t" style="white-space:normal;${e.status === 'feito' ? 'opacity:.6' : ''}">${esc(e.nome)}</span>
        <span class="s">${[
          e.responsavel_id ? nomeMembro(e.responsavel_id) : '',
          e.prazo ? fmtData(e.prazo) + ' · ' + prazoTxt(e.prazo) : '',
          tarefas.length ? `checklist ${tOk}/${tarefas.length}` : '',
          travando.length ? '⛔ aguarda: ' + travando.map((d) => d.nome).join(', ') : ''
        ].filter(Boolean).join(' · ') || 'sem responsável'}</span>
      </span>
      <span class="r"><span class="tag ${e.prazo && e.status !== 'feito' ? prazoTag(e.prazo) : st.tag}">${esc(st.t)}</span></span>
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
          <span style="flex:1;${t.feito ? 'opacity:.55;text-decoration:line-through' : ''}">${esc(t.titulo)}</span>
          ${editar ? `<button class="btn sm gho" data-del-tar="${t.id}">×</button>` : ''}
        </label>`).join('') : '<div class="empty">Sem itens.</div>'}</div>
      ${editar ? '<button class="btn wide gho" data-edit>Editar etapa</button>' : ''}`;

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
      titulo: 'Novo item do checklist',
      campos: [{ k: 'titulo', label: 'O que precisa ser feito', type: 'texto', req: true }],
      onSave: async (v) => { await store.insert('tarefas', { etapa_id: e.id, titulo: v.titulo, feito: false }); pintar(); store.emit(); }
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
