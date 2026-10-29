// ─────────────────────────────────────────────────────────────────────────────
// Conteúdo do site. Tudo o que muda (textos, vídeos, escolas, fotógrafos) fica aqui.
//
// VÍDEOS: preencha `url` com um link do YouTube, Vimeo ou um arquivo .mp4.
//   Os links finais vêm de videos.js (gerado a partir da página "Controle dos Filmes",
//   pelo `id` de cada vídeo); sem link, o player toca o vídeo provisório.
// ESCOLAS: as 40 unidades retratadas no livro (relação "Escolas por fotógrafo" + Osasco II).
//   As 6 com `visita` são as escolas onde o making of filmou; elas ganham
//   destaque no mapa e o filme "Visita".
//   `fonte` diz de onde veio o endereço: "site" (página da escola em
//   fundacao.bradesco), "email" (curadoria), "diretorio" (cadastros públicos,
//   conferir). Campo vazio ou `confirmar: true` = endereço a confirmar.
// ─────────────────────────────────────────────────────────────────────────────

window.PROJETO = {
  titulo: "De geração em geração",
  subtitulo: "Fundação Bradesco 70 anos",
  kicker: "Os filmes do livro",
  intro: [
    // 1º parágrafo adaptado da abertura da seção "Fotógrafos" do livro.
    "Para celebrar os 70 anos da Fundação Bradesco, onze fotógrafas e fotógrafos fizeram registros nas unidades escolares de todo o Brasil entre agosto e outubro de 2026. O resultado é um retrato atual dessas escolas, pelo olhar cuidadoso e sensível de cada um deles, e forma o livro que você tem em mãos.",
    "Esta série de filmes acompanha esse percurso: das salas de aula de Conceição do Araguaia, Jaboatão dos Guararapes, Gravataí, Bodoquena, Canuanã e Osasco até os estúdios onde cada artista conta como enxergou esse encontro.",
  ],
  formatos: [
    { tipo: "pilula", cor: "#2F6246", nome: "Pílulas", duracao: "1 min", texto: "Depoimentos curtos de cada fotógrafo sobre o processo e as pessoas que retratou." },
    { tipo: "visita", cor: "#613CAD", nome: "Visitas", duracao: "2 min", texto: "Um filme para cada escola visitada pelas câmeras: o lugar, a rotina, quem faz a escola." },
    { tipo: "documentario", cor: "#4E9DBE", nome: "Documentário", duracao: "15 min", texto: "O percurso completo do projeto, de escola em escola. Com trailer de 2 min." },
  ],
  creditos: [
    ["Direção", "Maví"],
    ["Produção executiva", "Tato Pessanha"],
    ["Realização", "Fundação Bradesco · Curadoria"],
  ],
};

const REGIAO = {
  AC: "Norte", AM: "Norte", AP: "Norte", PA: "Norte", RO: "Norte", RR: "Norte", TO: "Norte",
  AL: "Nordeste", BA: "Nordeste", CE: "Nordeste", MA: "Nordeste", PB: "Nordeste", PE: "Nordeste", PI: "Nordeste", RN: "Nordeste", SE: "Nordeste",
  DF: "Centro-Oeste", GO: "Centro-Oeste", MS: "Centro-Oeste", MT: "Centro-Oeste",
  ES: "Sudeste", MG: "Sudeste", RJ: "Sudeste", SP: "Sudeste",
  PR: "Sul", RS: "Sul", SC: "Sul",
};

