// Carga inicial do projeto real: Doc Fundação Bradesco 70 Anos (Têmpora).
// Origem dos dados: contrato 4600001793 / PRC0045076, pauta final de negociação
// e planilha geral TÊMPORA (11/08/2026). Onde o contrato e a planilha divergem,
// vale o contrato — e a divergência fica anotada na observação.
import { store } from './store.js';
import { uid, parseMoney } from './utils.js';

const M = parseMoney;

const PESSOAS = [
  {
    nome: 'Maví Simões', funcao: 'Direção de cena', papel: 'admin', tipo: 'pj',
    email: 'mavi@tempora', telefone: '(19) 98220-1700',
    doc: '394.458.628-05', rg: '46.364.032-9', nascimento: '1990-01-22',
    cache_cents: M('3000'), diarias: 26, contrato_status: 'na',
    chave_pix: 'mavissimo1@gmail.com',
    obs: 'Sócio da MATHEUS SIMÕES AVILA LTDA (CNPJ 47.661.128/0001-60), parte contratada.'
  },
  {
    nome: 'Tato Pessanha', funcao: 'Produção executiva', papel: 'coord', tipo: 'pf',
    email: 'tato@tempora', telefone: '(11) 96340-1980',
    doc: '083.240.687-24', rg: '633482316', nascimento: '1980-06-04',
    cache_cents: M('1600'), diarias: 26, contrato_status: 'pendente',
    obs: 'Total job negociado em R$ 41.600 (executivo + produtor de viagem + som). '
      + 'Está como Coordenação: vê custos, agenda e equipe, mas não vê valor de contrato nem margem. '
      + 'Para liberar, troque a alçada para Financeiro ou Produtor/Admin.'
  },
  {
    nome: 'Julio Becker', funcao: '1º assistente de câmera', papel: 'equipe', tipo: 'pf',
    email: 'becker@tempora', telefone: '(55) 98100-3404',
    doc: '063.821.999-07', rg: '1124393396', nascimento: '1997-04-04',
    cache_cents: M('1300'), diarias: 26, contrato_status: 'pendente',
    obs: 'Planilha traz duas leituras: 26 × R$ 1.300 = R$ 33.800 na linha e "26 dias × R$ 1.100" na observação. Confirmar.'
  },
  {
    nome: 'Patrick Bombassaro', funcao: 'Assistente criativo', papel: 'equipe', tipo: 'pf',
    email: 'patrick@tempora', telefone: '',
    cache_cents: M('4000'), diarias: 1, contrato_status: 'pendente',
    obs: 'Orçado em R$ 8.000, negociado para R$ 4.000.'
  }
];

const CONTATOS = [
  ['Gustavo Brognara', 'Curador', 'Fundação Bradesco', 'gustavo.brognara@fundacao.bradesco', 'cliente', 'Gestor principal do projeto.'],
  ['Caio Rossi', 'Analista de Acervo I — Curadoria', 'Fundação Bradesco', 'caio.rossi@fundacao.bradesco', 'cliente', 'Conduziu a minuta do contrato.'],
  ['Rebeca Hindrikson', 'Analista de Acervo III — Curadoria', 'Fundação Bradesco', 'rebeca.hindrikson@fundacao.bradesco', 'cliente', 'Homologação e agenda das escolas.'],
  ['Dayane Marques', 'Compras', 'Fundação Bradesco', 'dayane.marques@fundacao.bradesco', 'cliente', 'PRC0045079 — documentação do fornecedor.'],
  ['Maria das Dores da Silva', 'Jurídico / Contratos', 'Fundação Bradesco', 'maria.dores@fundacao.bradesco', 'cliente', 'Assinatura via Docusign.'],
  ['Fábio Correa', 'Curadoria', 'Fundação Bradesco', 'fabio.correa@fundacao.bradesco', 'cliente', ''],
  ['Joana Areas', 'Curadoria', 'Fundação Bradesco', 'joana.areas@fundacao.bradesco', 'cliente', ''],
  ['Heloisa Aguiar', 'Gestão de fornecedores', 'Bradesco', 'heloisa.aguiar@bradesco.com.br', 'cliente', 'Cadastro de fornecedor CNPJ 47.661.128/0001-60.'],
  ['Kátia Pelaes', 'Corretora de seguros', 'GBI Seguros', 'katia.pelaes@gbiseguros.com', 'fornecedor', 'Apólice equipe + equipamento: R$ 4.096,76. Tel (11) 99962-2312.'],
  ['Otávio Nazareth', 'Editora', 'Editora Olhares', '', 'outro', 'Indicou a produtora para a Fundação.']
];

