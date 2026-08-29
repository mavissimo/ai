// Fontes do projeto: os links de onde a informação vem e que mudam sozinhos
// (planilha, agenda, contrato, cronograma). O app não lê esses links — ele
// lembra de conferir, e mostra há quanto tempo ninguém olhou.
import { store, nomeMembro, membros } from '../store.js';
import { can } from '../perms.js';
import { el, abrirForm, sheet, toast } from '../ui.js';
import { esc, fmtData, hoje, ordenar } from '../utils.js';
import { FREQ_FONTE, freqFonte, statusFonte } from '../calc.js';

const TIPOS = [
  { v: 'planilha', t: 'Planilha', icone: '📊' },
  { v: 'agenda', t: 'Agenda', icone: '🗓' },
  { v: 'contrato', t: 'Contrato', icone: '📄' },
  { v: 'pasta', t: 'Pasta de arquivos', icone: '📁' },
  { v: 'link', t: 'Link', icone: '🔗' }
];
const tipo = (v) => TIPOS.find((t) => t.v === v) || TIPOS[4];


export function render() {
  const u = store.user;
  const editar = can(u, 'projeto.edit');
  const node = el('<div></div>');
  const lista = ordenar(store.doProjeto('fontes'), (f) => (statusFonte(f).vencida ? '0' : '1') + f.titulo);
  const vencidas = lista.filter((f) => statusFonte(f).vencida);

  node.innerHTML = `
    ${vencidas.length ? `<div class="banner warn small">
      <b>${vencidas.length} fonte(s) para reconferir.</b> A informação do projeto vive nesses links —
      quando eles mudam e ninguém olha, o app fica contando história velha.</div>` : ''}
    <div class="card lista">${lista.length ? lista.map((f) => {
      const s = statusFonte(f);
      const t = tipo(f.tipo);
      return `<div class="row act alto" data-fonte="${f.id}">
        <span class="ico ${s.vencida ? 'urg' : ''}">${t.icone}</span>
        <span class="g"><span class="t">${esc(f.titulo)}</span>
          <span class="s">${esc([freqFonte(f.frequencia).t,
            f.responsavel_id ? nomeMembro(f.responsavel_id) : ''].filter(Boolean).join(' · '))}</span></span>
        <span class="r"><span class="tag ${s.vencida ? 'warn' : 'ok'}">${esc(s.txt)}</span></span>
      </div>`;
    }).join('') : '<div class="empty">Nenhuma fonte cadastrada.</div>'}</div>
    <div class="banner small">Cadastre aqui tudo que muda fora do app: a planilha do Drive, a agenda
      do Google, o contrato, a pasta de vouchers. Ao conferir, marque — assim todo mundo sabe se o
      que está na tela é a versão de hoje ou a da semana passada.</div>`;

  node.querySelectorAll('[data-fonte]').forEach((n) => {
    n.onclick = () => abrir(store.get('fontes', n.dataset.fonte), editar);
  });

  return { titulo: 'Fontes', node, fab: editar ? { label: '+', onClick: () => editarFonte({}) } : null };
}

function abrir(f, editar) {
  if (!f) return;
  const corpo = el('<div></div>');
  const pintar = () => {
    const s = statusFonte(f);
    corpo.innerHTML = `
      <div class="card tight">
        <div class="row"><span class="g"><span class="s">Tipo</span>
          <span class="t">${esc(tipo(f.tipo).icone + ' ' + tipo(f.tipo).t)}</span></span></div>
        <div class="row"><span class="g"><span class="s">Reconferir</span>
          <span class="t">${esc(freqFonte(f.frequencia).t)}</span></span>
          <span class="r"><span class="tag ${s.vencida ? 'warn' : 'ok'}">${esc(s.txt)}</span></span></div>
        ${f.responsavel_id ? `<div class="row"><span class="g"><span class="s">Quem confere</span>
          <span class="t">${esc(nomeMembro(f.responsavel_id))}</span></span></div>` : ''}
        ${f.conferido_em ? `<div class="row"><span class="g"><span class="s">Última conferida</span>
          <span class="t">${esc(fmtData(f.conferido_em, { longo: true }))}</span></span></div>` : ''}
        ${f.obs ? `<div class="row"><span class="g"><span class="s">O que olhar</span>
          <span class="t" style="white-space:normal;font-weight:400">${esc(f.obs)}</span></span></div>` : ''}
      </div>
      ${f.url ? `<a class="btn wide pri" href="${esc(f.url)}" target="_blank" rel="noopener">Abrir</a>` : ''}
      ${editar ? '<button class="btn wide" style="margin-top:8px" data-conferi>Conferi agora</button>' : ''}
      ${editar ? '<button class="btn wide gho" style="margin-top:8px" data-edit>Editar</button>' : ''}`;

    corpo.querySelector('[data-conferi]')?.addEventListener('click', async () => {
      await store.update('fontes', f.id, { conferido_em: hoje() });
      f.conferido_em = hoje();
      await store.log(`${store.user?.nome || 'Alguém'} conferiu a fonte: ${f.titulo}`, 'projeto');
      toast('Marcada como conferida hoje.');
      pintar(); store.emit();
    });
    corpo.querySelector('[data-edit]')?.addEventListener('click', () => { sh.close(); editarFonte(f); });
  };
  pintar();
  const sh = sheet({ titulo: f.titulo, corpo });
}

function editarFonte(f) {
  const nova = !f.id;
  abrirForm({
    titulo: nova ? 'Nova fonte' : 'Editar fonte',
    subtitulo: 'Um link de fora que o projeto depende.',
    campos: [
      { k: 'titulo', label: 'O que é', type: 'texto', req: true, valor: f.titulo || '' },
      { k: 'url', label: 'Link', type: 'texto', valor: f.url || '', ph: 'https://' },
      {
        k: 'tipo', label: 'Tipo', type: 'select', valor: f.tipo || 'link', meia: true,
        opts: TIPOS.map((t) => ({ v: t.v, t: t.t }))
      },
      {
        k: 'frequencia', label: 'Reconferir', type: 'select', valor: f.frequencia || 'semanal', meia: true,
        opts: FREQ_FONTE.map((x) => ({ v: x.v, t: x.t }))
      },
      {
        k: 'responsavel_id', label: 'Quem confere', type: 'select', valor: f.responsavel_id || '',
        opts: [{ v: '', t: 'Ninguém definido' }, ...membros().map((m) => ({ v: m.id, t: m.nome }))]
      },
      { k: 'obs', label: 'O que olhar', type: 'area', valor: f.obs || '',
        ph: 'Ex.: coluna NEGOCIADO da aba mavi + profissionais' }
    ],
    onSave: async (v) => {
      if (nova) await store.insert('fontes', { ...v, conferido_em: '' });
      else await store.update('fontes', f.id, v);
      toast(nova ? 'Fonte cadastrada.' : 'Fonte atualizada.');
    },
    onDelete: nova ? null : async () => { await store.remove('fontes', f.id); toast('Fonte removida.'); }
  });
}
