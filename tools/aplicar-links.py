#!/usr/bin/env python3
"""Aplica no site os links da página "Controle dos Filmes".

Uso:  python3 tools/aplicar-links.py lista.json
`lista.json` é o texto do botão "Copiar links para o site" (ou o que o Claude
lê da página): {"placeholder": "...", "videos": {"<id>": {"url": "...", "status": "..."}}}.
Reescreve videos.js. Só entram links preenchidos; o resto toca o vídeo provisório.
"""
import json, pathlib, sys

root = pathlib.Path(__file__).resolve().parent.parent
data = json.loads(pathlib.Path(sys.argv[1]).read_text())
links = {k: v["url"] for k, v in sorted(data["videos"].items()) if v.get("url")}
out = (
    '// Links finais dos filmes, vindos da página "Controle dos Filmes".\n'
    "// Gerado por tools/aplicar-links.py: não edite à mão. Filme sem link aqui toca o vídeo provisório.\n"
    f"window.VIDEO_PLACEHOLDER = {json.dumps(data.get('placeholder') or '')};\n"
    f"window.VIDEO_LINKS = {json.dumps(links, indent=2, ensure_ascii=False)};\n"
)
(root / "videos.js").write_text(out)
print(f"{len(links)} links aplicados; placeholder = {data.get('placeholder')}")
