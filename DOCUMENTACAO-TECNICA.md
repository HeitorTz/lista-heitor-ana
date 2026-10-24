# Documentação técnica: Chá de casa nova Heitor e Ana

Última atualização: 23/10/2026.

Este documento tem dois públicos:

1. **Quem desenvolve o projeto**: arquitetura, dados, regras, testes, publicação e manutenção (seções 2 a 9).
2. **Um agente (Claude Code ou outro) configurando uma máquina nova**: a seção 1 é um roteiro executável, passo a passo, com os comandos de verificação. Os valores de referência foram coletados na máquina original.

Documentos relacionados, na mesma pasta:
- `README.md`: resumo curto de como rodar, testar e publicar.
- `ESPECIFICACAO.md` (versão 9): o que o site deve fazer, decisões D1 a D27, pendências P1 a P8, preços.
- Atenção: existe uma cópia **antiga** (versão 7) de `ESPECIFICACAO.md` dois níveis acima, em `15 - Lista de presente/`. A versão válida é a desta pasta.

---

## 1. Configurar uma máquina nova (roteiro para o agente)

> **Agente:** siga os passos na ordem. Cada passo tem uma verificação. Os passos marcados **[USUÁRIO]** exigem login em navegador ou decisão do dono e não podem ser feitos por você: peça ao usuário e espere a confirmação.

### 1.1 Como o projeto chega à máquina nova

O projeto fica numa pasta do OneDrive (conta corporativa "OneDrive - Tomazeli") e é um repositório **Git** com remoto público no GitHub: https://github.com/HeitorTz/lista-heitor-ana (seção 1.1.1). O OneDrive leva o projeto, inclusive a pasta `.git`, para a outra máquina; o GitHub é o backup e a forma de obter o código sem o OneDrive.

Sem o OneDrive, clone o repositório (o PDF modelo `referencia/modelo.pdf` não vem, porque não está no Git):

```powershell
git clone https://github.com/HeitorTz/lista-heitor-ana.git
```

```
C:\Users\Heitor\OneDrive - Tomazeli\Documentos\1- Projetos\15 - Lista de presente\
└── lista-presentes\
    └── lista-presentes\      ← raiz do projeto (onde está o package.json)
```

Na máquina nova, entre com a mesma conta no OneDrive e espere a pasta sincronizar. Se o usuário do Windows não for `Heitor`, o caminho muda só no início (`C:\Users\<usuario>\OneDrive - Tomazeli\...`). Nenhum arquivo do projeto depende do caminho absoluto.

**[USUÁRIO]** Antes de continuar, confirme que a pasta foi baixada inteira. No Explorador, clique com o botão direito na pasta do projeto e escolha **"Sempre manter neste dispositivo"**: o emulador e o `npm` falham com arquivos que estão só na nuvem.

Verificação (PowerShell, na raiz do projeto):

```powershell
Test-Path package.json, firebase.json, firestore.rules, dados\itens.json, js\app.js, .git
# Esperado: True em todas as linhas
```

#### 1.1.1 Git

