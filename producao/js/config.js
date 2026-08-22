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
  moeda: 'BRL'
};

export const isRemote = () => Boolean(SUPABASE.url && SUPABASE.anonKey);
