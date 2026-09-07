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

/** O texto do pedido, pronto para colar no e-mail ou no WhatsApp. */
export function textoPedido(conta) {
  if (!conta) return '';
  const f = faturamento();
  const m = conta.membro_id ? store.get('membros', conta.membro_id) : null;
  const p = store.projeto || {};
  // O código do job já carrega o nome do projeto; sem ele, usa o nome puro.
  const titulo = f.job || (p.nome || '').toUpperCase();
  const linha = m ? [m.funcao, nomeMembro(conta.membro_id)].filter(Boolean).join(' ')
    : conta.descricao;
  const detalhe = conta.parcela ? ` (parcela ${conta.parcela})` : '';

  return [
    `Segue pedido de NF para o pagamento.`,
    ``,
    `INCLUIR NO CORPO DA NOTA FISCAL:`,
    ``,
    titulo,
    ``,
    `${linha}${detalhe}`,
    ``,
    `Data de vencimento: ${conta.venc ? fmtData(conta.venc) : 'a combinar'}`,
    ``,
    fmtMoney(conta.valor_cents),
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
export function linkEmail(conta) {
  const m = conta?.membro_id ? store.get('membros', conta.membro_id) : null;
  const para = m?.email && m.email.includes('@') && !m.email.endsWith('@tempora') ? m.email : '';
  return `mailto:${encodeURIComponent(para)}?subject=${encodeURIComponent(assuntoPedido(conta))}`
    + `&body=${encodeURIComponent(textoPedido(conta))}`;
}

export function linkWhats(conta) {
  const m = conta?.membro_id ? store.get('membros', conta.membro_id) : null;
  const tel = String(m?.telefone || '').replace(/\D/g, '');
  const num = tel.length >= 10 ? (tel.length <= 11 ? '55' + tel : tel) : '';
  return `https://wa.me/${num}?text=${encodeURIComponent(textoPedido(conta))}`;
}
