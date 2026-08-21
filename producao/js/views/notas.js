// Arquivo de notas fiscais, recibos, contratos e comprovantes.
// Cada arquivo fica ligado ao lançamento, conta ou contrato que originou.
import { store, nomeMembro, membros } from '../store.js';
import { can, podeVerTudo } from '../perms.js';
import { el, abrirForm, sheet, toast } from '../ui.js';
import { esc, fmtMoney, fmtData, hoje, ordenar, soma, bytes } from '../utils.js';
import { salvarArquivo, abrirArquivo, removerArquivo } from '../files.js';

let filtro = 'todos';
const TIPOS = [
  { v: 'nf', t: 'Nota fiscal' }, { v: 'recibo', t: 'Recibo' },
  { v: 'comprovante', t: 'Comprovante' }, { v: 'boleto', t: 'Boleto' },
  { v: 'contrato', t: 'Contrato' }, { v: 'passagem', t: 'Passagem / ticket' },
  { v: 'autorizacao', t: 'Autorização / licença' }, { v: 'outro', t: 'Outro' }
];
const tipoTxt = (v) => TIPOS.find((t) => t.v === v)?.t || v || 'documento';

export function render() {
  const u = store.user;
  const node = el('<div></div>');
  let docs = store.doProjeto('documentos');
  if (!podeVerTudo(u) && !can(u, 'docs.ver')) docs = docs.filter((d) => d.membro_id === u?.id || d.criado_por === u?.id);
  if (filtro !== 'todos') docs = docs.filter((d) => d.tipo === filtro);
  docs = ordenar(docs, (d) => d.data || d.criado_em, -1);

  node.innerHTML = `
    <div class="chips">
      <button class="chip ${filtro === 'todos' ? 'on' : ''}" data-f="todos">Todos</button>
      ${TIPOS.map((t) => `<button class="chip ${filtro === t.v ? 'on' : ''}" data-f="${t.v}">${esc(t.t)}</button>`).join('')}
    </div>
    <div class="grid">
      <div class="kpi"><div class="l">Documentos</div><div class="v">${docs.length}</div></div>
      <div class="kpi"><div class="l">Valor somado</div><div class="v">${fmtMoney(soma(docs, (d) => d.valor_cents))}</div></div>
    </div>
    <div class="card">${docs.length ? docs.map((d) => `<div class="row act" data-doc="${d.id}">
      <span class="tag ${d.tipo === 'nf' ? 'info' : d.tipo === 'contrato' ? 'ok' : 'mut'}">${esc(tipoTxt(d.tipo).slice(0, 10))}</span>
      <span class="g"><span class="t">${esc(d.titulo || d.nome || 'documento')}</span>
        <span class="s">${esc([d.emissor, fmtData(d.data), d.membro_id ? nomeMembro(d.membro_id) : '', d.numero ? 'nº ' + d.numero : '']
    .filter(Boolean).join(' · '))}</span></span>
      <span class="r"><span class="v">${d.valor_cents ? fmtMoney(d.valor_cents) : ''}</span></span>
    </div>`).join('') : '<div class="empty">Nenhum documento arquivado.</div>'}</div>
    <div class="banner small">${store.remoto
      ? 'Os arquivos ficam no storage do projeto — todo mundo com permissão acessa.'
      : 'No modo demo os arquivos ficam salvos <b>neste aparelho</b>. Ligando o Supabase, eles passam a ficar na nuvem do projeto.'}</div>`;

  node.querySelectorAll('[data-f]').forEach((b) => { b.onclick = () => { filtro = b.dataset.f; store.emit(); }; });
  node.querySelectorAll('[data-doc]').forEach((n) => { n.onclick = () => abrirDoc(store.get('documentos', n.dataset.doc), can(u, 'docs.edit')); });

  return { titulo: 'Notas e documentos', node, fab: { label: '+', onClick: () => novoDoc(u) } };
}

