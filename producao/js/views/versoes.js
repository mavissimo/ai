// Versões do orçamento. Toda proposta que vai para o cliente é uma foto das
// rubricas no dia em que foi fechada — e é o que permite responder "o que mudou
// da V1 para a V2?" seis meses depois, sem depender de memória.
import { store } from '../store.js';
import { can } from '../perms.js';
import { el, abrirForm, sheet, toast, confirmar, btnOlho } from '../ui.js';
import { esc, fmtMoney, fmtMoneyShort, fmtData, hoje, ordenar, soma, valoresOcultos } from '../utils.js';

export const ST_VERSAO = {
  rascunho: { t: 'Rascunho', tag: 'mut' },
  enviada: { t: 'Com o cliente', tag: 'warn' },
  aprovada: { t: 'Aprovada', tag: 'ok' },
  recusada: { t: 'Recusada', tag: 'bad' }
};
const st = (v) => ST_VERSAO[v] || ST_VERSAO.rascunho;

/** A foto do orçamento como ele está agora. */
export function fotoAtual() {
  const linhas = store.doProjeto('orcamento').map((o) => ({
    rubrica: o.rubrica,
    previsto_cents: o.previsto_cents || 0,
    negociado_cents: o.negociado_cents || 0
  }));
  return {
    linhas,
    previsto_cents: soma(linhas, (l) => l.previsto_cents),
    negociado_cents: soma(linhas, (l) => l.negociado_cents)
  };
}

/** O que mudou de uma versão para outra, rubrica a rubrica. */
export function comparar(a, b) {
  const mapa = new Map();
  for (const l of (a?.linhas || [])) mapa.set(l.rubrica, { rubrica: l.rubrica, de: l.previsto_cents, para: 0 });
  for (const l of (b?.linhas || [])) {
    const x = mapa.get(l.rubrica) || { rubrica: l.rubrica, de: 0, para: 0 };
    x.para = l.previsto_cents;
    mapa.set(l.rubrica, x);
  }
  return [...mapa.values()]
    .map((x) => ({ ...x, delta: x.para - x.de }))
    .filter((x) => x.delta !== 0)
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
}

export function render() {
  const u = store.user;
  const node = el('<div></div>');
  if (!can(u, 'orcamento.ver')) {
    node.innerHTML = '<div class="empty">Sem acesso ao orçamento.</div>';
    return { titulo: 'Versões', node };
  }
  const editar = can(u, 'orcamento.edit');
  const lista = ordenar(store.doProjeto('versoes'), (v) => v.criado_em || '', -1);
  const agora = fotoAtual();
  const ultima = lista[0];
  // A versão registra a proposta, então o que conta para "mudou" é o orçado.
  const mudou = ultima && ultima.previsto_cents !== agora.previsto_cents;

  node.innerHTML = `
    <div class="sec" style="margin-top:0"><div class="sec-t">Orçamento de hoje</div>
      ${btnOlho(valoresOcultos())}</div>
    <div class="grid">
      <div class="kpi"><div class="l">Orçado</div><div class="v">${fmtMoneyShort(agora.previsto_cents)}</div>
        <div class="h">${agora.linhas.length} rubricas</div></div>
      <div class="kpi"><div class="l">Negociado</div><div class="v">${fmtMoneyShort(agora.negociado_cents)}</div>
        <div class="h">o que já fechou</div></div>
    </div>
    ${editar ? `<button class="btn wide ${mudou || !lista.length ? 'pri' : 'gho'}" data-salvar>
      Salvar como ${proximoNome(lista)}</button>
      <div class="small muted" style="margin-top:6px;text-align:center">${mudou
    ? `Mudou ${fmtMoney(Math.abs(agora.previsto_cents - ultima.previsto_cents))} desde a ${esc(ultima.nome)}.`
    : ultima ? `Igual à ${esc(ultima.nome)} — salve só se quiser marcar um novo envio.`
      : 'Primeira versão do projeto.'}</div>` : ''}

    <div class="sec"><div class="sec-t">Versões salvas</div>
      <span class="small muted">${lista.length}</span></div>
    <div class="card lista">${lista.length ? lista.map((v, i) => {
    const s = st(v.status);
    const ant = lista[i + 1];
    const d = ant ? v.previsto_cents - ant.previsto_cents : 0;
    return `<div class="row act alto" data-versao="${v.id}">
        <span class="ico">${v.status === 'aprovada' ? '✅' : v.status === 'recusada' ? '❌' : '📄'}</span>
        <span class="g"><span class="t">${esc(v.nome)}</span>
          <span class="s">${esc([fmtData(v.respondida_em || v.enviada_em || v.criado_em),
    v.nota].filter(Boolean).join(' · '))}</span>
          ${d ? `<span class="s" style="color:${d > 0 ? 'var(--bad)' : 'var(--ok)'}">
            ${d > 0 ? '+' : '−'}${fmtMoney(Math.abs(d))} em relação à ${esc(ant.nome)}</span>` : ''}</span>
        <span class="r"><span class="v">${fmtMoney(v.previsto_cents)}</span>
          <div class="small"><span class="tag ${s.tag}">${esc(s.t)}</span></div></span>
      </div>`;
  }).join('') : '<div class="empty">Nenhuma versão salva ainda.</div>'}</div>

    <div class="banner small">Salve uma versão toda vez que mandar orçamento para o cliente. Ela guarda
      as rubricas como estavam naquele dia — depois dá para ver exatamente o que mudou entre uma e outra.</div>`;

  node.querySelector('[data-salvar]')?.addEventListener('click', () => salvar(lista));
  node.querySelectorAll('[data-versao]').forEach((n) => {
    n.onclick = () => abrir(store.get('versoes', n.dataset.versao), lista, editar);
  });
  return { titulo: 'Versões do orçamento', node };
}

