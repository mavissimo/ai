// Carga inicial do projeto real: Doc Fundação Bradesco 70 Anos (Têmpora).
//
// Fontes conferidas em 28/08/2026, nesta ordem de prevalência:
//   1. Contrato 4600001793 / PRC0045079 — rev 04 assinada (Docusign 89521261…).
//   2. Carta-Orçamento V2 e Anexo I — Cronograma V2 (anexos do contrato).
//   3. Planilha geral TÊMPORA no Drive (abas: mavi + profissionais, custo viagem,
//      cronograma, lista de voos, verba a vista) — modificada em 28/08/2026 14:39.
//   4. Google Agenda "Fundação Bradesco" — logística viva (voos, carros, hotéis).
// Onde as fontes divergem, vale o contrato e a divergência fica na observação.
import { store, TABELAS } from './store.js';
import { uid, parseMoney, somarDiasUteis, somarDias, hoje } from './utils.js';

const M = parseMoney;

// Sobe a cada mudança na carga inicial. O app compara com o que está gravado
// e oferece recarregar quando ficou para trás.
export const SEED_VERSAO = 10;

const PESSOAS = [
  {
    nome: 'Master', funcao: 'Administração do sistema', papel: 'master', tipo: 'pj',
    email: 'master@tempora', telefone: '',
    cache_cents: 0, diarias: 0, perdiem_cents: 0, contrato_status: 'na',
    obs: 'Perfil de acesso total: enxerga e edita tudo, inclusive alçadas, contrato, margem e imposto.'
  },
  {
    nome: 'Maví Simões', funcao: 'Direção de cena', papel: 'diretor', tipo: 'pj', rubrica: 'Direção de cena',
    email: 'mavi@tempora', telefone: '(19) 98220-1700',
    doc: '394.458.628-05', rg: '46.364.032-9', nascimento: '1990-01-22',
    cache_cents: M('3000'), cache_orcado_cents: M('3000'), diarias: 26, perdiem_cents: M('7000'),
    contrato_status: 'na', chave_pix: 'mavissimo1@gmail.com',
    obs: 'Sócio da MATHEUS SIMÕES AVILA LTDA (CNPJ 47.661.128/0001-60), a parte contratada. '
      + 'É quem paga, assina e emite as notas fiscais. '
      + 'Direção fechada em R$ 3.000 × 26 = R$ 78.000 (coluna NEGOCIADO da planilha, que na versão '
      + 'anterior estava zerada). Per diem: R$ 7.000 (35 × R$ 200).'
  },
  {
    nome: 'Tato Pessanha', funcao: 'Produção executiva', papel: 'coord', tipo: 'pf', rubrica: 'Produção executiva',
    email: 'tato@tempora', telefone: '(11) 96340-1980',
    doc: '083.240.687-24', rg: '633482316', nascimento: '1980-06-04',
    cache_cents: M('1600'), cache_orcado_cents: M('1600'), diarias: 26, perdiem_cents: M('7000'),
    contrato_status: 'pendente',
    obs: 'Cachê fechado em R$ 41.600 (total job: executivo + produtor de viagem + som), igual ao orçado. '
      + 'Per diem: R$ 7.000 (35 × R$ 200). Está como Produção: organiza o projeto, negocia, '
      + 'monta as contas e cuida de contratos e autorizações. Não dá baixa em pagamento nem vê a margem.'
  },
  {
    nome: 'Julio Becker', funcao: '1º assistente de câmera', papel: 'equipe', tipo: 'pf', rubrica: '1º assistente de câmera',
    email: 'becker@tempora', telefone: '(55) 98100-3404',
    doc: '063.821.999-07', rg: '1124393396', nascimento: '1997-04-04',
    cache_cents: M('1100'), cache_orcado_cents: M('1300'), diarias: 26, perdiem_cents: M('7000'),
    contrato_status: 'pendente',
    obs: 'Cachê fechado em R$ 1.100 × 26 = R$ 28.600 (coluna NEGOCIADO). Orçado era R$ 1.300 × 26 = '
      + 'R$ 33.800, sobrando R$ 5.200. Per diem: R$ 7.000 (35 × R$ 200).'
  },
  {
    nome: 'Patrick Bombassaro', funcao: 'Pesquisa de imagens', papel: 'equipe', tipo: 'pf', rubrica: 'Assistente criativo',
    email: 'patrick@tempora', telefone: '',
    cache_cents: M('4000'), cache_orcado_cents: M('8000'), diarias: 1, perdiem_cents: 0,
    contrato_status: 'pendente',
    obs: 'Neste projeto faz só pesquisa de imagens. Entra na planilha como Assistente Criativo: '
      + 'orçado R$ 8.000, fechado R$ 4.000 (coluna NEGOCIADO).'
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
  ['Kátia Pelaes', 'Corretora de seguros', 'GBI Seguros', 'katia.pelaes@gbiseguros.com', 'fornecedor', 'Apólice equipe + equipamento fechada em R$ 4.092,00. Tel (11) 99962-2312.'],
  ['Otávio Nazareth', 'Editora', 'Editora Olhares', '', 'outro', 'Indicou a produtora para a Fundação.'],
  ['Amauri — Coopertaxi', 'Taxista', 'Coopertaxi', '', 'fornecedor', 'Conceição do Araguaia (PA). Tel (63) 98406-2700.'],
  ['Sr. Edson', 'Apoio local', 'Escola Conceição do Araguaia', '', 'fornecedor', 'Tel (94) 99173-6700.'],
  ['Sr. Neto', 'Apoio local', 'Escola Conceição do Araguaia', '', 'fornecedor', 'Tel (94) 99191-6860.'],
  ['Sr. Paulo', 'Taxista', 'Bodoquena / Miranda (MS)', '', 'fornecedor', 'Tel (67) 99251-4177.'],
  ['Sr. Tucum', 'Apoio local', 'Fazenda Canuanã (TO)', '', 'fornecedor', 'Tel (63) 98445-9166.']
];

const LOCACOES = [
  ['Escola Fundação Bradesco — Conceição do Araguaia', 'Conceição do Araguaia', 'PA',
    'Av. Couto Magalhães, 2165 — Setor Universitário. Fotógrafa: Elza Lima. '
    + 'Aeroporto de referência: Palmas (PMW), 395 km / 5h07. Apoio: Sr. Edson e Sr. Neto.'],
  ['Escola Fundação Bradesco — Jaboatão', 'Jaboatão dos Guararapes', 'PE',
    'Rua Manoel Carneiro Leão, 1457 — Dois Carneiros. Fotógrafo: Ntí Uirá. '
    + 'Aeroporto: Recife (REC). Deslocamento por Uber/99 ou carro alugado.'],
  ['Escola Fundação Bradesco — Gravataí', 'Gravataí', 'RS',
    'Rua Aristides D’Avila, 390 — Parque dos Anjos. Fotógrafo: Renato Parada. '
    + 'Aeroporto: Porto Alegre (POA), 30 km. A planilha e a carta-orçamento escrevem "Gravataí - PR"; '
    + 'o contrato (cláusula 2.2) traz Gravataí/RS, que é o correto.'],
  ['Escola Fundação Bradesco — Bodoquena', 'Bodoquena', 'MS',
    'Rodovia BR-262, Estação Guaycurus — Fazenda Bodoquena, município de Miranda/MS. '
    + 'Fotógrafo: Pedro Kok. Aeroporto: Campo Grande (CGR), 250–265 km / 3h38. Taxista: Sr. Paulo. '
    + 'Data ainda não confirmada pela Fundação.'],
  ['Escola Fundação Bradesco — Fazenda Canuanã', 'Formoso do Araguaia', 'TO',
    'Fazenda Canuanã, s/n. Fotógrafa: Mariana Valente. Aeroporto: Palmas (PMW), 330 km / 4h16. '
    + 'Apoio: Sr. Tucum. Data ainda não confirmada pela Fundação.'],
  ['Escola Fundação Bradesco — Osasco', 'Osasco', 'SP',
    'Núcleo Administrativo Cidade de Deus, sede da Fundação. Fotógrafo: Fábio Bartelt. '
    + 'Data ainda não confirmada pela Fundação.']
];

// Orçamento na estrutura da planilha (abas "mavi + profissionais" e "custo viagem ").
// [rubrica, orçado, negociado, observação]
const ORCAMENTO = [
  /* --- equipe, equipamento e pós (283.891 orçado / 210.330 negociado) --- */
  ['Roteiro', '15000', '15000', 'Total job. Fechado no valor orçado.'],
  ['Assistente criativo', '8000', '4000', 'Patrick Bombassaro. Orçado 8.000, fechado 4.000.'],
  ['Direção de cena', '78000', '78000', 'Maví — R$ 3.000 × 26 (pré + diárias + viagem).'],
  ['Produção executiva', '41600', '41600', 'Tato Pessanha — R$ 1.600 × 26. Executivo + produtor de viagem + som.'],
  ['Secretaria de produção / advogada', '7000', '0', 'Ainda não contratada.'],
  ['1º assistente de câmera', '33800', '28600', 'Julio Becker. Orçado 26 × 1.300, fechado 26 × 1.100.'],
  ['Equipamento de câmera', '11700', '2770', 'Câmera, lentes e acessórios — orçado R$ 450 × 26. Pago no crédito C6 PF.'],
  ['Luz e elétrica', '7800', '0', 'R$ 300 × 26. Ainda não fechado.'],
  ['Material de produção e som', '5720', '0', 'R$ 220 × 26. Ainda não fechado.'],
  ['HDs e armazenamento', '6270', '3360', '3 HDs de 4 TB (2 de filmagem + 1 de edição). Pago no crédito C6 PF.'],
  ['Montagem — doc principal', '13000', '5000', 'Editor offline do documentário de ~15 min.'],
  ['Montagem — cortes de fotógrafo', '13000', '5000', '33 cortes de até 1 min, 3 por fotógrafo(a).'],
  ['Montagem — minidocs de escola', '13000', '5000', '6 minidocs de até 2 min, 1 por escola.'],
  ['Versões', '8000', '5000', ''],
  ['Trilha', '12000', '5000', 'Definir entre original e biblioteca.'],
  ['Color', '10000', '12000', 'Vini Azevedo, Jesus Mendes, Braiom ou Rafaim. Fechou R$ 2.000 acima do orçado.'],

  /* --- viagens e logística (172.812 orçado / 47.973,69 negociado) --- */
  ['Passagens aéreas', '52800', '17616,78', 'Orçado a R$ 2.200 por pessoa em 8 das 11 viagens. '
    + 'Fechado: Palmas R$ 10.722,51 e Recife R$ 6.894,27.'],
  ['Hospedagem', '70200', '3293,07', 'Fechado: Conceição do Araguaia R$ 1.620,00 e Jaboatão R$ 1.673,07.'],
  ['Locação de carro', '9676', '1411,73', 'Fechado: Conceição R$ 580,00 e Recife/Jaboatão R$ 831,73.'],
  ['Combustível e estacionamento', '6200', '560,11', 'Viagem 1 fechada em R$ 560,11 (aba "verba a vista").'],
  ['Per diem da equipe', '23100', '21000', 'Orçado R$ 220/dia, fechado R$ 200/dia × 35 dias para Maví, Tato e Julio.'],
  ['Verba de produção (caixinha)', '8536', '0', 'Petty cash das viagens. Ainda sem adiantamento lançado.'],
  ['Seguro (GBI)', '2300', '4092', 'Apólice equipe + equipamentos. Estourou o orçado em R$ 1.792.']
];

// Pagamentos já fechados (coluna NEGOCIADO), que viram contas a pagar.
// Os marcados como 'quitado' já saíram e viram também lançamento pago.
// [descrição, favorecido, valor, categoria, rubrica, vencimento, status, observação]
const PAGAVEIS = [
  ['Passagens SP → Palmas (ida e volta, 3 pax)', 'GOL / Decolar', '10722,51', 'passagens', 'Passagens aéreas', '2026-08-23', 'quitado',
    'Localizador WFNEWO. Ida 23/08 (CGH 06:00 → BSB → PMW 10:05), volta 26/08 (PMW 18:20 → BSB → GRU 23:05). '
    + 'Pago no crédito C6 PF. Orçado era R$ 6.600 — estourou R$ 4.122,51.'],
  ['Aluguel de carro — Conceição do Araguaia', 'Movida', '580', 'transporte', 'Locação de carro', '2026-08-23', 'quitado',
    'Reserva 740099355700 · aluguel MV1MPRM8QUBR. Retirada em Palmas 11:00, devolução 26/08 16:30.'],
  ['Pousada em Conceição do Araguaia', 'Pousada — Conceição do Araguaia (PA)', '1620', 'hospedagem', 'Hospedagem', '2026-08-23', 'quitado',
    'Pago no crédito C6 PF. Orçado era R$ 6.750.'],
  ['Passagens SP → Recife (ida e volta, 3 pax)', 'Azul', '6894,27', 'passagens', 'Passagens aéreas', '2026-08-30', 'quitado',
    'Localizador ZWQY3Q. Ida 30/08 Azul 4232 (GRU 05:00 → REC 08:00), volta 02/09 Azul 4320 (REC 20:35 → GRU 23:50). '
    + 'Pago no crédito C6 PF.'],
  ['Aluguel de carro — Recife / Jaboatão', 'Movida Recife Aeroporto', '831,73', 'transporte', 'Locação de carro', '2026-08-30', 'aberto',
    'Retirada 30/08 08:30, devolução 02/09 18:30. Marcado como "A Pagar" na planilha.'],
  ['Hospedagem em Recife (Jaboatão)', 'Rede Andrade LG Inn', '1673,07', 'hospedagem', 'Hospedagem', '2026-08-30', 'aberto',
    'Check-in 30/08 14:00, check-out 02/09 12:00. Maví individual, Tato 2 solteiros, Julio duplo. Café incluso.'],
  ['Equipamento de câmera, lentes e acessórios', 'A definir', '2770', 'equipamento', 'Equipamento de câmera', '', 'quitado',
    'Pago no crédito C6 PF. Orçado era R$ 11.700.'],
  ['3 HDs de 4 TB', 'A definir', '3360', 'equipamento', 'HDs e armazenamento', '', 'quitado',
    '2 para filmagem e 1 para edição. Pago no crédito C6 PF.'],
  ['Seguro de equipe e equipamento', 'GBI Seguros', '4092', 'seguro', 'Seguro (GBI)', '', 'aberto',
    'Kátia Pelaes. Estourou o orçado (R$ 2.300) em R$ 1.792.'],
  ['Roteiro', 'A definir', '15000', 'cachê', 'Roteiro', '', 'aberto', 'Total job. Confirmar o favorecido.'],
  ['Montagem — doc principal (offline)', 'A definir', '5000', 'pós', 'Montagem — doc principal', '', 'aberto', 'Orçado R$ 13.000.'],
  ['Montagem — cortes de fotógrafo (offline)', 'A definir', '5000', 'pós', 'Montagem — cortes de fotógrafo', '', 'aberto', 'Orçado R$ 13.000.'],
  ['Montagem — minidocs de escola (offline)', 'A definir', '5000', 'pós', 'Montagem — minidocs de escola', '', 'aberto', 'Orçado R$ 13.000.'],
  ['Versões', 'A definir', '5000', 'pós', 'Versões', '', 'aberto', 'Orçado R$ 8.000.'],
  ['Trilha', 'A definir', '5000', 'pós', 'Trilha', '', 'aberto', 'Orçado R$ 12.000.'],
  ['Color', 'Vini Azevedo / Jesus Mendes / Braiom / Rafaim', '12000', 'pós', 'Color', '', 'aberto',
    'Fechou R$ 2.000 acima do orçado (R$ 10.000).']
];

// Gastos em dinheiro já realizados (aba "verba a vista" da planilha).
// [data, descrição, valor, rubrica, quem]
const GASTOS_CAIXA = [
  ['2026-08-23', 'Combustível — trecho Palmas → Conceição', '204,07', 'Combustível e estacionamento', 'Tato Pessanha'],
  ['2026-08-26', 'Combustível — trecho Conceição → Palmas', '203,04', 'Combustível e estacionamento', 'Tato Pessanha'],
  ['2026-08-26', 'Estacionamento e pedágios da viagem 1', '153', 'Combustível e estacionamento', 'Tato Pessanha'],
  ['2026-08-23', 'Transporte por app — viagem 1 (12 corridas)', '402,08', 'Combustível e estacionamento', 'Tato Pessanha']
];

// Agenda vinda do Google Agenda "Fundação Bradesco" (calendário vivo do projeto).
// [data, tipo, título, local, confirmado, observação]
const AGENDA = [
  ['2026-08-18', 'outro', 'Pagamento — 1ª parcela (50%)', '', true,
    'Data marcada no cronograma da planilha. Pelo contrato: faturado na assinatura, pago em até 3 dias úteis.'],
  ['2026-08-21', 'outro', 'Produção', 'São Paulo', true, 'Dia de produção antes do embarque.'],
  ['2026-08-22', 'outro', 'Checagem de equipamentos', 'São Paulo', true, 'Conferência de câmera, som, luz e HDs.'],
  ['2026-08-23', 'viagem', 'SP → Palmas → Conceição do Araguaia', 'GRU / Palmas (PMW)', true,
    'GOL 1400 CGH 06:00 → BSB 07:45 · conexão 1h · GOL 1788 BSB 08:45 → PMW 10:05. '
    + 'Chegar ao aeroporto até 04:00. Localizador WFNEWO. Bagagem: mão + 1 mala de 23 kg por pessoa. '
    + 'Carro Movida retirado em Palmas às 11:00. Palmas → Conceição: 5h07 / 395 km.'],
  ['2026-08-24', 'outro', 'Scout e visita — Conceição do Araguaia', 'Conceição do Araguaia (PA)', true,
    'Escola Fundação Bradesco, Av. Couto Magalhães, 2165. Horário ainda não informado.'],
  ['2026-08-25', 'diaria', 'Filmagem — Conceição do Araguaia', 'Conceição do Araguaia (PA)', true,
    'Fotógrafa Elza Lima. Horário ainda não informado.'],
  ['2026-08-26', 'viagem', 'Conceição do Araguaia → Palmas → SP', 'Conceição do Araguaia (PA)', true,
    'Saída sugerida 11:10 · 5h07 até Palmas · devolução do carro na Movida do aeroporto às 16:30. '
    + 'GOL 1789 PMW 18:20 → BSB 19:40 · conexão 1h25 · GOL 1459 BSB 21:05 → GRU 23:05.'],
  ['2026-08-27', 'outro', 'Agenda do Maví ocupada (27 a 29/08)', '', true, 'Bloqueio no cronograma.'],
  ['2026-08-30', 'viagem', 'SP → Recife', 'GRU / Recife (REC)', true,
    'Azul 4232 direto GRU 05:00 → REC 08:00. Chegar ao aeroporto até 03:00. Localizador ZWQY3Q. '
    + 'Maví assento 12F (2 bagagens), Tato a selecionar (1), Julio 13F (1). '
    + 'Retirada do carro na Movida Recife Aeroporto às 08:30. Check-in no Rede Andrade LG Inn a partir das 14:00.'],
  ['2026-08-31', 'outro', 'Scout e visita — Jaboatão', 'Jaboatão dos Guararapes (PE)', true,
    'Escola Fundação Bradesco, Rua Manoel Carneiro Leão, 1457.'],
  ['2026-09-01', 'diaria', 'Filmagem — Jaboatão', 'Jaboatão dos Guararapes (PE)', true, 'Fotógrafo Ntí Uirá.'],
  ['2026-09-02', 'viagem', 'Recife → SP', 'Recife (PE)', true,
    'Check-out até 12:00 · devolução do carro 18:30 · Azul 4320 direto REC 20:35 → GRU 23:50. '
    + 'Chegar ao aeroporto até 18:35.'],
  ['2026-09-03', 'outro', 'Edição (03 e 04/09)', 'São Paulo', true, ''],
  ['2026-09-08', 'outro', 'Edição', 'São Paulo', true, ''],
  ['2026-09-09', 'viagem', 'SP → Porto Alegre → Gravataí + scout', 'Porto Alegre / Gravataí (RS)', true,
    'Voo ainda sem horário confirmado. POA → Gravataí: 30 km. Scout e visita no mesmo dia.'],
  ['2026-09-10', 'diaria', 'Filmagem — Gravataí', 'Gravataí (RS)', true, 'Fotógrafo Renato Parada.'],
  ['2026-09-11', 'diaria', 'Filmagem — Gravataí', 'Gravataí (RS)', true, ''],
  ['2026-09-12', 'viagem', 'Gravataí → Porto Alegre → SP', 'Gravataí (RS)', true, 'Voo ainda sem horário confirmado.'],
  ['2026-09-14', 'outro', 'Edição', 'São Paulo', true, ''],
  ['2026-09-15', 'viagem', 'SP → Campo Grande', 'Campo Grande (MS)', true, 'Voo ainda sem horário confirmado.'],
  ['2026-09-16', 'viagem', 'Campo Grande → Bodoquena + scout', 'Miranda (MS)', true, '3h38 · 250–265 km.'],
  ['2026-09-17', 'diaria', 'Filmagem — Bodoquena', 'Miranda (MS)', false,
    'Fotógrafo Pedro Kok. A carta-orçamento V2 marca esta escola como SEM DATA MARCADA — a agenda traz 17 e 18/09 como previsão.'],
  ['2026-09-18', 'diaria', 'Filmagem — Bodoquena', 'Miranda (MS)', false, 'Data prevista, aguardando confirmação.'],
  ['2026-09-19', 'viagem', 'Bodoquena → Campo Grande → SP', 'Miranda (MS)', true, '3h38 · 250–265 km.'],
  ['2026-09-21', 'viagem', 'SP → Palmas → Fazenda Canuanã', 'Palmas (TO)', true, '4h16 · 330 km de Palmas até a fazenda.'],
  ['2026-09-22', 'outro', 'Scout e visita — Canuanã', 'Formoso do Araguaia (TO)', true, ''],
  ['2026-09-23', 'diaria', 'Filmagem — Canuanã', 'Formoso do Araguaia (TO)', false,
    'Fotógrafa Mariana Valente. A carta-orçamento V2 marca esta escola como SEM DATA MARCADA — a agenda traz 23 e 24/09 como previsão.'],
  ['2026-09-24', 'diaria', 'Filmagem — Canuanã', 'Formoso do Araguaia (TO)', false, 'Data prevista, aguardando confirmação.'],
  ['2026-09-25', 'viagem', 'Canuanã → Palmas → SP', 'Formoso do Araguaia (TO)', true, ''],
  ['2026-09-28', 'outro', 'Edição (28/09 a 02/10)', 'São Paulo', true, ''],
  ['2026-10-05', 'outro', 'Edição', 'São Paulo', true, ''],
  ['2026-10-06', 'outro', 'Scout e visita — Osasco', 'Osasco (SP)', true, 'Núcleo Cidade de Deus.'],
  ['2026-10-07', 'diaria', 'Filmagem — Osasco', 'Osasco (SP)', false,
    'Fotógrafo Fábio Bartelt. A carta-orçamento V2 marca esta escola como SEM DATA MARCADA — a agenda traz 07 e 08/10 como previsão.'],
  ['2026-10-08', 'diaria', 'Filmagem — Osasco', 'Osasco (SP)', false, 'Data prevista, aguardando confirmação.'],
  ['2026-10-09', 'outro', 'Edição', 'São Paulo', true, ''],
  ['2026-10-12', 'viagem', 'SP → Belém', 'Belém (PA)', false, 'Data prevista, aguardando confirmação.'],
  ['2026-10-13', 'diaria', 'Filmagem — Patricia Brasil', 'Belém (PA)', false, 'Entrevista de estúdio. Data prevista.'],
  ['2026-10-14', 'viagem', 'Belém → SP', 'Belém (PA)', false, 'Data prevista.'],
  ['2026-10-15', 'diaria', 'Filmagem — Lalo de Almeida', 'São Paulo (SP)', false, 'Entrevista de estúdio. Data prevista.'],
  ['2026-10-16', 'outro', 'Edição', 'São Paulo', true, ''],
  ['2026-10-19', 'viagem', 'SP → Salvador', 'Salvador (BA)', false, 'Data prevista.'],
  ['2026-10-20', 'diaria', 'Filmagem — Edgar Azevedo', 'Salvador (BA)', false, 'Entrevista de estúdio. Data prevista.'],
  ['2026-10-21', 'viagem', 'Salvador → Curitiba', 'Curitiba (PR)', false, 'Data prevista.'],
  ['2026-10-22', 'diaria', 'Filmagem — Vilma Slomp', 'Curitiba (PR)', false, 'Entrevista de estúdio. Data prevista.'],
  ['2026-10-23', 'viagem', 'Curitiba → SP', 'Curitiba (PR)', false, 'Data prevista.'],
  ['2026-10-26', 'outro', 'Edição', 'São Paulo', true, ''],
  ['2026-10-27', 'diaria', 'Filmagem — Maíra Erlich', 'São Paulo (SP)', false, 'Entrevista de estúdio. Data prevista.'],
  ['2026-10-28', 'outro', 'Edição (28 a 30/10)', 'São Paulo', true, ''],
  ['2026-11-02', 'outro', 'Edição (02 a 06/11)', 'São Paulo', true, ''],
  ['2026-11-09', 'outro', 'Edição (09 a 12/11)', 'São Paulo', true, ''],
  ['2026-11-13', 'entrega', 'Entrega do primeiro corte', '', true,
    '1 doc de 15 min + 33 cortes de até 1 min + 6 minidocs de até 2 min. Análise da Fundação em 5 dias úteis.'],
  ['2026-11-14', 'outro', 'Ajustes (14 a 18/11)', 'São Paulo', true, ''],
  ['2026-11-19', 'entrega', 'Entrega da versão 2', '', true, ''],
  ['2026-11-20', 'outro', 'Cor, motion e trilha (20 a 27/11)', 'São Paulo', true, ''],
  ['2026-11-30', 'entrega', 'Entrega da versão 3', '', true, ''],
  ['2026-12-01', 'outro', 'Ajustes (01 a 07/12)', 'São Paulo', true, ''],
  ['2026-12-08', 'entrega', 'ENTREGA FINAL', '', true,
    'Marco contratual (cláusula 4.1). Masters, brutos e editáveis na entrega final; backups por 90 dias.'],
  ['2027-01-07', 'outro', 'Pagamento — 2ª parcela (50%)', '', false,
    'Pelo contrato: faturada na entrega final e paga em até 30 dias corridos (cláusula 6.1.II). '
    + 'A planilha e a agenda marcam 09/12/2026 — vale o contrato.']
];

// As 11 viagens da aba "custo viagem " da planilha, com orçado por viagem.
// [nº, título, ida, volta, sai de, vai para, orçado, situação, observação]
const VIAGENS = [
  ['1', 'SP → Palmas → Conceição do Araguaia', '2026-08-23', '2026-08-26', 'São Paulo (CGH)', 'Conceição do Araguaia (PA)',
    '16026', 'feita', 'Voo GOL via Brasília, localizador WFNEWO. Carro Movida retirado em Palmas. 395 km / 5h07 até a escola.'],
  ['2', 'SP → Recife → Jaboatão', '2026-08-30', '2026-09-02', 'São Paulo (GRU)', 'Jaboatão dos Guararapes (PE)',
    '15350', 'confirmada', 'Azul 4232 / 4320, localizador ZWQY3Q. Carro Movida no aeroporto. Rede Andrade LG Inn em Boa Viagem.'],
  ['3', 'SP → Porto Alegre → Gravataí', '2026-09-09', '2026-09-12', 'São Paulo', 'Gravataí (RS)',
    '14900', 'confirmada', 'Voo ainda não fechado. POA → Gravataí: 30 km.'],
  ['4', 'SP → Campo Grande → Bodoquena', '2026-09-15', '2026-09-19', 'São Paulo', 'Miranda (MS)',
    '14900', 'prevista', 'Datas de filmagem ainda não confirmadas pela Fundação. 250–265 km / 3h38 do aeroporto.'],
  ['5', 'SP → Palmas → Canuanã', '2026-09-21', '2026-09-25', 'São Paulo', 'Formoso do Araguaia (TO)',
    '14900', 'prevista', 'Datas de filmagem ainda não confirmadas pela Fundação. 330 km / 4h16 do aeroporto.'],
  ['6', 'SP → Osasco', '2026-10-06', '2026-10-08', 'São Paulo', 'Osasco (SP)',
    '7300', 'prevista', 'Sem voo — só carro. Datas ainda não confirmadas.'],
  ['7', 'SP → Belém (Patricia Brasil)', '2026-10-12', '2026-10-14', 'São Paulo', 'Belém (PA)',
    '13900', 'prevista', 'Entrevista de estúdio. Data prevista.'],
  ['8', 'São Paulo (Lalo de Almeida)', '2026-10-15', '2026-10-15', 'São Paulo', 'São Paulo (SP)',
    '7000', 'prevista', 'Entrevista de estúdio, sem voo. Data prevista.'],
  ['9', 'SP → Salvador (Edgar Azevedo)', '2026-10-19', '2026-10-21', 'São Paulo', 'Salvador (BA)',
    '13900', 'prevista', 'Entrevista de estúdio. Data prevista.'],
  ['10', 'Salvador → Curitiba (Vilma Slomp)', '2026-10-21', '2026-10-23', 'Salvador', 'Curitiba (PR)',
    '13900', 'prevista', 'Entrevista de estúdio. Data prevista.'],
  ['11', 'São Paulo (Maíra Erlich)', '2026-10-26', '2026-10-27', 'São Paulo', 'São Paulo (SP)',
    '6800', 'prevista', 'Entrevista de estúdio, sem voo. Data prevista.']
];

// Os links de onde a informação vem e que mudam sem avisar.
// [título, url, tipo, frequência, quem confere, o que olhar]
const FONTES = [
  ['Planilha geral TÊMPORA — Bradesco 70', 'https://docs.google.com/spreadsheets/d/1YzxxBFst2R4c3-vgEYDI50qxhVYIp9UrCeazoKER5Oo/edit',
    'planilha', 'semanal', 'Tato Pessanha',
    'Abas: mavi + profissionais (coluna NEGOCIADO), custo viagem (as 11 viagens), '
    + 'cronograma, lista de voos e verba a vista. É a fonte do orçamento e dos cachês.'],
  ['Google Agenda do projeto', 'https://calendar.google.com/calendar/u/1?cid=OTU5NDNkYjNkZWZjYzU1MmEwNTFmNDYwYjNmYTVlOTRlM2Y3NDk0NjVjNWRiYWJhZmNiYjllYmY5NWJiNjk1M0Bncm91cC5jYWxlbmRhci5nb29nbGUuY29t',
    'agenda', 'diaria', 'Tato Pessanha',
    'Voos, carros, hotéis e localizadores. O ⏳ no título marca data ainda não confirmada.'],
  ['Cronograma oficial (PDF no Drive)', 'https://drive.google.com/file/d/1ZSHAscVHWb8UC9XU-entRsEckflVPeMH/view',
    'contrato', 'quando_mudar', 'Tato Pessanha', 'Anexo I do contrato. Referência das diárias.'],
  ['Contrato 4600001793 rev 04', '', 'contrato', 'quando_mudar', 'Maví Simões',
    'Cláusula 6.10 (retenção de 5%) x Quadro Resumo VI (sem retenção). Prazo da 2ª parcela.'],
  ['Vouchers e comprovantes de viagem', '', 'pasta', 'quando_mudar', 'Tato Pessanha',
    'Voos, locação de carro e hotéis. Cada viagem precisa do seu antes do embarque.']
];

// Quantas partes cada etapa tem de verdade. O progresso sai daqui, não de um
// "feito / não feito" que esconde 5 escolas ainda por rodar.
const METAS = {
  'Rodar as 6 escolas': { meta: 6, unidade: 'escolas', feitos: 2 },
  'Rodar as 5 entrevistas de fotógrafo em estúdio': { meta: 5, unidade: 'entrevistas', feitos: 0 },
  'Backup duplo criptografado em locais separados': { meta: 6, unidade: 'escolas', feitos: 2 },
  'Fechar os voos das viagens 3 a 11': { meta: 9, unidade: 'viagens', feitos: 0 },
  'Contratos da equipe (PF e PJ) assinados': { meta: 4, unidade: 'contratos', feitos: 0 },
  'Autorizações de imagem, nome e voz (Anexo II, com termo para menores)': { meta: 6, unidade: 'escolas', feitos: 0 },
  'Certidões de antecedentes de quem entra nas escolas': { meta: 3, unidade: 'certidões', feitos: 0 },
  'Confirmar datas de Bodoquena, Canuanã e Osasco': { meta: 3, unidade: 'escolas', feitos: 0 },
  'Entrega final das 40 peças': { meta: 40, unidade: 'peças', feitos: 0 }
};

const ETAPAS = [
  ['negociacao', 'Carta-Orçamento V2 e Cronograma V2 aprovados', 'feito', '2026-08-14'],
  ['negociacao', 'Cadastro de fornecedor no Bradesco', 'feito', '2026-07-31'],
  ['negociacao', 'Homologação e certidões entregues', 'feito', '2026-08-17'],
  ['negociacao', 'Contrato 4600001793 rev 04 assinado (Docusign)', 'feito', '2026-08-22'],
  ['negociacao', 'Emitir NF da 1ª parcela', 'fazendo', '2026-08-22'],
  ['negociacao', 'Receber 1ª parcela (50%)', 'fazendo', '2026-08-26'],
  ['pre', 'Confirmar datas de Bodoquena, Canuanã e Osasco', 'fazendo', '2026-09-03'],
  ['pre', 'Contratos da equipe (PF e PJ) assinados', 'nao', '2026-08-31'],
  ['pre', 'Apólice GBI emitida (equipe + equipamento)', 'fazendo', '2026-08-31'],
  ['pre', 'Certidões de antecedentes de quem entra nas escolas', 'nao', '2026-08-31'],
  ['pre', 'Autorizações de imagem, nome e voz (Anexo II, com termo para menores)', 'fazendo', '2026-08-31'],
  ['pre', 'Requisitos de segurança de acesso (Anexo III) e Código de Conduta (Anexo V)', 'nao', '2026-08-31'],
  ['pre', 'Logística da viagem 2 — Recife / Jaboatão', 'feito', '2026-08-28'],
  ['pre', 'Fechar voos das viagens 3 a 11', 'nao', '2026-09-04'],
  ['producao', 'Rodar as 6 escolas', 'fazendo', '2026-10-08'],
  ['producao', 'Rodar as 5 entrevistas de fotógrafo em estúdio', 'nao', '2026-10-27'],
  ['producao', 'Backup duplo criptografado em locais separados', 'fazendo', '2026-10-27'],
  // A planilha tem uma linha por contratação — aqui também. "Fechar a pós" não
  // é uma coisa só: são seis fornecedores diferentes, com valor e prazo próprios.
  ['pos', 'Fechar montador do documentário (R$ 13.000 orçado / 5.000 negociado)', 'fazendo', '2026-09-15'],
  ['pos', 'Fechar montador dos cortes de fotógrafo (R$ 13.000 / 5.000)', 'nao', '2026-09-15'],
  ['pos', 'Fechar montador dos minidocs de escola (R$ 13.000 / 5.000)', 'nao', '2026-09-15'],
  ['pos', 'Fechar quem faz as versões (R$ 8.000 / 5.000)', 'nao', '2026-09-30'],
  ['pos', 'Fechar a trilha (R$ 12.000 / 5.000)', 'nao', '2026-09-30'],
  ['pos', 'Fechar o color (R$ 10.000 / 12.000 — estourou)', 'fazendo', '2026-09-30'],
  ['pos', 'Montagem — primeiro corte', 'nao', '2026-11-13'],
  ['pos', 'Rodada 1 de aprovação com a Fundação (5 dias úteis)', 'nao', '2026-11-18'],
  ['pos', 'Versão 2', 'nao', '2026-11-19'],
  ['pos', 'Cor, motion e trilha', 'nao', '2026-11-27'],
  ['pos', 'Versão 3', 'nao', '2026-11-30'],
  ['pos', 'Ficha técnica de entrega aprovada antes da finalização', 'nao', '2026-11-30'],
  ['entrega', 'Entrega final das 40 peças', 'nao', '2026-12-08'],
  ['entrega', 'Masters, brutos e editáveis + relação e recibo', 'nao', '2026-12-08'],
  ['entrega', 'Emitir NF da 2ª parcela (até o dia 22 do mês)', 'nao', '2026-12-22'],
  ['entrega', 'Receber 2ª parcela (50%)', 'nao', '2027-01-07'],
  ['entrega', 'Cobrar a liberação da retenção de garantia, se aplicada', 'nao', '2027-01-07'],
  ['entrega', 'Guardar backups por 90 dias após a entrega', 'nao', '2027-03-08']
];

// [título, quem faz, prazo, etapa a que pertence]
const TAREFAS = [
  ['Confirmar com a Fundação as datas de Bodoquena, Canuanã e Osasco', 'Tato Pessanha', '2026-09-03',
    'Confirmar datas de Bodoquena, Canuanã e Osasco'],
  ['Checar com o jurídico a retenção de garantia de 5% (cláusula 6.10 x Quadro Resumo VI)', 'Maví Simões', '2026-09-01', ''],
  ['Emitir a NF da 1ª parcela', 'Tato Pessanha', '2026-08-22', 'Emitir NF da 1ª parcela'],
  ['Fechar os contratos de PF e PJ da equipe', 'Tato Pessanha', '2026-08-31', 'Contratos da equipe (PF e PJ) assinados'],
  ['Juntar as certidões de antecedentes de quem entra nas escolas', 'Tato Pessanha', '2026-08-31',
    'Certidões de antecedentes de quem entra nas escolas'],
  ['Pagar o carro de Recife / Jaboatão (R$ 831,73)', 'Tato Pessanha', '2026-09-02', ''],
  ['Fechar os voos de Porto Alegre (viagem 3, embarque 09/09)', 'Tato Pessanha', '2026-08-30',
    'Fechar voos das viagens 3 a 11'],
  ['Confirmar as diárias de Gravataí com 10 dias úteis de antecedência', 'Tato Pessanha', '2026-08-27',
    'Confirmar datas de Bodoquena, Canuanã e Osasco'],
  ['Fazer o backup duplo do material de Conceição e Jaboatão', 'Julio Becker', '2026-09-03',
    'Backup duplo criptografado em locais separados'],
  ['Levantar as autorizações de imagem das escolas', 'Patrick Bombassaro', '2026-08-31',
    'Autorizações de imagem, nome e voz (Anexo II, com termo para menores)'],
  ['Lançar o adiantamento da verba à vista para bater a caixinha', 'Tato Pessanha', '2026-08-31', ''],
  ['Fechar o color com Vini, Jesus, Braiom ou Rafaim', 'Maví Simões', '2026-09-30',
    'Fechar o color (R$ 10.000 / 12.000 — estourou)'],
  ['Escolher e fechar o montador do documentário', 'Maví Simões', '2026-09-15',
    'Fechar montador do documentário (R$ 13.000 orçado / 5.000 negociado)']
];

const ENTREGAS = [
  ['Documentário principal — 15 min', '2026-12-08', 'Aprox. 15 minutos'],
  ['Corte do documentário — até 2 min', '2026-12-08', 'Versão curta do doc principal'],
  ['33 cortes individuais — até 1 min', '2026-12-08', '3 por fotógrafo(a), 11 fotógrafos'],
  ['6 minidocumentários — até 2 min', '2026-12-08', '1 por escola'],
  ['Masters, brutos e editáveis', '2026-12-08', 'Com relação dos arquivos e recibo. Backups por 90 dias.']
];

/* Semeadura idempotente. Cada registro da carga ganha uma `chave` estável.
   Semear de novo só insere o que ainda não existe — nunca sobrescreve, nunca
   apaga. É o que garante que atualizar a carga não desfaça o trabalho de
   ninguém. */
let P = null;

const achar = (tabela, chave) => store.doProjeto(tabela).find((r) => r.chave === chave);

async function ins(tabela, chave, dados) {
  const existe = achar(tabela, chave);
  if (existe) return existe;
  return store.insert(tabela, { ...dados, projeto_id: P, chave });
}

/** Corrige um campo da carga — mas só se ninguém tiver editado o registro. */
async function corrigir(tabela, chave, dados) {
  const r = achar(tabela, chave);
  if (!r || r.editado_em) return false;
  const muda = {};
  for (const [k, v] of Object.entries(dados)) if (r[k] !== v) muda[k] = v;
  if (!Object.keys(muda).length) return false;
  await store.update(tabela, r.id, muda);
  return true;
}

/** Só preenche campo que ainda está vazio — não pisa no que já foi escrito. */
async function completar(tabela, id, dados) {
  const r = store.get(tabela, id);
  if (!r) return;
  const falta = {};
  for (const [k, v] of Object.entries(dados)) {
    const atual = r[k];
    if (atual === undefined || atual === null || atual === ''
      || (Array.isArray(atual) && !atual.length)) falta[k] = v;
  }
  if (Object.keys(falta).length) await store.update(tabela, id, falta);
}

// Datas que saem do contrato, calculadas — não digitadas.
const ASSINATURA = '2026-08-22';                       // sábado
const ENTREGA_FINAL = '2026-12-08';
const VENC_PARCELA1 = somarDiasUteis(ASSINATURA, 3);   // 3 dias úteis (cláusula 6.1.I) = 26/08
const VENC_PARCELA2 = somarDias(ENTREGA_FINAL, 30);    // 30 dias corridos (6.1.II) = 07/01/2027

export async function criarProjetoBradesco(existente = null) {
  const projeto = existente || await store.insert('projetos', {
    id: uid('proj'),
    chave: 'proj:bradesco70',
    nome: 'Doc Fundação Bradesco 70 Anos',
    cliente: 'Fundação Bradesco',
    agencia: 'Têmpora (marca e crédito)',
    formato: '1 doc 15min + corte de 2min + 33 cortes + 6 minidocs — 9 cidades',
    status: 'producao',
    inicio: '2026-08-23',
    entrega: '2026-12-08',
    valor_contrato_cents: M('518998,86'),
    imposto_regime: 'simples',
    imposto_aliquota: 12,
    seed_versao: SEED_VERSAO,
    obs: 'Contrato 4600001793 (PRC0045079), rev 04 assinada em 22/08/2026, vigência de 6 meses. '
      + 'Cada diária precisa ser confirmada pela Fundação com 10 dias úteis de antecedência (cláusula 4.3). '
      + '17 diárias de filmagem e 18 de viagem. Regime Simples Nacional, CNAE 5911-1/99, IM 74270133. '
      + 'A alíquota de 12% é a que a planilha usa para chegar no valor de NF.'
  });
  store.setProjeto(projeto.id);
  P = projeto.id;

  /* equipe */
  const membros = {};
  for (const p of PESSOAS) {
    const m = await ins('membros', 'membro:' + p.email, { ativo: true, ...p });
    membros[p.nome] = m.id;
  }
  const viajantes = [membros['Maví Simões'], membros['Julio Becker'], membros['Tato Pessanha']];

  /* contatos */
  for (const [nome, papel, empresa, email, tipo, obs] of CONTATOS) {
    await ins('contatos', 'contato:' + nome, { nome, papel, empresa, email, tipo, telefone: '', obs });
  }

  /* locações */
  for (const [nome, cidade, uf, obs] of LOCACOES) {
    await ins('locacoes', 'loc:' + cidade, {
      nome, cidade, uf, endereco: '', contato: '', telefone: '',
      valor_cents: 0, autorizacao: 'pendente', horario: '', obs
    });
  }

  /* contrato + parcelas */
  const parcela1 = uid('parc'), parcela2 = uid('parc');
  const contrato = await ins('contratos', 'contrato:4600001793', {
    titulo: 'Fundação Bradesco — Making of 70 Anos (nº 4600001793)',
    tipo: 'cliente',
    contratante: 'Fundação Bradesco (CNPJ 60.701.521/0001-06)',
    contratado: 'Matheus Simões Avila Ltda (CNPJ 47.661.128/0001-60)',
    valor_total_cents: M('518998,86'),
    assinado_em: '2026-08-22',
    objeto: 'Produção audiovisual de 40 peças em 9 cidades (Conceição do Araguaia/PA, Jaboatão dos '
      + 'Guararapes/PE, Gravataí/RS, Bodoquena/MS, Canuanã/TO, Osasco/SP, São Paulo/SP, Curitiba/PR e '
      + 'Salvador/BA): 1 documentário principal de ~15 min com corte de até 2 min, 33 cortes individuais '
      + 'de até 1 min e 6 minidocumentários de até 2 min.',
    entregaveis: '1 doc 15 min · 1 corte de até 2 min · 33 cortes até 1 min · 6 minidocs até 2 min · '
      + 'Masters, brutos e editáveis na entrega final, com relação dos arquivos e recibo.',
    prazo_entrega: '2026-12-08',
    direitos: 'Cessão dos direitos sobre as Obras finais após o pagamento integral, para uso institucional '
      + 'interno e internet. Preservados direitos morais, materiais preexistentes, portfólio autorizado e '
      + 'licenças de terceiros. Backups por 90 dias.',
    praca: 'Brasil — uso institucional interno e internet',
    janela: 'Vigência de 6 meses a contar da assinatura (22/08/2026)',
    exclusividade: 'Novas filmagens, episódios, formatos, peças ou série dependem de aditivo ou novo contrato.',
    multa: 'Mora: 0,2% ao dia, limitada a 10%. Inadimplemento de obrigação não pecuniária: 1%, limitado a 10%. '
      + 'Rescisão por culpa: 10%. Atraso de pagamento da Fundação: juros de 1% ao mês pro rata die, após '
      + 'notificação com 20 dias corridos para regularizar. Foro de Osasco/SP.',
    condicoes_pagto: '50% (R$ 259.499,43) faturados na assinatura e pagos em até 3 dias úteis, sem depender '
      + 'de aceite. 50% (R$ 259.499,43) faturados na entrega final e pagos em até 30 dias corridos. '
      + 'NF até o dia 22 de cada mês — emitida entre 23 e 31 tem de ser cancelada e reemitida no mês seguinte '
      + '(cláusula 6.4.1). A NF só é recebida com comprovação do aceite e certidões de regularidade fiscal, '
      + 'trabalhista e previdenciária.',
    obs: 'ATENÇÃO — divergência interna do contrato: o Quadro Resumo VI diz "sem retenção de garantia", '
      + 'mas a cláusula 6.10 manda deduzir 5% de cada pagamento (R$ 25.949,94), liberados no aceite final. '
      + 'O próprio Quadro Resumo diz que, havendo divergência, prevalecem as cláusulas — ou seja, a retenção '
      + 'vale. Vale confirmar com a Fundação antes de faturar. '
      + 'Aceite: análise em 5 dias úteis, silêncio NÃO configura aceite (cláusula 5.8), até 3 rodadas de '
      + 'revisão por Obra. Diária extra de filmagem: R$ 18.977,00. Diária extra de deslocamento: R$ 9.488,00. '
      + 'Weather day segue a diária extra. Anexos: I Cronograma · II Autorizações de imagem · III Requisitos '
      + 'de segurança · IV Termo de responsabilidade · V Código de conduta · VI Carta-Orçamento V2.',
    parcelas: [
      { id: parcela1, condicao: '50% na assinatura, pago em até 3 dias úteis', valor_cents: M('259499,43'), venc: VENC_PARCELA1, status: 'aberto' },
      { id: parcela2, condicao: '50% em até 30 dias corridos da entrega final', valor_cents: M('259499,43'), venc: VENC_PARCELA2, status: 'aberto' }
    ]
  });

  await ins('contas', 'conta:parcela1', {
    tipo: 'receber', descricao: 'Fundação Bradesco — 1ª parcela (50%)',
    contraparte: 'Fundação Bradesco', valor_cents: M('259499,43'), venc: VENC_PARCELA1,
    status: 'aberto', contrato_id: contrato.id, parcela_id: parcela1, parcela: '1/2',
    categoria: 'contrato', nf_status: 'a_emitir',
    obs: `Faturada na assinatura (22/08, sábado) e paga em até 3 dias úteis: vence ${VENC_PARCELA1}. `
      + 'Não depende de aceite. '
      + 'O cronograma da planilha marcava 18/08.'
  });
  await ins('contas', 'conta:parcela2', {
    tipo: 'receber', descricao: 'Fundação Bradesco — 2ª parcela (50%)',
    contraparte: 'Fundação Bradesco', valor_cents: M('259499,43'), venc: VENC_PARCELA2,
    status: 'aberto', contrato_id: contrato.id, parcela_id: parcela2, parcela: '2/2',
    categoria: 'contrato', nf_status: 'a_emitir',
    obs: '30 dias corridos após a entrega final de 08/12 (cláusula 6.1.II). A planilha e a agenda marcam '
      + '09/12 — vale o contrato. Se a NF sair depois do dia 22, escorrega mais um mês (cláusula 6.4.1).'
  });

  /* orçamento */
  for (const [rubrica, orcado, negociado, obs] of ORCAMENTO) {
    await ins('orcamento', 'rub:' + rubrica, {
      rubrica, descricao: '',
      previsto_cents: M(orcado), negociado_cents: M(negociado), obs
    });
  }

  /* pagamentos já fechados viram contas a pagar */
  for (const [descricao, contraparte, valor, categoria, rubrica, venc, status, obs] of PAGAVEIS) {
    await ins('contas', 'pag:' + descricao, {
      tipo: 'pagar', descricao, contraparte, valor_cents: M(valor),
      venc, status, categoria, rubrica, nf_status: 'a_receber', obs
    });
    // O que já saiu também entra como gasto realizado, para o dinheiro bater.
    if (status === 'quitado') {
      await ins('lancamentos', 'lanc:' + descricao, {
        tipo: 'saida', descricao, valor_cents: M(valor), rubrica,
        data: venc || '2026-08-22', fornecedor: contraparte, forma: 'crédito',
        membro_id: null, evento_id: null, fonte: 'empresa', reembolso: false,
        sem_comprovante: true, status: 'pago', aprovado_por: null, obs
      });
    }
  }

  /* Correções desta carga. Cada uma só entra se o registro ainda estiver
     como veio — se você mudou a data da parcela, ela fica com a sua. */
  await corrigir('contas', 'conta:parcela1', { venc: VENC_PARCELA1 });
  await corrigir('contas', 'conta:parcela2', { venc: VENC_PARCELA2 });

  /* --------------------------------------------------------------------
     1ª leva de pagamentos: 3 dias úteis depois de a 1ª parcela cair.
     Combinado: 100% dos per diems, 100% do Tato, 60% do Becker e 50% do Maví.
     -------------------------------------------------------------------- */
  const parc1 = achar('contas', 'conta:parcela1');
  const baseLeva = parc1?.quitado_em || parc1?.venc || VENC_PARCELA1;
  const vencLeva = somarDiasUteis(baseLeva, 3);
  const FATIA = { 'mavi@tempora': 0.5, 'tato@tempora': 1, 'becker@tempora': 0.6 };
  for (const em of Object.keys(FATIA)) {
    await corrigir('contas', 'cache1:' + em, { venc: vencLeva });
    await corrigir('contas', 'perdiem:' + em, { venc: vencLeva });
  }

  /* cachês e per diems fechados */
  for (const p of PESSOAS) {
    const id = membros[p.nome];
    const bruto = (p.cache_cents || 0) * (p.diarias || 0);
    const fatia = FATIA[p.email] || 0;

    if (bruto && fatia) {
      // Parte combinada para a 1ª leva, e o resto fica em aberto sem data.
      const agora = Math.round(bruto * fatia);
      await ins('contas', 'cache1:' + p.email, {
        tipo: 'pagar', descricao: `Cachê — ${p.nome} (${Math.round(fatia * 100)}%)`,
        contraparte: p.nome, valor_cents: agora, venc: vencLeva, status: 'aberto',
        membro_id: id, categoria: 'cachê', rubrica: p.rubrica, parcela: '1/2',
        nf_status: p.tipo === 'pj' ? 'a_receber' : 'na',
        obs: `${Math.round(fatia * 100)}% de ${(bruto / 100).toLocaleString('pt-BR',
          { style: 'currency', currency: 'BRL' })}. Combinado: 3 dias úteis depois de a 1ª parcela cair.`
      });
      if (bruto - agora > 0) {
        await ins('contas', 'cache2:' + p.email, {
          tipo: 'pagar', descricao: `Cachê — ${p.nome} (saldo)`,
          contraparte: p.nome, valor_cents: bruto - agora, venc: '', status: 'aberto',
          membro_id: id, categoria: 'cachê', rubrica: p.rubrica, parcela: '2/2',
          nf_status: p.tipo === 'pj' ? 'a_receber' : 'na',
          obs: 'Saldo do cachê. Data a combinar.'
        });
      }
    } else if (bruto) {
      await ins('contas', 'cache:' + p.email, {
        tipo: 'pagar', descricao: `Cachê — ${p.nome} (${p.funcao})`,
        contraparte: p.nome, valor_cents: bruto,
        venc: '', status: 'aberto', membro_id: id, categoria: 'cachê', rubrica: p.rubrica,
        nf_status: p.tipo === 'pj' ? 'a_receber' : 'na',
        obs: `Coluna NEGOCIADO da planilha: ${p.diarias} × R$ ${(p.cache_cents / 100).toLocaleString('pt-BR')}.`
      });
    }

    if (p.perdiem_cents) {
      await ins('contas', 'perdiem:' + p.email, {
        tipo: 'pagar', descricao: `Per diem — ${p.nome}`,
        contraparte: p.nome, valor_cents: p.perdiem_cents, venc: vencLeva, status: 'aberto',
        membro_id: id, categoria: 'per diem', rubrica: 'Per diem da equipe', nf_status: 'na',
        obs: '35 dias × R$ 200 (negociado). Combinado: 100% pago 3 dias úteis depois de a 1ª parcela cair.'
      });
    }
  }

  /* etapas */
  let ordem = 0;
  for (const [fase, nome, status, prazo] of ETAPAS) {
    const m = METAS[nome];
    await ins('etapas', 'etapa:' + nome, {
      fase, nome, status, prazo, responsavel_id: null,
      meta: m?.meta || 0, feitos: m?.feitos || 0, unidade: m?.unidade || '',
      depende_de: [], ordem: ordem++, obs: ''
    });
  }

  /* tarefas em aberto */
  for (const [titulo, dono, prazo, etapaNome] of TAREFAS) {
    const etapa = etapaNome ? store.doProjeto('etapas').find((e) => e.nome === etapaNome) : null;
    await ins('tarefas', 'tar:' + titulo, {
      titulo, responsavel_id: membros[dono] || null, prazo,
      etapa_id: etapa?.id || null, status: 'aberta', feito: false, cobrado_em: '', descricao: ''
    });
  }

  /* entregas */
  for (const [titulo, prazo, formato] of ENTREGAS) {
    await ins('entregas', 'entrega:' + titulo, {
      titulo, prazo, formato, status: 'pendente',
      responsavel_id: membros['Maví Simões'], link: '', obs: ''
    });
  }

  /* agenda */
  for (const [data, tipo, titulo, local, confirmado, obs] of AGENDA) {
    const participantes = (tipo === 'entrega' || tipo === 'outro') ? [membros['Maví Simões']] : viajantes;
    await ins('eventos', 'ev:' + data + ':' + titulo, {
      data, tipo, titulo, local, obs, confirmado,
      hora_inicio: '', hora_fim: '', participantes, chamadas: [],
      endereco: '', mapa: '', contato_nome: '', contato_tel: '', levar: '', roteiro_dia: ''
    });
  }

  /* chamada e logística das duas primeiras viagens */
  const eventos = store.doProjeto('eventos');
  const ida1 = eventos.find((e) => e.data === '2026-08-23');
  if (ida1) {
    await completar('eventos', ida1.id, {
      hora_inicio: '04:00', hora_fim: '10:05',
      endereco: 'Aeroporto de Congonhas (CGH) — GOL 1400',
      contato_nome: 'Tato Pessanha', contato_tel: '(11) 96340-1980',
      levar: 'Documento com foto, cartão de embarque, CNH (carro Movida), equipamento de câmera e som, HDs de backup, carregadores.',
      roteiro_dia: '04:00 chegada ao aeroporto\n06:00 GOL 1400 CGH → BSB (07:45)\n08:45 GOL 1788 BSB → PMW (10:05)\n'
        + '11:00 retirada do carro na Movida — reserva 740099355700, aluguel MV1MPRM8QUBR\n'
        + 'Palmas → Conceição do Araguaia: 5h07 (395 km)',
      chamadas: viajantes.map((id) => ({ membro_id: id, hora: '04:00', obs: 'Chegada ao aeroporto' }))
    });
  }
  const ida2 = eventos.find((e) => e.data === '2026-08-30');
  if (ida2) {
    await completar('eventos', ida2.id, {
      hora_inicio: '03:00', hora_fim: '14:30',
      endereco: 'Aeroporto de Guarulhos (GRU) — Azul 4232',
      contato_nome: 'Tato Pessanha', contato_tel: '(11) 96340-1980',
      levar: 'Documento com foto, CNH, equipamento de câmera e som, HDs de backup, carregadores.',
      roteiro_dia: '03:00 chegada ao aeroporto\n05:00 Azul 4232 GRU → REC (08:00)\n'
        + '08:30 retirada do carro na Movida Recife Aeroporto\n'
        + '14:00 check-in no Rede Andrade LG Inn (Av. Domingos Ferreira, 3067 — Boa Viagem)',
      chamadas: viajantes.map((id) => ({ membro_id: id, hora: '03:00', obs: 'Chegada ao aeroporto' }))
    });
  }

  /* gastos em dinheiro já feitos (aba "verba a vista") */
  for (const [data, descricao, valor, rubrica, quem] of GASTOS_CAIXA) {
    await ins('lancamentos', 'caixa:' + descricao, {
      tipo: 'saida', descricao, valor_cents: M(valor), rubrica, data,
      fornecedor: '', forma: 'dinheiro', membro_id: membros[quem] || null,
      evento_id: eventos.find((e) => e.data === data)?.id || null,
      fonte: 'empresa', reembolso: false, sem_comprovante: true,
      status: 'aprovado', aprovado_por: membros['Maví Simões'],
      obs: 'Veio da aba "verba a vista" da planilha. Falta anexar o comprovante.'
    });
  }

  /* fontes vivas do projeto */
  for (const [titulo, url, tipoF, frequencia, quem, obs] of FONTES) {
    await ins('fontes', 'fonte:' + titulo, {
      titulo, url, tipo: tipoF, frequencia,
      responsavel_id: membros[quem] || null, conferido_em: '2026-08-28', obs
    });
  }

  /* viagens */
  const viagens = {};
  for (const [numero, titulo, ida, volta, origem, destino, orcado, status, obs] of VIAGENS) {
    const v = await ins('viagens', 'viagem:' + numero, {
      numero, titulo, ida, volta, origem, destino,
      orcado_cents: M(orcado), status, obs, participantes: viajantes
    });
    viagens[numero] = v.id;
  }
  // Amarra o que já sabemos: eventos e compromissos caem na viagem pela data.
  const daData = (d) => VIAGENS.find(([, , ida, volta]) => d >= ida && d <= volta)?.[0];
  for (const e of store.doProjeto('eventos')) {
    const n = daData(e.data);
    if (n && !e.viagem_id) await store.update('eventos', e.id, { viagem_id: viagens[n] });
  }
  for (const c of store.doProjeto('contas')) {
    const n = c.venc && daData(c.venc);
    if (n && !c.viagem_id && c.tipo === 'pagar') await store.update('contas', c.id, { viagem_id: viagens[n] });
  }
  for (const l of store.doProjeto('lancamentos')) {
    const n = daData(l.data);
    if (n && !l.viagem_id) await store.update('lancamentos', l.id, { viagem_id: viagens[n] });
  }

  /* --------------------------------------------------------------------
     Check-in de voo: toda viagem de avião abre 24h antes. Vira tarefa com
     prazo na véspera e uma confirmação por pessoa, para ninguém embarcar
     sem assento.
     -------------------------------------------------------------------- */
  // Só para voo que ainda vai acontecer — abrir check-in de viagem passada
  // não serve para nada e só enche a lista.
  const hj = hoje();
  for (const ev of store.doProjeto('eventos').filter((e) => e.tipo === 'viagem' && e.data >= hj)) {
    await ins('tarefas', 'checkin:' + ev.data, {
      titulo: `Fazer check-in — ${ev.titulo}`,
      responsavel_id: membros['Tato Pessanha'] || null,
      prazo: somarDias(ev.data, -1),   // o check-in abre 24h antes do voo
      etapa_id: null, status: 'aberta', feito: false, cobrado_em: '', remarcacoes: [],
      evento_id: ev.id,
      descricao: 'O check-in abre 24h antes do voo. Fazer para todo mundo que embarca e '
        + 'guardar os cartões de embarque.'
    });
  }

  /* confirmações de passagem das duas primeiras viagens */
  const bilhetes = {
    [membros['Maví Simões']]: '1272310202943',
    [membros['Julio Becker']]: '1272310202944',
    [membros['Tato Pessanha']]: '1272310202945'
  };
  for (const id of viajantes) {
    const em = store.get('membros', id)?.email || id;
    await ins('confirmacoes', 'conf:passagem1:' + em, {
      membro_id: id, tipo: 'passagem', ref_id: ida1?.id || null,
      titulo: 'Passagem SP → Palmas · 23/08 · embarque 06:00',
      status: 'pendente',
      obs: `Localizador WFNEWO · bilhete ${bilhetes[id]} · 2 voos · chegada ao aeroporto 04:00.`
    });
    await ins('confirmacoes', 'conf:passagem2:' + em, {
      membro_id: id, tipo: 'passagem', ref_id: ida2?.id || null,
      titulo: 'Passagem SP → Recife · 30/08 · Azul 4232 05:00',
      status: 'pendente',
      obs: 'Localizador ZWQY3Q · voo direto GRU → REC · chegada ao aeroporto 03:00.'
    });
    await ins('confirmacoes', 'conf:contrato:' + em, {
      membro_id: id, tipo: 'contrato',
      titulo: 'Contrato de prestação de serviço assinado', status: 'pendente', obs: ''
    });
  }

  await store.log('Projeto carregado do contrato rev 04, da Carta-Orçamento V2, da planilha do Drive '
    + '(28/08) e do Google Agenda do projeto.', 'projeto');
  return projeto;
}


/**
 * Atualiza a carga do projeto SEM apagar nada. Roda a mesma semeadura, que só
 * insere o que ainda não existe: tudo que você editou, criou ou marcou fica
 * exatamente como está. Se a carga trouxer um evento, uma etapa ou uma conta
 * nova, ela entra ao lado do que já havia.
 */
/* ---------------------------------------------------------------------------
   Adoção da carga antiga. As primeiras versões gravavam sem `chave`, então uma
   semeadura nova não reconhecia nada e duplicava tudo. Aqui o registro velho é
   reconhecido pelo que ele é (nome, título, data) e recebe a chave que teria
   se tivesse nascido agora. Só depois disso a semeadura roda.
   --------------------------------------------------------------------------- */
const chaveDe = {
  membros: (r) => (r.email ? 'membro:' + r.email : null),
  contatos: (r) => (r.nome ? 'contato:' + r.nome : null),
  locacoes: (r) => (r.cidade ? 'loc:' + r.cidade : null),
  contratos: (r) => (r.tipo === 'cliente' ? 'contrato:4600001793' : null),
  orcamento: (r) => (r.rubrica ? 'rub:' + r.rubrica : null),
  etapas: (r) => (r.nome ? 'etapa:' + r.nome : null),
  entregas: (r) => (r.titulo ? 'entrega:' + r.titulo : null),
  eventos: (r) => (r.data && r.titulo ? `ev:${r.data}:${r.titulo}` : null),
  fontes: (r) => (r.titulo ? 'fonte:' + r.titulo : null),
  viagens: (r) => (r.numero ? 'viagem:' + r.numero : null),
  tarefas: (r) => {
    if (!r.titulo) return null;
    const m = /^Fazer check-in — /.test(r.titulo);
    if (m) {
      const ev = r.evento_id ? store.get('eventos', r.evento_id) : null;
      return ev ? 'checkin:' + ev.data : null;
    }
    return 'tar:' + r.titulo;
  },
  contas: (r) => {
    if (r.parcela === '1/2' && r.tipo === 'receber') return 'conta:parcela1';
    if (r.parcela === '2/2' && r.tipo === 'receber') return 'conta:parcela2';
    if (r.membro_id) {
      const m = store.get('membros', r.membro_id);
      if (m?.email) {
        if (r.categoria === 'per diem') return 'perdiem:' + m.email;
        if (r.categoria === 'cachê') {
          if (/\(\d+%\)/.test(r.descricao || '')) return 'cache1:' + m.email;
          if (/saldo/i.test(r.descricao || '')) return 'cache2:' + m.email;
          return 'cache:' + m.email;
        }
      }
    }
    return r.descricao ? 'pag:' + r.descricao : null;
  },
  lancamentos: (r) => {
    if (!r.descricao) return null;
    return r.forma === 'dinheiro' ? 'caixa:' + r.descricao : 'lanc:' + r.descricao;
  },
  confirmacoes: (r) => {
    const em = r.membro_id ? store.get('membros', r.membro_id)?.email : null;
    if (!em) return null;
    if (r.tipo === 'contrato') return 'conf:contrato:' + em;
    if (r.tipo === 'passagem') {
      if (/Palmas/.test(r.titulo || '')) return 'conf:passagem1:' + em;
      if (/Recife/.test(r.titulo || '')) return 'conf:passagem2:' + em;
    }
    return null;
  }
};

/** Dá chave a quem ainda não tem, para a semeadura reconhecer o que já existe. */
async function adotarCargaAntiga() {
  let n = 0;
  for (const [tabela, fn] of Object.entries(chaveDe)) {
    for (const r of store.doProjeto(tabela)) {
      if (r.chave) continue;
      const k = fn(r);
      if (!k) continue;
      await store.update(tabela, r.id, { chave: k });
      n += 1;
    }
  }
  const proj = store.projeto;
  if (proj && !proj.chave) await store.update('projetos', proj.id, { chave: 'proj:bradesco70' });
  return n;
}

/** Some com cópias da mesma chave, guardando sempre a mais antiga — que é a
    que a pessoa vinha usando e pode ter editado. */
async function removerDuplicados() {
  let n = 0;
  for (const tabela of Object.keys(chaveDe)) {
    const porChave = new Map();
    for (const r of store.doProjeto(tabela)) {
      if (!r.chave) continue;
      const lista = porChave.get(r.chave) || [];
      lista.push(r);
      porChave.set(r.chave, lista);
    }
    for (const lista of porChave.values()) {
      if (lista.length < 2) continue;
      lista.sort((a, b) => String(a.criado_em || '').localeCompare(String(b.criado_em || '')));
      for (const extra of lista.slice(1)) {
        // store.remove tira da lista em memória e persiste; adapter.remove só grava.
        await store.remove(tabela, extra.id);
        n += 1;
      }
    }
  }
  return n;
}

/**
 * Atualiza a carga do projeto SEM apagar trabalho. Antes de semear, adota o que
 * já existe (dando chave a quem não tem) e limpa cópias repetidas. Depois roda
 * a semeadura, que só insere o que ainda falta.
 */
export async function atualizarProjeto() {
  const nomeAtual = store.user?.nome || null;
  const atual = store.projeto;

  store.ocupado = true;
  try {
    const adotados = await adotarCargaAntiga();
    const removidos = await removerDuplicados();

    const antes = TABELAS.reduce((n, t) => n + store.doProjeto(t).length, 0);
    const projeto = await criarProjetoBradesco(store.projeto || atual || null);
    await store.update('projetos', projeto.id, { seed_versao: SEED_VERSAO });
    const depois = TABELAS.reduce((n, t) => n + store.doProjeto(t).length, 0);

    const eu = nomeAtual ? store.doProjeto('membros').find((m) => m.nome === nomeAtual) : null;
    store.setUser(eu || store.user || null);
    await store.log(`Carga atualizada para a versão ${SEED_VERSAO}: ${depois - antes} item(ns) novo(s), `
      + `${removidos} duplicado(s) removido(s), ${adotados} registro(s) reconhecido(s) da carga antiga.`,
    'projeto');
    return { projeto, novos: depois - antes, removidos, adotados };
  } finally {
    store.ocupado = false;
  }
}

/**
 * Zera o projeto e carrega tudo de novo. DESTRUTIVO: perde toda edição feita
 * no app. Só existe para recomeçar do zero de propósito — a atualização normal
 * é atualizarProjeto(), que não apaga nada.
 */
export async function recarregarProjeto() {

  const nomeAtual = store.user?.nome || null;
  const antigo = store.projetoId;

  store.ocupado = true;
  try {
    store.setUser(null);

    if (!store.remoto) {
      // Modo demo: zera a base do aparelho de uma vez só. Apagar registro a
      // registro dispara render no meio do caminho e o app tenta recarregar
      // sozinho, criando um projeto duplicado.
      await store.adapter.reset();
      store.state = await store.adapter.load();
    } else if (antigo) {
      for (const t of TABELAS) {
        for (const r of [...store.all(t)]) {
          const doProjeto = t === 'projetos' ? r.id === antigo : r.projeto_id === antigo;
          if (doProjeto) await store.adapter.remove(t, r.id);
        }
      }
      store.state = await store.adapter.load();
    }
    store.projetoId = null;

    const projeto = await criarProjetoBradesco();

    // Reconecta a pessoa que estava logada, se ela existir na nova carga.
    const eu = nomeAtual ? store.doProjeto('membros').find((m) => m.nome === nomeAtual) : null;
    store.setUser(eu || null);
    return projeto;
  } finally {
    store.ocupado = false;
  }
}
