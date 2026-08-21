// Contratos: resumo objetivo (o que importa no dia a dia) + parcelas que viram
// contas a receber/pagar automaticamente.
import { store } from '../store.js';
import { can } from '../perms.js';
import { el, abrirForm, sheet, toast, confirmar } from '../ui.js';
import { esc, fmtMoney, fmtMoneyShort, fmtData, prazoTxt, prazoTag, hoje, soma, uid } from '../utils.js';
import { salvarArquivo, abrirArquivo } from '../files.js';

const TIPOS = [
  { v: 'cliente', t: 'Com o cliente (receita)' },
  { v: 'fornecedor', t: 'Com fornecedor (custo)' },
  { v: 'equipe', t: 'Com equipe / elenco' }
];
const tipoTxt = (v) => TIPOS.find((t) => t.v === v)?.t || v;

export function render() {
  const u = store.user;
  const node = el('<div></div>');
  if (!can(u, 'contratos.ver')) {
    node.innerHTML = '<div class="empty">Sem acesso aos contratos.</div>';
    return { titulo: 'Contratos', node };
  }
  const verValor = can(u, 'contratos.valores');
  const editar = can(u, 'projeto.edit') || can(u, 'contas.edit');
  const lista = store.doProjeto('contratos');

  node.innerHTML = lista.length ? lista.map((c) => {
    const parc = c.parcelas || [];
    const pagas = parc.filter((p) => p.status === 'quitado').length;
    return `<div class="card act" data-ctr="${c.id}" style="cursor:pointer">
      <div style="display:flex;gap:10px;align-items:baseline">
        <span style="flex:1;font-weight:650;font-size:15px">${esc(c.titulo)}</span>
        <span class="tag ${c.tipo === 'cliente' ? 'ok' : 'mut'}">${c.tipo === 'cliente' ? 'receita' : c.tipo}</span>
      </div>
      ${(c.contratante || c.contratado) ? `<div class="small muted" style="margin-top:4px">${esc([c.contratante, c.contratado].filter(Boolean).join(' → '))}</div>` : ''}
      <div class="row" style="border:0;padding-top:10px">
        <span class="g"><span class="s">${parc.length ? `${pagas}/${parc.length} parcelas` : 'sem parcelas'}</span>
          <span class="t">${esc(c.assinado_em ? 'assinado ' + fmtData(c.assinado_em) : 'não assinado')}</span></span>
        ${verValor ? `<span class="r"><span class="v">${fmtMoney(c.valor_total_cents)}</span></span>` : ''}
      </div>
    </div>`;
  }).join('') : '<div class="empty">Nenhum contrato cadastrado.<br>Cadastre o resumo do contrato para acompanhar parcelas e prazos.</div>';

  node.querySelectorAll('[data-ctr]').forEach((n) => {
    n.onclick = () => abrirContrato(store.get('contratos', n.dataset.ctr), editar, verValor);
  });

  return { titulo: 'Contratos', node, fab: editar ? { label: '+', onClick: () => novoContrato() } : null };
}

function campos(c = {}) {
  return [
    { k: 'titulo', label: 'Nome do contrato', type: 'texto', req: true, valor: c.titulo, ph: 'Fundação Bradesco — filme institucional' },
    { k: 'tipo', label: 'Tipo', type: 'select', valor: c.tipo || 'cliente', opts: TIPOS },
    { k: 'contratante', label: 'Contratante', type: 'texto', valor: c.contratante },
    { k: 'contratado', label: 'Contratado', type: 'texto', valor: c.contratado },
    { k: 'valor_total_cents', label: 'Valor total', type: 'dinheiro', valor: c.valor_total_cents },
    { k: 'assinado_em', label: 'Assinado em', type: 'data', valor: c.assinado_em },
    { type: 'titulo', label: 'Resumo do que foi combinado', k: '_t1' },
    { k: 'objeto', label: 'Objeto', type: 'area', valor: c.objeto, ph: 'O que a produtora se comprometeu a entregar.' },
    { k: 'entregaveis', label: 'Entregáveis', type: 'area', valor: c.entregaveis, ph: '1 filme 3min + 3 cortes 30s + fotos still' },
    { k: 'prazo_entrega', label: 'Prazo final de entrega', type: 'data', valor: c.prazo_entrega },
    { k: 'direitos', label: 'Direitos e uso', type: 'area', valor: c.direitos, ph: 'Cessão total? Uso interno? Mídia paga?' },
    { k: 'praca', label: 'Praça', type: 'texto', valor: c.praca, ph: 'Brasil / nacional / interno' },
    { k: 'janela', label: 'Janela de uso', type: 'texto', valor: c.janela, ph: '12 meses a partir da entrega' },
    { k: 'exclusividade', label: 'Exclusividade', type: 'texto', valor: c.exclusividade },
    { k: 'multa', label: 'Multas e cancelamento', type: 'area', valor: c.multa },
    { k: 'condicoes_pagto', label: 'Condições de pagamento', type: 'area', valor: c.condicoes_pagto, ph: '50% na assinatura, 50% na entrega, NF em 30 dias' },
    { k: 'obs', label: 'Outras observações', type: 'area', valor: c.obs }
  ];
}