const LOCACOES = [
  ['Escola Fundação Bradesco — Conceição do Araguaia', 'Conceição do Araguaia', 'PA', 'Fotógrafa: Elza Lima'],
  ['Escola Fundação Bradesco — Jaboatão', 'Jaboatão dos Guararapes', 'PE', 'Reprogramada a pedido da Fundação. Uma ex-aluna será fotografada em teatro.'],
  ['Escola Fundação Bradesco — Gravataí', 'Gravataí', 'RS', 'Planilha traz "Gravataí - PR"; a cidade é no RS. Confirmar.'],
  ['Escola Fundação Bradesco — Bodoquena', 'Bodoquena', 'MS', ''],
  ['Escola Fundação Bradesco — Fazenda Canuanã', 'Formoso do Araguaia', 'TO', 'Escola incluída depois do orçamento inicial.'],
  ['Escola Fundação Bradesco — Osasco', 'Osasco', 'SP', 'Núcleo Cidade de Deus, sede da Fundação.']
];

const ORCAMENTO = [
  ['Roteiro', '15000', 'Total job.'],
  ['Assistente criativo', '4000', 'Orçado 8.000, negociado 4.000. Patrick Bombassaro.'],
  ['Direção de cena', '78000', 'R$ 3.000 × 26 (pré-produção + diárias + viagem). Maví.'],
  ['Produção executiva', '41600', 'R$ 1.600 × 26. Total job: executivo + produtor de viagem + som. Tato.'],
  ['Secretaria de produção / advogada', '7000', ''],
  ['1º assistente de câmera', '33800', 'R$ 1.300 × 26. Julio Becker.'],
  ['Seguros (GBI)', '4096,76', 'Apólice equipe + equipamentos, incluída no preço do contrato.'],
  ['Passagens aéreas', '0', 'Preencher conforme as reservas.'],
  ['Hospedagem', '0', ''],
  ['Alimentação', '0', ''],
  ['Transporte e locação de carro', '0', 'Movida — reserva 740099355700.'],
  ['Equipamento de câmera', '0', ''],
  ['Equipamento de som', '0', ''],
  ['Pós-produção — montagem', '0', ''],
  ['Cor, motion e finalização', '0', ''],
  ['Trilha e locução', '0', 'Incluída no orçamento; definir entre original e biblioteca.'],
  ['Armazenamento, HDs e backup', '0', 'Contrato exige 2 cópias criptografadas em locais separados + 1 HD físico na entrega.'],
  ['Autorizações e certidões', '0', 'Certidão de antecedentes para quem acessar escolas.'],
  ['Contingência', '0', ''],
  ['Impostos', '0', 'Definir alíquota efetiva em Dinheiro → Imposto.']
];

