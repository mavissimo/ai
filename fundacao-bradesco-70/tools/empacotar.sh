#!/bin/zsh
# Pacote do site dos filmes para a hospedagem do Bradesco: só o site do mapa (sem cronograma, Controle,
# página da equipe, ferramentas ou o contador de visitas). Os links e os avisos continuam vindo da nossa
# planilha, ao vivo: não é preciso mandar pacote novo quando um filme muda de status.
# Uso: tools/empacotar.sh [pasta de saída]   (padrão: ~/Library/CloudStorage/Dropbox/AI/FB70 pacote Bradesco)
set -e
ORIG="${0:A:h:h}"
SAIDA="${1:-$HOME/Library/CloudStorage/Dropbox/AI/FB70 pacote Bradesco}"
DATA=$(date +%Y%m%d)
NOME="fb70-site-provisorio-$DATA"
TMP=$(mktemp -d)/$NOME
mkdir -p "$TMP" "$SAIDA"
for f in index.html app.js styles.css player.js player.css data.js videos.js brasil-path.js links-planilha.js registro.js; do cp "$ORIG/$f" "$TMP/"; done
cp -R "$ORIG/assets" "$TMP/assets"
python3 -I - "$TMP/index.html" <<'PY'
import re, sys
p = sys.argv[1]; t = open(p, encoding="utf-8").read()
# atalho interno para a página de entrega (só a produção e a Equipe Bradesco usam)
t, n1 = re.subn(r'\s*<a href="cronograma\.html" class="nav-crono".*?</a>(<!--.*?-->)?', "", t, flags=re.S)
# contador de visitas (consulta serviços de terceiros para saber a cidade): fora do domínio do Bradesco
t, n2 = re.subn(r'\s*<script src="presenca\.js[^"]*"[^>]*></script>', "", t)
# endereços absolutos do GitHub: viram relativos (o domínio final ainda não existe)
t = re.sub(r'\s*<meta property="og:url"[^>]*>', "", t)
t = t.replace('content="https://mavissimo.github.io/ai/fundacao-bradesco-70/assets/og.png"', 'content="assets/og.png"')
assert n1 == 1 and n2 == 1, (n1, n2)
assert "mavissimo" not in t and "cronograma.html" not in t and "presenca.js" not in t
open(p, "w", encoding="utf-8").write(t)
PY
cat > "$TMP/LEIA-ME.txt" <<'TXT'
Fundação Bradesco 70 anos · site dos filmes (versão provisória)
Produção: Têmpora studio

O QUE É
Um site estático: HTML, CSS, JavaScript e imagens. Não usa banco de dados nem programa
rodando no servidor. Basta publicar o conteúdo desta pasta numa hospedagem com HTTPS.

COMO PUBLICAR
1. Copiar todo o conteúdo desta pasta (index.html e as demais) para a raiz do endereço escolhido
   (ex.: https://70anos.fundacaobradesco.org.br/) ou para uma subpasta. Os caminhos são relativos.
2. A página inicial é index.html.
3. Não há etapa de build nem dependências para instalar.

CONEXÕES QUE O SITE PRECISA FAZER (liberar no firewall / política de conteúdo, se houver)
- docs.google.com ............. leitura da planilha com o andamento e os links dos filmes
                                 (enquanto o site é provisório, os avisos de cada filme se atualizam por ela)
- www.dropbox.com e
  *.dl.dropboxusercontent.com .. vídeos hospedados no Dropbox
- player.vimeo.com, vimeo.com,
  www.youtube-nocookie.com ...... só se algum filme for publicado nesses serviços
Content-Security-Policy sugerida, se a hospedagem usar:
  default-src 'self'; script-src 'self' https://docs.google.com; img-src 'self' data: https:;
  media-src 'self' https://*.dropbox.com https://*.dropboxusercontent.com;
  frame-src https://player.vimeo.com https://www.youtube-nocookie.com;
  connect-src 'self' https://docs.google.com; style-src 'self' 'unsafe-inline'; font-src 'self'

PRIVACIDADE
O site não usa cookies, não coleta dados pessoais e não tem contador de visitas.

ATUALIZAÇÕES
- Andamento e links dos filmes: automáticos (pela planilha), sem nova publicação.
- Textos, fotos e layout: enviaremos um pacote novo; basta substituir os arquivos.
- Versão final: no lançamento enviaremos o pacote definitivo, com os vídeos e a indexação
  em buscadores liberada (nesta versão o site pede aos buscadores para não indexar).
TXT
rm -f "$SAIDA/$NOME.zip"
(cd "${TMP:h}" && zip -qr -X "$SAIDA/$NOME.zip" "$NOME" -x '*.DS_Store')
rm -rf "$SAIDA/$NOME"; cp -R "$TMP" "$SAIDA/$NOME"
echo "$SAIDA/$NOME.zip"
du -h "$SAIDA/$NOME.zip" | cut -f1
