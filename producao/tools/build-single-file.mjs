// Empacota o app inteiro (HTML + CSS + todos os módulos JS) num único arquivo .html,
// que roda em qualquer lugar: abrir direto do celular, hospedar estático, anexar.
// Uso: node producao/tools/build-single-file.mjs saida.html
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const saida = process.argv[2] || join(RAIZ, 'claquete-arquivo-unico.html');

function arquivosJS(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? arquivosJS(p) : (n.endsWith('.js') ? [p] : []);
  });
}

const chave = (p) => relative(RAIZ, p).split('\\').join('/');
const resolver = (deQuem, spec) => chave(resolve(dirname(join(RAIZ, deQuem)), spec));

function transformar(id, src) {
  const exportados = new Set();
  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)/gm)) {
    exportados.add(m[1]);
  }
  for (const m of src.matchAll(/^export\s*\{([^}]*)\};?\s*$/gm)) {
    m[1].split(',').map((s) => s.trim()).filter(Boolean)
      .forEach((n) => exportados.add(n.split(/\s+as\s+/).pop().trim()));
  }

  let out = src
    // import * as X from '...'
    .replace(/^import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"];?\s*$/gm,
      (_, nome, spec) => `const ${nome} = __req(${JSON.stringify(resolver(id, spec))});`)
    // import { a, b as c } from '...'
    .replace(/^import\s*\{([^}]*)\}\s*from\s+['"]([^'"]+)['"];?\s*$/gm, (_, nomes, spec) => {
      const lista = nomes.split(',').map((s) => s.trim()).filter(Boolean)
        .map((n) => n.replace(/\s+as\s+/, ': ')).join(', ');
      return `const { ${lista} } = __req(${JSON.stringify(resolver(id, spec))});`;
    })
    // import('./x.js') dinâmico -> módulo já embutido (URLs externas ficam intactas)
    .replace(/import\(\s*['"](\.[^'"]+)['"]\s*\)/g,
      (_, spec) => `Promise.resolve(__req(${JSON.stringify(resolver(id, spec))}))`)
    .replace(/^export\s*\{[^}]*\};?\s*$/gm, '')
    .replace(/^export\s+/gm, '');

  out += `\n  return { ${[...exportados].join(', ')} };`;
  return out;
}

const modulos = arquivosJS(join(RAIZ, 'js'))
  .map((p) => [chave(p), transformar(chave(p), readFileSync(p, 'utf8'))]);

const css = readFileSync(join(RAIZ, 'css/app.css'), 'utf8');
const icone = 'data:image/svg+xml;base64,' +
  Buffer.from(readFileSync(join(RAIZ, 'icon.svg'), 'utf8')).toString('base64');

const html = `<meta charset="utf-8">
<title>Claquete</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>
${css}</style>
<div id="app" class="app"><div class="boot">Carregando…</div></div>
<script type="module">
const __defs = {};
const __cache = {};
function __req(id) {
  if (id in __cache) return __cache[id];
  const def = __defs[id];
  if (!def) throw new Error('módulo não encontrado: ' + id);
  return (__cache[id] = def());
}
${modulos.map(([id, corpo]) =>
  `__defs[${JSON.stringify(id)}] = function () {\n${corpo}\n};`).join('\n\n')}
__req('js/app.js');
</script>`.replaceAll("'icon.svg'", JSON.stringify(icone))
           .replaceAll('"icon.svg"', JSON.stringify(icone));

writeFileSync(saida, html);
console.log(`${saida} — ${(html.length / 1024).toFixed(0)} KB, ${modulos.length} módulos`);