// [id, cidade, UF, lat, lon, ano, nome oficial, endereço, CEP, fonte]
// `ano` = inauguração (linha do tempo do livro; site oficial onde o livro não mostra).
const LISTA = [
  ["paragominas",           "Paragominas",             "PA",  -2.995, -47.354, 1977, "E.E.B.P. Fundação Bradesco", "Av. Presidente Vargas, 300 – Angelim", "68625-130", "diretorio"],
  ["macapa",                "Macapá",                  "AP",   0.034, -51.066, 1985, "E.E.B.P. Governador Janary Gentil Nunes", "Av. B1, 110 – Vila Amazonas", "68926-102", "site"],
  ["conceicao-do-araguaia", "Conceição do Araguaia",   "PA",  -8.258, -49.265, 1971, "E.E.B.P. Fundação Bradesco", "Av. Couto Magalhães, 2165 – Setor Universitário", "68540-000", "site"],
  ["garanhuns",             "Garanhuns",               "PE",  -8.890, -36.493, 1988, "E.E.B.P. Fundação Bradesco", "Rodovia PE-218, km 4 – Fazenda Canhotinho", "55290-000", "site"],
  ["cacoal",                "Cacoal",                  "RO", -11.438, -61.447, 1983, "E.E.B.P. Antônio Sanchez de Larragoiti y Curdumi", "Travessa Ouro, 160 – Cristal do Arco-Íris", "76961-890", "site"],
  ["jaboatao",              "Jaboatão dos Guararapes", "PE",  -8.130, -34.990, 1983, "E.E.B.P. Fundação Bradesco", "R. Manoel Carneiro Leão, 1457 – Dois Carneiros", "", "email"],
  ["boa-vista",             "Boa Vista",               "RR",   2.820, -60.672, 2003, "E.E.B.P. Fundação Bradesco", "R. Severino Caetano da Silva, 82 – Jardim Floresta", "", "site"],
  ["irece",                 "Irecê",                   "BA", -11.304, -41.856, 1977, "E.E.B.P. Fundação Bradesco", "R. Fundação Bradesco, 466", "44860-528", "site"],
  ["joao-pessoa",           "João Pessoa",             "PB",  -7.120, -34.880, 1989, "E.E.B.P. Fundação Bradesco", "R. Mariângela de Lucena Peixoto, 683 – Valentina de Figueiredo", "58063-300", "site"],
  ["natal",                 "Natal",                   "RN",  -5.795, -35.209, 1989, "E.E.B.P. Fundação Bradesco", "R. Prof. Antônio Trigueiro, 500 – Felipe Camarão", "59074-100", "site"],
  ["teresina",              "Teresina",                "PI",  -5.089, -42.802, 1982, "E.E.B.P. Fundação Bradesco", "R. Dr. Clidenor Freitas – Itararé", "64077-015", "site"],
  ["caucaia",               "Caucaia",                 "CE",  -3.736, -38.653, 1990, "E.E.B.P. Fundação Bradesco", "Av. Dom Almeida Lustosa, 585 – Parque Albano", "", "diretorio"],
  ["feira-de-santana",      "Feira de Santana",        "BA", -12.267, -38.966, 1990, "E.E.P. Fundação Bradesco", "Rodovia BR-116 Norte – Fazenda Nossa Senhora Aparecida, s/n – Zona Rural", "44036-331", "site"],
  ["vila-velha",            "Vila Velha",              "ES", -20.330, -40.292, 1990, "E.E.B.P. Dr. Ronaldo Young Carneiro da Rocha", "Rodovia Darly Santos, s/n – Araçás", "29103-091", "site"],
  ["itajuba",               "Itajubá",                 "MG", -22.426, -45.453, 1983, "E.E.B.P. Fundação Bradesco", "", "", ""],
  ["sao-joao-del-rei",      "São João del-Rei",        "MG", -21.136, -44.262, 1985, "E.E.B.P. Fundação Bradesco", "R. Amador Aguiar, 100 – Cohab", "36302-162", "site"],
  ["gravatai",              "Gravataí",                "RS", -29.944, -50.992, 1979, "Colégio Fundação Bradesco", "R. Aristides D’Ávila, 390 – Parque dos Anjos", "94185-280", "email"],
  ["campinas",              "Campinas",                "SP", -22.906, -47.061, 1975, "E.E.B.P. Fundação Bradesco", "Av. Wellman Galvão de França Rangel, 2000 – Swiss Park", "13049-254", "site"],
  ["paranavai",             "Paranavaí",               "PR", -23.073, -52.465, 1987, "Escola de Educação Básica Fundação Bradesco", "R. Luiz Zaros, 600 – Jardim Ipê", "87706-080", "site"],
  ["laguna",                "Laguna",                  "SC", -28.482, -48.781, 1974, "E.E.B.P. Prof.ª Adélia Cabral Varejão", "R. São Pedro, 221 – Magalhães", "88790-000", "site"],
  ["bage",                  "Bagé",                    "RS", -31.331, -54.107, 1974, "E.E.B.P. Fundação Bradesco", "R. Cantalício Barbosa, 670 – Menino Deus", "96402-010", "site"],
  ["rosario-do-sul",        "Rosário do Sul",          "RS", -30.258, -54.914, 1983, "Escola de Educação Profissional Fundação Bradesco", "Rodovia BR-158 – Zona Rural", "97590-000", "diretorio"],
  ["canuana",               "Canuanã",                 "TO", -11.500, -49.950, 1973, "Fundação Bradesco – Escola de Canuanã", "Fazenda Canuanã, s/n – Formoso do Araguaia", "77470-000", "site"],
  ["salvador",              "Salvador",                "BA", -12.880, -38.420, 1985, "E.E.B.P. Fundação Bradesco", "Av. Eng. Raymundo Carlos Nery, 818 – Cajazeiras X", "41340-280", "site"],
  ["rio-de-janeiro",        "Rio de Janeiro",          "RJ", -22.917, -43.218, 1987, "Escola de Educação Básica e Profissional Fundação Bradesco", "R. Haddock Lobo, 253 – Tijuca", "20260-141", "site"],
  ["ceilandia",             "Ceilândia",               "DF", -15.819, -48.108, 1986, "E.E.B.P. Fundação Bradesco", "QNN 28, Área Especial L, s/n – Ceilândia Sul", "72220-280", "site"],
  ["aparecida-de-goiania",  "Aparecida de Goiânia",    "GO", -16.823, -49.244, 1999, "Colégio Fundação Bradesco", "Av. J2, esq. com R. L16 – Papillon Park", "74950-170", "site"],
  ["cuiaba",                "Cuiabá",                  "MT", -15.601, -56.097, 1995, "E.E.B.P. Fundação Bradesco", "Av. José Torquato da Silva, 95 – Jardim Vitória", "78055-731", "site"],
  ["bodoquena",             "Bodoquena",               "MS", -20.200, -56.450, 1986, "E.E.B.P. Fundação Bradesco", "Rodovia BR-262 – Estação Guaycurus, Fazenda Bodoquena – Miranda", "", "email"],
  ["manaus",                "Manaus",                  "AM",  -3.102, -60.025, 1985, "E.E.B.P. Fundação Bradesco", "R. Prof. Abílio Alencar, 1130 – Dom Pedro", "69040-035", "site"],
  ["rio-branco",            "Rio Branco",              "AC",  -9.975, -67.810, 2001, "E.E.B.P. Fundação Bradesco", "Estrada do Calafate, 690 – Nova Esperança", "69915-266", "site"],
  ["maceio",                "Maceió",                  "AL",  -9.648, -35.733, 1989, "E.E.B.P. Fundação Bradesco", "Av. Presidente Vargas – Serraria", "57046-140", "site"],
  ["pinheiro",              "Pinheiro",                "MA",  -2.521, -45.082, 1990, "E.E.B.P. Fundação Bradesco", "Av. Amador Aguiar, s/n – Antigo Aeroporto", "65200-000", "site"],
  ["propria",               "Propriá",                 "SE", -10.211, -36.840, 1987, "E.E.B.P. Fundação Bradesco", "Av. João Barbosa Porto, 2104 – Bela Vista", "49900-000", "site"],
  ["sao-luis",              "São Luís",                "MA",  -2.530, -44.297, 1984, "E.E.B.P. Fundação Bradesco", "Av. dos Africanos, 10 – Coroadinho", "65044-295", "site"],
  ["jardim-conceicao",      "Jardim Conceição",        "SP", -23.555, -46.810, 2004, "E.E.B.P. Fundação Bradesco – Jardim Conceição", "R. João Terto dos Santos, s/n – Jardim Conceição, Osasco", "", "diretorio"],
  ["osasco-2",              "Osasco II",               "SP", -23.540, -46.790, null, "E.E.B.P. Embaixador Assis Chateaubriand", "Praça Pedro Salgado, s/n – Vila Campesina, Osasco", "06023-180", "site"],
  ["osasco",                "Osasco",                  "SP", -23.533, -46.775, 1962, "Fundação Bradesco – Osasco I", "Cidade de Deus, s/n – Vila Yara", "06029-900", "site"],
  ["registro",              "Registro",                "SP", -24.488, -47.844, 1974, "E.E.B.P. Fundação Bradesco", "R. Dr. Choichi Ono, 1000 – Vila São Francisco", "11900-000", "site"],
  ["marilia",               "Marília",                 "SP", -22.214, -49.946, 1994, "E.E.B.P. Fundação Bradesco", "R. Benedito Alves Delfino, 80 – Palmital Prolongamento", "17512-043", "site"],
];

