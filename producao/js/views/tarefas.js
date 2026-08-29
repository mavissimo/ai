// Tarefas com dono e prazo, e a cobrança que faz a coisa andar.
// Uma tarefa pode estar solta ou pendurada numa etapa — quando está, ela também
// aparece no checklist daquela etapa.
import { store, membros, nomeMembro } from '../store.js';
import { can, podeVerTudo } from '../perms.js';
import { el, abrirForm, sheet, toast } from '../ui.js';
import { esc, fmtData, prazoTxt, diasAte, hoje, ordenar, iniciais } from '../utils.js';
import { faseNome } from '../seed.js';

let aba = 'minhas';

export const ST_TAREFA = {
  aberta: { t: 'A fazer', tag: 'mut' },
  fazendo: { t: 'Fazendo', tag: 'info' },
  feita: { t: 'Feita', tag: 'ok' }
};

export const statusDe = (t) => t.status || (t.feito ? 'feita' : 'aberta');
export const emAberto = (t) => statusDe(t) !== 'feita';

export function atrasadas(membroId) {
  return store.doProjeto('tarefas').filter((t) => emAberto(t) && t.prazo
    && (diasAte(t.prazo) ?? 9) < 0 && (!membroId || t.responsavel_id === membroId));
}
export function minhasTarefas(membroId) {
  return ordenar(store.doProjeto('tarefas').filter((t) => t.responsavel_id === membroId && emAberto(t)),
    (t) => t.prazo || '9999');
}

function faixa(t) {
  const d = diasAte(t.prazo);
  if (!t.prazo) return { k: '4', t: 'Sem prazo' };
  if (d < 0) return { k: '0', t: 'Atrasadas' };
  if (d === 0) return { k: '1', t: 'Para hoje' };
  if (d <= 7) return { k: '2', t: 'Esta semana' };
  return { k: '3', t: 'Mais para frente' };
}

export function render() {
  const u = store.user;
  const node = el('<div></div>');
  const todas = store.doProjeto('tarefas');
  const gestor = podeVerTudo(u);

  const minhasAbertas = todas.filter((t) => t.responsavel_id === u?.id && emAberto(t));
  // Quem não tem tarefa própria cai direto na lista geral, em vez de encarar
  // uma tela vazia enquanto o projeto tem coisa atrasada.
  if (aba === 'minhas' && !minhasAbertas.length && gestor) aba = 'todas';

  let lista;
  if (aba === 'minhas') lista = minhasAbertas;
  else if (aba === 'atrasadas') lista = atrasadas();
  else if (aba === 'feitas') lista = todas.filter((t) => !emAberto(t));
  else lista = todas.filter(emAberto);

  const minhas = minhasAbertas.length;
  const atras = atrasadas().length;

  node.innerHTML = `
    <div class="chips">
      <button class="chip ${aba === 'minhas' ? 'on' : ''}" data-t="minhas">Minhas${minhas ? ' (' + minhas + ')' : ''}</button>
      ${gestor ? `<button class="chip ${aba === 'todas' ? 'on' : ''}" data-t="todas">Todas</button>` : ''}
      <button class="chip ${aba === 'atrasadas' ? 'on' : ''}" data-t="atrasadas">Atrasadas${atras ? ' (' + atras + ')' : ''}</button>
      <button class="chip ${aba === 'feitas' ? 'on' : ''}" data-t="feitas">Feitas</button>
    </div>
    ${blocoLista(lista, u)}`;

  node.querySelectorAll('[data-t]').forEach((b) => { b.onclick = () => { aba = b.dataset.t; store.emit(); }; });
  node.querySelectorAll('[data-tarefa]').forEach((n) => {
    n.onclick = (ev) => {
      if (ev.target.closest('[data-check]')) return;
      abrir(store.get('tarefas', n.dataset.tarefa));
    };
  });
  node.querySelectorAll('[data-check]').forEach((c) => {
    c.onchange = async () => {
      const t = store.get('tarefas', c.dataset.check);
      await marcar(t, c.checked ? 'feita' : 'aberta');
      store.emit();
    };
  });

  return { titulo: 'Tarefas', node, fab: { label: '+', onClick: () => nova(u) } };
}

function blocoLista(lista, u) {
  if (!lista.length) return '<div class="empty">Nenhuma tarefa por aqui.</div>';
  const grupos = {};
  lista.forEach((t) => {
    const f = faixa(t);
    (grupos[f.k] = grupos[f.k] || { t: f.t, itens: [] }).itens.push(t);
  });
  return Object.keys(grupos).sort().map((k) => {
    const g = grupos[k];
    return `<div class="sec"><div class="sec-t">${esc(g.t)}</div>
        <span class="small muted">${g.itens.length}</span></div>
      <div class="card lista">${ordenar(g.itens, (t) => t.prazo || '9999').map((t) => linha(t, u)).join('')}</div>`;
  }).join('');
}

