// Contas a pagar e a receber, com vencimento, vínculo e comprovante.
import { store, membros, nomeMembro } from '../store.js';
import { can } from '../perms.js';
import { el, abrirForm, sheet, toast } from '../ui.js';
import { esc, fmtMoney, fmtMoneyShort, fmtData, prazoTxt, prazoTag, hoje, ordenar, soma, diasAte } from '../utils.js';
import { ST_CONTA } from '../calc.js';
import { salvarArquivo, abrirArquivo } from '../files.js';

let aba = 'pagar';

export function render() {
  const u = store.user;
  const node = el('<div></div>');
  if (!can(u, 'contas.ver')) {
    node.innerHTML = '<div class="empty">Sem acesso a contas a pagar/receber.</div>';
    return { titulo: 'Contas', node };
  }
  const editar = can(u, 'contas.edit');
  const todas = store.doProjeto('contas');
  const lista = ordenar(todas.filter((c) => c.tipo === aba), (c) => c.venc || '9999');
  const abertas = lista.filter((c) => c.status === 'aberto');
  const vencidas = abertas.filter((c) => (diasAte(c.venc) ?? 9) < 0);

  node.innerHTML = `
    <div class="chips">
      <button class="chip ${aba === 'pagar' ? 'on' : ''}" data-aba="pagar">A pagar</button>
      <button class="chip ${aba === 'receber' ? 'on' : ''}" data-aba="receber">A receber</button>
    </div>
    <div class="grid">
      <div class="kpi"><div class="l">Em aberto</div><div class="v">${fmtMoneyShort(soma(abertas, (c) => c.valor_cents))}</div>
        <div class="h">${abertas.length} lançamento(s)</div></div>
      <div class="kpi ${vencidas.length ? 'bad' : 'ok'}"><div class="l">Vencido</div>
        <div class="v">${fmtMoneyShort(soma(vencidas, (c) => c.valor_cents))}</div>
        <div class="h">${vencidas.length} conta(s)</div></div>
    </div>
    <div class="card">${lista.length ? lista.map((c) => {
      const st = ST_CONTA[c.status] || ST_CONTA.aberto;
      return `<div class="row act" data-conta="${c.id}">
        <span class="tag ${c.status === 'quitado' ? 'ok' : prazoTag(c.venc)}">${c.venc ? esc(fmtData(c.venc, { ano: false })) : '—'}</span>
        <span class="g"><span class="t">${esc(c.descricao)}</span>
          <span class="s">${esc([c.contraparte, c.status === 'aberto' ? prazoTxt(c.venc) : st.t, c.parcela ? 'parcela ' + c.parcela : '']
        .filter(Boolean).join(' · '))}</span></span>
        <span class="r"><span class="v">${fmtMoney(c.valor_cents)}</span></span>
      </div>`;
    }).join('') : '<div class="empty">Nada aqui.</div>'}</div>`;

  node.querySelectorAll('[data-aba]').forEach((b) => { b.onclick = () => { aba = b.dataset.aba; store.emit(); }; });
  node.querySelectorAll('[data-conta]').forEach((n) => { n.onclick = () => abrirConta(store.get('contas', n.dataset.conta), editar); });

  return { titulo: 'Contas', node, fab: editar ? { label: '+', onClick: () => novaConta(aba) } : null };
}

function campos(c = {}, tipo) {
  return [
    {
      k: 'tipo', label: 'Tipo', type: 'select', valor: c.tipo || tipo || 'pagar',
      opts: [{ v: 'pagar', t: 'A pagar' }, { v: 'receber', t: 'A receber' }]
    },
    { k: 'descricao', label: 'Descrição', type: 'texto', req: true, valor: c.descricao, ph: 'Cachê da direção de fotografia' },
    { k: 'contraparte', label: 'Para quem / de quem', type: 'texto', valor: c.contraparte },
    { k: 'valor_cents', label: 'Valor', type: 'dinheiro', req: true, valor: c.valor_cents },
    { k: 'venc', label: 'Vencimento', type: 'data', valor: c.venc || hoje() },
    {
      k: 'status', label: 'Status', type: 'select', valor: c.status || 'aberto',
      opts: Object.entries(ST_CONTA).map(([v, o]) => ({ v, t: o.t }))
    },
    {
      k: 'membro_id', label: 'Pessoa da equipe (opcional)', type: 'select', valor: c.membro_id || '',
      opts: [{ v: '', t: '— nenhuma —' }, ...membros().map((m) => ({ v: m.id, t: m.nome }))]
    },
    { k: 'categoria', label: 'Categoria', type: 'texto', valor: c.categoria, ph: 'cachê, fornecedor, parcela de contrato…' },
    { k: 'obs', label: 'Observações', type: 'area', valor: c.obs }
  ];
}

function novaConta(tipo) {
  abrirForm({
    titulo: tipo === 'receber' ? 'Nova conta a receber' : 'Nova conta a pagar',
    campos: campos({}, tipo),
    onSave: async (v) => { await store.insert('contas', v); toast('Conta criada.'); }
  });
}