// [data, tipo, título, local, observação]
const AGENDA = [
  ['2026-08-22', 'outro', 'Checagem de equipamentos', 'São Paulo', 'Antes do embarque.'],
  ['2026-08-23', 'viagem', 'Viagem SP → Palmas → Conceição do Araguaia', 'GRU / Palmas (TO)',
    'Chegada ao aeroporto 04:00 · embarque 05:40 · desembarque 10:05 (2 voos). Localizador WFNEWO. Carro Movida — reserva 740099355700, aluguel MV1MPRM8QUBR. Palmas → Conceição: 5h07 (322 km).'],
  ['2026-08-24', 'diaria', 'Scout + Diária 1 — Conceição do Araguaia (PA)', 'Conceição do Araguaia (PA)', 'Fotógrafa Elza Lima.'],
  ['2026-08-25', 'diaria', 'Diária 2 — Conceição do Araguaia (PA)', 'Conceição do Araguaia (PA)', ''],
  ['2026-08-26', 'viagem', 'Viagem Conceição do Araguaia → Palmas → SP', 'Conceição do Araguaia (PA)', '5h07 (322 km) até Palmas.'],
  ['2026-08-30', 'viagem', 'Viagem SP → Recife', 'GRU / Recife (PE)', ''],
  ['2026-08-31', 'diaria', 'Scout + Diária 1 — Jaboatão (PE)', 'Jaboatão dos Guararapes (PE)', ''],
  ['2026-09-01', 'diaria', 'Diária 2 — Jaboatão (PE)', 'Jaboatão dos Guararapes (PE)', ''],
  ['2026-09-02', 'viagem', 'Viagem Recife → SP', 'Recife (PE)', ''],
  ['2026-09-09', 'viagem', 'Viagem SP → Porto Alegre + scout Gravataí', 'Porto Alegre / Gravataí', ''],
  ['2026-09-10', 'diaria', 'Diária 1 — Gravataí', 'Gravataí (RS)', ''],
  ['2026-09-11', 'diaria', 'Diária 2 — Gravataí', 'Gravataí (RS)', ''],
  ['2026-09-12', 'viagem', 'Viagem Gravataí → Porto Alegre → SP', 'Gravataí (RS)', ''],
  ['2026-09-15', 'viagem', 'Viagem SP → Campo Grande', 'Campo Grande (MS)', ''],
  ['2026-09-16', 'viagem', 'Campo Grande → Bodoquena + scout', 'Bodoquena (MS)', '3h38 (265 km).'],
  ['2026-09-17', 'diaria', 'Diária 1 — Bodoquena (MS)', 'Bodoquena (MS)', ''],
  ['2026-09-18', 'diaria', 'Diária 2 — Bodoquena (MS)', 'Bodoquena (MS)', ''],
  ['2026-09-19', 'viagem', 'Viagem Bodoquena → Campo Grande → SP', 'Bodoquena (MS)', '3h38 (265 km).'],
  ['2026-09-21', 'viagem', 'Viagem SP → Palmas → Fazenda Canuanã', 'Palmas (TO)', '4h16 (330 km) de Palmas até a fazenda.'],
  ['2026-09-22', 'outro', 'Scout e visita — Canuanã (TO)', 'Fazenda Canuanã (TO)', ''],
  ['2026-09-23', 'diaria', 'Diária 1 — Canuanã (TO)', 'Fazenda Canuanã (TO)', ''],
  ['2026-09-24', 'diaria', 'Diária 2 — Canuanã (TO)', 'Fazenda Canuanã (TO)', ''],
  ['2026-09-25', 'viagem', 'Viagem Canuanã → Palmas → SP', 'Fazenda Canuanã (TO)', ''],
  ['2026-10-06', 'outro', 'Scout e visita — Osasco (SP)', 'Osasco (SP)', ''],
  ['2026-10-07', 'diaria', 'Diária 1 — Osasco (SP)', 'Osasco (SP)', ''],
  ['2026-10-08', 'diaria', 'Diária 2 — Osasco (SP)', 'Osasco (SP)', ''],
  ['2026-10-12', 'viagem', 'Viagem SP → Belém', 'Belém (PA)', ''],
  ['2026-10-13', 'diaria', 'Filma — Patrícia Brasil', 'Belém (PA)', 'Fotógrafa.'],
  ['2026-10-14', 'viagem', 'Viagem Belém → SP', 'Belém (PA)', ''],
  ['2026-10-15', 'diaria', 'Filma — Lalo de Almeida', 'São Paulo (SP)', 'Fotógrafo.'],
  ['2026-10-19', 'viagem', 'Viagem SP → Salvador', 'Salvador (BA)', ''],
  ['2026-10-20', 'diaria', 'Filma — Edgar Azevedo', 'Salvador (BA)', 'Fotógrafo.'],
  ['2026-10-21', 'viagem', 'Viagem Salvador → Curitiba', 'Curitiba (PR)', ''],
  ['2026-10-22', 'diaria', 'Filma — Vilma Slomp', 'Curitiba (PR)', 'Fotógrafa.'],
  ['2026-10-23', 'viagem', 'Viagem Curitiba → SP', 'Curitiba (PR)', ''],
  ['2026-10-27', 'diaria', 'Filma — Maíra Erlich', 'São Paulo (SP)', 'Fotógrafa.'],
  ['2026-11-13', 'entrega', 'Primeiro corte — envio ao cliente', '', '1 doc de 15 min + 33 cortes + 6 minidocs.'],
  ['2026-11-19', 'entrega', 'Entrega versão 2', '', 'Depois da rodada de ajustes.'],
  ['2026-11-30', 'entrega', 'Entrega versão 3', '', 'Depois de cor, motion e trilha.'],
  ['2026-12-08', 'entrega', 'ENTREGA FINAL', '', 'Marco contratual. Segunda parcela vence 15 dias corridos depois.']
];

