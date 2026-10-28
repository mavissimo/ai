#!/usr/bin/env python3
"""Gera um único HTML autocontido do site (CSS, JS, fonte, selo e capas embutidos).

Uso:  python3 tools/gerar-preview.py saida.html
Serve para mandar o site para revisão sem hospedar. Inclui as fotos de assets/capas/
se existirem, então NÃO publique o arquivo gerado em lugar aberto antes do lançamento.
"""
import base64, json, pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent.parent
b64 = lambda p, mime: f"data:{mime};base64," + base64.b64encode((root / p).read_bytes()).decode()

html = re.sub(r"\?v=[\w-]+\"", "\"", (root / "index.html").read_text())  # tira o ?v= (só serve para o cache do navegador)
css = re.sub(r'url\("(assets/fonts/[^"]+)"\)', lambda m: f'url("{b64(m.group(1), "font/woff2")}")', (root / "styles.css").read_text())
html = re.sub(r'\s*<link rel="preload"[^>]+>\n', "\n", html)
html = html.replace('<link rel="stylesheet" href="styles.css">', f"<style>{css}</style>")
for svg in ("selo-70-branco.svg", "selo-70-roxo.svg"):
    html = html.replace(f"assets/{svg}", b64(f"assets/{svg}", "image/svg+xml"))

caps = {p.name: b64(f"assets/capas/{p.name}", "image/jpeg") for p in sorted((root / "assets/capas").glob("*.jpg"))}
app = (root / "app.js").read_text()
old = 'const capa = (f, tipo = "thumb") => f.capa?.[tipo] ?? `assets/capas/${f.id}${tipo === "thumb" ? "-thumb" : ""}.jpg`;'
assert old in app, "app.js mudou: atualize a substituição de `capa` neste script"
app = app.replace(old, 'const capa = (f, tipo = "thumb") => { const k = `${f.id}${tipo === "thumb" ? "-thumb" : ""}.jpg`; return (window.__CAPAS || {})[k] || `assets/capas/${k}`; };')
for name in ("brasil-path.js", "data.js", "videos.js", "links-planilha.js"):
    html = html.replace(f'<script src="{name}"></script>', f"<script>{(root / name).read_text()}</script>")
html = html.replace('<script src="player.js"></script>', f"<script>{(root / 'player.js').read_text()}</script>")
html = html.replace('<script src="app.js"></script>', f"<script>window.__CAPAS={json.dumps(caps)};</script>\n<script>{app}</script>")
assert not re.search(r'(?:src|href)="assets', html)
pathlib.Path(sys.argv[1]).write_text(html)
print(f"{len(html) // 1024} KB, {len(caps)} imagens de capa")
