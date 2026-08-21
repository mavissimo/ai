// Adaptador SUPABASE: mesmas tabelas, agora compartilhadas pela equipe.
// O schema (com RLS por papel) está em producao/supabase/schema.sql.
import { SUPABASE } from '../config.js';
import { TABELAS } from './local.js';

let client = null;
export async function getClient() {
  if (client) return client;
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  client = createClient(SUPABASE.url, SUPABASE.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  return client;
}

export class SupabaseAdapter {
  constructor() { this.remoto = true; this.state = null; }

  async load() {
    const sb = await getClient();
    const tabelas = {};
    await Promise.all(TABELAS.map(async (n) => {
      const { data, error } = await sb.from(n).select('*');
      if (error) { console.warn(`Falha ao ler ${n}:`, error.message); tabelas[n] = []; return; }
      tabelas[n] = data || [];
    }));
    this.state = { meta: { versao: 1, remoto: true }, tabelas };
    return this.state;
  }

  async insert(t, obj) {
    const sb = await getClient();
    const { error } = await sb.from(t).insert(obj);
    if (error) throw new Error(`${t}: ${error.message}`);
  }
  async update(t, id, patch) {
    const sb = await getClient();
    const { error } = await sb.from(t).update(patch).eq('id', id);
    if (error) throw new Error(`${t}: ${error.message}`);
  }
  async remove(t, id) {
    const sb = await getClient();
    const { error } = await sb.from(t).delete().eq('id', id);
    if (error) throw new Error(`${t}: ${error.message}`);
  }
  async reset() { throw new Error('Reset só está disponível no modo demo.'); }

  exportar() { return JSON.stringify(this.state, null, 2); }
  async importar() { throw new Error('Importação só está disponível no modo demo.'); }
}