function linha(t, u) {
  const st = ST_TAREFA[statusDe(t)];
  const atrasada = emAberto(t) && t.prazo && (diasAte(t.prazo) ?? 9) < 0;
  const cobrada = t.cobrado_em && emAberto(t);
  return `<label class="row act alto" data-tarefa="${t.id}" style="cursor:pointer">
    <input type="checkbox" data-check="${t.id}" ${emAberto(t) ? '' : 'checked'}
      style="width:22px;height:22px;flex:none" aria-label="Concluir">
    <span class="g" style="padding-top:1px"><span class="t" style="white-space:normal;${emAberto(t) ? '' : 'opacity:.55;text-decoration:line-through'}">${esc(t.titulo)}</span>
      <span class="s">${esc([
        t.responsavel_id ? nomeMembro(t.responsavel_id) : 'sem dono',
        t.prazo ? (atrasada ? 'venceu ' + fmtData(t.prazo) : prazoTxt(t.prazo)) : 'sem prazo',
        cobrada ? '⚡ cobrada' : '',
        (t.remarcacoes || []).length ? `↻ ${t.remarcacoes.length}ª data` : ''
      ].filter(Boolean).join(' · '))}</span></span>
    <span class="r"><span class="tag ${atrasada ? 'bad' : st.tag}">${atrasada ? 'atrasada' : st.t}</span></span>
  </label>`;
}

async function marcar(t, status) {
  if (!t) return;
  await store.update('tarefas', t.id, { status, feito: status === 'feita' });
  if (status === 'feita') await store.log(`Tarefa concluída: ${t.titulo}`, 'tarefa');
}

function campos(t = {}, u) {
  const etapas = store.doProjeto('etapas');
  return [
    { k: 'titulo', label: 'O que precisa ser feito', type: 'texto', req: true, valor: t.titulo },
    {
      k: 'responsavel_id', label: 'Quem faz', type: 'select', valor: t.responsavel_id || u?.id || '',
      opts: [{ v: '', t: '— ninguém ainda —' }, ...membros().map((m) => ({ v: m.id, t: m.nome }))]
    },
    { k: 'prazo', label: 'Para quando', type: 'data', valor: t.prazo },
    {
      k: 'status', label: 'Status', type: 'select', valor: statusDe(t),
      opts: Object.entries(ST_TAREFA).map(([v, o]) => ({ v, t: o.t }))
    },
    {
      k: 'etapa_id', label: 'Faz parte de qual etapa', type: 'select', valor: t.etapa_id || '',
      opts: [{ v: '', t: '— nenhuma —' }, ...etapas.map((e) => ({ v: e.id, t: `${faseNome(e.fase)} · ${e.nome}` }))]
    },
    { k: 'descricao', label: 'Detalhes', type: 'area', valor: t.descricao }
  ];
}

export function nova(u, fixo = {}) {
  abrirForm({
    titulo: 'Nova tarefa',
    campos: campos(fixo, u),
    onSave: async (v) => {
      await store.insert('tarefas', { ...v, feito: v.status === 'feita', cobrado_em: '' });
      toast('Tarefa criada.');
    }
  });
}

/** Muda o prazo guardando de onde veio, para onde foi e por quê. */
export function remarcar(t) {
  const u = store.user;
  const hj = hoje();
  const daqui = (n) => {
    const d = new Date(`${t.prazo || hj}T12:00:00`);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };
  abrirForm({
    titulo: 'Mudar o prazo',
    subtitulo: t.titulo,
    campos: [
      {
        k: '_atalho', label: 'Empurrar para', type: 'select', valor: '',
        opts: [
          { v: '', t: 'Escolher a data na mão' },
          { v: hj, t: 'Hoje' },
          { v: daqui(1), t: 'Amanhã (1 dia)' },
          { v: daqui(3), t: 'Daqui a 3 dias' },
          { v: daqui(7), t: 'Daqui a 1 semana' },
          { v: daqui(14), t: 'Daqui a 2 semanas' }
        ],
        hint: 'Os atalhos contam a partir do prazo atual. Para tirar o prazo, apague a data abaixo.'
      },
      { k: 'prazo', label: 'Novo prazo', type: 'data', valor: t.prazo || '' },
      {
        k: 'motivo', label: 'Por que mudou', type: 'livre', valor: '',
        opts: [
          'Cliente remarcou', 'Dependência atrasou', 'Falta informação',
          'Mudança de agenda da equipe', 'Prioridade mudou', 'Prazo era otimista'
        ].map((v) => ({ v, t: v })),
        ph: 'Escreva o motivo',
        hint: 'Fica no histórico da tarefa. Ajuda a entender depois por que o projeto escorregou.'
      }
    ],
    onSave: async (v) => {
      // O atalho manda; se ninguém escolheu atalho, vale a data digitada.
      const antes = t.prazo || '';
      const novo = v._atalho || v.prazo || '';
      if (novo === antes) { toast('O prazo continua o mesmo.'); return; }
      const hist = [...(t.remarcacoes || []),
        { de: antes, para: novo, motivo: v.motivo || '', por: u?.nome || '', em: hj }];
      await store.update('tarefas', t.id, { prazo: novo, remarcacoes: hist });
      Object.assign(t, { prazo: novo, remarcacoes: hist });
      await store.log(`${u?.nome || 'Alguém'} mudou o prazo de "${t.titulo}" de `
        + `${antes || 'sem prazo'} para ${novo || 'sem prazo'}`
        + (v.motivo ? ` — ${v.motivo}` : ''), 'tarefa');
      toast('Prazo alterado. Ficou no histórico.');
    }
  });
}

