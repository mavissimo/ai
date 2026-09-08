// Pedido de nota fiscal. O texto que a produção monta na mão para cada pessoa
// — job, função, vencimento, valor e os dados de faturamento da produtora —
// sai daqui pronto, a partir da conta e do cadastro de quem vai receber.
import { store, nomeMembro } from './store.js';
import { fmtMoney, fmtData } from './utils.js';

/** Dados de faturamento da produtora, tirados do próprio projeto. */
export function faturamento() {
  const p = store.projeto || {};
  return {
    cnpj: p.cnpj || '47.661.128/0001-60',
    razao: p.razao_social || 'MATHEUS SIMOES AVILA LTDA',
    fantasia: p.fantasia || 'MAVI',
    endereco: p.endereco || 'R AROABA, 482',
    cidade: p.cidade_uf || 'SAO PAULO SP 05.315-021',
    email: p.email_nf || 'mavissimo1@gmail.com',
    job: p.codigo_job || ''
  };
}

/** Todas as contas em aberto da mesma pessoa que ainda esperam nota fiscal.
    O montador que faz quatro linhas do orçamento emite uma NF só — o pedido
    precisa saber juntar. */
export function irmasSemNF(conta) {
  if (!conta) return [];
  const quem = conta.membro_id || conta.contraparte;
  if (!quem) return [];
  return store.doProjeto('contas').filter((c) => c.id !== conta.id
    && c.tipo === 'pagar' && c.status === 'aberto' && c.nf_status === 'a_receber'
    && (conta.membro_id ? c.membro_id === conta.membro_id : c.contraparte === conta.contraparte));
}

/** O texto do pedido, pronto para colar no e-mail ou no WhatsApp.
    Com mais de uma conta, discrimina linha a linha e fecha com o total. */
export function textoPedido(conta, extras = []) {
  if (!conta) return '';
  const f = faturamento();
  const m = conta.membro_id ? store.get('membros', conta.membro_id) : null;
  const p = store.projeto || {};
  // O código do job já carrega o nome do projeto; sem ele, usa o nome puro.
  const titulo = f.job || (p.nome || '').toUpperCase();
  // Com várias linhas, o cabeçalho é quem recebe; com uma só, é o serviço.
  const quem = m ? [m.funcao, nomeMembro(conta.membro_id)].filter(Boolean).join(' ')
    : (conta.contraparte || conta.descricao);
  const linha = extras.length ? quem : (m ? quem : conta.descricao);
  const detalhe = conta.parcela ? ` (parcela ${conta.parcela})` : '';
  const todas = [conta, ...extras];
  const total = todas.reduce((n, c) => n + (c.valor_cents || 0), 0);

  // Uma conta só: o formato curto de sempre. Várias: discrimina e soma.
  const corpo = todas.length === 1
    ? [`${linha}${detalhe}`, ``,
      `Data de vencimento: ${conta.venc ? fmtData(conta.venc) : 'a combinar'}`, ``,
      fmtMoney(conta.valor_cents)]
    : [linha, ``,
      ...todas.map((c) => `· ${c.descricao} — ${fmtMoney(c.valor_cents)}`), ``,
      `Data de vencimento: ${conta.venc ? fmtData(conta.venc) : 'a combinar'}`, ``,
      `TOTAL: ${fmtMoney(total)}`];

  return [
    `Segue pedido de NF para o pagamento.`,
    ``,
    `INCLUIR NO CORPO DA NOTA FISCAL:`,
    ``,
    titulo,
    ``,
    ...corpo,
    ``,
    `— Dados de faturamento —`,
    `CNPJ: ${f.cnpj}`,
    f.razao,
    f.fantasia ? `(nome de fantasia) ${f.fantasia}` : '',
    f.endereco,
    f.cidade,
    ``,
    `Depois de emitir, envie a NF em PDF para ${f.email} com os seus dados de pagamento:`,
    `Banco / Agência / Conta / PIX / Nome do favorecido / CNPJ.`
  ].filter((l) => l !== null).join('\n');
}