/** V4 depois de V3, mesmo que alguma tenha sido apagada no caminho. */
const proximoNome = (lista) => {
  const maior = lista.reduce((n, v) => {
    const m = /^V(\d+)$/i.exec(String(v.nome || '').trim());
    return m ? Math.max(n, Number(m[1])) : n;
  }, 0);
  return `V${maior + 1}`;
};

function salvar(lista) {
  const foto = fotoAtual();
  abrirForm({
    titulo: 'Salvar versão do orçamento',
    subtitulo: `${fmtMoney(foto.previsto_cents)} orçado · ${foto.linhas.length} rubricas`,
    campos: [
      { k: 'nome', label: 'Nome', type: 'texto', req: true, valor: proximoNome(lista), meia: true },
      {
        k: 'status', label: 'Situação', type: 'select', meia: true, valor: 'rascunho',
        opts: Object.entries(ST_VERSAO).map(([v, o]) => ({ v, t: o.t }))
      },
      { k: 'nota', label: 'O que mudou nesta versão', type: 'area', valor: '',
        ph: 'Ex.: tirei a escola de Santo André e cortei uma diária de luz' }
    ],
    onSave: async (v) => {
      await store.insert('versoes', { ...v, ...foto, enviada_em: v.status === 'enviada' ? hoje() : '' });
      await store.log(`Orçamento ${v.nome} salvo: ${fmtMoney(foto.previsto_cents)}`, 'orcamento');
      toast(`${v.nome} salva.`);
    }
  });
}

function abrir(v, lista, editar) {
  if (!v) return;
  const i = lista.findIndex((x) => x.id === v.id);
  const ant = lista[i + 1];
  const dif = ant ? comparar(ant, v) : [];
  const s = st(v.status);
  const corpo = el(`<div>
    <div class="card tight">
      <div class="row"><span class="g"><span class="s">${v.respondida_em ? 'Respondida em'
    : v.enviada_em ? 'Enviada em' : 'Salva em'}</span>
        <span class="t">${esc(fmtData(v.respondida_em || v.enviada_em || v.criado_em, { longo: true }))}</span></span>
        <span class="r"><span class="tag ${s.tag}">${esc(s.t)}</span></span></div>
      <div class="row"><span class="g"><span class="s">Orçado</span>
        <span class="t">${fmtMoney(v.previsto_cents)}</span></span></div>
      <div class="row"><span class="g"><span class="s">Negociado na época</span>
        <span class="t">${fmtMoney(v.negociado_cents)}</span></span></div>
      ${v.nota ? `<div class="row"><span class="g"><span class="s">O que mudou</span>
        <span class="t" style="white-space:normal;font-weight:400">${esc(v.nota)}</span></span></div>` : ''}
    </div>

    ${dif.length ? `<div class="sec"><div class="sec-t">Diferença para a ${esc(ant.nome)}</div>
        <span class="small muted">${dif.length} rubrica(s)</span></div>
      <div class="card lista">${dif.map((d) => `<div class="row">
        <span class="g"><span class="t">${esc(d.rubrica)}</span>
          <span class="s">${d.de ? fmtMoney(d.de) : 'não existia'} → ${d.para ? fmtMoney(d.para) : 'saiu'}</span></span>
        <span class="r"><span class="v" style="color:${d.delta > 0 ? 'var(--bad)' : 'var(--ok)'}">
          ${d.delta > 0 ? '+' : '−'}${fmtMoney(Math.abs(d.delta))}</span></span></div>`).join('')}</div>`
    : ant ? '<div class="banner small">Nenhuma rubrica mudou de valor em relação à versão anterior.</div>' : ''}

    <div class="sec"><div class="sec-t">Rubricas desta versão</div></div>
    <div class="card lista">${(v.linhas || []).map((l) => `<div class="row">
      <span class="g"><span class="t">${esc(l.rubrica)}</span></span>
      <span class="r"><span class="v">${fmtMoney(l.previsto_cents)}</span></span></div>`).join('')}</div>

    ${editar ? '<button class="btn wide gho" data-status>Mudar situação</button>' : ''}
    ${editar ? '<button class="btn wide gho danger" style="margin-top:8px" data-apagar>Apagar versão</button>' : ''}
  </div>`);

  const sh = sheet({ titulo: v.nome, corpo });
  corpo.querySelector('[data-status]')?.addEventListener('click', () => {
    sh.close();
    abrirForm({
      titulo: 'Situação da versão',
      campos: [{
        k: 'status', label: 'Situação', type: 'select', valor: v.status,
        opts: Object.entries(ST_VERSAO).map(([x, o]) => ({ v: x, t: o.t }))
      }],
      onSave: async (d) => {
        await store.update('versoes', v.id, {
          ...d,
          enviada_em: d.status === 'enviada' && !v.enviada_em ? hoje() : v.enviada_em,
          respondida_em: ['aprovada', 'recusada'].includes(d.status) ? hoje() : v.respondida_em
        });
        toast('Atualizada.');
      }
    });
  });
  corpo.querySelector('[data-apagar]')?.addEventListener('click', async () => {
    if (!await confirmar(`Apagar a ${v.nome}? A foto do orçamento daquele dia some.`, { perigo: true, ok: 'Apagar' })) return;
    await store.remove('versoes', v.id);
    sh.close(); toast('Versão apagada.');
  });
}
