// ─────────────────────────────────────────────────────────────────────────────
// Conteúdo do site. Tudo o que muda (textos, vídeos, ligações no mapa) fica aqui.
//
// VÍDEOS: preencha `url` com um link do YouTube, Vimeo ou um arquivo .mp4.
//   Enquanto `url` estiver vazio, o player mostra "Filme em finalização".
// LIGAÇÕES: `cidades` de cada fotógrafo define as linhas no mapa.
//   Ligações marcadas em `aConfirmar` são provisórias (placeholder) — trocar
//   quando a curadoria confirmar quais escolas cada fotógrafo retratou.
// ─────────────────────────────────────────────────────────────────────────────

window.PROJETO = {
  titulo: "De geração em geração",
  subtitulo: "Fundação Bradesco 70 anos",
  kicker: "Os filmes do livro",
  intro: [
    "Em 2026, a Fundação Bradesco completa 70 anos. Para celebrar, onze fotógrafas e fotógrafos brasileiros percorreram escolas da Fundação de norte a sul do país e registraram, cada um com seu olhar, as pessoas e as histórias que fazem a educação acontecer. Essas imagens formam o livro comemorativo que você tem em mãos.",
    "Esta série de filmes acompanha esse percurso: das salas de aula de Conceição do Araguaia, Jaboatão dos Guararapes, Gravataí, Bodoquena, Canuanã e Osasco até os estúdios onde cada artista conta como enxergou esse encontro.",
  ],
  formatos: [
    { tipo: "pilula", cor: "#2F6246", nome: "Pílulas", duracao: "1 min", texto: "Depoimentos curtos de cada fotógrafo sobre o processo e as pessoas que retratou." },
    { tipo: "visita", cor: "#613CAD", nome: "Visitas", duracao: "2 min", texto: "Um filme para cada escola visitada: o lugar, a rotina, quem faz a escola." },
    { tipo: "documentario", cor: "#4E9DBE", nome: "Documentário", duracao: "15 min", texto: "O percurso completo do projeto, de escola em escola. Com trailer de 2 min." },
  ],
  creditos: [
    ["Direção", "Maví"],
    ["Produção executiva", "Tato Pessanha"],
    ["Realização", "Fundação Bradesco · Curadoria"],
  ],
};

// Escolas visitadas. `pos` = coordenadas no mapa (viewBox 1000×1000),
// geradas a partir de lat/long por tools/gerar-mapa.mjs.
window.ESCOLAS = [
  {
    id: "conceicao-do-araguaia",
    ano: 1971, // inauguração (linha do tempo do livro)
    cor: "#AB3438", // cor do ponto no mapa (paleta do livro)
    rotulo: "l", // lado do rótulo: r, l ou bl (abaixo)
    nomeMapa: "Conceição do\nAraguaia",
    cidade: "Conceição do Araguaia",
    uf: "PA",
    regiao: "Norte",
    pos: [617, 340],
    sobre: "Inaugurada em 1971, a mais de mil quilômetros da capital do estado. Atende 1.138 alunos com Educação Básica, Educação de Jovens e Adultos e Cursos Livres.",
    visita: { titulo: "Visita · Conceição do Araguaia", duracao: "2 min", url: "" },
  },
  {
    id: "canuana",
    ano: 1973, // inauguração (linha do tempo do livro)
    cor: "#E6AC5A", // cor do ponto no mapa (paleta do livro)
    rotulo: "l", // lado do rótulo: r, l ou bl (abaixo)
    nomeMapa: "Canuanã",
    cidade: "Canuanã",
    uf: "TO",
    regiao: "Norte",
    pos: [602, 415],
    sobre: "Escola-fazenda inaugurada em 1973 em Formoso do Araguaia. Atende 749 alunos com Ensino Técnico em agropecuária e Cursos Livres.",
    visita: { titulo: "Visita · Canuanã", duracao: "2 min", url: "" },
  },
  {
    id: "jaboatao",
    ano: 1983, // inauguração (linha do tempo do livro)
    cor: "#4E9DBE", // cor do ponto no mapa (paleta do livro)
    rotulo: "bl", // lado do rótulo: r, l ou bl (abaixo)
    nomeMapa: "Jaboatão dos\nGuararapes",
    cidade: "Jaboatão dos Guararapes",
    uf: "PE",
    regiao: "Nordeste",
    pos: [944, 337],
    sobre: "Inaugurada em 1983, a 16 km do Recife. Atende 1.148 alunos com Educação Básica, EJA, Educação Profissional e Cursos Livres.",
    visita: { titulo: "Visita · Jaboatão dos Guararapes", duracao: "2 min", url: "" },
  },
  {
    id: "bodoquena",
    ano: 1986, // inauguração (linha do tempo do livro)
    cor: "#F5D775", // cor do ponto no mapa (paleta do livro)
    rotulo: "l", // lado do rótulo: r, l ou bl (abaixo)
    nomeMapa: "Bodoquena",
    cidade: "Bodoquena",
    uf: "MS",
    regiao: "Centro-Oeste",
    pos: [453, 622],
    sobre: "Inaugurada em 1986, na Fazenda Bodoquena, em Miranda. Atende 637 alunos com Educação Básica, EJA e Cursos Livres.",
    visita: { titulo: "Visita · Bodoquena", duracao: "2 min", url: "" },
  },
  {
    id: "osasco",
    ano: 1962, // inauguração (linha do tempo do livro)
    cor: "#613CAD", // cor do ponto no mapa (paleta do livro)
    rotulo: "r", // lado do rótulo: r, l ou bl (abaixo)
    nomeMapa: "Osasco",
    cidade: "Osasco",
    uf: "SP",
    regiao: "Sudeste",
    pos: [674, 704],
    sobre: "Escola na Cidade de Deus, onde fica a sede da Fundação Bradesco. Texto completo a confirmar.",
    visita: { titulo: "Visita · Osasco", duracao: "2 min", url: "" },
  },
  {
    id: "gravatai",
    ano: 1979, // inauguração (linha do tempo do livro)
    cor: "#2F6246", // cor do ponto no mapa (paleta do livro)
    rotulo: "l", // lado do rótulo: r, l ou bl (abaixo)
    nomeMapa: "Gravataí",
    cidade: "Gravataí",
    uf: "RS",
    regiao: "Sul",
    pos: [578, 868],
    sobre: "Inaugurada em 1979, a 31 km de Porto Alegre. Atende 1.858 alunos com Educação Básica, EJA, Educação Profissional e Cursos Livres.",
    visita: { titulo: "Visita · Gravataí", duracao: "2 min", url: "" },
  },
];