const ETAPAS = [
  ['negociacao', 'Proposta e orçamento V2 aprovados', 'feito', '2026-08-14'],
  ['negociacao', 'Cadastro de fornecedor no Bradesco', 'feito', '2026-07-31'],
  ['negociacao', 'Homologação e certidões entregues', 'feito', '2026-08-17'],
  ['negociacao', 'Contrato 4600001793 assinado (Docusign)', 'feito', '2026-08-22'],
  ['negociacao', 'Receber 1ª parcela (50%)', 'fazendo', '2026-08-24'],
  ['pre', 'Cronograma das 9 cidades confirmado', 'fazendo', '2026-08-23'],
  ['pre', 'Contratos da equipe (PF e PJ) assinados', 'nao', '2026-08-28'],
  ['pre', 'Apólice GBI emitida (equipe + equipamento)', 'fazendo', '2026-08-23'],
  ['pre', 'Certidões de antecedentes de quem entra nas escolas', 'nao', '2026-08-28'],
  ['pre', 'Autorizações de imagem, nome e voz (com termo para menores)', 'nao', '2026-08-24'],
  ['pre', 'Logística da 1ª viagem — voos, carro e hospedagem', 'feito', '2026-08-22'],
  ['pre', 'Checagem e seguro de equipamento', 'fazendo', '2026-08-22'],
  ['producao', 'Rodar as 6 escolas', 'nao', '2026-10-08'],
  ['producao', 'Rodar os 5 fotógrafos fora das escolas', 'nao', '2026-10-27'],
  ['producao', 'Backup duplo criptografado em locais separados', 'nao', '2026-10-27'],
  ['pos', 'Montagem — primeiro corte', 'nao', '2026-11-13'],
  ['pos', 'Rodada 1 de aprovação com a Fundação', 'nao', '2026-11-18'],
  ['pos', 'Versão 2', 'nao', '2026-11-19'],
  ['pos', 'Cor, motion e trilha', 'nao', '2026-11-27'],
  ['pos', 'Versão 3', 'nao', '2026-11-30'],
  ['pos', 'Ficha técnica aprovada antes da finalização', 'nao', '2026-11-30'],
  ['entrega', 'Entrega final das 40 peças', 'nao', '2026-12-08'],
  ['entrega', 'HD físico com masters, brutos e editáveis + relação e recibo', 'nao', '2026-12-08'],
  ['entrega', 'Emitir NF da 2ª parcela', 'nao', '2026-12-08'],
  ['entrega', 'Receber 2ª parcela (50%)', 'nao', '2026-12-23'],
  ['entrega', 'Liberação de portfólio (após divulgação ou 6 meses)', 'nao', '']
];

const ENTREGAS = [
  ['Documentário principal — 15 min', '2026-12-08', 'Aprox. 15 minutos'],
  ['33 cortes individuais — até 1 min', '2026-12-08', '3 por fotógrafo(a), 11 fotógrafos'],
  ['6 minidocumentários — até 2 min', '2026-12-08', '1 por escola'],
  ['HD físico com masters, brutos e editáveis', '2026-12-08', 'Com relação dos arquivos e recibo']
];