function novoContrato() {
  abrirForm({
    titulo: 'Novo contrato',
    campos: campos(),
    onSave: async (v) => { await store.insert('contratos', { ...v, parcelas: [] }); toast('Contrato criado.'); }
  });
}

function abrirContrato(c, editar, verValor) {
  if (!c) return;
  const corpo = el('<div></div>');

  const pintar = () => {
    const parc = c.parcelas || [];
    const doc = store.doProjeto('documentos').find((d) => d.contrato_id === c.id);
    const linha = (l, v) => v ? `<div class="row"><span class="g"><span class="s">${esc(l)}</span>
      <span class="t" style="white-space:normal;font-weight:500">${esc(v)}</span></span></div>` : '';
    corpo.innerHTML = `
      <div class="small muted" style="margin-bottom:10px">${esc(tipoTxt(c.tipo))}</div>
      ${verValor ? `<div class="grid">
        <div class="kpi"><div class="l">Valor total</div><div class="v">${fmtMoneyShort(c.valor_total_cents)}</div></div>
        <div class="kpi"><div class="l">Recebido/pago</div>
          <div class="v">${fmtMoneyShort(soma(parc.filter((p) => p.status === 'quitado'), (p) => p.valor_cents))}</div></div>
      </div>` : ''}
      <div class="card tight">
        ${linha('Contratante', c.contratante)}${linha('Contratado', c.contratado)}
        ${linha('Assinado em', c.assinado_em ? fmtData(c.assinado_em, { longo: true }) : '')}
        ${linha('Objeto', c.objeto)}${linha('Entregáveis', c.entregaveis)}
        ${linha('Prazo de entrega', c.prazo_entrega ? fmtData(c.prazo_entrega, { longo: true }) + ' · ' + prazoTxt(c.prazo_entrega) : '')}
        ${linha('Direitos e uso', c.direitos)}${linha('Praça', c.praca)}${linha('Janela', c.janela)}
        ${linha('Exclusividade', c.exclusividade)}${linha('Multas', c.multa)}
        ${linha('Condições de pagamento', c.condicoes_pagto)}${linha('Observações', c.obs)}
        <div class="row"><span class="g"><span class="s">Contrato em PDF</span>
          <span class="t">${doc ? esc(doc.nome || 'anexo') : 'sem anexo'}</span></span>
          <span class="r">${doc ? '<button class="btn sm" data-ver>abrir</button>'
        : editar ? '<button class="btn sm gho" data-anexar>anexar</button>' : ''}</span></div>
      </div>
      <div class="sec"><div class="sec-t">Parcelas</div>
        ${editar ? '<button class="btn sm gho" data-nova-parcela>+ parcela</button>' : ''}</div>
      <div class="card">${parc.length ? parc.map((p, i) => `
        <div class="row ${editar ? 'act' : ''}" data-parc="${p.id || i}">
          <span class="tag ${p.status === 'quitado' ? 'ok' : prazoTag(p.venc)}">${i + 1}ª</span>
          <span class="g"><span class="t">${esc(p.condicao || 'parcela')}</span>
            <span class="s">${p.venc ? esc(fmtData(p.venc) + ' · ' + (p.status === 'quitado' ? 'quitada' : prazoTxt(p.venc))) : 'sem data'}</span></span>
          ${verValor ? `<span class="r"><span class="v">${fmtMoney(p.valor_cents)}</span></span>` : ''}
        </div>`).join('') : '<div class="empty">Nenhuma parcela cadastrada.</div>'}</div>
      ${editar && parc.length ? '<button class="btn wide gho" data-gerar>Gerar contas a partir das parcelas</button>' : ''}
      ${editar ? '<button class="btn wide gho" style="margin-top:8px" data-edit>Editar contrato</button>' : ''}`;

    corpo.querySelector('[data-ver]')?.addEventListener('click', async () => {
      try { if (!await abrirArquivo(doc)) toast('Arquivo não encontrado neste aparelho.'); }
      catch (e) { toast('Não consegui abrir: ' + e.message); }
    });
    corpo.querySelector('[data-anexar]')?.addEventListener('click', () => abrirForm({
      titulo: 'Anexar contrato',
      campos: [{ k: 'arquivo', label: 'PDF do contrato', type: 'arquivo', req: true, accept: 'application/pdf,image/*' }],
      onSave: async (v) => {
        const meta = await salvarArquivo(v.arquivo, { pasta: 'contratos' });
        await store.insert('documentos', {
          tipo: 'contrato', titulo: c.titulo, valor_cents: c.valor_total_cents, data: c.assinado_em || hoje(),
          emissor: c.contratante || '', contrato_id: c.id,
          path: meta.path, nome: meta.nome, tamanho: meta.tamanho, mime: meta.tipo
        });
        toast('Contrato anexado.'); pintar(); store.emit();
      }
    }));
    corpo.querySelector('[data-nova-parcela]')?.addEventListener('click', () => abrirForm({
      titulo: 'Nova parcela',
      campos: [
        { k: 'condicao', label: 'Condição', type: 'texto', req: true, ph: 'Na assinatura / na entrega / 30 dias' },
        { k: 'valor_cents', label: 'Valor', type: 'dinheiro', req: true },
        { k: 'venc', label: 'Vencimento previsto', type: 'data', valor: hoje() }
      ],
      onSave: async (v) => {
        const novas = [...(c.parcelas || []), { id: uid('parc'), ...v, status: 'aberto' }];
        await store.update('contratos', c.id, { parcelas: novas });
        c.parcelas = novas; pintar(); store.emit(); toast('Parcela adicionada.');
      }
    }));
    corpo.querySelectorAll('[data-parc]').forEach((n) => {
      if (!editar) return;
      n.onclick = () => {
        const p = (c.parcelas || []).find((x) => x.id === n.dataset.parc);
        if (!p) return;
        abrirForm({
          titulo: 'Parcela',
          campos: [
            { k: 'condicao', label: 'Condição', type: 'texto', valor: p.condicao },
            { k: 'valor_cents', label: 'Valor', type: 'dinheiro', valor: p.valor_cents },
            { k: 'venc', label: 'Vencimento', type: 'data', valor: p.venc },
            {
              k: 'status', label: 'Status', type: 'select', valor: p.status || 'aberto',
              opts: [{ v: 'aberto', t: 'Em aberto' }, { v: 'quitado', t: 'Quitada' }]
            }
          ],
          onSave: async (v) => {
            Object.assign(p, v);
            await store.update('contratos', c.id, { parcelas: c.parcelas });
            pintar(); store.emit();
          },
          onDelete: async () => {
            c.parcelas = c.parcelas.filter((x) => x.id !== p.id);
            await store.update('contratos', c.id, { parcelas: c.parcelas });
            pintar(); store.emit();
          }
        });
      };
    });
    corpo.querySelector('[data-gerar]')?.addEventListener('click', async () => {
      if (!await confirmar('Criar uma conta para cada parcela ainda não lançada?')) return;
      let n = 0;
      for (const [i, p] of (c.parcelas || []).entries()) {
        const jaTem = store.doProjeto('contas').find((x) => x.parcela_id === p.id);
        if (jaTem) continue;
        await store.insert('contas', {
          tipo: c.tipo === 'cliente' ? 'receber' : 'pagar',
          descricao: `${c.titulo} — ${p.condicao || (i + 1) + 'ª parcela'}`,
          contraparte: c.tipo === 'cliente' ? c.contratante : c.contratado,
          valor_cents: p.valor_cents, venc: p.venc, status: p.status === 'quitado' ? 'quitado' : 'aberto',
          contrato_id: c.id, parcela_id: p.id, parcela: `${i + 1}/${c.parcelas.length}`, categoria: 'contrato'
        });
        n++;
      }
      toast(n ? `${n} conta(s) criada(s).` : 'Todas as parcelas já tinham conta.');
      store.emit();
    });
    corpo.querySelector('[data-edit]')?.addEventListener('click', () => {
      sh.close();
      abrirForm({
        titulo: 'Editar contrato', campos: campos(c),
        onSave: async (v) => { await store.update('contratos', c.id, v); toast('Atualizado.'); },
        onDelete: async () => { await store.remove('contratos', c.id); toast('Excluído.'); }
      });
    });
  };
  pintar();
  const sh = sheet({ titulo: c.titulo, corpo });
}