function abrirConta(c, editar) {
  if (!c) return;
  const st = ST_CONTA[c.status] || ST_CONTA.aberto;
  const corpo = el('<div></div>');
  const pintar = () => {
    const doc = store.doProjeto('documentos').find((d) => d.conta_id === c.id);
    corpo.innerHTML = `
      <div class="center" style="padding:6px 0 14px">
        <div style="font-size:30px;font-weight:700;letter-spacing:-.5px">${fmtMoney(c.valor_cents)}</div>
        <span class="tag ${c.status === 'quitado' ? 'ok' : prazoTag(c.venc)}" style="margin-top:8px">
          ${c.status === 'aberto' ? esc('vence ' + prazoTxt(c.venc)) : esc(st.t)}</span>
      </div>
      <div class="card tight">
        <div class="row"><span class="g"><span class="s">${c.tipo === 'pagar' ? 'Pagar para' : 'Receber de'}</span>
          <span class="t">${esc(c.contraparte || '—')}</span></span></div>
        <div class="row"><span class="g"><span class="s">Vencimento</span>
          <span class="t">${esc(fmtData(c.venc, { longo: true }))}</span></span></div>
        ${c.categoria ? `<div class="row"><span class="g"><span class="s">Categoria</span><span class="t">${esc(c.categoria)}</span></span></div>` : ''}
        ${c.membro_id ? `<div class="row"><span class="g"><span class="s">Pessoa</span><span class="t">${esc(nomeMembro(c.membro_id))}</span></span></div>` : ''}
        ${c.obs ? `<div class="row"><span class="g"><span class="s">Observações</span>
          <span class="t" style="white-space:normal;font-weight:400">${esc(c.obs)}</span></span></div>` : ''}
        <div class="row"><span class="g"><span class="s">Comprovante</span>
          <span class="t">${doc ? esc(doc.nome || 'anexo') : 'sem anexo'}</span></span>
          <span class="r">${doc ? '<button class="btn sm" data-ver>abrir</button>'
        : editar ? '<button class="btn sm gho" data-anexar>anexar</button>' : ''}</span></div>
      </div>
      ${editar && c.status === 'aberto' ? `<button class="btn wide pri" data-quitar>
        Marcar como ${c.tipo === 'pagar' ? 'pago' : 'recebido'}</button>` : ''}
      ${editar ? '<button class="btn wide gho" style="margin-top:8px" data-edit>Editar</button>' : ''}`;

    corpo.querySelector('[data-ver]')?.addEventListener('click', async () => {
      try { if (!await abrirArquivo(doc)) toast('Arquivo não encontrado neste aparelho.'); }
      catch (e) { toast('Não consegui abrir: ' + e.message); }
    });
    corpo.querySelector('[data-anexar]')?.addEventListener('click', () => abrirForm({
      titulo: 'Anexar comprovante',
      campos: [{ k: 'arquivo', label: 'Arquivo', type: 'arquivo', req: true }],
      onSave: async (v) => {
        const meta = await salvarArquivo(v.arquivo, { pasta: 'comprovantes' });
        await store.insert('documentos', {
          tipo: 'comprovante', titulo: c.descricao, valor_cents: c.valor_cents, data: c.venc,
          emissor: c.contraparte || '', conta_id: c.id, membro_id: c.membro_id || null,
          path: meta.path, nome: meta.nome, tamanho: meta.tamanho, mime: meta.tipo
        });
        toast('Comprovante anexado.'); pintar(); store.emit();
      }
    }));
    corpo.querySelector('[data-quitar]')?.addEventListener('click', async () => {
      await store.update('contas', c.id, { status: 'quitado', quitado_em: hoje() });
      c.status = 'quitado';
      // espelha no fluxo de caixa
      await store.insert('lancamentos', {
        tipo: c.tipo === 'pagar' ? 'saida' : 'entrada', descricao: c.descricao,
        valor_cents: c.valor_cents, rubrica: c.categoria || 'Outros', data: hoje(),
        fornecedor: c.contraparte || '', membro_id: c.membro_id || null,
        status: c.tipo === 'pagar' ? 'pago' : 'recebido', conta_id: c.id, obs: 'Gerado ao quitar a conta.'
      });
      await store.log(`Conta "${c.descricao}" quitada (${fmtMoney(c.valor_cents)})`, 'conta');
      toast('Quitada.'); pintar(); store.emit();
    });
    corpo.querySelector('[data-edit]')?.addEventListener('click', () => {
      sh.close();
      abrirForm({
        titulo: 'Editar conta', campos: campos(c),
        onSave: async (v) => { await store.update('contas', c.id, v); toast('Atualizada.'); },
        onDelete: async () => { await store.remove('contas', c.id); toast('Excluída.'); }
      });
    });
  };
  pintar();
  const sh = sheet({ titulo: c.descricao, corpo });
}
