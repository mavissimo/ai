// Cronograma da pós para o cliente, a partir da "Agenda diária" do Notion
// (Fundação Bradesco 70 anos | Pós-produção). Só entra o que o cliente acompanha: o cliente recebe
// cada filme na V2; antes disso a edição e a V1 são internas (aparecem só como contexto).
// Reserva: o cronograma lê as datas da aba "Cronograma" da planilha, que o Controle dos Filmes preenche a partir do Notion.
window.CRONO = {
  atualizado: "2026-10-29",
  inicio: "2026-10-26",
  fim: "2026-12-08",
  feriados: { "2026-11-02": "Finados", "2026-11-20": "Consciência Negra", "2026-12-25": "Natal", "2027-01-01": "Ano-novo", "2027-01-25": "Aniversário de São Paulo" },

  // Blocos de entrega: cidade + fotógrafo (visita + 3 pílulas), só as 3 pílulas, documentário e trailer.
  // ed = [início, fim] da edição interna até a V2; fin = [início, fim] de cor e som; fot = fotógrafo do bloco da cidade.
  filmes: [
    { id: "conceicao-do-araguaia", nome: "Conceição do Araguaia", uf: "PA", tipo: "bloco", fot: { id: "elza-lima", nome: "Elza Lima" }, ed: ["2026-10-23", "2026-10-30"], v2: "2026-11-03", rev: "2026-11-05", off: "2026-11-16", fin: ["2026-11-17", "2026-11-17"], on: "2026-11-18" },
    { id: "jaboatao", nome: "Jaboatão dos Guararapes", uf: "PE", tipo: "bloco", fot: { id: "nti-uira", nome: "Ntí Uirá" }, ed: ["2026-10-29", "2026-11-04"], v2: "2026-11-05", rev: "2026-11-09", off: "2026-11-17", fin: ["2026-11-17", "2026-11-18"], on: "2026-11-19" },
    { id: "gravatai", nome: "Gravataí", uf: "RS", tipo: "bloco", fot: { id: "renato-parada", nome: "Renato Parada" }, ed: ["2026-11-05", "2026-11-09"], v2: "2026-11-10", rev: "2026-11-12", off: "2026-11-17", fin: ["2026-11-17", "2026-11-19"], on: "2026-11-23" },
    { id: "bodoquena", nome: "Fazenda Bodoquena", uf: "MS", tipo: "bloco", fot: { id: "pedro-kok", nome: "Pedro Kok" }, ed: ["2026-11-06", "2026-11-10"], v2: "2026-11-11", rev: "2026-11-13", off: "2026-11-17", fin: ["2026-11-18", "2026-11-23"], on: "2026-11-24" },
    { id: "canuana", nome: "Canuanã", uf: "TO", tipo: "bloco", fot: { id: "mariana-valente", nome: "Mariana Valente" }, ed: ["2026-11-10", "2026-11-11"], v2: "2026-11-12", rev: "2026-11-16", off: "2026-11-17", fin: ["2026-11-18", "2026-11-26"], on: "2026-11-26" },
    { id: "osasco", nome: "Osasco", uf: "SP", tipo: "bloco", fot: { id: "fabio-bartelt", nome: "Fábio Bartelt" }, ed: ["2026-11-12", "2026-11-13"], v2: "2026-11-16", rev: "2026-11-18", off: "2026-11-18", fin: ["2026-11-19", "2026-11-27"], on: "2026-11-27" },
    { id: "patricia-brasil", nome: "Patricia Brasil", tipo: "pilula", ed: ["2026-11-04", "2026-11-12"], v2: "2026-11-13", rev: "2026-11-17", off: "2026-11-19", fin: ["2026-11-19", "2026-11-19"], on: "2026-11-23" },
    { id: "maira-erlich", nome: "Maíra Erlich", tipo: "pilula", ed: ["2026-11-06", "2026-11-16"], v2: "2026-11-17", rev: "2026-11-19", off: "2026-11-23", fin: ["2026-11-23", "2026-11-24"], on: "2026-11-24" },
    { id: "edgar-azevedo", nome: "Edgar Azevedo", tipo: "pilula", ed: ["2026-11-09", "2026-11-16"], v2: "2026-11-17", rev: "2026-11-19", off: "2026-11-24", fin: ["2026-11-24", "2026-11-26"], on: "2026-11-27" },
    { id: "lalo-de-almeida", nome: "Lalo de Almeida", tipo: "pilula", ed: ["2026-11-11", "2026-11-17"], v2: "2026-11-18", rev: "2026-11-23", off: "2026-11-23", fin: ["2026-11-24", "2026-11-24"], on: "2026-11-25" },
    { id: "vilma-slomp", nome: "Vilma Slomp", tipo: "pilula", ed: ["2026-11-12", "2026-11-18"], v2: "2026-11-19", rev: "2026-11-24", off: "2026-11-24", fin: ["2026-11-24", "2026-11-27"], on: "2026-11-30" },
    { id: "documentario", nome: "Documentário", tipo: "documentario", ed: ["2026-10-29", "2026-11-12"], v2: "2026-11-13", rev: "2026-11-17", off: "2026-11-23", fin: ["2026-11-23", "2026-11-25"], on: "2026-11-26" },
    { id: "trailer", nome: "Trailer", tipo: "trailer", ed: ["2026-11-11", "2026-11-13"], v2: "2026-11-16", rev: "2026-11-18", off: "2026-11-19", fin: ["2026-11-19", "2026-11-30"], on: "2026-11-30" },
  ],

  // Fechamento, para todos os filmes
  fechamento: [
    { data: "2026-11-30", titulo: "Todos os 41 onlines prontos", texto: "Os 41 vídeos com cor, som, grafismos e legendas, para conferência técnica." },
    { data: "2026-12-01", titulo: "Retorno técnico", texto: "Um retorno consolidado sobre os onlines: só ajustes técnicos (cor, som, grafismos, legendas).", cliente: true },
    { data: "2026-12-02", titulo: "Correções finais", texto: "Cor, som, grafismos e legendas corrigidos." },
    { data: "2026-12-03", titulo: "Masters fechados", texto: "Exports conferidos e masters prontos." },
    { data: "2026-12-04", titulo: "Margem para imprevistos", texto: "Dias reservados para qualquer imprevisto." },
    { data: "2026-12-08", titulo: "Entrega dos 41 vídeos", texto: "33 pílulas, 6 visitas, o documentário e o trailer.", marco: true },
  ],
};