// As 6 escolas onde o making of filmou: destaque no mapa + filme "Visita".
// `rotulo` = lado do rótulo no mapa (r, l ou bl = abaixo). `nomeMapa` aceita \n.
const VISITADAS = {
  "conceicao-do-araguaia": { cor: "#AB3438", rotulo: "l", nomeMapa: "Conceição do\nAraguaia",
    sobre: "Inaugurada em 1971, a mais de mil quilômetros da capital do estado. Atende 1.138 alunos com Educação Básica, Educação de Jovens e Adultos e Cursos Livres." },
  "canuana": { cor: "#E6AC5A", rotulo: "l",
    sobre: "Escola-fazenda inaugurada em 1973 em Formoso do Araguaia. Atende 749 alunos com Ensino Técnico em agropecuária e Cursos Livres." },
  "jaboatao": { cor: "#4E9DBE", rotulo: "bl", nomeMapa: "Jaboatão dos\nGuararapes",
    sobre: "Inaugurada em 1983, a 16 km do Recife. Atende 1.148 alunos com Educação Básica, EJA, Educação Profissional e Cursos Livres." },
  "bodoquena": { cor: "#F5D775", rotulo: "l",
    sobre: "Inaugurada em 1986, na Fazenda Bodoquena, em Miranda. Atende 637 alunos com Educação Básica, EJA e Cursos Livres." },
  "osasco": { cor: "#613CAD", rotulo: "r",
    sobre: "Na Cidade de Deus, onde fica a sede da Fundação Bradesco. Texto completo a confirmar." },
  "gravatai": { cor: "#2F6246", rotulo: "l",
    sobre: "Inaugurada em 1979, a 31 km de Porto Alegre. Atende 1.858 alunos com Educação Básica, EJA, Educação Profissional e Cursos Livres." },
};

