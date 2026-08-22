// Locações (escolas, estúdios, casas) e contatos do projeto — cliente e fornecedores.
import { store } from '../store.js';
import { can } from '../perms.js';
import { el, abrirForm, sheet, toast } from '../ui.js';
import { esc, fmtMoney, ordenar } from '../utils.js';

let aba = 'locacoes';

const ST_AUT = [
  { v: 'pendente', t: 'Autorização pendente', tag: 'warn' },
  { v: 'solicitada', t: 'Solicitada', tag: 'info' },
  { v: 'ok', t: 'Autorizada', tag: 'ok' },
  { v: 'na', t: 'Não precisa', tag: 'mut' }
];
const stAut = (v) => ST_AUT.find((s) => s.v === v) || ST_AUT[0];

const TIPOS_CONTATO = [
  { v: 'cliente', t: 'Cliente' }, { v: 'fornecedor', t: 'Fornecedor' },
  { v: 'escola', t: 'Escola / locação' }, { v: 'personagem', t: 'Personagem / entrevistado' },
  { v: 'outro', t: 'Outro' }
];

const mapaURL = (txt) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(txt);

export function render() {
  const u = store.user;
  const editar = can(u, 'agenda.edit') || can(u, 'equipe.edit');
  const node = el('<div></div>');
  const locs = ordenar(store.doProjeto('locacoes'), (l) => l.cidade || l.nome);
  const contatos = ordenar(store.doProjeto('contatos'), (c) => c.tipo + c.nome);

  node.innerHTML = `
    <div class="chips">
      <button class="chip ${aba === 'locacoes' ? 'on' : ''}" data-aba="locacoes">Locações</button>
      <button class="chip ${aba === 'contatos' ? 'on' : ''}" data-aba="contatos">Contatos</button>
    </div>
    ${aba === 'locacoes' ? `<div class="card">${locs.length ? locs.map((l) => {
      const s = stAut(l.autorizacao);
      const diarias = store.doProjeto('eventos').filter((e) => e.locacao_id === l.id).length;
      return `<div class="row act" data-loc="${l.id}">
        <span class="tag ${s.tag}">${esc(l.uf || '—')}</span>
        <span class="g"><span class="t">${esc(l.nome)}</span>
          <span class="s">${esc([l.cidade, s.t, diarias ? diarias + ' diária(s)' : ''].filter(Boolean).join(' · '))}</span></span>
        ${l.valor_cents ? `<span class="r"><span class="v">${fmtMoney(l.valor_cents)}</span></span>` : ''}
      </div>`;
    }).join('') : '<div class="empty">Nenhuma locação cadastrada.</div>'}</div>`
      : `<div class="card">${contatos.length ? contatos.map((c) => `<div class="row act" data-contato="${c.id}">
        <span class="tag ${c.tipo === 'cliente' ? 'info' : c.tipo === 'fornecedor' ? 'warn' : 'mut'}">${esc(c.tipo)}</span>
        <span class="g"><span class="t">${esc(c.nome)}</span>
          <span class="s">${esc([c.papel, c.empresa].filter(Boolean).join(' · '))}</span></span>
      </div>`).join('') : '<div class="empty">Nenhum contato cadastrado.</div>'}</div>`}`;

  node.querySelectorAll('[data-aba]').forEach((b) => { b.onclick = () => { aba = b.dataset.aba; store.emit(); }; });
  node.querySelectorAll('[data-loc]').forEach((n) => { n.onclick = () => abrirLocacao(store.get('locacoes', n.dataset.loc), editar); });
  node.querySelectorAll('[data-contato]').forEach((n) => { n.onclick = () => abrirContato(store.get('contatos', n.dataset.contato), editar); });

  return {
    titulo: aba === 'locacoes' ? 'Locações' : 'Contatos',
    node,
    fab: editar ? { label: '+', onClick: () => (aba === 'locacoes' ? novaLocacao() : novoContato()) } : null
  };
}

