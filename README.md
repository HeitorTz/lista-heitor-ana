# Chá de casa nova Heitor e Ana

Site de lista de presentes em uma página: HTML, CSS e JavaScript puro, sem framework e sem etapa de build. O backend é o Firebase (plano Spark, gratuito): Auth, Firestore e Hosting.

Por enquanto tudo roda **só no Firebase Emulator Suite**. Nenhum projeto na nuvem foi criado.

Documentação completa (arquitetura, dados, publicação e o roteiro para configurar uma máquina nova): `DOCUMENTACAO-TECNICA.md`.

## Requisitos

- Node.js 20 ou mais novo (testado com 24.22.1)
- Java 21 (testado com Temurin 21), exigido pelo emulador do Firestore
- Firebase CLI: `npm install -g firebase-tools` (testado com 15.34.1)

## Rodar localmente

```bash
npm install            # dependências de desenvolvimento (testes, conversão de fotos)
npm run emuladores     # Auth :9099, Firestore :8080, Hosting :5000, painel :4000
```

- Site: http://127.0.0.1:5000
- Área do casal: http://127.0.0.1:5000/casal.html (link "Área do casal" no rodapé)
- Painel dos emuladores (dados, usuários): http://127.0.0.1:4000

Os emuladores começam vazios toda vez. Para guardar os dados entre execuções, use `npm run emuladores:salvar` (grava em `.emulador-dados/`).

### Login do casal

A área do casal entra **pelo Google**, e as regras do Firestore liberam a leitura só para `heitor.tomazeli@gmail.com` com login Google. No emulador, "Entrar com Google" abre uma tela falsa do emulador: toque em "Add new account" e digite esse e-mail (nenhuma senha é pedida).

## Testes

```bash
npm test
```

- `testes/pix.test.mjs` (5 testes): CRC16 contra o valor de checagem do padrão; o exemplo do Manual do BR Code do Banco Central, reproduzido byte a byte (CRC `1D3D`); Pix com valor; Pixinho sem valor; o QR gerado é lido de volta (jsQR) e dá o mesmo código.
- `testes/regras.test.mjs` (30 testes): sobe o emulador do Firestore sozinho e cobre:
  - visitante (logado ou não) não lê compras, mensagens nem pixinhos, nem a própria compra;
  - visitante só apaga a marcação que ele mesmo fez;
  - o casal lê tudo e apaga qualquer marcação;
  - um item presenteado não pode ser marcado de novo, nem pelo próprio marcador, nem pelo casal;
  - nome obrigatório, campos extras recusados, data do servidor obrigatória;
  - uma conta com o e-mail do casal mas **não verificado**, ou que não entrou pelo Google, não lê nada.

## Estrutura

```
index.html            página pública
casal.html            área do casal
css/                  estilo.css (identidade visual do PDF), casal.css
js/app.js             lista, marcar/desmarcar, Pix do item, Pixinho, mural
js/casal.js           login e painel do casal
js/catalogo.js        leitura do itens.json e regra de preço do Pix
js/pix.js             BR Code Pix (EMV + CRC16), chave/recebedor/cidade
js/firebase.js        inicialização; em localhost fala só com os emuladores
js/firebase-config.js configuração do app web (projeto lista-heitor-ana)
js/vendor/qrcode.mjs  gerador de QR Code (qrcode-generator, MIT), local, sem CDN
dados/itens.json      itens, links e preços: a única fonte desses dados
assets/               fotos .webp (publicadas) e .png originais (não publicados)
firestore.rules       privacidade garantida no servidor
scripts/              converter-webp.mjs
testes/               testes do Pix e das regras
```

## Como os dados funcionam

| Coleção | Conteúdo | Quem lê |
|---|---|---|
| `status/{itemId}` | `presenteado`, `uidMarcador`, `criadoEm` | todos |
| `compras/{itemId}` | `nome`, `opcao`, `forma` (`loja`/`pix`), `mensagem`, `uidMarcador`, `criadoEm` | só o casal |
| `mensagens/{id}` | `nome`, `texto`, `itemId` (ou `null` no mural), `criadoEm` | só o casal |
| `pixinhos/{id}` | `nome`, `mensagem`, `criadoEm` (sem valor: o casal confere no extrato) | só o casal |

- Marcar grava `status` e `compras` juntos (gravação em lote), e as regras exigem que os dois existam. Desmarcar apaga os dois. A mensagem enviada junto também vai para `mensagens` e fica lá mesmo se a marcação for desfeita.
- Cada visitante recebe um **login anônimo invisível**, salvo no navegador. É por ele que quem marcou consegue desmarcar no mesmo aparelho. A área do casal usa outra instância do Firebase, então o casal entrar no mesmo celular não apaga esse login anônimo.

## Atualizar preços, links e itens

Tudo fica em `dados/itens.json`. O código não tem nenhum preço.

- `precos` tem uma entrada por botão, na mesma ordem de `botoes`: `{ "valor": 123.45, "precoPix": 110.00 }`.
- Regra do Pix do item: usa `precoPix` quando existe; senão, `valor`.
- Atualize `precosLevantadosEm` junto.
- Botão com `url: null` aparece inativo; ao preencher a URL, vira link ativo sozinho.
- **Toalhas:** link e preço (R$ 218,35) já estão no `itens.json`; o botão "Presentear via Pix" aparece nesse item.
- A ordem das seções no site é a ordem em `secoes` (hoje Eletroportáteis por último).
- Fotos novas: coloque o `.png` em `assets/produtos/`, rode `npm run webp` e aponte o `itens.json` para o `.webp`.

## Publicação

Projeto Firebase: **`lista-heitor-ana`** (conta `htkarater10@gmail.com`). Site: https://lista-heitor-ana.web.app

Já feito:
1. Projeto criado, app web registrado e configuração em `js/firebase-config.js`; `.firebaserc` aponta para ele. Os scripts `emuladores` e `teste:regras` continuam com o projeto `demo-…`, de propósito, e `js/firebase.js` usa esse id quando roda em localhost.
2. Firestore criado (modo produção, `southamerica-east1`).
3. Authentication: logins **Google** (casal) e **Anônimo** (visitantes) ativados.
4. Primeira publicação em 23/10/2026.

Para publicar de novo depois de mudar algo: `npm test` e `firebase deploy --only firestore:rules,hosting`.

Observações:
- O emulador do Hosting serve todos os arquivos da pasta. No `firebase deploy`, a lista `ignore` do `firebase.json` deixa de fora os PNG originais, testes, scripts, `node_modules`, a especificação e o PDF.
- A configuração do app web (`apiKey` etc.) não é segredo. Quem protege os dados são as regras do Firestore.
- Ainda pendente na especificação: o endereço de entrega (P3).