// Pequenos deslocamentos (viewBox 1000×1000) para escolas muito próximas no mapa.
const AJUSTE = { "jardim-conceicao": [-16, 12], "osasco-2": [-2, 18], osasco: [4, -4], "joao-pessoa": [4, -8], jaboatao: [0, 6] };

window.ESCOLAS = LISTA.map(([id, cidade, uf, lat, lon, ano, nome, endereco, cep, fonte]) => {
  const v = VISITADAS[id];
  return {
    id, cidade, uf, lat, lon, ano, nome, endereco, cep, fonte,
    regiao: REGIAO[uf],
    conhecida: `FB ${cidade}`, // como o livro e a rede chamam a escola
    confirmar: !endereco || !cep || fonte === "diretorio",
    ajuste: AJUSTE[id],
    ...(v && { ...v, visita: { id: `visita-${id}`, titulo: `Visita · ${cidade}`, duracao: "2 min", url: "" } }),
  };
});

// Fotógrafos. `cidades` = escolas que retratou (relação da curadoria).
// `filmagem` = onde o making of gravou o depoimento.
// `visita` = escola visitada pelo making of com esse fotógrafo (o filme Visita aparece no painel dele).
// `cor` = cor da lombada da capa do fotógrafo no livro.
// Imagem do nó: `retrato` (ex.: "assets/retratos/elza-lima.jpg") se preenchido;
// senão, o recorte da capa em assets/capas/<id>-thumb.jpg (gerado por tools/extrair-capas.py).
// `pos` (opcional) fixa o nó no mapa; sem `pos`, o site calcula a posição.
const pilulas = (fid, nome) => [1, 2, 3].map((n) => ({
  id: `pilula-${fid}-${n}`,
  titulo: `${nome} · Pílula ${n}`,
  duracao: "1 min",
  url: "",
}));