// Fotógrafos. `cidades` = escolas que retratou (linhas no mapa).
// `filmagem` = onde o making of gravou o depoimento.
// `aConfirmar` = ligações provisórias, a validar com a curadoria.
// `pos` = posição do nó no mapa (viewBox 1000×1000). Sem `pos`, o site calcula.
// `cor` = cor da lombada da capa do fotógrafo no livro.
// A foto vem de assets/capas/<id>.jpg (gerada por tools/extrair-capas.py).
const pilulas = (nome) => [1, 2, 3].map((n) => ({
  titulo: `${nome} · Pílula ${n}`,
  duracao: "1 min",
  url: "",
}));

window.FOTOGRAFOS = [
  { id: "elza-lima", cor: "#C70E0C",       nome: "Elza Lima", pos: [430, 228],       filmagem: "Escola de Conceição do Araguaia (PA)", cidades: ["conceicao-do-araguaia", "canuana"],   aConfirmar: ["canuana"] },
  { id: "nti-uira", cor: "#5E5E99",        nome: "Ntí Uirá", pos: [820, 270],        filmagem: "Escola de Jaboatão dos Guararapes (PE)", cidades: ["jaboatao", "conceicao-do-araguaia"], aConfirmar: ["conceicao-do-araguaia"] },
  { id: "renato-parada", cor: "#5D5F99",   nome: "Renato Parada", pos: [390, 760],   filmagem: "Escola de Gravataí (RS)",              cidades: ["gravatai", "bodoquena"],              aConfirmar: ["bodoquena"] },
  { id: "pedro-kok", cor: "#A80B4C",       nome: "Pedro Kok", pos: [378, 505],       filmagem: "Escola de Bodoquena (MS)",             cidades: ["bodoquena", "canuana"],               aConfirmar: ["canuana"] },
  { id: "mariana-valente", cor: "#1C1F3E", nome: "Mariana Valente", pos: [765, 525], filmagem: "Escola de Canuanã (TO)",               cidades: ["canuana", "jaboatao"],                aConfirmar: ["jaboatao"] },
  { id: "fabio-bartelt", cor: "#1F2042",   nome: "Fabio Bartelt", pos: [760, 905],   filmagem: "Escola de Osasco (SP)",                cidades: ["osasco", "gravatai"],                 aConfirmar: ["gravatai"] },
  { id: "patricia-brasil", cor: "#00ABA6", nome: "Patricia Brasil", pos: [640, 205], filmagem: "Estúdio em Belém (PA)",                cidades: ["conceicao-do-araguaia", "jaboatao"],  aConfirmar: ["conceicao-do-araguaia", "jaboatao"] },
  { id: "lalo-de-almeida", cor: "#C80D06", nome: "Lalo de Almeida", pos: [540, 700], filmagem: "Estúdio em São Paulo (SP)",            cidades: ["osasco", "bodoquena"],                aConfirmar: ["osasco", "bodoquena"] },
  { id: "edgar-azevedo", cor: "#17301B",   nome: "Edgar Azevedo", pos: [860, 605],   filmagem: "Estúdio em Salvador (BA)",             cidades: ["jaboatao", "osasco"],                 aConfirmar: ["jaboatao", "osasco"] },
  { id: "maira-erlich", cor: "#00ACA5",    nome: "Maíra Erlich", pos: [650, 545],    filmagem: "Estúdio em São Paulo (SP)",            cidades: ["osasco", "canuana"],                  aConfirmar: ["osasco", "canuana"] },
  { id: "vilma-slomp", cor: "#A70C4F",     nome: "Vilma Slomp", pos: [812, 812],     filmagem: "Estúdio em Curitiba (PR)",             cidades: ["gravatai", "osasco"],                 aConfirmar: ["gravatai", "osasco"] },
].map((f) => ({
  bio: "Minibiografia em breve.",
  pilulas: pilulas(f.nome),
  ...f,
}));

window.DOCUMENTARIO = {
  filme:   { titulo: "Documentário · Fundação Bradesco 70 anos", duracao: "15 min", url: "" },
  trailer: { titulo: "Trailer", duracao: "2 min", url: "" },
};
