# O que só você consegue fazer

Tudo o que está aqui depende de uma conta, de um aparelho ou de um clique seu —
eu não tenho acesso a nenhuma dessas coisas de dentro da sessão. Está tudo em
ordem de utilidade.

---

## 1. Mandar o Unit0 para o Tato testar

O link é sempre o mesmo, mesmo quando eu publico uma versão nova:

**https://claude.ai/code/artifact/e129c531-621c-49c6-9f1d-5eb476e276ad**

Só que ele nasce **privado**: se você mandar assim, o Tato vê "sem acesso".

1. Abra o link no navegador.
2. Canto superior direito, menu **Share** (compartilhar).
3. Escolha **Anyone with the link** (ou adicione o e-mail dele).
4. Copie e mande.

O que ele vai ver: o app inteiro, com o projeto carregado. Os dados dele ficam
**no aparelho dele** — o que ele mexer não aparece no seu, e vice-versa. Para
os dois mexerem na mesma base, é o passo 3 aqui embaixo.

## 2. Instalar no celular (vira app de verdade)

Sem isso ele abre como uma página; com isso abre em tela cheia, com ícone.

- **iPhone (Safari):** botão de compartilhar → *Adicionar à Tela de Início*.
- **Android (Chrome):** menu ⋮ → *Instalar app* / *Adicionar à tela inicial*.

Precisa ser o Safari no iPhone — no Chrome do iPhone a opção não aparece.

## 3. Ligar a base compartilhada (Supabase)

Hoje cada aparelho tem a sua cópia. Para você e o Tato verem o mesmo lançamento
na mesma hora — e para o app conseguir mandar notificação com ele fechado —
o projeto precisa de um Supabase. É de graça no plano inicial.

1. Entre em **supabase.com**, crie uma conta e um projeto novo
   (nome: `unit0`, região: São Paulo).
2. Menu **SQL Editor** → cole o conteúdo de `producao/supabase/schema.sql`
   deste repositório → **Run**. Isso cria as tabelas e as regras de quem pode
   ver o quê.
3. Menu **Project Settings → API**. Copie dois valores:
   - **Project URL** (algo como `https://xxxx.supabase.co`)
   - **anon public key** (uma chave longa)
4. Me mande os dois aqui no chat. A `anon key` é pública por definição — ela é
   feita para ficar no código do app, quem protege os dados são as regras do
   passo 2. **Não me mande a `service_role key`**, essa sim é secreta.

Eu preencho o `producao/js/config.js`, publico e a partir daí o login passa a
ser por link no e-mail, cada um com o seu papel.

## 4. Comentar dentro do app publicado

Você pode comentar em cima da tela publicada, mas eu **só leio e respondo** se
você mandar a thread para mim: responda no comentário e use **Send to Claude**
(ou escreva `@claude` dentro dele). Sem isso o comentário fica lá e eu não
enxergo — hoje tem 11 threads abertas nessa situação.

## 5. Coisas que eu não alcanço nesta sessão

| O quê | Por quê | O que fazer |
|---|---|---|
| Dropbox | não foi autorizado no começo | autorizar em Configurações → Conectores, se quiser que eu leia de lá |
| Notificação com o app fechado | precisa de servidor | passo 3 acima |
| Anexar arquivo/foto de verdade | não tenho seus arquivos | subir pelo próprio app, no campo de anexo |
| Assinar contrato / emitir NF | é ato seu | o app só organiza e lembra |

---

## Como eu publico uma versão nova

Eu edito o código, rodo o build (`node tools/build-single-file.mjs`), publico no
**mesmo link** e faço commit na branch `claude/audiovisual-project-management-gsfx5d`.
Você não precisa fazer nada — só recarregar a página.

Se o app avisar **"Tem novidade na carga do projeto"**, pode clicar em
*Atualizar* sem medo: ela só acrescenta o que falta. Nada que você editou,
criou ou marcou é apagado ou sobrescrito.