function abrir(t) {
  if (!t) return;
  const u = store.user;
  const gestor = podeVerTudo(u);
  const meu = t.responsavel_id === u?.id;
  const etapa = t.etapa_id ? store.get('etapas', t.etapa_id) : null;
  const corpo = el('<div></div>');

  const pintar = () => {
    const st = statusDe(t);
    corpo.innerHTML = `
      <div class="seg" style="margin-bottom:14px">${Object.entries(ST_TAREFA).map(([v, o]) =>
        `<button data-st="${v}" class="${st === v ? 'on' : ''}">${o.t}</button>`).join('')}</div>
      <div class="card tight">
        <div class="row"><span class="g"><span class="s">Quem faz</span>
          <span class="t">${esc(t.responsavel_id ? nomeMembro(t.responsavel_id) : '—')}</span></span></div>
        <div class="row"><span class="g"><span class="s">Prazo</span>
          <span class="t">${t.prazo ? esc(fmtData(t.prazo, { longo: true }) + ' · ' + prazoTxt(t.prazo)) : 'sem prazo'}</span></span>
          ${gestor || meu ? '<span class="r"><button class="btn sm gho" data-adiar>mudar</button></span>' : ''}</div>
        ${etapa ? `<div class="row"><span class="g"><span class="s">Etapa</span>
          <span class="t">${esc(etapa.nome)}</span></span></div>` : ''}
        ${t.cobrado_em ? `<div class="row"><span class="g"><span class="s">Cobrada</span>
          <span class="t">${esc(fmtData(t.cobrado_em) + ' · ' + prazoTxt(t.cobrado_em))}</span></span></div>` : ''}
        ${t.descricao ? `<div class="row"><span class="g"><span class="s">Detalhes</span>
          <span class="t" style="white-space:normal;font-weight:400">${esc(t.descricao)}</span></span></div>` : ''}
      </div>
      ${(t.remarcacoes || []).length ? `<div class="sec"><div class="sec-t">Mudanças de data</div>
        <span class="small muted">${(t.remarcacoes || []).length}</span></div>
        <div class="card tight">${[...(t.remarcacoes || [])].reverse().map((r) => `<div class="row">
          <span class="g"><span class="t">${esc(fmtData(r.de) || 'sem prazo')} → ${esc(fmtData(r.para) || 'sem prazo')}</span>
            <span class="s">${esc([r.motivo, r.por, fmtData(r.em)].filter(Boolean).join(' · '))}</span></span>
        </div>`).join('')}</div>` : ''}
      ${gestor && emAberto(t) && t.responsavel_id && !meu
        ? '<button class="btn wide" data-cobrar>Cobrar quem ficou responsável</button>' : ''}
      <button class="btn wide gho" style="margin-top:8px" data-edit>Editar tarefa</button>`;

    corpo.querySelectorAll('[data-st]').forEach((b) => {
      b.onclick = async () => { await marcar(t, b.dataset.st); t.status = b.dataset.st; pintar(); store.emit(); };
    });
    corpo.querySelector('[data-adiar]')?.addEventListener('click', () => { sh.close(); remarcar(t); });
    corpo.querySelector('[data-cobrar]')?.addEventListener('click', async () => {
      await store.update('tarefas', t.id, { cobrado_em: hoje() });
      t.cobrado_em = hoje();
      await store.log(`${u.nome} cobrou ${nomeMembro(t.responsavel_id)}: ${t.titulo}`, 'tarefa');
      toast('Cobrança registrada. Aparece no painel de quem é responsável.');
      pintar(); store.emit();
    });
    corpo.querySelector('[data-edit]').onclick = () => {
      sh.close();
      abrirForm({
        titulo: 'Editar tarefa', campos: campos(t, u),
        onSave: async (v) => { await store.update('tarefas', t.id, { ...v, feito: v.status === 'feita' }); toast('Atualizada.'); },
        onDelete: async () => { await store.remove('tarefas', t.id); toast('Excluída.'); }
      });
    };
  };
  pintar();
  const sh = sheet({ titulo: t.titulo, corpo });
}