| Item | Valor |
|---|---|
| Raiz do repositório | a raiz do projeto (`lista-presentes\lista-presentes\`) |
| Branch | `main` |
| Remoto | `origin` → https://github.com/HeitorTz/lista-heitor-ana (**público**; `main` acompanha `origin/main`) |
| Conta GitHub | `HeitorTz`, logada no GitHub CLI (`gh`), que também autentica o `git push` |
| Autor | `Heitor Tomazeli <heitor.tomazeli@hotmail.com>`, definido no `.git/config` do repositório (não há `~/.gitconfig` global) |
| Primeiro commit | `42dc79b` "Lista de presentes do Chá de casa nova Heitor e Ana" |

O `.gitignore` deixa fora do Git: `node_modules/`, `config.local.json`, `.emulador-dados/`, `*-debug.log`, `.firebase/` e `referencia/`. Ou seja, o **PDF modelo (`referencia/modelo.pdf`) existe só no OneDrive**, não no histórico do Git. As fotos `.png` originais e os `.webp` estão versionados.

Como a identidade do autor fica no `.git/config` e ele vem pelo OneDrive, não é preciso configurar `user.name`/`user.email` na máquina nova.

**[USUÁRIO]** O login do GitHub fica no perfil do Windows e precisa ser feito em cada máquina, num terminal do usuário (abre o navegador): `gh auth login` → GitHub.com → HTTPS → Yes (autenticar o Git) → Login with a web browser.

Verificação:

```powershell
git status -sb        # "## main...origin/main", sem erro
git log --oneline -3  # mostra o histórico, incluindo 42dc79b
git config user.email # heitor.tomazeli@hotmail.com
git remote -v         # origin https://github.com/HeitorTz/lista-heitor-ana.git
gh auth status        # Logged in to github.com account HeitorTz
```

Para guardar uma mudança no GitHub (separado da publicação do site, seção 7.1):

```powershell
git add -A
git commit -m "descrição da mudança"
git push
```

Como o repositório é **público**, não versione dados pessoais nem segredos. Antes de um commit, confira `git status`; arquivos que não devem ir para o GitHub entram no `.gitignore`.

Cuidados por causa do OneDrive:
- **Não trabalhe nas duas máquinas ao mesmo tempo.** Antes de mexer na máquina nova, espere o OneDrive terminar de sincronizar (ícone verde); antes de trocar de máquina de novo, faça commit, `git push` e espere sincronizar. Duas máquinas gravando na pasta `.git` ao mesmo tempo podem gerar arquivos "conflito" do OneDrive e corromper o repositório.
- Se `git status` reclamar de objeto corrompido ou aparecerem arquivos como `index-NOMEDAMAQUINA` dentro de `.git`, pare e avise o usuário antes de qualquer correção. O GitHub guarda uma cópia íntegra do que foi enviado com `git push`.

### 1.2 Programas necessários

Versões da máquina original (Windows 11 Home, x64):

| Programa | Versão na máquina original | Mínimo | Para quê |
|---|---|---|---|
| Node.js LTS | 24.22.1 (npm 11.19.1) | 20 | testes, scripts, Firebase CLI |
| Java (Eclipse Temurin JDK) | 21.0.12 | 21 | exigido pelo emulador do Firestore |
| Firebase CLI (`firebase-tools`) | 15.34.1 | 15 | emuladores e publicação |
| Git for Windows | 2.55.0 | qualquer | controle de versão do projeto |
| GitHub CLI (`gh`) | 2.103.2 | qualquer | login no GitHub e `git push` |
| Visual Studio Code | 1.143.1 | qualquer | editor |
| Extensão Claude Code (VS Code) | `anthropic.claude-code` 2.1.309 | qualquer | agente |

Instalação pelo `winget` (PowerShell; o Windows pode pedir confirmação de administrador):

```powershell
winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
winget install --id EclipseAdoptium.Temurin.21.JDK -e --accept-source-agreements --accept-package-agreements
winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements
winget install --id GitHub.cli -e --accept-source-agreements --accept-package-agreements
winget install --id Microsoft.VisualStudioCode -e --accept-source-agreements --accept-package-agreements
```

Depois de instalar, **o terminal atual não enxerga o PATH novo**. Recarregue o PATH na sessão (ou feche e abra o terminal/VS Code):

```powershell
$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
```

> **Agente:** na máquina original, o terminal integrado do VS Code abria **sem** Node e Firebase no PATH. Comece todo comando PowerShell com a linha acima, senão `node`, `npm` e `firebase` dão "comando não encontrado". No Git Bash, `node` também pode não estar no PATH; prefira o PowerShell.

Firebase CLI (global, pelo npm):

```powershell
npm install -g firebase-tools@15.34.1
```

Extensão do Claude Code no VS Code:

```powershell
code --install-extension anthropic.claude-code
```

Verificação:

```powershell
node -v          # v24.x (ou >= v20)
npm -v           # 11.x
java -version    # openjdk version "21..." Temurin
firebase --version   # 15.34.1
git --version
code --list-extensions   # inclui anthropic.claude-code
```

Não é preciso definir `JAVA_HOME`: na máquina original ele está vazio e o emulador acha o `java` pelo PATH (`C:\Program Files\Eclipse Adoptium\jdk-21...\bin`).

### 1.3 Dependências do projeto

Na raiz do projeto:

```powershell
npm ci
```

- Use `npm ci` (instala exatamente o `package-lock.json`), não `npm install`.
- A pasta `node_modules` pode ter vindo pelo OneDrive da outra máquina. **Apague-a antes** (`Remove-Item -Recurse -Force node_modules`) se `npm ci` reclamar ou se o `sharp` falhar: ele tem binário nativo por plataforma.
- Dependências (todas de desenvolvimento; o site publicado não usa nenhuma delas):

| Pacote | Versão | Uso |
|---|---|---|
| `firebase` | ^12.19.0 | SDK usado pelos testes de regras (o site carrega o SDK da CDN do Google) |
| `@firebase/rules-unit-testing` | ^5.0.2 | testes das regras do Firestore |
| `jsqr` | ^1.4.0 | lê o QR Code gerado de volta, no teste do Pix |
| `qrcode-generator` | ^2.0.4 | origem de `js/vendor/qrcode.mjs` |
| `sharp` | ^0.35.5 | conversão PNG → WebP (`npm run webp`) |

Verificação:

```powershell
npm run teste:pix   # esperado: tests 5, pass 5, fail 0
```

### 1.4 Login no Firebase **[USUÁRIO]**

Só é preciso para **publicar** (rodar localmente não exige login).

```powershell
firebase login
```

Abre o navegador. Entrar com a conta **htkarater10@gmail.com** (dona do projeto `lista-heitor-ana`). O agente não pode fazer esse login; peça ao usuário para rodar o comando no terminal dele (no Claude Code: `! firebase login`).

Verificação:

```powershell
firebase login:list      # "Logged in as htkarater10@gmail.com"
firebase projects:list   # inclui lista-heitor-ana (current)
```

O `.firebaserc` já aponta o projeto padrão para `lista-heitor-ana`; não rode `firebase use` nem `firebase init` (o `init` sobrescreveria `firebase.json` e as regras).

### 1.5 Teste completo

As portas 4000, 4400, 4500, 5000, 8080 e 9099 precisam estar livres. Se os emuladores já estiverem rodando, `npm test` falha com "port taken": pare os emuladores antes (Ctrl+C no terminal deles).

```powershell
npm test
```

Esperado: `teste:pix` com 5 testes aprovados e `teste:regras` com 30 testes aprovados. O `teste:regras` sobe o emulador do Firestore sozinho, roda e desliga. **Ele apaga os dados do emulador** (`clearFirestore`); não rode `node --test testes/regras.test.mjs` direto contra emuladores com dados que você quer manter.

Se aparecer erro de Java: confira `java -version` (precisa ser 21+).

### 1.6 Rodar o site localmente

```powershell
npm run emuladores
```

- Site: http://127.0.0.1:5000
- Área do casal: http://127.0.0.1:5000/casal.html
- Painel dos emuladores: http://127.0.0.1:4000

No emulador, "Entrar com Google" abre uma tela falsa: "Add new account" e o e-mail `heitortomazeli@gmail.com` (sem senha). Os dados começam vazios a cada execução; para guardá-los use `npm run emuladores:salvar` (grava em `.emulador-dados/`).

### 1.7 Memória do Claude Code (opcional)

A memória do Claude Code fica no perfil do Windows, fora do OneDrive, e não vem junto. O conteúdo relevante dela já está neste documento (seções 1.2, 5 e 7). Se quiser recriá-la, peça ao Claude na máquina nova: "lembre que o projeto Firebase é lista-heitor-ana (conta htkarater10@gmail.com), o login do casal é Google com heitortomazeli@gmail.com, e o terminal do VS Code precisa recarregar o PATH antes de usar node/firebase".

As configurações globais do Claude Code na máquina original (`%USERPROFILE%\.claude\settings.json`) são só:

```json
{ "autoUpdatesChannel": "latest", "theme": "dark" }
```

O projeto não tem `.claude/`, `CLAUDE.md`, servidores MCP nem hooks próprios.

### 1.8 Checklist final

- [ ] Pasta do projeto sincronizada e marcada "Sempre manter neste dispositivo".
- [ ] `git status -sb` mostra `## main` sem erro.
- [ ] `node -v` ≥ 20, `java -version` 21, `firebase --version` 15.x.
- [ ] `npm ci` sem erros.
- [ ] `npm test`: 5 + 30 testes aprovados.
- [ ] `npm run emuladores` abre o site em http://127.0.0.1:5000 com as 3 seções e 35 itens.
- [ ] (Para publicar) `firebase login:list` mostra htkarater10@gmail.com.

---

## 2. Visão geral

Site de lista de presentes de chá de casa nova, em **uma página pública** (`index.html`) e uma **área do casal** (`casal.html`).

- **Front-end:** HTML, CSS e JavaScript puro, módulos ES, **sem framework e sem etapa de build**. O que está na pasta é o que vai para o ar.
- **Back-end:** Firebase, plano Spark (gratuito): Authentication, Cloud Firestore e Hosting. Não há Cloud Functions nem servidor próprio.
- **SDK do Firebase:** versão 12.19.0, importado direto da CDN `https://www.gstatic.com/firebasejs/12.19.0/...`.
- **Fontes:** Google Fonts (Cormorant Garamond, Great Vibes, Lato).
- **QR Code Pix:** gerado no navegador (`js/pix.js` + `js/vendor/qrcode.mjs`), sem serviço externo.
- **Publicado em:** https://lista-heitor-ana.web.app (primeira publicação em 23/10/2026).

Funcionalidades:
- Lista de 35 itens em 3 seções, com foto, nota e botões para as lojas.
- Visitante marca "Já comprei este presente" (nome obrigatório, mensagem opcional): o item fica "Já presenteado" para todos, em tempo real.
- "Presentear via Pix": QR Code e "copia e cola" com o valor do item; ao confirmar "Enviei o Pix", o item é marcado.
- "Pixinho solidário": Pix sem valor fixo.
- Mural de mensagens (só o casal lê).
- Quem marcou pode desfazer no mesmo aparelho; o casal desmarca qualquer item.
- Área do casal: abas Presentes, Mensagens e Pix informados.

---

## 3. Estrutura de arquivos

```
lista-presentes/lista-presentes/
├── index.html               página pública
├── casal.html               área do casal (noindex)
├── css/
│   ├── estilo.css           identidade visual (variáveis de cor e fonte no :root)
│   └── casal.css            estilos só da área do casal
├── js/
│   ├── app.js               página pública: login anônimo, lista, marcar/desfazer, Pix, Pixinho, mural
│   ├── casal.js             área do casal: login Google, painel em tempo real, desmarcar, apagar mensagem
│   ├── catalogo.js          lê dados/itens.json; regra de preço do Pix; helper el() para criar elementos
│   ├── pix.js               BR Code Pix (EMV + CRC16); chave, recebedor e cidade
│   ├── firebase.js          inicializa Firebase; em localhost liga os emuladores
│   ├── firebase-config.js   configuração do app web (projeto lista-heitor-ana)
│   └── vendor/qrcode.mjs    qrcode-generator (MIT), cópia local
├── dados/itens.json         catálogo: seções, itens, links e preços (única fonte)
├── assets/
│   ├── banner.webp / .png   banner do topo (o .png é o original, não publicado)
│   └── produtos/*.webp/.png fotos dos itens (600 px em WebP; .png originais)
├── firestore.rules          regras de segurança (privacidade garantida no servidor)
├── firestore.indexes.json   vazio (nenhum índice composto necessário)
├── firebase.json            Hosting, regras, emuladores, arquivos ignorados no deploy
├── .firebaserc              projeto padrão: lista-heitor-ana
├── package.json / -lock     scripts e dependências de desenvolvimento
├── scripts/converter-webp.mjs  PNG → WebP com sharp
├── testes/pix.test.mjs      5 testes do BR Code
├── testes/regras.test.mjs   30 testes das regras do Firestore
├── referencia/modelo.pdf    PDF original da lista (referência visual e de conteúdo; fora do Git)
├── README.md, ESPECIFICACAO.md, DOCUMENTACAO-TECNICA.md
├── .gitignore               node_modules, .firebase, referencia, logs, dados do emulador
├── .git/                    repositório Git (branch main, remoto origin no GitHub)
├── .firebase/               cache do deploy do Hosting (gerado; pode apagar)
└── firestore-debug.log      log do emulador (gerado; ignorado)
```

Arquivos gerados que podem ser apagados sem perda: `node_modules/`, `.firebase/`, `*-debug.log`, `.emulador-dados/` (este último guarda os dados salvos do emulador; apague só se não precisar deles).

---

## 4. Arquitetura do front-end

### 4.1 Inicialização (`js/firebase.js`)

`iniciarFirebase(nomeInstancia)` cria uma instância nomeada do app Firebase e devolve `{ app, auth, db }`.

- **Emulador ou nuvem:** se a página roda em `localhost`/`127.0.0.1` (ou se o `projectId` começa com `demo-`), troca o projeto para `demo-cha-casa-nova` e conecta Auth (`:9099`) e Firestore (`:8080`) do emulador. Assim, desenvolvimento local **nunca** toca nos dados reais.
- **Instâncias separadas:** `index.html` usa a instância `'visitante'` e `casal.html` usa outra. O login Google do casal não substitui o login anônimo do visitante no mesmo navegador, e o "Desfazer" continua funcionando (decisão D22).

### 4.2 Página pública (`js/app.js`)

1. Login **anônimo invisível** (`signInAnonymously`). O `uid` fica salvo no navegador e identifica quem marcou.
2. Carrega `dados/itens.json` (`carregarCatalogo`) e monta os cards.
3. Escuta a coleção `status` em tempo real (`onSnapshot`) e atualiza os cards ("Já presenteado", botão "Desfazer" para o próprio marcador).
4. **Marcar** (`marcar`): um `writeBatch` grava `status/{itemId}` + `compras/{itemId}` e, se houver mensagem, um documento em `mensagens` com `itemId`.
5. **Desfazer** (`desfazer`): um `writeBatch` apaga `status` e `compras` do item. A mensagem continua (D21).
6. **Pixinho** e **mural**: `addDoc` em `pixinhos` e `mensagens`.
7. QR Code desenhado em SVG (`svgDoQr`), com botões "Copiar" (chave) e "Copiar código Pix (copia e cola)".

Todo texto vindo de dados entra como `textContent` pelo helper `el()` (sem `innerHTML`), para evitar injeção de HTML.

### 4.3 Área do casal (`js/casal.js`)

- Botão "Entrar com Google" (`signInWithPopup`, `prompt: 'select_account'`). Se o navegador bloquear o pop-up, aparece uma mensagem pedindo para liberar.
- O e-mail do casal **não está no JavaScript**: quem decide são as regras. Depois do login, a página escuta as coleções; se o Firestore responde `permission-denied`, mostra "A conta ... não tem acesso" e o botão Sair. Se `compras` responde, as regras reconheceram o casal e o painel aparece.
- Conta do casal: escuta `compras`, `status`, `mensagens` e `pixinhos` (as duas últimas ordenadas por `criadoEm` desc) e renderiza as três abas.
- Ações: desmarcar um item (apaga `status` + `compras` em lote) e apagar mensagem.

### 4.4 Pix (`js/pix.js`)

- Dados fixos: chave `htkarater10@gmail.com`, recebedor `Heitor Tomazeli`, cidade `Vitória` (gravada `Vitoria`: o BR Code aceita só ASCII).
- `montarBrCode()` monta o payload EMV (campos 00, 26, 52, 53, 54 opcional, 58, 59, 60, 62, 63) e o CRC16-CCITT-FALSE (`crc16`).
- Pix de item leva o valor (campo 54); Pixinho vai sem valor.
- Validado contra o exemplo do Manual do BR Code do Banco Central (CRC `1D3D`).

Para trocar a chave Pix: altere `PIX` em `js/pix.js`, rode `npm run teste:pix` e publique.

### 4.5 Identidade visual (`css/estilo.css`)

Variáveis no `:root`: fundo `#F2EDE4`, cartão `#FFFFFF`, borda `#E6DECF`, verde `#6E8362` (escuro `#4E6343`, claro `#9BAE8E`), texto `#4A4A40`, nomes `#333F2A`, nota `#9A9A8A`, erro `#A04A3A`. Fontes: Cormorant Garamond (serifada), Great Vibes (manuscrita), Lato (sem serifa). Grade de 3/2/1 colunas (desktop/tablet/celular); botões com altura mínima de 44 px no celular.

---

## 5. Dados

### 5.1 Catálogo (`dados/itens.json`)

Única fonte de itens, links e preços; o código não tem nenhum preço. Servido com `Cache-Control: no-cache`, então mudanças aparecem na hora após publicar.

Estrutura:

```jsonc
{
  "observacao": "...",
  "precosLevantadosEm": "2026-10-23",
  "regraPix": "...",
  "secoes": [                       // a ordem aqui é a ordem no site
    {
      "id": "casa-moveis", "titulo": "Casa & Móveis", "subtitulo": "Para montar o nosso cantinho",
      "itens": [
        {
          "id": "box-bau",            // ^[a-z0-9-]{1,60}$ (exigido pelas regras); é o id no Firestore
          "nome": "Box baú para cama",
          "nota": "...",              // opcional, texto pequeno no card
          "variacao": "Bege",         // opcional: "Na loja, escolha a opção ..."
          "fotos": ["assets/produtos/box-bau.webp"],
          "botoes": [{ "rotulo": "Opção 1", "url": "https://..." }],   // url null = botão inativo
          "precos": [{ "valor": 999.90, "precoPix": 949.90 }],         // um por botão, mesma ordem; null = sem preço
          "adicionadoEm": "2026-10-23",   // opcional, informativo
          "alteradoDoPdf": "..."          // opcional, informativo
        }
      ]
    }
  ]
}
```

Hoje: Casa & Móveis 13, Cozinha & Mesa 13, Eletroportáteis 9 (35 itens, 37 links).

Regras:
- Valor do Pix do item = `precoPix` se existir, senão `valor` (`valorPix` em `catalogo.js`). Item sem nenhum preço não mostra "Presentear via Pix".
- Em item com dois botões, a pessoa escolhe a opção; `compras.opcao` grava o índice (0 ou 1).
- **Nunca mude o `id` de um item já marcado**: o status no Firestore é ligado ao id, e o item perderia a marcação.
- Ao atualizar preços, atualize também `precosLevantadosEm`.

Foto nova: coloque o `.png` em `assets/produtos/`, rode `npm run webp` (gera `.webp` de até 600 px; banner até 1600 px) e aponte o item para o `.webp`.

### 5.2 Firestore

Banco `(default)`, modo produção, região `southamerica-east1`.

| Coleção | Campos | Quem lê | Quem escreve |
|---|---|---|---|
| `status/{itemId}` | `presenteado: true`, `uidMarcador`, `criadoEm` | todos | cria: qualquer logado, só se não existe; apaga: o marcador ou o casal |
| `compras/{itemId}` | `nome`, `opcao` (0, 1 ou `null`), `forma` (`loja`/`pix`), `mensagem`, `uidMarcador`, `criadoEm` | só o casal | junto com `status` (mesmo lote) |
| `mensagens/{id}` | `nome`, `texto`, `itemId` (ou `null` no mural), `criadoEm` | só o casal | cria: qualquer logado; apaga: o casal |
| `pixinhos/{id}` | `nome`, `mensagem`, `criadoEm` (sem valor) | só o casal | cria: qualquer logado; apaga: o casal |

- `criadoEm` precisa ser `serverTimestamp()`; ninguém faz `update` em nada.
- Limites: nome 1 a 80 caracteres, mensagem até 1000.

### 5.3 Regras de segurança (`firestore.rules`)

- `ehCasal()`: `email` igual a `'heitortomazeli@gmail.com'` ou `'heitor.tomazeli@gmail.com'` (o Gmail ignora pontos; o Google entrega a forma sem ponto), `email_verified == true` **e** `sign_in_provider == 'google.com'`.
- `status` e `compras` se exigem mutuamente via `existsAfter`/`getAfter`: só é possível criar os dois juntos e apagar os dois juntos.
- Um item já presenteado não pode ser marcado de novo (sobrescrever seria `update`, proibido).
- Qualquer outro caminho: negado.

Para trocar o e-mail do casal: altere `ehCasal()` em `firestore.rules`, `EMAIL_CASAL` em `testes/regras.test.mjs` e os textos que citam o e-mail (comentário de `js/casal.js`, `README.md`, esta documentação); rode `npm test` e publique regras e hosting.

---

## 6. Testes

| Comando | O que faz |
|---|---|
| `npm test` | `teste:pix` e depois `teste:regras` |
| `npm run teste:pix` | 5 testes (`node --test`): CRC16, exemplo do Banco Central, Pix com valor, Pixinho sem valor, QR lido de volta com jsQR |
| `npm run teste:regras` | `firebase emulators:exec --only firestore` + 30 testes: privacidade (visitante e não logado não leem compras, mensagens, pixinhos), marcar/desfazer, casal lê e apaga tudo, item não pode ser remarcado, validação de campos, conta com e-mail do casal sem verificação ou sem Google não lê |

Todos rodam no projeto `demo-cha-casa-nova`, só no emulador.

---

## 7. Firebase na nuvem

| Item | Valor |
|---|---|
| Projeto | `lista-heitor-ana` (nome "Cha de casa nova Heitor e Ana", número 25715720798) |
| Conta dona | htkarater10@gmail.com |
| Site | https://lista-heitor-ana.web.app |
| Firestore | `(default)`, modo produção, `southamerica-east1` |
| Authentication | provedores **Google** (casal) e **Anônimo** (visitantes) ativados |
| Login do casal | heitortomazeli@gmail.com, pelo Google (D26) |
| Plano | Spark (gratuito) |
| Projeto local | `demo-cha-casa-nova` (só existe no emulador) |

A configuração do app web em `js/firebase-config.js` (`apiKey`, `appId` etc.) **não é segredo**; quem protege os dados são as regras. Não há arquivo de segredo, `.env` ou chave de serviço no projeto. O único acesso privilegiado é o login do Firebase CLI (`firebase login`), que fica no perfil do usuário e precisa ser feito em cada máquina.

Mudanças no console do Firebase (provedores de login, domínios autorizados) são feitas pelo usuário no navegador: https://console.firebase.google.com/project/lista-heitor-ana. Se um dia usar domínio próprio, adicione-o em Authentication → Settings → Authorized domains, senão o login Google falha.

### 7.1 Publicar

```powershell
npm test
firebase deploy --only firestore:rules,hosting
git add -A; git commit -m "descrição da mudança"; git push   # guarda a mesma versão no GitHub
```

- Publicar o site e enviar ao GitHub são passos separados: o `firebase deploy` publica a pasta local, com ou sem commit.
- O Hosting publica a pasta do projeto (`"public": "."`) **menos** o que está em `ignore` no `firebase.json`: configs, `package*.json`, documentos `.md`, arquivos ocultos, `node_modules`, `referencia/`, `scripts/`, `testes/`, PNGs de `assets/` e logs. **Arquivo novo que não deve ir ao ar precisa entrar nessa lista.**
- O emulador do Hosting serve todos os arquivos, inclusive os ignorados; confira o que foi publicado no site real.
- Cabeçalhos: `dados/itens.json` com `no-cache`; `assets/**/*.webp` com cache de 7 dias (foto trocada com o mesmo nome pode demorar a atualizar no celular de quem já visitou; prefira um nome novo).
- Para voltar uma versão do Hosting: console do Firebase → Hosting → histórico de versões → "Reverter".

Limites do plano Spark relevantes: Hosting 10 GB armazenados e 360 MB/dia de transferência (as fotos somam cerca de 0,54 MB em WebP); Firestore 50 mil leituras e 20 mil gravações por dia.

---

## 8. Tarefas comuns

| Tarefa | Onde mexer | Depois |
|---|---|---|
| Atualizar preço ou link | `dados/itens.json` (e `precosLevantadosEm`) | publicar hosting |
| Adicionar item | `dados/itens.json` + foto `.png` → `npm run webp` | publicar hosting |
| Remover item | tirar do `itens.json` (a foto pode ficar) | publicar hosting; se estava marcado, o casal pode desmarcar antes |
| Mudar ordem das seções | ordem do array `secoes` | publicar hosting |
| Mudar textos fixos | `index.html` | publicar hosting |
| Mudar cores/fontes | variáveis no topo de `css/estilo.css` | publicar hosting |
| Trocar chave Pix | `PIX` em `js/pix.js` | `npm run teste:pix`, publicar hosting |
| Trocar conta do casal | ver 5.3 | `npm test`, publicar regras e hosting |
| Mudar regras | `firestore.rules` + testes | `npm test`, `firebase deploy --only firestore:rules` |

Atualizar o SDK do Firebase: troque `12.19.0` nas URLs de `js/firebase.js`, `js/app.js` e `js/casal.js` (todas iguais) e a versão de `firebase` no `package.json`; rode `npm test` e teste no emulador.

---

## 9. Problemas conhecidos e soluções

| Sintoma | Causa | Solução |
|---|---|---|
| `node`/`npm`/`firebase` não encontrado no terminal do VS Code | PATH da sessão desatualizado | recarregar o PATH (seção 1.2) ou reabrir o VS Code |
| `Port 8080 is not open ... port taken` no `npm test` | emuladores já rodando | parar os emuladores; ou ver quem usa a porta com `netstat -ano \| findstr :8080` |
| Emulador do Firestore não sobe | Java ausente ou < 21 | instalar Temurin 21 |
| `sharp` falha ao carregar | `node_modules` copiado de outra máquina pelo OneDrive | apagar `node_modules` e rodar `npm ci` |
| Erros estranhos de arquivo/permissão no `npm` | arquivos do OneDrive só na nuvem | "Sempre manter neste dispositivo" na pasta |
| Arquivos "-NOMEDAMAQUINA" ou erro de objeto corrompido no Git | as duas máquinas mexeram no `.git` antes de o OneDrive sincronizar | parar, não apagar nada e comparar com a outra máquina (seção 1.1.1) |
| Login Google bloqueado | pop-up bloqueado pelo navegador | liberar pop-ups para o site |
| Casal entra mas vê "não autorizado" | conta Google errada | sair e entrar com heitortomazeli@gmail.com |
| `firebase deploy` pede login ou dá 403 | CLI sem login ou com outra conta | `firebase login` / `firebase login:list` com htkarater10@gmail.com |
| `gh` não encontrado logo após instalar | PATH da sessão desatualizado | recarregar o PATH (seção 1.2) ou usar `& "C:\Program Files\GitHub CLI\gh.exe"` |
| `git push` pede login ou dá 403 | GitHub CLI sem login nesta máquina | usuário roda `gh auth login`; conferir com `gh auth status` (conta HeitorTz) |
| Saída do `git push` aparece em vermelho no PowerShell | o Git escreve o progresso no stderr | não é erro; conferir com `git status -sb` (sem "ahead") |

Pendência aberta na especificação: P3 (endereço de entrega).
