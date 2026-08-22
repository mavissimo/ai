// Equipe: quem é quem, cachê, contrato, e as confirmações de cada um
// (presença, passagem, hospedagem, recebimento).
import { store, membros } from '../store.js';
import { can } from '../perms.js';
import { PAPEIS } from '../perms.js';
import { el, abrirForm, sheet, toast, confirmar, btnOlho } from '../ui.js';
import { esc, fmtMoney, hoje, iniciais, soma, valoresOcultos } from '../utils.js';
import { retencoes, RET_SUGESTAO, EXPLICACAO_RETENCAO } from '../calc.js';
import { temSenha, limparSenha } from '../pin.js';

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
    ${verGrana ? `<div class="sec" style="margin-top:4px"><div class="sec-t">Equipe</div>${btnOlho(valoresOcultos())}</div>
    <div class="grid">
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
      hint: 'Deixe em branco ou zero enquanto não souber. O app não inventa alíquota: só desconta o que você preencher aqui.'
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
        <div class="row"><span class="g"><span class="s">Imposto retido (${(m.tipo || 'pf').toUpperCase()})</span>
          <span class="t" style="white-space:normal;font-weight:500">${r.total ? [
            r.inss ? `INSS ${r.percentuais.inss}% · ${fmtMoney(r.inss)}` : '',
            r.irrf ? `IRRF ${r.percentuais.irrf}% · ${fmtMoney(r.irrf)}` : '',
            r.iss ? `ISS ${r.percentuais.iss}% · ${fmtMoney(r.iss)}` : '',
            r.pcc ? `PIS/COFINS/CSLL ${r.percentuais.pcc}% · ${fmtMoney(r.pcc)}` : ''
          ].filter(Boolean).join('<br>') : 'nada configurado — paga o valor cheio'}</span></span>
          <span class="r">${r.total ? `<span class="v">− ${fmtMoney(r.total)}</span>` : ''}
            <button class="btn sm gho" data-explica-ret style="margin-top:4px">o que é?</button></span></div>
        <div class="row"><span class="g"><span class="s">Vai cair na conta</span>
          <span class="t">${r.total ? 'depois da retenção' : 'sem retenção configurada'}</span></span>
          <span class="r"><span class="v" style="color:var(--ok)">${fmtMoney(r.liquido)}</span></span></div>
        ${editar && !r.total ? `<div class="row"><span class="g">
          <span class="s">Se esta produção retém imposto no pagamento</span>
          <span class="t" style="white-space:normal;font-weight:400">Preencher com a sugestão para ${(m.tipo || 'pf') === 'pj' ? 'PJ' : 'PF'} — e conferir com a contabilidade.</span></span>
          <span class="r"><button class="btn sm gho" data-sugestao>usar sugestão</button></span></div>` : ''}` : ''}
        <div class="row"><span class="g"><span class="s">Senha de acesso</span>
          <span class="t">${temSenha(m) ? 'criada' : 'ainda não criada'}</span></span>
          ${editar && temSenha(m) ? '<span class="r"><button class="btn sm gho" data-zerar-senha>zerar</button></span>' : ''}</div>
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
    corpo.querySelector('[data-explica-ret]')?.addEventListener('click', () => {
      sheet({
        titulo: 'Imposto retido no pagamento',
        corpo: el(`<div>
          <p class="small" style="margin:0 0 14px;line-height:1.6">Reter imposto é descontar uma parte do
          pagamento e recolher no lugar de quem recebe. A pessoa recebe o líquido e a produção fica
          responsável por repassar o desconto ao governo. Nem toda produção retém, e o que se retém muda
          conforme a pessoa é física ou jurídica, o município e o valor.</p>
          <div class="card tight">${EXPLICACAO_RETENCAO.map(([nome, texto]) => `<div class="row">
            <span class="g"><span class="t">${esc(nome)}</span>
              <span class="s" style="white-space:normal">${esc(texto)}</span></span></div>`).join('')}</div>
          <div class="banner warn small">O Unit0 só desconta o que você preencher no cadastro da pessoa.
          Ele não calcula tabela progressiva nem teto de INSS — para valor de pagamento, confirme com a
          sua contabilidade.</div>
        </div>`)
      });
    });
    corpo.querySelector('[data-sugestao]')?.addEventListener('click', async () => {
      const sug = RET_SUGESTAO[(m.tipo || 'pf') === 'pj' ? 'pj' : 'pf'];
      if (!await confirmar(sug.aviso, { ok: 'Preencher assim mesmo' })) return;
      await store.update('membros', m.id, {
        ret_inss: sug.valores.inss, ret_irrf: sug.valores.irrf,
        ret_iss: sug.valores.iss, ret_pcc: sug.valores.pcc
      });
      Object.assign(m, { ret_inss: sug.valores.inss, ret_irrf: sug.valores.irrf, ret_iss: sug.valores.iss, ret_pcc: sug.valores.pcc });
      toast('Sugestão aplicada. Confirme com a contabilidade.'); pintar(); store.emit();
    });
    corpo.querySelector('[data-zerar-senha]')?.addEventListener('click', async () => {
      if (!await confirmar(`Zerar a senha de ${m.nome}? Na próxima entrada ela cria uma nova.`,
        { ok: 'Zerar', perigo: true })) return;
      await limparSenha(m.id);
      m.pin_hash = '';
      toast('Senha zerada.'); pintar(); store.emit();
    });
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