/** Assunto do e-mail, no mesmo padrão que a produção já usa. */
export function assuntoPedido(conta) {
  const p = store.projeto || {};
  const m = conta?.membro_id ? store.get('membros', conta.membro_id) : null;
  const quem = m ? `${m.funcao} ${m.nome}` : (conta?.contraparte || conta?.descricao || '');
  return `${(p.nome || 'Projeto').toUpperCase()} _ PEDIDO DE NF _ ${quem}`;
}

/** Link de e-mail já preenchido. */
export function linkEmail(conta, extras = []) {
  const m = conta?.membro_id ? store.get('membros', conta.membro_id) : null;
  const para = m?.email && m.email.includes('@') && !m.email.endsWith('@tempora') ? m.email : '';
  return `mailto:${encodeURIComponent(para)}?subject=${encodeURIComponent(assuntoPedido(conta))}`
    + `&body=${encodeURIComponent(textoPedido(conta, extras))}`;
}

export function linkWhats(conta, extras = []) {
  const m = conta?.membro_id ? store.get('membros', conta.membro_id) : null;
  const tel = String(m?.telefone || '').replace(/\D/g, '');
  const num = tel.length >= 10 ? (tel.length <= 11 ? '55' + tel : tel) : '';
  return `https://wa.me/${num}?text=${encodeURIComponent(textoPedido(conta, extras))}`;
}


/* --------------------------------------------------------------- cobrança ---
   O outro lado do balcão: o e-mail que a produtora manda ao cliente quando a
   parcela vence. Sai do mesmo lugar que o pedido de NF para os dois textos não
   viverem em cabeças diferentes. */
export function textoCobranca(conta) {
  if (!conta) return '';
  const f = faturamento();
  const p = store.projeto || {};
  const ctr = store.doProjeto('contratos').find((c) => c.tipo === 'cliente');
  // Linha ausente é `null` e some; linha vazia é `''` e vira parágrafo. Trocar
  // um pelo outro colava o texto todo num bloco só.
  return [
    'Prezados,',
    '',
    `Seguem os dados para o pagamento da ${conta.parcela ? `parcela ${conta.parcela}` : 'parcela'} `
      + `do projeto ${(p.nome || '').toUpperCase()}.`,
    ctr?.numero ? `Contrato ${ctr.numero}.` : null,
    '',
    `Valor: ${fmtMoney(conta.valor_cents)}`,
    `Vencimento: ${conta.venc ? fmtData(conta.venc) : 'a combinar'}`,
    conta.nf_numero ? `Nota fiscal: ${conta.nf_numero}` : null,
    '',
    '— Dados da produtora —',
    `CNPJ: ${f.cnpj}`,
    f.razao,
    f.endereco,
    f.cidade,
    '',
    'Qualquer dúvida, estou à disposição.'
  ].filter((l) => l !== null).join('\n');
}

export function assuntoCobranca(conta) {
  const p = store.projeto || {};
  return `${(p.nome || 'Projeto').toUpperCase()} _ `
    + `${conta?.parcela ? `PARCELA ${conta.parcela}` : 'PAGAMENTO'}`
    + `${conta?.nf_numero ? ` _ NF ${conta.nf_numero}` : ''}`;
}

/** Link de e-mail de cobrança, endereçado ao contato do contrato quando existe. */
export function linkCobranca(conta) {
  const ctr = store.doProjeto('contratos').find((c) => c.tipo === 'cliente');
  // O contrato guarda o contato do cliente com nomes diferentes conforme a
  // época em que foi cadastrado; qualquer um serve para preencher o "para".
  const para = ctr?.contato_email || ctr?.email || ctr?.contato || '';
  return `mailto:${encodeURIComponent(para)}?subject=${encodeURIComponent(assuntoCobranca(conta))}`
    + `&body=${encodeURIComponent(textoCobranca(conta))}`;
}
