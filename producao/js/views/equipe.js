// Equipe: quem é quem, cachê, contrato, e as confirmações de cada um
// (presença, passagem, hospedagem, recebimento).
import { store, membros } from '../store.js';
import { can } from '../perms.js';
import { PAPEIS, RESPONSA } from '../perms.js';
import { el, abrirForm, sheet, toast, confirmar, btnOlho } from '../ui.js';
import { esc, fmtMoney, hoje, iniciais, soma, valoresOcultos } from '../utils.js';
import { temSenha, limparSenha } from '../pin.js';
import { planoDe, abrirPlano } from './pagamentos.js';

const TIPOS_CONF = [
  { v: 'presenca', t: 'Presença em diária' },
  { v: 'passagem', t: 'Recebimento de passagem' },
  { v: 'hospedagem', t: 'Hospedagem confirmada' },
  { v: 'contrato', t: 'Contrato assinado' },
  { v: 'pagamento', t: 'Recebimento do pagamento' },
  { v: 'outro', t: 'Outro' }
];
export const tipoConf = (v) => TIPOS_CONF.find((t) => t.v === v)?.t || v;

// Um punhado de funções que cobrem a maioria das equipes. Quem precisar de
// outra digita na hora, sem virar item fixo da lista.
export const FUNCOES = [
  'Direção', 'Assistente de direção', 'Produção executiva', 'Direção de produção',
  'Assistente de produção', 'Direção de fotografia', '1º assistente de câmera',
  'Técnico de som direto', 'Elétrica e maquinaria', 'Direção de arte',
  'Figurino e maquiagem', 'Montagem', 'Finalização (cor e som)', 'Roteiro', 'Motorista'
];

let visao = 'pessoas';   // pessoas | planilha

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
  const orcadoEquipe = soma(lista, (m) => (m.cache_orcado_cents || m.cache_cents || 0) * (m.diarias || 0));

  node.innerHTML = `
    ${verGrana ? `<div class="sec"><div class="sec-t">Quanto custa a equipe</div>${btnOlho(valoresOcultos())}</div>
    <div class="grid">
      <div class="kpi"><div class="l">Pessoas</div><div class="v">${lista.length}</div>
        <div class="h">${lista.filter((m) => m.papel === 'equipe').length} em campo</div></div>
      <div class="kpi"><div class="l">Custo de equipe</div><div class="v">${fmtMoney(custoEquipe)}</div>
        <div class="h">cachês e per diems fechados</div></div>
    </div>
    <div class="seg" style="margin-bottom:14px">
      <button data-visao="pessoas" class="${visao === 'pessoas' ? 'on' : ''}">Pessoas</button>
      <button data-visao="planilha" class="${visao === 'planilha' ? 'on' : ''}">Planilha</button>
    </div>` : ''}

    ${visao === 'planilha' && verGrana ? tabela(lista, orcadoEquipe, custoEquipe) : `
    <div class="card lista">${lista.length ? lista.map((m) => {
      const meus = confs.filter((c) => c.membro_id === m.id);
      const pend = meus.filter((c) => c.status === 'pendente').length;
      const p = PAPEIS[m.papel] || PAPEIS.equipe;
      return `<div class="row act" data-membro="${m.id}">
        <span class="avatar">${esc(iniciais(m.nome))}</span>
        <span class="g"><span class="t">${esc(m.nome)}</span>
          <span class="s">${esc([m.funcao, p.curto].filter(Boolean).join(' · '))}</span></span>
        <span class="r">${pend ? `<span class="tag warn">${pend} pend.</span>`
        : meus.length ? '<span class="tag ok">ok</span>' : ''}
          ${verGrana && (m.cache_cents || m.perdiem_cents) ? `<div class="small muted mono" style="margin-top:3px">
            ${fmtMoney((m.cache_cents || 0) * (m.diarias || 0) + (m.perdiem_cents || 0))}</div>` : ''}</span>
      </div>`;
    }).join('') : '<div class="empty">Ninguém cadastrado ainda.</div>'}</div>
    <div class="banner small">Cada pessoa entra no app e vê só a parte dela: a própria agenda, o
      próprio cachê, as próprias confirmações e os próprios gastos.</div>`}`;

  node.querySelectorAll('[data-visao]').forEach((b) => {
    b.onclick = () => { visao = b.dataset.visao; store.emit(); };
  });
  node.querySelectorAll('[data-membro]').forEach((n) => {
    n.onclick = () => abrirMembro(store.get('membros', n.dataset.membro), editar, verGrana);
    if (n.tagName === 'TR') n.style.cursor = 'pointer';
  });

  return { titulo: 'Equipe', node, fab: editar ? { label: '+', onClick: () => novoMembro() } : null };
}

