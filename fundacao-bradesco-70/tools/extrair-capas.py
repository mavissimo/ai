#!/usr/bin/env python3
"""Extrai as capas do PDF do projeto gráfico e gera as imagens do site.

Uso:  python3 tools/extrair-capas.py caminho/para/Livro_capas.pdf
Gera: assets/capas/<id>.jpg (capa inteira) e assets/capas/<id>-thumb.jpg (recorte redondo do mapa).

As fotos são do livro ainda não lançado: a pasta assets/capas/ fica fora do git (.gitignore).
Requer: poppler (pdfimages) e Pillow.
"""
import subprocess, sys, tempfile, pathlib
from PIL import Image

# ordem das capas no PDF (páginas 1–4, 3 por página) e ponto focal do recorte (x, y em 0–1)
CAPAS = [
    ("lalo-de-almeida", (0.45, 0.22)), ("maira-erlich", (0.50, 0.62)), ("nti-uira", (0.30, 0.55)),
    ("elza-lima", (0.60, 0.80)), ("patricia-brasil", (0.62, 0.42)), ("renato-parada", (0.55, 0.62)),
    ("pedro-kok", (0.30, 0.80)), ("mariana-valente", (0.38, 0.52)), ("edgar-azevedo", (0.48, 0.50)),
    ("vilma-slomp", (0.55, 0.45)), ("fabio-bartelt", (0.50, 0.62)), ("historica", (0.70, 0.68)),
]

def main(pdf):
    out = pathlib.Path(__file__).resolve().parent.parent / "assets" / "capas"
    out.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(["pdfimages", "-j", pdf, f"{tmp}/img"], check=True)
        # as capas são os JPEGs grandes; os PPM são sombras/máscaras
        jpgs = sorted(p for p in pathlib.Path(tmp).glob("img-*.jpg"))
        if len(jpgs) != len(CAPAS):
            sys.exit(f"esperava {len(CAPAS)} capas, encontrei {len(jpgs)}")
        for (cid, (fx, fy)), src in zip(CAPAS, jpgs):
            im = Image.open(src).convert("RGB")
            full = im.copy(); full.thumbnail((720, 960), Image.LANCZOS)
            full.save(out / f"{cid}.jpg", quality=80, optimize=True, progressive=True)
            w, h = im.size; side = int(w * 0.5)
            x = min(max(int(fx * w - side / 2), 0), w - side)
            y = min(max(int(fy * h - side / 2), 0), h - side)
            im.crop((x, y, x + side, y + side)).resize((240, 240), Image.LANCZOS) \
              .save(out / f"{cid}-thumb.jpg", quality=82, optimize=True)
            print("ok", cid)

if __name__ == "__main__":
    main(sys.argv[1])
