// Custo fixo da produtora: o que existe com ou sem projeto — contador, software,
// aluguel, seguro anual. Marcando "ratear", ele entra no cálculo de quanto o
// projeto realmente custa, em vez de sumir no meio do mês.
import { store } from '../store.js';
import { can } from '../perms.js';
import { el, abrirForm, sheet, toast, btnOlho } from '../ui.js';
import { esc, fmtMoney, ordenar, soma, valoresOcultos } from '../utils.js';

const PERIODOS = [{ v: 'mensal', t: 'Por mês' }, { v: 'anual', t: 'Por ano' }];
export const porMes = (f) => (f.periodo === 'anual' ? Math.round(f.valor_cents / 12) : f.valor_cents);

export function render() {
  const u = store.user;
  const node = el('<div></div>');
  if (!can(u, 'lucro.ver')) {
    node.innerHTML = '<div class="empty">Só quem vê a margem enxerga o custo fixo da produtora.</div>';
    return { titulo: 'Despesas fixas', node };
  }
  const editar = can(u, 'orcamento.edit');
  const lista = ordenar(store.doProjeto('fixas'), (f) => f.nome);
  const mes = soma(lista, porMes);
  const rateado = soma(lista.filter((f) => f.rateia), porMes);
  const meses = Math.max(1, Number(store.projeto?.meses_projeto || 1));

  node.innerHTML = `
    <div class="grid">
      <div class="kpi"><div class="l">Por mês</div><div class="v">${fmtMoney(mes)}</div>
        <div class="h">${lista.length} despesa(s)</div></div>
      <div class="kpi ${rateado ? 'warn' : ''}"><div class="l">Entra neste projeto</div>
        <div class="v">${fmtMoney(rateado * meses)}</div>
        <div class="h">${fmtMoney(rateado)} × ${meses} ${meses === 1 ? 'mês' : 'meses'}</div></div>
    </div>
    <div class="card lista">${lista.length ? lista.map((f) => `<div class="row act" data-fixa="${f.id}">
      <span class="g"><span class="t">${esc(f.nome)}</span>
        <span class="s">${esc([f.categoria, PERIODOS.find((p) => p.v === f.periodo)?.t,
    f.rateia ? 'entra no projeto' : 'fora do projeto'].filter(Boolean).join(' · '))}</span></span>
      <span class="r"><span class="v">${fmtMoney(f.valor_cents)}</span>
        ${f.periodo === 'anual' ? `<div class="small muted">${fmtMoney(porMes(f))}/mês</div>` : ''}</span>
    </div>`).join('') : '<div class="empty">Nenhuma despesa fixa cadastrada.</div>'}</div>
    <div class="banner small">Só o que estiver marcado como <b>ratear</b> entra na conta do projeto.
      O resto fica aqui como memória do custo da produtora.</div>`;

  node.querySelectorAll('[data-fixa]').forEach((n) => {
    n.onclick = () => abrir(store.get('fixas', n.dataset.fixa), editar);
  });
  return { titulo: 'Despesas fixas', node, fab: editar ? { label: '+', onClick: () => editarFixa({}) } : null };
}

function abrir(f, editar) {
  if (!f) return;
  const corpo = el(`<div>
    <div class="card tight">
      <div class="row"><span class="g"><span class="s">Valor</span>
        <span class="t">${fmtMoney(f.valor_cents)} ${esc(PERIODOS.find((p) => p.v === f.periodo)?.t.toLowerCase() || '')}</span></span></div>
      ${f.categoria ? `<div class="row"><span class="g"><span class="s">Categoria</span>
        <span class="t">${esc(f.categoria)}</span></span></div>` : ''}
      <div class="row"><span class="g"><span class="s">No custo do projeto</span>
        <span class="t">${f.rateia ? 'sim, rateado' : 'não'}</span></span></div>
      ${f.obs ? `<div class="row"><span class="g"><span class="s">Observação</span>
        <span class="t" style="white-space:normal;font-weight:400">${esc(f.obs)}</span></span></div>` : ''}
    </div>
    ${editar ? '<button class="btn wide gho" data-edit>Editar</button>' : ''}
  </div>`);
  const sh = sheet({ titulo: f.nome, corpo });
  corpo.querySelector('[data-edit]')?.addEventListener('click', () => { sh.close(); editarFixa(f); });
}

function editarFixa(f) {
  const nova = !f.id;
  abrirForm({
    titulo: nova ? 'Nova despesa fixa' : 'Editar despesa',
    campos: [
      { k: 'nome', label: 'O que é', type: 'texto', req: true, valor: f.nome || '' },
      { k: 'valor_cents', label: 'Valor', type: 'dinheiro', req: true, valor: f.valor_cents, meia: true },
      { k: 'periodo', label: 'A cada', type: 'select', valor: f.periodo || 'mensal', meia: true, opts: PERIODOS },
      {
        k: 'categoria', label: 'Categoria', type: 'livre', valor: f.categoria || '',
        opts: ['Contabilidade', 'Software', 'Aluguel', 'Seguro', 'Telefonia e internet',
          'Equipamento próprio', 'Impostos fixos', 'Outros'].map((v) => ({ v, t: v })),
        ph: 'Escreva a categoria'
      },
      { k: 'rateia', label: 'Entra no custo deste projeto', type: 'check', valor: f.rateia !== false,
        hint: 'Marcado, o valor mensal × a duração do projeto entra no cálculo da margem.' },
      { k: 'obs', label: 'Observação', type: 'area', valor: f.obs || '' }
    ],
    onSave: async (v) => {
      if (nova) await store.insert('fixas', v);
      else await store.update('fixas', f.id, v);
      toast(nova ? 'Despesa cadastrada.' : 'Atualizada.');
    },
    onDelete: nova ? null : async () => { await store.remove('fixas', f.id); toast('Removida.'); }
  });
}