function campos(m = {}) {
  return [
    { k: 'nome', label: 'Nome', type: 'texto', req: true, valor: m.nome },
    {
      k: 'funcao', label: 'Função no projeto', type: 'livre', valor: m.funcao,
      opts: FUNCOES.map((f) => ({ v: f, t: f })), ph: 'Escreva a função',
      hint: 'Não achou? Escolha "outra, digitar" e escreva — vale só para esta pessoa.'
    },
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
    { type: 'titulo', label: 'Dados de pagamento', k: '_t_fisc' },
    {
      k: 'tipo', label: 'Pessoa física ou jurídica', type: 'select', valor: m.tipo || 'pf',
      opts: [{ v: 'pf', t: 'Pessoa física (recibo)' }, { v: 'pj', t: 'Pessoa jurídica (nota fiscal)' }],
      hint: 'Só serve para saber se a produção espera recibo ou nota fiscal desta pessoa.'
    },
    { k: 'doc', label: 'CPF / CNPJ', type: 'texto', valor: m.doc },
    { k: 'chave_pix', label: 'Chave Pix', type: 'texto', valor: m.chave_pix },
    { k: 'banco', label: 'Banco', type: 'texto', valor: m.banco, meia: true },
    { k: 'agencia', label: 'Agência', type: 'texto', valor: m.agencia, meia: true },
    { k: 'conta_banco', label: 'Conta', type: 'texto', valor: m.conta_banco, meia: true },
    { k: 'titular', label: 'Titular, se for outro nome', type: 'texto', valor: m.titular },
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
    const confs = store.doProjeto('confirmacoes').filter((c) => c.membro_id === m.id);
    const gastos = store.doProjeto('lancamentos').filter((l) => l.membro_id === m.id);
    const contas = store.doProjeto('contas').filter((c) => c.membro_id === m.id);
    corpo.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px">
        <span class="avatar" style="width:48px;height:48px;font-size:16px">${esc(iniciais(m.nome))}</span>
        <div style="min-width:0"><div style="font-weight:650">${esc(m.funcao || '—')}</div>
          <div class="small muted">${esc(p.nome)} — ${esc(RESPONSA[m.papel] || RESPONSA.equipe)}</div></div>
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
          <span class="r"><span class="v">${fmtMoney(m.perdiem_cents)}</span></span></div>` : ''}` : ''}
        <div class="row"><span class="g"><span class="s">Senha de acesso</span>
          <span class="t">${temSenha(m) ? 'criada' : 'ainda não criada'}</span></span>
          ${editar && temSenha(m) ? '<span class="r"><button class="btn sm gho" data-zerar-senha>zerar</button></span>' : ''}</div>
        <div class="row"><span class="g"><span class="s">Contrato</span>
          <span class="t">${esc(ST_CONTRATO.find((s) => s.v === (m.contrato_status || 'na'))?.t)}</span></span></div>
        ${verGrana && m.chave_pix ? `<div class="row"><span class="g"><span class="s">Pix</span><span class="t">${esc(m.chave_pix)}</span></span></div>` : ''}
        ${m.obs ? `<div class="row"><span class="g"><span class="s">Observações</span>
          <span class="t" style="white-space:normal;font-weight:400">${esc(m.obs)}</span></span></div>` : ''}
      </div>
      ${verGrana ? `<div class="sec"><div class="sec-t">Pagamento</div>
        <button class="btn sm gho" data-plano>abrir plano</button></div>
      <div class="card tight">
        <div class="row"><span class="g"><span class="t">Combinado</span>
          <span class="s">cachê e per diem</span></span>
          <span class="r"><span class="v">${fmtMoney(bruto + (m.perdiem_cents || 0))}</span></span></div>
        <div class="row"><span class="g"><span class="t">Falta pagar</span>
          <span class="s">${planoDe(m.id).itens.length} parcela(s) combinada(s)</span></span>
          <span class="r"><span class="v">${fmtMoney(planoDe(m.id).falta)}</span></span></div>
      </div>` : ''}
      <div class="sec"><div class="sec-t">Confirmações</div>
        ${editar ? '<button class="btn sm gho" data-nova-conf>+ pedir</button>' : ''}</div>
      <div class="card lista">${confs.length ? confs.map((c) => `<div class="row">
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
    corpo.querySelector('[data-plano]')?.addEventListener('click', () => { sh.close(); abrirPlano(m.id, editar); });
    corpo.querySelector('[data-zerar-senha]')?.addEventListener('click', async () => {
      if (!await confirmar(`Zerar a senha de ${m.nome}? Na próxima entrada ela cria uma nova.`,
        { ok: 'Zerar', perigo: true })) return;
      await limparSenha(m.id);
      m.pin_hash = '';
      toast('Senha zerada.'); pintar(); store.emit();
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

/* ---------------------------------------------------------------- planilha ---
   A mesma leitura da planilha da produtora: função, diárias, valor da diária,
   total orçado, o que foi fechado e a diferença — com totais no rodapé. */
function tabela(lista, orcadoTotal, negociadoTotal) {
  const linha = (m) => {
    const d = m.diarias || 0;
    const orc = (m.cache_orcado_cents || m.cache_cents || 0) * d;
    const neg = (m.cache_cents || 0) * d;
    const dif = orc - neg;
    return `<tr data-membro="${m.id}">
      <td><b>${esc(m.nome)}</b><span class="sub">${esc(m.funcao || '—')}</span></td>
      <td class="n">${d || '—'}</td>
      <td class="n">${m.cache_cents ? fmtMoney(m.cache_cents) : '—'}</td>
      <td class="n">${orc ? fmtMoney(orc) : '—'}</td>
      <td class="n forte">${neg ? fmtMoney(neg) : '—'}</td>
      <td class="n ${dif < 0 ? 'ruim' : dif > 0 ? 'bom' : ''}">${dif ? fmtMoney(dif) : '—'}</td>
      <td class="n">${m.perdiem_cents ? fmtMoney(m.perdiem_cents) : '—'}</td>
    </tr>`;
  };
  return `<div class="tabela-caixa"><div class="tabela-rolo"><table class="tabela">
    <thead><tr>
      <th>Quem / função</th><th class="n">Diárias</th><th class="n">Diária</th>
      <th class="n">Orçado</th><th class="n">Negociado</th><th class="n">Dif.</th><th class="n">Per diem</th>
    </tr></thead>
    <tbody>${lista.map(linha).join('')}</tbody>
    <tfoot><tr>
      <td>Total</td><td class="n"></td><td class="n"></td>
      <td class="n">${fmtMoney(orcadoTotal)}</td>
      <td class="n forte">${fmtMoney(negociadoTotal)}</td>
      <td class="n"></td><td class="n"></td>
    </tr></tfoot>
  </table></div></div>
  <div class="tabela-dica">arraste para o lado para ver o resto →</div>
  <div class="banner small">Mesma leitura da planilha da produtora. O <b>negociado</b> é o que vale
    como compromisso; a <b>diferença</b> é o que sobrou do orçado.</div>`;
}
