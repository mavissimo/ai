// Estado central. As telas nunca falam com o banco direto — sempre por aqui.
import { isRemote } from './config.js';
import { LocalAdapter, TABELAS } from './adapters/local.js';
import { uid, hoje } from './utils.js';

export { TABELAS };

const LS_PROJ = 'unit0:projeto';
const LS_USER = 'unit0:usuario';

class Store {
  constructor() {
    this.adapter = null;
    this.state = null;
    this.user = null;        // membro logado (registro da tabela membros)
    this.projetoId = null;
    this.subs = new Set();
    this.erro = null;
  }

  async init() {
    if (isRemote()) {
      const { SupabaseAdapter } = await import('./adapters/supabase.js');
      this.adapter = new SupabaseAdapter();
    } else {
      this.adapter = new LocalAdapter();
    }
    this.state = await this.adapter.load();
    this.projetoId = localStorage.getItem(LS_PROJ) || this.all('projetos')[0]?.id || null;
    return this.state;
  }

  get remoto() { return Boolean(this.adapter?.remoto); }

  /* ---------- leitura ---------- */
  all(tabela) { return this.state?.tabelas?.[tabela] || []; }
  /** Registros da tabela pertencentes ao projeto ativo. */
  doProjeto(tabela) {
    const p = this.projetoId;
    return this.all(tabela).filter((r) => !r.projeto_id || r.projeto_id === p);
  }
  get(tabela, id) { return this.all(tabela).find((r) => r.id === id) || null; }
  get projeto() { return this.get('projetos', this.projetoId); }

  /* ---------- escrita ---------- */
  async insert(tabela, obj) {
    const rec = {
      id: obj.id || uid(tabela.slice(0, 3)),
      criado_em: obj.criado_em || new Date().toISOString(),
      criado_por: obj.criado_por ?? this.user?.id ?? null,
      ...obj
    };
    if (tabela !== 'projetos' && rec.projeto_id === undefined) rec.projeto_id = this.projetoId;
    this.all(tabela).push(rec);
    await this._persist('insert', tabela, rec.id, rec);
    this.emit();
    return rec;
  }

  async update(tabela, id, patch) {
    const rec = this.get(tabela, id);
    if (!rec) throw new Error('Registro não encontrado.');
    Object.assign(rec, patch);
    await this._persist('update', tabela, id, patch);
    this.emit();
    return rec;
  }

  async remove(tabela, id) {
    const arr = this.all(tabela);
    const i = arr.findIndex((r) => r.id === id);
    if (i >= 0) arr.splice(i, 1);
    await this._persist('remove', tabela, id);
    this.emit();
  }

  async _persist(op, tabela, id, payload) {
    try {
      if (op === 'insert') await this.adapter.insert(tabela, payload);
      else if (op === 'update') await this.adapter.update(tabela, id, payload);
      else await this.adapter.remove(tabela, id);
      this.erro = null;
    } catch (e) {
      this.erro = e.message || String(e);
      console.error('[persist]', op, tabela, e);
      throw e;
    }
  }

  /** Registra uma linha no histórico do projeto (quem fez o quê). */
  async log(texto, tipo = 'geral', extra = {}) {
    try {
      await this.insert('atividades', { texto, tipo, quando: new Date().toISOString(), ...extra });
    } catch (e) { console.warn('log falhou', e); }
  }

  /* ---------- sessão ---------- */
  setUser(membro) {
    this.user = membro;
    if (membro) localStorage.setItem(LS_USER, membro.id);
    else localStorage.removeItem(LS_USER);
    this.emit();
  }
  restaurarUser() {
    const id = localStorage.getItem(LS_USER);
    const m = id ? this.get('membros', id) : null;
    this.user = m;
    return m;
  }
  setProjeto(id) {
    this.projetoId = id;
    localStorage.setItem(LS_PROJ, id);
    this.emit();
  }

  /* ---------- eventos ---------- */
  sub(fn) { this.subs.add(fn); return () => this.subs.delete(fn); }
  emit() { this.subs.forEach((f) => { try { f(); } catch (e) { console.error(e); } }); }
}

export const store = new Store();

/* Helpers usados por várias telas ------------------------------------ */
export const membros = () => store.doProjeto('membros');
export const membro = (id) => store.get('membros', id);
export const nomeMembro = (id) => membro(id)?.nome || '—';
export const hojeISO = hoje;