function campos(d = {}) {
  return [
    { k: 'tipo', label: 'Tipo', type: 'select', valor: d.tipo || 'nf', opts: TIPOS },
    { k: 'titulo', label: 'Descrição', type: 'texto', req: true, valor: d.titulo, ph: 'NF locação de equipamento' },
    { k: 'valor_cents', label: 'Valor', type: 'dinheiro', valor: d.valor_cents },
    { k: 'data', label: 'Data', type: 'data', valor: d.data || hoje() },
    { k: 'emissor', label: 'Emissor / fornecedor', type: 'texto', valor: d.emissor },
    { k: 'numero', label: 'Número do documento', type: 'texto', valor: d.numero },
    {
      k: 'membro_id', label: 'Pessoa relacionada', type: 'select', valor: d.membro_id || '',
      opts: [{ v: '', t: '— produção —' }, ...membros().map((m) => ({ v: m.id, t: m.nome }))]
    },
    { k: 'link', label: 'Link externo (opcional)', type: 'texto', valor: d.link, hint: 'Se a nota estiver no Drive/portal, cole o link aqui.' },
    { k: 'obs', label: 'Observações', type: 'area', valor: d.obs }
  ];
}

function novoDoc(u) {
  abrirForm({
    titulo: 'Arquivar documento',
    campos: [...campos(), { k: 'arquivo', label: 'Arquivo (foto ou PDF)', type: 'arquivo' }],
    onSave: async (v) => {
      const { arquivo, ...resto } = v;
      let extra = {};
      if (arquivo) {
        const meta = await salvarArquivo(arquivo, { pasta: 'documentos' });
        extra = { path: meta.path, nome: meta.nome, tamanho: meta.tamanho, mime: meta.tipo };
      }
      if (!arquivo && !v.link) throw new Error('Anexe um arquivo ou informe um link.');
      await store.insert('documentos', { ...resto, ...extra, membro_id: resto.membro_id || u?.id || null });
      toast('Documento arquivado.');
    }
  });
}

function abrirDoc(d, editar) {
  if (!d) return;
  const corpo = el(`<div>
    <div class="card tight">
      <div class="row"><span class="g"><span class="s">Tipo</span><span class="t">${esc(tipoTxt(d.tipo))}</span></span></div>
      <div class="row"><span class="g"><span class="s">Valor</span><span class="t">${d.valor_cents ? fmtMoney(d.valor_cents) : '—'}</span></span></div>
      <div class="row"><span class="g"><span class="s">Data</span><span class="t">${esc(fmtData(d.data, { longo: true }))}</span></span></div>
      ${d.emissor ? `<div class="row"><span class="g"><span class="s">Emissor</span><span class="t">${esc(d.emissor)}</span></span></div>` : ''}
      ${d.numero ? `<div class="row"><span class="g"><span class="s">Número</span><span class="t">${esc(d.numero)}</span></span></div>` : ''}
      ${d.membro_id ? `<div class="row"><span class="g"><span class="s">Pessoa</span><span class="t">${esc(nomeMembro(d.membro_id))}</span></span></div>` : ''}
      ${d.nome ? `<div class="row"><span class="g"><span class="s">Arquivo</span>
        <span class="t">${esc(d.nome)}${d.tamanho ? ' · ' + bytes(d.tamanho) : ''}</span></span></div>` : ''}
      ${d.obs ? `<div class="row"><span class="g"><span class="s">Observações</span>
        <span class="t" style="white-space:normal;font-weight:400">${esc(d.obs)}</span></span></div>` : ''}
    </div>
    ${(d.path || d.link) ? '<button class="btn wide pri" data-ver>Abrir documento</button>' : ''}
    ${editar ? '<button class="btn wide gho" style="margin-top:8px" data-edit>Editar dados</button>' : ''}
  </div>`);
  const sh = sheet({ titulo: d.titulo || d.nome || 'Documento', corpo });
  corpo.querySelector('[data-ver]')?.addEventListener('click', async () => {
    try { if (!await abrirArquivo(d)) toast('Arquivo não encontrado neste aparelho.'); }
    catch (e) { toast('Não consegui abrir: ' + e.message); }
  });
  corpo.querySelector('[data-edit]')?.addEventListener('click', () => {
    sh.close();
    abrirForm({
      titulo: 'Editar documento', campos: campos(d),
      onSave: async (v) => { await store.update('documentos', d.id, v); toast('Atualizado.'); },
      onDelete: async () => {
        try { await removerArquivo(d); } catch (e) { console.warn(e); }
        await store.remove('documentos', d.id); toast('Excluído.');
      }
    });
  });
}
