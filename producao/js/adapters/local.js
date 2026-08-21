// Adaptador MODO DEMO: tudo em localStorage, no próprio aparelho.
const KEY = 'claquete:db:v1';

export const TABELAS = [
  'projetos', 'membros', 'etapas', 'tarefas', 'eventos', 'entregas',
  'orcamento', 'lancamentos', 'contas', 'contratos', 'documentos',
  'confirmacoes', 'atividades'
];

const vazio = () => {
  const t = {};
  TABELAS.forEach((n) => { t[n] = []; });
  return { meta: { versao: 1, criado_em: new Date().toISOString() }, tabelas: t };
};

export class LocalAdapter {
  constructor() { this.remoto = false; this.state = null; }

  async load() {
    try {
      const raw = localStorage.getItem(KEY);
      const s = raw ? JSON.parse(raw) : vazio();
      TABELAS.forEach((n) => { if (!Array.isArray(s.tabelas[n])) s.tabelas[n] = []; });
      this.state = s;
    } catch (e) {
      console.warn('Base local corrompida, começando do zero.', e);
      this.state = vazio();
    }
    return this.state;
  }

  persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Não consegui salvar localmente', e);
      throw new Error('Armazenamento do aparelho cheio. Exporte um backup em Ajustes.');
    }
  }

  async insert(_t, _obj) { this.persist(); }
  async update(_t, _id, _patch) { this.persist(); }
  async remove(_t, _id) { this.persist(); }
  async reset() { localStorage.removeItem(KEY); }

  exportar() { return JSON.stringify(this.state, null, 2); }
  async importar(json) {
    const s = JSON.parse(json);
    if (!s || !s.tabelas) throw new Error('Arquivo de backup inválido.');
    TABELAS.forEach((n) => { if (!Array.isArray(s.tabelas[n])) s.tabelas[n] = []; });
    this.state = s;
    this.persist();
    return s;
  }
}