export async function criarProjetoBradesco() {
  const projeto = await store.insert('projetos', {
    id: uid('proj'),
    nome: 'Doc Fundação Bradesco 70 Anos',
    cliente: 'Fundação Bradesco',
    agencia: 'Têmpora (marca e crédito)',
    formato: '1 documentário 15min + 33 cortes + 6 minidocs — 9 cidades',
    status: 'pre',
    inicio: '2026-08-23',
    entrega: '2026-12-08',
    valor_contrato_cents: M('518998,86'),
    imposto_regime: 'simples',
    imposto_aliquota: 0,
    obs: 'Contrato 4600001793 (PRC0045076 / PRC0045079), assinado em 22/08/2026, vigência 12 meses. '
      + 'Confirmação de cada diária exige 10 dias corridos de antecedência. '
      + 'Defina a alíquota de imposto em Dinheiro → Imposto para o lucro sair certo.'
  });
  store.setProjeto(projeto.id);
  const P = projeto.id;

  /* equipe */
  const membros = {};
  for (const p of PESSOAS) {
    const m = await store.insert('membros', { projeto_id: P, ativo: true, ...p });
    membros[p.nome] = m.id;
  }
  const todos = Object.values(membros);
  const viajantes = [membros['Maví Simões'], membros['Julio Becker'], membros['Tato Pessanha']];

  /* contatos */
  for (const [nome, papel, empresa, email, tipo, obs] of CONTATOS) {
    await store.insert('contatos', { projeto_id: P, nome, papel, empresa, email, tipo, telefone: '', obs });
  }

  /* locações */
  const locs = {};
  for (const [nome, cidade, uf, obs] of LOCACOES) {
    const l = await store.insert('locacoes', {
      projeto_id: P, nome, cidade, uf, endereco: '', contato: '', telefone: '',
      valor_cents: 0, autorizacao: 'pendente', horario: '', obs
    });
    locs[cidade] = l.id;
  }

  /* contrato + parcelas */
  const parcela1 = uid('parc'), parcela2 = uid('parc');
  const contrato = await store.insert('contratos', {
    projeto_id: P,
    titulo: 'Fundação Bradesco — Making of 70 Anos (nº 4600001793)',
    tipo: 'cliente',
    contratante: 'Fundação Bradesco (CNPJ 60.701.521/0001-06)',
    contratado: 'Matheus Simões Avila Ltda (CNPJ 47.661.128/0001-60)',
    valor_total_cents: M('518998,86'),
    assinado_em: '2026-08-22',
    objeto: 'Produção audiovisual de 40 peças em 9 cidades: 1 documentário principal de ~15 min, '
      + '33 cortes individuais de até 1 min e 6 minidocumentários de até 2 min. '
      + 'Santo André e o filme da gráfica ficam fora do escopo.',
    entregaveis: '1 doc 15 min · 33 cortes até 1 min · 6 minidocs até 2 min · 1 HD físico com masters, '
      + 'brutos e editáveis, com relação dos arquivos e recibo.',
    prazo_entrega: '2026-12-08',
    direitos: 'Entrega dos brutos aceita. Know-how, métodos, templates e materiais preexistentes seguem com seus titulares. '
      + 'Portfólio liberado após divulgação pública ou autorização; tentar liberação após 6 meses sem publicação.',
    praca: 'Brasil — mídia interna e internet',
    janela: 'Vigência de 12 meses a contar da assinatura',
    exclusividade: 'Novas obras só por aditivo; primeira negociação para continuidades relacionadas.',
    multa: 'Multas não cumulativas, limitadas a 10% do contrato. Responsabilidade agregada limitada ao preço. '
      + 'Sem danos indiretos ou lucros cessantes. Cancelamento sem culpa: custos executados, compromissos não '
      + 'canceláveis, desmobilização e 10% do saldo. Mora: IPCA + 1% ao mês + multa de 2%.',
    condicoes_pagto: '50% em até 2 dias corridos da assinatura e 50% em até 15 dias corridos da entrega final. '
      + 'Sem retenção de garantia. Retenções tributárias só quando legalmente obrigatórias, com comprovante.',
    obs: 'Aceite em 5 dias úteis, silêncio equivale a aceite, objeção específica e consolidada, até 3 rodadas por '
      + 'conjunto de entregas. Diária extra de filmagem: R$ 18.977,00. Diária extra de deslocamento: R$ 9.488,00. '
      + 'Weather day segue a diária extra. Foro de Osasco/SP. Créditos: Direção Maví Simões · Produção Executiva '
      + 'Tato Pessanha · Produção Audiovisual Têmpora · Assistente de Câmera Julio Becker · Assistente Criativo '
      + 'Patrick Bombassaro.',
    parcelas: [
      { id: parcela1, condicao: '50% na assinatura', valor_cents: M('259499,43'), venc: '2026-08-24', status: 'aberto' },
      { id: parcela2, condicao: '50% em 15 dias corridos da entrega final', valor_cents: M('259499,43'), venc: '2026-12-23', status: 'aberto' }
    ]
  });

  await store.insert('contas', {
    projeto_id: P, tipo: 'receber', descricao: 'Fundação Bradesco — 1ª parcela (50%)',
    contraparte: 'Fundação Bradesco', valor_cents: M('259499,43'), venc: '2026-08-24',
    status: 'aberto', contrato_id: contrato.id, parcela_id: parcela1, parcela: '1/2',
    categoria: 'contrato', nf_status: 'a_emitir',
    obs: 'Contrato assinado em 22/08/2026; 2 dias corridos para o pagamento.'
  });
  await store.insert('contas', {
    projeto_id: P, tipo: 'receber', descricao: 'Fundação Bradesco — 2ª parcela (50%)',
    contraparte: 'Fundação Bradesco', valor_cents: M('259499,43'), venc: '2026-12-23',
    status: 'aberto', contrato_id: contrato.id, parcela_id: parcela2, parcela: '2/2',
    categoria: 'contrato', nf_status: 'a_emitir',
    obs: '15 dias corridos após a entrega final de 08/12. A planilha marcava 09/12 — vale o contrato.'
  });

  /* orçamento */
  for (const [rubrica, valor, obs] of ORCAMENTO) {
    await store.insert('orcamento', { projeto_id: P, rubrica, descricao: '', previsto_cents: M(valor), obs });
  }

  /* etapas */
  let ordem = 0;
  for (const [fase, nome, status, prazo] of ETAPAS) {
    await store.insert('etapas', {
      projeto_id: P, fase, nome, status, prazo, responsavel_id: null,
      depende_de: [], ordem: ordem++, obs: ''
    });
  }

  /* entregas */
  for (const [titulo, prazo, formato] of ENTREGAS) {
    await store.insert('entregas', {
      projeto_id: P, titulo, prazo, formato, status: 'pendente',
      responsavel_id: membros['Maví Simões'], link: '', obs: ''
    });
  }

  /* agenda */
  for (const [data, tipo, titulo, local, obs] of AGENDA) {
    const participantes = tipo === 'entrega' ? [membros['Maví Simões']] : viajantes;
    await store.insert('eventos', {
      projeto_id: P, data, tipo, titulo, local, obs,
      hora_inicio: '', hora_fim: '', participantes, chamadas: [],
      endereco: '', mapa: '', contato_nome: '', contato_tel: '', levar: '', roteiro_dia: ''
    });
  }

  /* chamada e logística da primeira viagem */
  const ida = store.doProjeto('eventos').find((e) => e.data === '2026-08-23');
  if (ida) {
    await store.update('eventos', ida.id, {
      hora_inicio: '04:00', hora_fim: '10:05',
      endereco: 'Aeroporto de Guarulhos (GRU)',
      contato_nome: 'Tato Pessanha', contato_tel: '(11) 96340-1980',
      levar: 'Documento com foto, cartão de embarque, CNH (carro Movida), equipamento de câmera e som, HDs de backup, carregadores.',
      roteiro_dia: '04:00 chegada ao aeroporto\n05:40 embarque\n10:05 desembarque em Palmas (2 voos)\n'
        + 'Retirada do carro na Movida — reserva 740099355700, aluguel MV1MPRM8QUBR\n'
        + 'Palmas → Conceição do Araguaia: 5h07 (322 km)',
      chamadas: viajantes.map((id) => ({ membro_id: id, hora: '04:00', obs: 'Chegada ao aeroporto' }))
    });
  }

  /* confirmações de passagem da primeira viagem */
  const bilhetes = {
    [membros['Maví Simões']]: '1272310202943',
    [membros['Julio Becker']]: '1272310202944',
    [membros['Tato Pessanha']]: '1272310202945'
  };
  for (const id of viajantes) {
    await store.insert('confirmacoes', {
      projeto_id: P, membro_id: id, tipo: 'passagem', ref_id: ida?.id || null,
      titulo: 'Passagem SP → Palmas · 23/08 · embarque 05:40',
      status: 'pendente',
      obs: `Localizador WFNEWO · bilhete ${bilhetes[id]} · 2 voos · chegada ao aeroporto 04:00.`
    });
  }
  for (const id of viajantes) {
    await store.insert('confirmacoes', {
      projeto_id: P, membro_id: id, tipo: 'contrato',
      titulo: 'Contrato de prestação de serviço assinado', status: 'pendente', obs: ''
    });
  }

  await store.log('Projeto carregado a partir do contrato 4600001793, da pauta de negociação e da planilha TÊMPORA.', 'projeto');
  return projeto;
}