window.FOTOGRAFOS = [
  { id: "elza-lima", visita: "conceicao-do-araguaia",       cor: "#C70E0C", pos: [650, 135], nome: "Elza Lima",       filmagem: "Escola de Conceição do Araguaia (PA)",   cidades: ["paragominas", "macapa", "conceicao-do-araguaia", "garanhuns"] },
  { id: "nti-uira", visita: "jaboatao",        cor: "#5E5E99", pos: [440, 250], nome: "Ntí Uirá",        filmagem: "Escola de Jaboatão dos Guararapes (PE)", cidades: ["cacoal", "jaboatao", "boa-vista", "irece"] },
  { id: "patricia-brasil", cor: "#00ABA6", pos: [950, 200], nome: "Patricia Brasil", filmagem: "Estúdio em Belém (PA)",                  cidades: ["joao-pessoa", "natal", "teresina", "caucaia", "feira-de-santana"] },
  { id: "renato-parada", visita: "gravatai",   cor: "#5D5F99", pos: [872, 772], nome: "Renato Parada",   filmagem: "Escola de Gravataí (RS)",                cidades: ["vila-velha", "itajuba", "sao-joao-del-rei", "gravatai", "campinas"] },
  { id: "vilma-slomp",     cor: "#A70C4F", pos: [400, 780], nome: "Vilma Slomp",     filmagem: "Estúdio em Curitiba (PR)",               cidades: ["paranavai", "laguna", "bage", "rosario-do-sul"] },
  { id: "mariana-valente", visita: "canuana", cor: "#1C1F3E", pos: [750, 525], nome: "Mariana Valente", filmagem: "Escola de Canuanã (TO)",                 cidades: ["canuana", "salvador", "rio-de-janeiro"] },
  { id: "pedro-kok", visita: "bodoquena",       cor: "#A80B4C", pos: [540, 580], nome: "Pedro Kok",       filmagem: "Escola de Bodoquena (MS)",               cidades: ["ceilandia", "aparecida-de-goiania", "cuiaba", "bodoquena"] },
  { id: "lalo-de-almeida", cor: "#C80D06", pos: [280, 300], nome: "Lalo de Almeida", filmagem: "Estúdio em São Paulo (SP)",              cidades: ["manaus", "rio-branco"] },
  { id: "edgar-azevedo",   cor: "#17301B", pos: [790, 165], nome: "Edgar Azevedo",   filmagem: "Estúdio em Salvador (BA)",               cidades: ["maceio", "pinheiro", "propria", "sao-luis"] },
  { id: "fabio-bartelt", cor: "#1F2042", pos: [720, 810], nome: "Fábio Bartelt",   filmagem: "Escola de Osasco (SP)",                  cidades: ["jardim-conceicao", "osasco-2", "osasco"] },
  { id: "maira-erlich",    cor: "#00ACA5", pos: [580, 770], nome: "Maíra Erlich",    filmagem: "Estúdio em São Paulo (SP)",              cidades: ["registro", "marilia"] },
].map((f) => ({
  bio: "Minibiografia em breve.",
  pilulas: pilulas(f.id, f.nome),
  ...f,
}));

window.DOCUMENTARIO = {
  filme:   { id: "documentario", titulo: "Documentário", duracao: "15 min", url: "" },
  trailer: { id: "trailer", titulo: "Trailer", duracao: "2 min", url: "" },
};

// Projeção do mapa (Mercator, a mesma usada para gerar brasil-path.js).
window.PROJECAO = { escala: 1308.9705582840097, tx: 1742.8995610255843, ty: 150.27511046245922 };
