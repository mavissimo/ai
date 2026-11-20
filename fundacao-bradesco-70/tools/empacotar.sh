#!/bin/zsh
# Pacote do site dos filmes para a hospedagem do Bradesco — por enquanto SÓ O MAPA, sem nada de vídeo:
# sem player, sem planilha, sem Dropbox, sem registro e sem contador de visitas. Todo filme aparece
# como "Em breve" (config.js liga o modo SEM_VIDEOS). Não faz nenhuma conexão fora do próprio servidor.
# Na entrega final vão os vídeos, a página oculta e o mapa ligado a ela.
# Uso: tools/empacotar.sh [pasta de saída]   (padrão: ~/Library/CloudStorage/Dropbox/AI/FB70 pacote Bradesco)
set -e
ORIG="${0:A:h:h}"
SAIDA="${1:-$HOME/Library/CloudStorage/Dropbox/AI/FB70 pacote Bradesco}"
DATA=$(date +%Y%m%d)
NOME="fb70-mapa-provisorio-$DATA"
TMP=$(mktemp -d)/$NOME
mkdir -p "$TMP" "$SAIDA"
for f in index.html app.js styles.css data.js videos.js brasil-path.js; do cp "$ORIG/$f" "$TMP/"; done
cp -R "$ORIG/assets" "$TMP/assets"
printf '%s\n' '// Site só com o mapa: os filmes aparecem como "Em breve" e nada é carregado de fora do servidor.' 'window.SEM_VIDEOS = true;' > "$TMP/config.js"
python3 -I - "$TMP/index.html" <<'PY'
import re, sys
p = sys.argv[1]; t = open(p, encoding="utf-8").read()
def tira(padrao, quantos=1):
    global t
    t, n = re.subn(padrao, "", t, flags=re.S)
    assert n == quantos, (padrao, n)
tira(r'\s*<a href="cronograma\.html" class="nav-crono".*?</a>(<!--.*?-->)?')   # atalho interno da página de entrega
tira(r'\s*<link rel="stylesheet" href="player\.css[^"]*">')                 # player: sem vídeos por enquanto
for js in ("links-planilha", "registro", "presenca", "player"):
    tira(r'\s*<script src="%s\.js[^"]*"[^>]*></script>' % js)              # planilha, registro, visitas e player
t = t.replace('<script src="app.js', '<script src="config.js"></script>\n  <script src="app.js', 1)
tira(r'\s*<meta property="og:url"[^>]*>')
t = t.replace('content="https://mavissimo.github.io/ai/fundacao-bradesco-70/assets/og.png"', 'content="assets/og.png"')
for x in ("mavissimo", "cronograma.html", "presenca.js", "links-planilha", "registro.js", "player.js", "docs.google"):
    assert x not in t, x
open(p, "w", encoding="utf-8").write(t)
PY
cat > "$TMP/LEIA-ME.txt" <<'TXT'
Fundação Bradesco 70 anos · site dos filmes (versão provisória: só o mapa)
Produção: Têmpora studio

O QUE É
Um site estático: HTML, CSS, JavaScript, imagens e fontes, todos nesta pasta. Não usa banco de dados,
não roda programa no servidor e não se conecta a nenhum serviço de fora. Nesta versão os filmes
aparecem como "Em breve".

COMO PUBLICAR
1. Copiar todo o conteúdo desta pasta para o endereço escolhido (raiz ou subpasta; os caminhos são
   relativos). A página inicial é index.html.
2. Basta uma hospedagem com HTTPS. Não há etapa de build nem dependências para instalar.

CONEXÕES EXTERNAS
Nenhuma. Content-Security-Policy compatível, se a hospedagem usar:
  default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'

PRIVACIDADE
Sem cookies, sem coleta de dados e sem contador de visitas.

PRÓXIMOS ENVIOS
Na versão final enviaremos os filmes, o mapa finalizado e a página de gestão dos vídeos
(para trocar um vídeo, se for preciso, sem mexer no site). Nesta versão o site pede aos
buscadores para não indexar; isso também muda na versão final.
TXT
rm -f "$SAIDA/$NOME.zip"
(cd "${TMP:h}" && zip -qr -X "$SAIDA/$NOME.zip" "$NOME" -x '*.DS_Store')
rm -rf "$SAIDA/$NOME"; cp -R "$TMP" "$SAIDA/$NOME"
echo "$SAIDA/$NOME.zip"
du -h "$SAIDA/$NOME.zip" | cut -f1