/* ---------------- locações ---------------- */
function camposLoc(l = {}) {
  return [
    { k: 'nome', label: 'Nome da locação', type: 'texto', req: true, valor: l.nome },
    { k: 'cidade', label: 'Cidade', type: 'texto', valor: l.cidade, meia: true },
    { k: 'uf', label: 'UF', type: 'texto', valor: l.uf, meia: true },
    { k: 'endereco', label: 'Endereço completo', type: 'texto', valor: l.endereco },
    { k: 'contato', label: 'Contato no local', type: 'texto', valor: l.contato },
    { k: 'telefone', label: 'Telefone', type: 'tel', valor: l.telefone },
    { k: 'autorizacao', label: 'Autorização', type: 'select', valor: l.autorizacao || 'pendente', opts: ST_AUT.map((s) => ({ v: s.v, t: s.t })) },
    { k: 'horario', label: 'Horário permitido', type: 'texto', valor: l.horario, ph: '07h às 18h, sem ruído após 22h' },
    { k: 'valor_cents', label: 'Custo da locação', type: 'dinheiro', valor: l.valor_cents },
    { k: 'obs', label: 'Observações', type: 'area', valor: l.obs }
  ];
}
function novaLocacao() {
  abrirForm({ titulo: 'Nova locação', campos: camposLoc(), onSave: async (v) => { await store.insert('locacoes', v); toast('Locação criada.'); } });
}
function abrirLocacao(l, editar) {
  if (!l) return;
  const s = stAut(l.autorizacao);
  const endereco = [l.endereco, l.cidade, l.uf].filter(Boolean).join(', ');
  const eventos = store.doProjeto('eventos').filter((e) => e.locacao_id === l.id);
  const linha = (t, v) => v ? `<div class="row"><span class="g"><span class="s">${esc(t)}</span>
    <span class="t" style="white-space:normal">${esc(v)}</span></span></div>` : '';
  const corpo = el(`<div>
    <div class="card tight">
      ${linha('Cidade', [l.cidade, l.uf].filter(Boolean).join(' — '))}
      ${endereco ? `<div class="row"><span class="g"><span class="s">Endereço</span>
        <span class="t" style="white-space:normal">${esc(endereco)}</span></span>
        <span class="r"><a class="btn sm gho" href="${esc(mapaURL(endereco))}" target="_blank" rel="noopener">mapa</a></span></div>` : ''}
      ${l.contato ? `<div class="row"><span class="g"><span class="s">Contato</span><span class="t">${esc(l.contato)}</span></span>
        ${l.telefone ? `<span class="r"><a class="btn sm gho" href="tel:${esc(l.telefone)}">ligar</a></span>` : ''}</div>` : ''}
      <div class="row"><span class="g"><span class="s">Autorização</span><span class="t">${esc(s.t)}</span></span></div>
      ${linha('Horário permitido', l.horario)}
      ${l.valor_cents ? linha('Custo', fmtMoney(l.valor_cents)) : ''}
      ${linha('Observações', l.obs)}
    </div>
    ${eventos.length ? `<div class="sec"><div class="sec-t">Diárias nesta locação</div></div>
      <div class="card">${eventos.map((e) => `<div class="row"><span class="g">
        <span class="t">${esc(e.titulo)}</span><span class="s">${esc(e.data)}</span></span></div>`).join('')}</div>` : ''}
    ${editar ? '<button class="btn wide gho" data-edit>Editar locação</button>' : ''}
  </div>`);
  const sh = sheet({ titulo: l.nome, corpo });
  corpo.querySelector('[data-edit]')?.addEventListener('click', () => {
    sh.close();
    abrirForm({
      titulo: 'Editar locação', campos: camposLoc(l),
      onSave: async (v) => { await store.update('locacoes', l.id, v); toast('Atualizada.'); },
      onDelete: async () => { await store.remove('locacoes', l.id); toast('Excluída.'); }
    });
  });
}

/* ---------------- contatos ---------------- */
function camposContato(c = {}) {
  return [
    { k: 'nome', label: 'Nome', type: 'texto', req: true, valor: c.nome },
    { k: 'papel', label: 'Cargo / papel', type: 'texto', valor: c.papel },
    { k: 'empresa', label: 'Empresa', type: 'texto', valor: c.empresa },
    { k: 'tipo', label: 'Tipo', type: 'select', valor: c.tipo || 'cliente', opts: TIPOS_CONTATO },
    { k: 'email', label: 'E-mail', type: 'email', valor: c.email },
    { k: 'telefone', label: 'Telefone', type: 'tel', valor: c.telefone },
    { k: 'obs', label: 'Observações', type: 'area', valor: c.obs }
  ];
}
function novoContato() {
  abrirForm({ titulo: 'Novo contato', campos: camposContato(), onSave: async (v) => { await store.insert('contatos', v); toast('Contato criado.'); } });
}
function abrirContato(c, editar) {
  if (!c) return;
  const corpo = el(`<div>
    <div class="card tight">
      ${c.papel ? `<div class="row"><span class="g"><span class="s">Papel</span><span class="t">${esc(c.papel)}</span></span></div>` : ''}
      ${c.empresa ? `<div class="row"><span class="g"><span class="s">Empresa</span><span class="t">${esc(c.empresa)}</span></span></div>` : ''}
      ${c.email ? `<div class="row"><span class="g"><span class="s">E-mail</span>
        <a class="t" href="mailto:${esc(c.email)}">${esc(c.email)}</a></span></div>` : ''}
      ${c.telefone ? `<div class="row"><span class="g"><span class="s">Telefone</span>
        <a class="t" href="tel:${esc(c.telefone)}">${esc(c.telefone)}</a></span></div>` : ''}
      ${c.obs ? `<div class="row"><span class="g"><span class="s">Observações</span>
        <span class="t" style="white-space:normal;font-weight:400">${esc(c.obs)}</span></span></div>` : ''}
    </div>
    ${editar ? '<button class="btn wide gho" data-edit>Editar contato</button>' : ''}
  </div>`);
  const sh = sheet({ titulo: c.nome, corpo });
  corpo.querySelector('[data-edit]')?.addEventListener('click', () => {
    sh.close();
    abrirForm({
      titulo: 'Editar contato', campos: camposContato(c),
      onSave: async (v) => { await store.update('contatos', c.id, v); toast('Atualizado.'); },
      onDelete: async () => { await store.remove('contatos', c.id); toast('Excluído.'); }
    });
  });
}
