// Equipe: quem é quem, cachê, contrato, e as confirmações de cada um
// (presença, passagem, hospedagem, recebimento).
import { store, membros } from '../store.js';
import { can } from '../perms.js';
import { PAPEIS } from '../perms.js';
import { el, abrirForm, sheet, toast } from '../ui.js';
import { esc, fmtMoney, hoje, iniciais, soma } from '../utils.js';

const TIPOS_CONF = [
  { v: 'presenca', t: 'Presença em diária' },
  { v: 'passagem', t: 'Recebimento de passagem' },
  { v: 'hospedagem', t: 'Hospedagem confirmada' },
  { v: 'contrato', t: 'Contrato assinado' },
  { v: 'pagamento', t: 'Recebimento do pagamento' },
  { v: 'outro', t: 'Outro' }
];
export const tipoConf = (v) => TIPOS_CONF.find((t) => t.v === v)?.t || v;

const ST_CONTRATO = [
  { v: 'na', t: 'Não se aplica' }, { v: 'pendente', t: 'A enviar' },
  { v: 'enviado', t: 'Enviado' }, { v: 'assinado', t: 'Assinado' }
];

export function render() {
  const u = store.user;
  const node = el('<div></div>');
  if (!can(u, 'equipe.ver')) {
    node.innerHTML = '<div class="empty">Sem acesso à lista de equipe.</div>';
    return { titulo: 'Equipe', node };
  }
  const editar = can(u, 'equipe.edit');
  const verGrana = can(u, 'orcamento.ver');
  const lista = membros();
  const confs = store.doProjeto('confirmacoes');

  const custoEquipe = soma(lista, (m) => (m.cache_cents || 0) * (m.diarias || 1));

  node.innerHTML = `
    ${verGrana ? `<div class="grid">
      <div class="kpi"><div class="l">Pessoas</div><div class="v">${lista.length}</div></div>
      <div class="kpi"><div class="l">Custo de equipe</div><div class="v">${fmtMoney(custoEquipe)}</div>
        <div class="h">cachê × diárias</div></div>
    </div>` : ''}
    <div class="card">${lista.length ? lista.map((m) => {
      const meus = confs.filter((c) => c.membro_id === m.id);
      const pend = meus.filter((c) => c.status === 'pendente').length;
      const p = PAPEIS[m.papel] || PAPEIS.equipe;
      return `<div class="row act" data-membro="${m.id}">
        <span class="avatar">${esc(iniciais(m.nome))}</span>
        <span class="g"><span class="t">${esc(m.nome)}</span>
          <span class="s">${esc([m.funcao, p.curto].filter(Boolean).join(' · '))}</span></span>
        <span class="r">${pend ? `<span class="tag warn">${pend} pend.</span>`
        : meus.length ? '<span class="tag ok">ok</span>' : ''}
          ${verGrana && m.cache_cents ? `<div class="small muted mono" style="margin-top:3px">${fmtMoney(m.cache_cents)}</div>` : ''}</span>
      </div>`;
    }).join('') : '<div class="empty">Ninguém cadastrado ainda.</div>'}</div>
    <div class="banner small">Cada pessoa entra no app e vê só a parte dela: a própria agenda, o
      próprio cachê, as próprias confirmações e os próprios gastos.</div>`;

  node.querySelectorAll('[data-membro]').forEach((n) => {
    n.onclick = () => abrirMembro(store.get('membros', n.dataset.membro), editar, verGrana);
  });

  return { titulo: 'Equipe', node, fab: editar ? { label: '+', onClick: () => novoMembro() } : null };
}

function campos(m = {}) {
  return [
    { k: 'nome', label: 'Nome', type: 'texto', req: true, valor: m.nome },
    { k: 'funcao', label: 'Função no projeto', type: 'texto', valor: m.funcao, ph: 'Direção de fotografia' },
    {
      k: 'papel', label: 'Alçada no sistema', type: 'select', valor: m.papel || 'equipe',
      opts: Object.entries(PAPEIS).map(([v, p]) => ({ v, t: p.nome })),
      hint: Object.values(PAPEIS).map((p) => `${p.curto}: ${p.desc}`).join('\n')
    },
    { k: 'email', label: 'E-mail', type: 'email', valor: m.email },
    { k: 'telefone', label: 'Telefone / WhatsApp', type: 'tel', valor: m.telefone },
    { k: 'cache_cents', label: 'Cachê (por diária)', type: 'dinheiro', valor: m.cache_cents },
    { k: 'diarias', label: 'Nº de diárias', type: 'numero', valor: m.diarias ?? 1 },
    { k: 'contrato_status', label: 'Contrato', type: 'select', valor: m.contrato_status || 'na', opts: ST_CONTRATO },
    { k: 'doc', label: 'CPF/CNPJ', type: 'texto', valor: m.doc },
    { k: 'chave_pix', label: 'Chave Pix / dados bancários', type: 'texto', valor: m.chave_pix },
    { k: 'obs', label: 'Observações', type: 'area', valor: m.obs }
  ];
}

function novoMembro() {
  abrirForm({
    titulo: 'Adicionar pessoa',
    campos: campos(),
    onSave: async (v) => { await store.insert('membros', { ...v, ativo: true }); toast('Pessoa adicionada.'); }
  });
}

