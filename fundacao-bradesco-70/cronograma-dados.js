// Cronograma da pós para o cliente, a partir da "Agenda diária" do Notion
// (Fundação Bradesco 70 anos | Pós-produção). Só entra o que o cliente acompanha: o cliente recebe
// cada filme na V2; antes disso a edição e a V1 são internas (aparecem só como contexto).
// Para atualizar: mude as datas aqui (AAAA-MM-DD) e o "atualizado".
window.CRONO = {
  atualizado: "2026-10-29",
  inicio: "2026-10-26",
  fim: "2027-02-10",
  feriados: { "2026-11-02": "Finados", "2026-11-20": "Consciência Negra", "2026-12-25": "Natal", "2027-01-01": "Ano-novo", "2027-01-25": "Aniversário de São Paulo" },

  // Cada filme (ou grupo de três pílulas): edição interna, V2, retorno do cliente, offline, finalização e online.
  // ed = [início, fim] da edição interna até a V2; fin = [início, fim] de cor e som.
  // junto = o filme chega ao cliente no mesmo pacote que a visita indicada (mesma V2, retorno e online).
  filmes: [
    { id: "elza-lima", nome: "Elza Lima", tipo: "pilula", ed: ["2026-10-23", "2026-10-30"], v2: "2026-11-03", rev: "2026-11-05", off: "2026-11-13", fin: ["2026-11-16", "2026-11-23"], on: "2026-11-30", junto: "conceicao-do-araguaia" },
    { id: "nti-uira", nome: "Ntí Uirá", tipo: "pilula", ed: ["2026-11-06", "2026-11-16"], v2: "2026-11-17", rev: "2026-11-19", off: "2026-12-03", fin: ["2026-12-04", "2026-12-08"], on: "2026-12-09", junto: "jaboatao" },
    { id: "renato-parada", nome: "Renato Parada", tipo: "pilula", ed: ["2026-11-17", "2026-11-26"], v2: "2026-11-27", rev: "2026-12-01", off: "2026-12-15", fin: ["2026-12-16", "2026-12-18"], on: "2026-12-21", junto: "gravatai" },
    { id: "pedro-kok", nome: "Pedro Kok", tipo: "pilula", ed: ["2026-11-23", "2026-12-04"], v2: "2026-12-07", rev: "2026-12-09", off: "2026-12-30", fin: ["2026-12-31", "2027-01-05"], on: "2027-01-06", junto: "bodoquena" },
    { id: "mariana-valente", nome: "Mariana Valente", tipo: "pilula", ed: ["2026-11-24", "2026-12-11"], v2: "2026-12-14", rev: "2026-12-16", off: "2027-01-06", fin: ["2027-01-07", "2027-01-11"], on: "2027-01-12", junto: "canuana" },
    { id: "fabio-bartelt", nome: "Fábio Bartelt", tipo: "pilula", ed: ["2026-12-15", "2026-12-21"], v2: "2026-12-22", rev: "2026-12-24", off: "2027-01-13", fin: ["2027-01-14", "2027-01-19"], on: "2027-01-20" },
    { id: "patricia-brasil", nome: "Patricia Brasil", tipo: "pilula", ed: ["2026-12-17", "2026-12-23"], v2: "2026-12-24", rev: "2026-12-29", off: "2027-01-14", fin: ["2027-01-15", "2027-01-21"], on: "2027-01-22" },
    { id: "maira-erlich", nome: "Maíra Erlich", tipo: "pilula", ed: ["2026-12-18", "2026-12-28"], v2: "2026-12-29", rev: "2026-12-31", off: "2027-01-15", fin: ["2027-01-18", "2027-01-26"], on: "2027-01-27" },
    { id: "edgar-azevedo", nome: "Edgar Azevedo", tipo: "pilula", ed: ["2026-12-22", "2027-01-04"], v2: "2027-01-05", rev: "2027-01-07", off: "2027-01-18", fin: ["2027-01-19", "2027-01-28"], on: "2027-01-29" },
    { id: "lalo-de-almeida", nome: "Lalo de Almeida", tipo: "pilula", ed: ["2026-12-30", "2027-01-07"], v2: "2027-01-08", rev: "2027-01-12", off: "2027-01-19", fin: ["2027-01-20", "2027-02-01"], on: "2027-02-02" },
    { id: "vilma-slomp", nome: "Vilma Slomp", tipo: "pilula", ed: ["2027-01-06", "2027-01-08"], v2: "2027-01-11", rev: "2027-01-13", off: "2027-01-20", fin: ["2027-01-21", "2027-02-03"], on: "2027-02-04" },
    { id: "conceicao-do-araguaia", nome: "Conceição do Araguaia", tipo: "visita", ed: ["2026-10-23", "2026-10-30"], v2: "2026-11-03", rev: "2026-11-05", off: "2026-11-10", fin: ["2026-11-11", "2026-11-27"], on: "2026-11-30", uf: "PA" },
    { id: "jaboatao", nome: "Jaboatão dos Guararapes", tipo: "visita", ed: ["2026-11-04", "2026-11-16"], v2: "2026-11-17", rev: "2026-11-19", off: "2026-11-30", fin: ["2026-12-01", "2026-12-04"], on: "2026-12-09", uf: "PE" },
    { id: "gravatai", nome: "Gravataí", tipo: "visita", ed: ["2026-11-10", "2026-11-26"], v2: "2026-11-27", rev: "2026-12-01", off: "2026-12-11", fin: ["2026-12-14", "2026-12-16"], on: "2026-12-21", uf: "RS" },
    { id: "bodoquena", nome: "Fazenda Bodoquena", tipo: "visita", ed: ["2026-11-18", "2026-12-04"], v2: "2026-12-07", rev: "2026-12-09", off: "2026-12-28", fin: ["2026-12-29", "2026-12-31"], on: "2027-01-06", uf: "MS" },
    { id: "canuana", nome: "Canuanã", tipo: "visita", ed: ["2026-11-30", "2026-12-11"], v2: "2026-12-14", rev: "2026-12-16", off: "2027-01-04", fin: ["2027-01-05", "2027-01-07"], on: "2027-01-12", uf: "TO" },
    { id: "osasco", nome: "Osasco", tipo: "visita", ed: ["2026-12-07", "2026-12-16"], v2: "2026-12-17", rev: "2026-12-21", off: "2027-01-12", fin: ["2027-01-13", "2027-01-15"], on: "2027-01-18", uf: "SP" },
    { id: "documentario", nome: "Documentário", tipo: "documentario", ed: ["2026-10-29", "2026-11-18"], v2: "2026-11-19", rev: "2026-11-24", off: "2026-11-26", fin: ["2026-11-27", "2026-12-01"], on: "2026-12-02" },
    { id: "trailer", nome: "Trailer", tipo: "trailer", ed: ["2026-11-13", "2026-11-24"], v2: "2026-11-25", rev: "2026-11-27", off: "2026-12-03", fin: ["2026-12-07", "2026-12-10"], on: "2026-12-11" },
  ],

  // Fechamento, para todos os filmes
  fechamento: [
    { data: "2027-02-04", titulo: "Todos os 41 onlines prontos", texto: "Os 41 vídeos com cor, som, grafismos e legendas, para conferência técnica." },
    { data: "2027-02-04", titulo: "Retorno técnico", texto: "Um retorno consolidado sobre os onlines: só ajustes técnicos (cor, som, grafismos, legendas).", cliente: true },
    { data: "2027-02-05", titulo: "Correções finais", texto: "Cor, som, grafismos e legendas corrigidos." },
    { data: "2027-02-08", titulo: "Masters fechados", texto: "Exports conferidos e masters prontos." },
    { data: "2027-02-09", titulo: "Margem para imprevistos", texto: "Dias reservados para qualquer imprevisto." },
    { data: "2027-02-10", titulo: "Entrega dos 41 vídeos", texto: "33 pílulas, 6 visitas, o documentário e o trailer.", marco: true },
  ],
};
