// Configuração do app.
// Enquanto SUPABASE.url estiver vazio, o app roda em MODO DEMO (dados no próprio
// aparelho, sem cadastro). Preenchendo url + anonKey, ele passa a usar o Supabase:
// login por e-mail, dados compartilhados entre a equipe e notas fiscais no storage.
// Passo a passo: producao/README.md
export const SUPABASE = {
  url: '',
  anonKey: '',
  bucket: 'documentos'
};

export const APP = {
  nome: 'Unit0',
  versao: '2.0.0',
  moeda: 'BRL',
  /* Carimbo da build. Quando o app é publicado num link aberto, o link fica
     preso numa versão e quem abre não tem como saber se está vendo a de ontem.
     O empacotador troca isto pela data e pelo commit reais; no servidor de
     módulos fica "dev", que também é uma informação. */
  build: 'dev'
};

export const isRemote = () => Boolean(SUPABASE.url && SUPABASE.anonKey);