function abrirMembro(m, editar, verGrana) {
  if (!m) return;
  const corpo = el('<div></div>');
  const p = PAPEIS[m.papel] || PAPEIS.equipe;

  const pintar = () => {
    const confs = store.doProjeto('confirmacoes').filter((c) => c.membro_id === m.id);
    const gastos = store.doProjeto('lancamentos').filter((l) => l.membro_id === m.id);
    const contas = store.doProjeto('contas').filter((c) => c.membro_id === m.id);
    corpo.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px">
        <span class="avatar" style="width:48px;height:48px;font-size:16px">${esc(iniciais(m.nome))}</span>
        <div><div style="font-weight:650">${esc(m.funcao || '—')}</div>
          <div class="small muted">${esc(p.nome)}</div></div>
      </div>
      <div class="card tight">
        ${m.email ? `<div class="row"><span class="g"><span class="s">E-mail</span><span class="t">${esc(m.email)}</span></span></div>` : ''}
        ${m.telefone ? `<div class="row"><span class="g"><span class="s">Telefone</span>
          <a class="t" href="tel:${esc(m.telefone)}">${esc(m.telefone)}</a></span></div>` : ''}
        ${verGrana ? `<div class="row"><span class="g"><span class="s">Cachê</span>
          <span class="t">${fmtMoney(m.cache_cents)} × ${m.diarias ?? 1} diária(s) = ${fmtMoney((m.cache_cents || 0) * (m.diarias || 1))}</span></span></div>` : ''}
        <div class="row"><span class="g"><span class="s">Contrato</span>
          <span class="t">${esc(ST_CONTRATO.find((s) => s.v === (m.contrato_status || 'na'))?.t)}</span></span></div>
        ${verGrana && m.chave_pix ? `<div class="row"><span class="g"><span class="s">Pix</span><span class="t">${esc(m.chave_pix)}</span></span></div>` : ''}
        ${m.obs ? `<div class="row"><span class="g"><span class="s">Observações</span>
          <span class="t" style="white-space:normal;font-weight:400">${esc(m.obs)}</span></span></div>` : ''}
      </div>
      <div class="sec"><div class="sec-t">Confirmações</div>
        ${editar ? '<button class="btn sm gho" data-nova-conf>+ pedir</button>' : ''}</div>
      <div class="card">${confs.length ? confs.map((c) => `<div class="row">
          <span class="tag ${c.status === 'confirmado' ? 'ok' : c.status === 'recusado' ? 'bad' : 'warn'}">
            ${c.status === 'confirmado' ? '✓' : c.status === 'recusado' ? '✕' : '…'}</span>
          <span class="g"><span class="t">${esc(c.titulo)}</span>
            <span class="s">${esc(tipoConf(c.tipo))}</span></span>
        </div>`).join('') : '<div class="empty">Nada pendente.</div>'}</div>
      ${verGrana ? `<div class="sec"><div class="sec-t">Financeiro da pessoa</div></div>
      <div class="card tight">
        <div class="row"><span class="g"><span class="t">Gastos lançados</span>
          <span class="s">${gastos.length} lançamento(s)</span></span>
          <span class="r"><span class="v">${fmtMoney(soma(gastos, (g) => g.valor_cents))}</span></span></div>
        <div class="row"><span class="g"><span class="t">Contas em aberto</span>
          <span class="s">${contas.filter((c) => c.status === 'aberto').length} conta(s)</span></span>
          <span class="r"><span class="v">${fmtMoney(soma(contas.filter((c) => c.status === 'aberto'), (c) => c.valor_cents))}</span></span></div>
      </div>` : ''}
      ${editar ? `<div class="btns" style="margin-top:6px">
        ${verGrana && m.cache_cents ? '<button class="btn" style="flex:1" data-gerar-cache>Lançar cachê a pagar</button>' : ''}
        <button class="btn gho" style="flex:1" data-edit>Editar</button></div>` : ''}`;

    corpo.querySelector('[data-nova-conf]')?.addEventListener('click', () => abrirForm({
      titulo: 'Pedir confirmação',
      subtitulo: `${m.nome} vê o pedido em "Meu painel" e responde pelo celular.`,
      campos: [
        { k: 'tipo', label: 'Tipo', type: 'select', valor: 'passagem', opts: TIPOS_CONF },
        { k: 'titulo', label: 'O que precisa confirmar', type: 'texto', req: true, ph: 'Passagem GRU→SSA 12/05 08h' },
        { k: 'obs', label: 'Detalhes', type: 'area', ph: 'Localizador, horário, quem paga…' }
      ],
      onSave: async (v) => {
        await store.insert('confirmacoes', { membro_id: m.id, status: 'pendente', ...v });
        toast('Pedido enviado.'); pintar(); store.emit();
      }
    }));
    corpo.querySelector('[data-gerar-cache]')?.addEventListener('click', async () => {
      const total = (m.cache_cents || 0) * (m.diarias || 1);
      await store.insert('contas', {
        tipo: 'pagar', descricao: `Cachê — ${m.nome}${m.funcao ? ' (' + m.funcao + ')' : ''}`,
        contraparte: m.nome, valor_cents: total, venc: hoje(), status: 'aberto',
        membro_id: m.id, categoria: 'cachê'
      });
      toast('Conta a pagar criada.'); store.emit();
    });
    corpo.querySelector('[data-edit]')?.addEventListener('click', () => {
      sh.close();
      abrirForm({
        titulo: 'Editar pessoa', campos: campos(m),
        onSave: async (v) => { await store.update('membros', m.id, v); toast('Atualizado.'); },
        onDelete: async () => { await store.remove('membros', m.id); toast('Removido.'); }
      });
    });
  };
  pintar();
  const sh = sheet({ titulo: m.nome, corpo });
}
