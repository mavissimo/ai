// Arquivos (notas fiscais, contratos, comprovantes, tickets de passagem).
// Modo demo: guarda o arquivo no IndexedDB do próprio aparelho.
// Modo Supabase: sobe para o bucket de storage e guarda só o caminho.
import { SUPABASE, isRemote } from './config.js';
import { uid } from './utils.js';

const DB = 'unit0-files';
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains('files')) r.result.createObjectStore('files', { keyPath: 'id' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
async function tx(mode, fn) {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction('files', mode);
    const req = fn(t.objectStore('files'));
    t.oncomplete = () => res(req && req.result);
    t.onerror = () => rej(t.error);
  });
}

/** Guarda um File/Blob e devolve {id, nome, tipo, tamanho, path}. */
export async function salvarArquivo(file, { pasta = 'geral' } = {}) {
  const id = uid('arq');
  const meta = { id, nome: file.name || 'arquivo', tipo: file.type || '', tamanho: file.size || 0 };
  if (isRemote()) {
    const { getClient } = await import('./adapters/supabase.js');
    const sb = await getClient();
    const path = `${pasta}/${id}-${meta.nome.replace(/[^\w.\-]+/g, '_')}`;
    const { error } = await sb.storage.from(SUPABASE.bucket).upload(path, file, { upsert: false });
    if (error) throw error;
    return { ...meta, path };
  }
  await tx('readwrite', (s) => s.put({ ...meta, blob: file }));
  return { ...meta, path: 'local:' + id };
}

/** Devolve uma URL utilizável para abrir/baixar o arquivo. */
export async function urlArquivo(meta) {
  if (!meta) return null;
  if (meta.link) return meta.link;
  if (!meta.path) return null;
  if (meta.path.startsWith('local:')) {
    const rec = await tx('readonly', (s) => s.get(meta.path.slice(6)));
    return rec ? URL.createObjectURL(rec.blob) : null;
  }
  const { getClient } = await import('./adapters/supabase.js');
  const sb = await getClient();
  const { data, error } = await sb.storage.from(SUPABASE.bucket).createSignedUrl(meta.path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function removerArquivo(meta) {
  if (!meta?.path) return;
  if (meta.path.startsWith('local:')) { await tx('readwrite', (s) => s.delete(meta.path.slice(6))); return; }
  const { getClient } = await import('./adapters/supabase.js');
  const sb = await getClient();
  await sb.storage.from(SUPABASE.bucket).remove([meta.path]);
}

export async function abrirArquivo(meta) {
  const url = await urlArquivo(meta);
  if (url) window.open(url, '_blank', 'noopener');
  return Boolean(url);
}
