// Cronograma da pós para o cliente, a partir da "Agenda diária" do Notion
// (Fundação Bradesco 70 anos | Pós-produção). Só entra o que o cliente acompanha: o cliente recebe
// cada filme na V2; antes disso a edição e a V1 são internas (aparecem só como contexto).
// Para atualizar: mude as datas aqui (AAAA-MM-DD) e o "atualizado".
window.CRONO = {
  atualizado: "2026-10-29",
  inicio: "2026-10-26",
  fim: "2027-01-28",
  feriados: { "2026-11-02": "Finados", "2026-11-20": "Consciência Negra", "2026-12-25": "Natal", "2027-01-01": "Ano-novo", "2027-01-25": "Aniversário de São Paulo" },

  // Cada filme (ou grupo de três pílulas): edição interna, V2, retorno do cliente, offline, finalização e online.
  // ed = [início, fim] da edição interna até a V2; fin = [início, fim] de cor e som.
  // junto = o filme chega ao cliente no mesmo pacote que a visita indicada (mesma V2, retorno e online).
  filmes: [
    { id: "elza-lima", nome: "Elza Lima", tipo: "pilula", junto: "conceicao-do-araguaia", ed: ["2026-10-23", "2026-11-06"], v2: "2026-11-09", rev: "2026-11-10", off: "2026-11-11", fin: ["2026-11-13", "2026-11-23"], on: "2026-11-27" },
    { id: "nti-uira", nome: "Ntí Uirá", tipo: "pilula", junto: "jaboatao", ed: ["2026-11-03", "2026-11-11"], v2: "2026-11-12", rev: "2026-11-13", off: "2026-11-16", fin: ["2026-11-18", "2026-12-02"], on: "2026-12-09" },
    { id: "renato-parada", nome: "Renato Parada", tipo: "pilula", junto: "gravatai", ed: ["2026-11-12", "2026-11-23"], v2: "2026-11-24", rev: "2026-11-25", off: "2026-11-26", fin: ["2026-11-30", "2026-12-10"], on: "2026-12-15" },
    { id: "pedro-kok", nome: "Pedro Kok", tipo: "pilula", junto: "bodoquena", ed: ["2026-11-17", "2026-11-27"], v2: "2026-11-30", rev: "2026-12-01", off: "2026-12-02", fin: ["2026-12-04", "2026-12-16"], on: "2026-12-21" },
    { id: "mariana-valente", nome: "Mariana Valente", tipo: "pilula", junto: "canuana", ed: ["2026-11-18", "2026-12-03"], v2: "2026-12-04", rev: "2026-12-07", off: "2026-12-08", fin: ["2026-12-10", "2026-12-22"], on: "2026-12-28" },
    { id: "fabio-bartelt", nome: "Fábio Bartelt", tipo: "pilula", ed: ["2026-12-04", "2026-12-10"], v2: "2026-12-11", rev: "2026-12-14", off: "2026-12-15", fin: ["2026-12-16", "2026-12-31"], on: "2027-01-04" },
    { id: "patricia-brasil", nome: "Patricia Brasil", tipo: "pilula", ed: ["2026-12-08", "2026-12-14"], v2: "2026-12-15", rev: "2026-12-16", off: "2026-12-17", fin: ["2026-12-18", "2027-01-05"], on: "2027-01-06" },
    { id: "maira-erlich", nome: "Maíra Erlich", tipo: "pilula", ed: ["2026-12-09", "2026-12-15"], v2: "2026-12-16", rev: "2026-12-17", off: "2026-12-18", fin: ["2026-12-21", "2027-01-07"], on: "2027-01-08" },
    { id: "edgar-azevedo", nome: "Edgar Azevedo", tipo: "pilula", ed: ["2026-12-11", "2026-12-17"], v2: "2026-12-18", rev: "2026-12-21", off: "2026-12-22", fin: ["2026-12-23", "2027-01-11"], on: "2027-01-12" },
    { id: "lalo-de-almeida", nome: "Lalo de Almeida", tipo: "pilula", ed: ["2026-12-16", "2026-12-22"], v2: "2026-12-23", rev: "2026-12-24", off: "2026-12-28", fin: ["2026-12-29", "2027-01-13"], on: "2027-01-14" },
    { id: "vilma-slomp", nome: "Vilma Slomp", tipo: "pilula", ed: ["2026-12-18", "2026-12-24"], v2: "2026-12-28", rev: "2026-12-29", off: "2026-12-30", fin: ["2026-12-31", "2027-01-15"], on: "2027-01-18" },

    { id: "conceicao-do-araguaia", nome: "Conceição do Araguaia", uf: "PA", tipo: "visita", ed: ["2026-10-23", "2026-11-06"], v2: "2026-11-09", rev: "2026-11-10", off: "2026-11-11", fin: ["2026-11-12", "2026-11-26"], on: "2026-11-27" },
    { id: "jaboatao", nome: "Jaboatão dos Guararapes", uf: "PE", tipo: "visita", ed: ["2026-10-29", "2026-11-11"], v2: "2026-11-12", rev: "2026-11-13", off: "2026-11-16", fin: ["2026-11-17", "2026-12-08"], on: "2026-12-09" },
    { id: "gravatai", nome: "Gravataí", uf: "RS", tipo: "visita", ed: ["2026-11-06", "2026-11-23"], v2: "2026-11-24", rev: "2026-11-25", off: "2026-11-26", fin: ["2026-11-27", "2026-12-14"], on: "2026-12-15" },
    { id: "bodoquena", nome: "Fazenda Bodoquena", uf: "MS", tipo: "visita", ed: ["2026-11-13", "2026-11-27"], v2: "2026-11-30", rev: "2026-12-01", off: "2026-12-02", fin: ["2026-12-03", "2026-12-18"], on: "2026-12-21" },
    { id: "canuana", nome: "Canuanã", uf: "TO", tipo: "visita", ed: ["2026-11-24", "2026-12-03"], v2: "2026-12-04", rev: "2026-12-07", off: "2026-12-08", fin: ["2026-12-09", "2026-12-24"], on: "2026-12-28" },
    { id: "osasco", nome: "Osasco", uf: "SP", tipo: "visita", ed: ["2026-11-30", "2026-12-07"], v2: "2026-12-08", rev: "2026-12-09", off: "2026-12-10", fin: ["2026-12-11", "2026-12-29"], on: "2026-12-30" },

    { id: "documentario", nome: "Documentário", tipo: "documentario", ed: ["2026-10-29", "2026-11-18"], v2: "2026-11-19", rev: "2026-11-23", off: "2026-11-24", fin: ["2026-11-25", "2026-11-30"], on: "2026-12-01" },
    { id: "trailer", nome: "Trailer", tipo: "trailer", ed: ["2026-11-13", "2026-11-24"], v2: "2026-11-25", rev: "2026-11-26", off: "2026-11-27", fin: ["2026-12-01", "2026-12-04"], on: "2026-12-07" },
  ],

  // Fechamento, para todos os filmes
  fechamento: [
    { data: "2027-01-19", titulo: "Todos os 41 onlines prontos", texto: "Os 41 vídeos com cor, som, grafismos e legendas, para conferência técnica." },
    { data: "2027-01-20", titulo: "Retorno técnico", texto: "Um retorno consolidado sobre os onlines: só ajustes técnicos (cor, som, grafismos, legendas).", cliente: true },
    { data: "2027-01-21", titulo: "Correções finais", texto: "Cor, som, grafismos e legendas corrigidos." },
    { data: "2027-01-22", titulo: "Masters fechados", texto: "Exports conferidos e masters prontos." },
    { data: "2027-01-26", titulo: "Margem para imprevistos", texto: "Dias reservados para qualquer imprevisto.", fim: "2027-01-27" },
    { data: "2027-01-28", titulo: "Entrega dos 41 vídeos", texto: "33 pílulas, 6 visitas, o documentário e o trailer.", marco: true },
  ],
};
