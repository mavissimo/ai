// Equipe: quem é quem, cachê, contrato, e as confirmações de cada um
// (presença, passagem, hospedagem, recebimento).
import { store, membros } from '../store.js';
import { can } from '../perms.js';
import { PAPEIS } from '../perms.js';
import { el, abrirForm, sheet, toast } from '../ui.js';
import { esc, fmtMoney, hoje, iniciais, soma } from '../utils.js';
import { retencoes, RET_PADRAO } from '../calc.js';

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

  const custoEquipe = soma(lista, (m) => (m.cache_cents || 0) * (m.diarias || 0) + (m.perdiem_cents || 0));

  node.innerHTML = `
    ${verGrana ? `<div class="grid">
      <div class="kpi"><div class="l">Pessoas</div><div class="v">${lista.length}</div></div>
      <div class="kpi"><div class="l">Custo de equipe</div><div class="v">${fmtMoney(custoEquipe)}</div>
        <div class="h">cachês e per diems fechados</div></div>
    </div>` : ''}
    <div class="card">${lista.length ? lista.map((m) => {
      const meus = confs.filter((c) => c.membro_id === m.id);
      const pend = meus.filter((c) => c.status === 'pendente').length;
      const p = PAPEIS[m.papel] || PAPEIS.equipe;
      return `<div class="row act" data-membro="${m.id}">
        <span class="avatar">${esc(iniciais(m.nome))}</span>
        <span class="g"><span class="t">${esc(m.nome)}</span>
          <span class="s">${esc([m.funcao, p.curto, (m.tipo || 'pf').toUpperCase()].filter(Boolean).join(' · '))}</span></span>
        <span class="r">${pend ? `<span class="tag warn">${pend} pend.</span>`
        : meus.length ? '<span class="tag ok">ok</span>' : ''}
          ${verGrana && (m.cache_cents || m.perdiem_cents) ? `<div class="small muted mono" style="margin-top:3px">
            ${fmtMoney((m.cache_cents || 0) * (m.diarias || 0) + (m.perdiem_cents || 0))}</div>` : ''}</span>
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
    { k: 'cache_cents', label: 'Cachê negociado (por diária)', type: 'dinheiro', valor: m.cache_cents,
      hint: 'O valor realmente fechado com a pessoa.' },
    { k: 'cache_orcado_cents', label: 'Cachê orçado (por diária)', type: 'dinheiro', valor: m.cache_orcado_cents },
    { k: 'diarias', label: 'Nº de diárias', type: 'numero', valor: m.diarias ?? 1 },
    { k: 'perdiem_cents', label: 'Per diem (total)', type: 'dinheiro', valor: m.perdiem_cents },
    { k: 'contrato_status', label: 'Contrato', type: 'select', valor: m.contrato_status || 'na', opts: ST_CONTRATO },
    { type: 'titulo', label: 'Como esta pessoa é paga', k: '_t_fisc' },
    {
      k: 'tipo', label: 'Pessoa física ou jurídica', type: 'select', valor: m.tipo || 'pf',
      opts: [{ v: 'pf', t: 'Pessoa física (RPA)' }, { v: 'pj', t: 'Pessoa jurídica (nota fiscal)' }],
      hint: 'Muda quais impostos são retidos no pagamento.'
    },
    { k: 'doc', label: 'CPF / CNPJ', type: 'texto', valor: m.doc },
    { k: 'chave_pix', label: 'Chave Pix / dados bancários', type: 'texto', valor: m.chave_pix },
    { k: 'ret_inss', label: 'INSS retido (%)', type: 'numero', step: '0.01', valor: m.ret_inss, meia: true },
    { k: 'ret_irrf', label: 'IRRF retido (%)', type: 'numero', step: '0.01', valor: m.ret_irrf, meia: true },
    { k: 'ret_iss', label: 'ISS retido (%)', type: 'numero', step: '0.01', valor: m.ret_iss, meia: true },
    {
      k: 'ret_pcc', label: 'PIS/COFINS/CSLL (%)', type: 'numero', step: '0.01', valor: m.ret_pcc, meia: true,
      hint: 'Em branco, o app usa o padrão do tipo: PF ' + RET_PADRAO.pf.inss + '% de INSS; PJ '
        + RET_PADRAO.pj.irrf + '% de IRRF e ' + RET_PADRAO.pj.pcc + '% de PIS/COFINS/CSLL. Confira com a sua contabilidade.'
    },
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
    const bruto = (m.cache_cents || 0) * (m.diarias || 0);
    const orcado = (m.cache_orcado_cents || 0) * (m.diarias || 0);
    const r = retencoes(m, bruto);
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
        ${verGrana ? `<div class="row"><span class="g"><span class="s">Cachê negociado</span>
          <span class="t">${bruto ? `${fmtMoney(m.cache_cents)} × ${m.diarias ?? 1} diária(s) = ${fmtMoney(bruto)}`
            : 'nada fechado — não sai como pagamento'}</span></span></div>
        ${orcado && orcado !== bruto ? `<div class="row"><span class="g"><span class="s">Cachê orçado</span>
          <span class="t">${fmtMoney(m.cache_orcado_cents)} × ${m.diarias ?? 1} = ${fmtMoney(orcado)}</span></span>
          <span class="r"><span class="v">${fmtMoney(orcado - bruto)}</span>
            <div class="small muted">diferença</div></span></div>` : ''}
        ${m.perdiem_cents ? `<div class="row"><span class="g"><span class="s">Per diem</span>
          <span class="t">negociado</span></span>
          <span class="r"><span class="v">${fmtMoney(m.perdiem_cents)}</span></span></div>` : ''}
        <div class="row"><span class="g"><span class="s">Retenções (${r.tipo.toUpperCase()})</span>
          <span class="t" style="white-space:normal;font-weight:500">${[
            r.inss ? `INSS ${r.percentuais.inss}% · ${fmtMoney(r.inss)}` : '',
            r.irrf ? `IRRF ${r.percentuais.irrf}% · ${fmtMoney(r.irrf)}` : '',
            r.iss ? `ISS ${r.percentuais.iss}% · ${fmtMoney(r.iss)}` : '',
            r.pcc ? `PIS/COFINS/CSLL ${r.percentuais.pcc}% · ${fmtMoney(r.pcc)}` : ''
          ].filter(Boolean).join('<br>') || 'nenhuma'}</span></span>
          <span class="r"><span class="v">− ${fmtMoney(r.total)}</span></span></div>
        <div class="row"><span class="g"><span class="s">Líquido a pagar</span>
          <span class="t">valor que cai na conta</span></span>
          <span class="r"><span class="v" style="color:var(--ok)">${fmtMoney(r.liquido)}</span></span></div>` : ''}
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
        ${verGrana && bruto ? '<button class="btn" style="flex:1" data-gerar-cache>Lançar cachê a pagar</button>' : ''}
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
      await store.insert('contas', {
        tipo: 'pagar', descricao: `Cachê — ${m.nome}${m.funcao ? ' (' + m.funcao + ')' : ''}`,
        contraparte: m.nome, valor_cents: bruto, retencao_cents: r.total, liquido_cents: r.liquido,
        venc: hoje(), status: 'aberto', membro_id: m.id, categoria: 'cachê',
        nf_status: m.tipo === 'pj' ? 'a_receber' : 'na',
        obs: r.total ? `Retenções: ${fmtMoney(r.total)}. Líquido ${fmtMoney(r.liquido)}.` : ''
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
