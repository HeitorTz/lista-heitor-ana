# Site de Lista de Presentes — Chá de casa nova Heitor e Ana

Especificação para desenvolvimento no Claude Code.
Versão 9 — 23/10/2026. Atualizada após a implementação local (mudanças nas seções 10 e 11).

**Título do site** (aba do navegador e cabeçalho/metadados): **Chá de casa nova Heitor e Ana**.

Pacote do projeto (o detalhe de cada arquivo está no `README.md`):

```
lista-presentes/
├── ESPECIFICACAO.md         ← este documento
├── README.md                ← como rodar, testar, atualizar e publicar
├── index.html, casal.html   ← página pública e área do casal
├── css/, js/                ← estilo e código (sem framework, sem build)
├── dados/itens.json         ← os 35 itens, com nomes, notas, botões, links e preços
├── assets/banner.webp       ← banner do topo (original banner.png, 1920×639, extraído do PDF)
├── assets/produtos/*.webp   ← fotos dos produtos (originais .png, extraídos do PDF)
├── firestore.rules          ← privacidade garantida no servidor
├── testes/, scripts/        ← testes (Pix e regras) e utilitários
└── referencia/modelo.pdf    ← PDF original (referência visual)
```

---

## 1. Visão geral

Site de **uma única página** com a lista de presentes do chá de Ana e Heitor. A área do casal fica numa página separada (`casal.html`).

- **Base:** o PDF modelo é a referência visual, e o **conteúdo do PDF é seguido à risca** (textos, itens, links), com as alterações registradas na seção 8.1.
- **Desenvolvimento:** feito e testado localmente no Firebase Emulator Suite; a publicação vem depois (P4).
- **Custo:** 100% gratuito, com Firebase (seção 6).

---

## 2. Conteúdo da página (transcrito do PDF)

A página segue a ordem do PDF, de cima para baixo, **exceto a ordem das seções da lista** (D18).

### 2.1 Banner
Imagem `assets/banner.webp` (contém o título "Chá de panela online", o subtítulo e a foto do casal).

### 2.2 Texto de boas-vindas (itálico, centralizado)
> Queridos familiares e amigos, vocês são pessoas muito importantes para nós e fazem parte da nossa história.
>
> Depois de muito sonhar, chegou a hora de construirmos o nosso cantinho juntos! Como não faremos uma cerimônia ou festa de casamento, escolhemos celebrar esse momento de uma forma simples, mas com o mesmo carinho.
>
> Se você quiser fazer parte desse novo começo, ficaremos muito felizes com seu gesto de carinho por meio do nosso chá de panela online.

Separador: linha — coração — linha.

### 2.3 Card "Como participar?"
1. Escolha na lista o item com o qual mais deseja nos presentear.
2. Toque no botão do presente para abrir a loja e comprá-lo direto pelo site, enviando para nós.
3. Se preferir, envie o valor correspondente ao presente escolhido.

### 2.4 Agradecimento
> Mais do que qualquer presente, somos muito gratos por todo o apoio, carinho e por torcerem pela nossa felicidade e por essa nova fase das nossas vidas. Que Deus abençoe cada um de vocês! ♥

Assinatura: "Com carinho," + **Ana & Heitor** (fonte manuscrita).

### 2.5 Seções da lista
Ordem no site (D18: Eletroportáteis por último, diferente do PDF):

| Seção | Subtítulo | Itens |
|---|---|---|
| Casa & Móveis | Para montar o nosso cantinho | 13 |
| Cozinha & Mesa | Para as receitas e os encontros | 13 |
| Eletroportáteis | Praticidade para o dia a dia | 9 |

Total: **35 itens, 36 links**. Lista completa em `dados/itens.json`. A ordem das seções no site é a ordem do `itens.json`.

Itens com particularidades:

| Item | Particularidade |
|---|---|
| Box baú para cama | **Alterado:** agora tem só uma opção (a antiga Opção 1, Shopee), botão "Ver na Shopee" |
| Filtro de água | **Alterado:** agora tem só uma opção (a antiga Opção 2), botão "Ver na Amazon" |
| Aparelho de jantar 30 peças | **Alterado:** agora tem só uma opção (Porto Brasil linha Roma, novo link), foto da antiga Opção 2, botão "Ver no Mercado Livre" |
| Conjunto de sobremesa | Duas opções, "precisamos de apenas um" |
| Toalhas de banho e rosto | "Modelo à sua escolha", duas fotos. **Alterado:** deixou de ser escolha livre; agora é o jogo Buddemeyer 4 peças no Mercado Livre, botão "Ver no Mercado Livre" (verde cheio, como os demais), R$ 218,35 |
| Kit 100 cabides de veludo | **R$ 132,99 no Pix** (R$ 139,98 em outros meios) |
| Mixer 5 em 1 | Link substituído pelo link do produto (P6) |
| Conjunto de formas | O card avisa: "Na loja, escolha a opção **Kit 12 Formas**" (D17) |
| Cabeceira de cama | Cor pré-definida: o card avisa "Na loja, escolha a opção **Bege**" (D27) |
| Guarda-roupa 4 portas | Cor pré-definida: o card avisa "Na loja, escolha a opção **Branco Riviera**" |

**Regra para itens com duas opções:** o Conjunto de sobremesa é **um único presente**. Marcar qualquer opção marca o item inteiro.

### 2.6 Itens novos (não estão no PDF)
Depois das três seções, nesta ordem:
- **Pixinho solidário:** card de Pix sem valor fixo (ver 3.3).
- **Mural de mensagens:** título "Deixe sua mensagem" (ver 3.4).
- **Rodapé:** "Ana & Heitor" e o link discreto "Área do casal".
- **Endereço de entrega** (adiado, P3).

---

## 3. Funcionalidades

### 3.1 Card de presente
- Foto (uma ou duas), nome, nota (quando houver) e botão(ões) com o link da loja.
- O preço **não aparece no card** (como no PDF); aparece só no fluxo de Pix.
- Botão "Já comprei este presente".
- Botão "Presentear via Pix" (ver 3.3), só quando o item tem preço no `itens.json`.
- Botão de loja com `url: null` no `itens.json` aparece inativo, sem quebrar a página.

### 3.2 Marcar como presenteado
- Qualquer visitante pode marcar. **Nome obrigatório.**
- Ao marcar, pode deixar uma mensagem junto (**opcional**).
- Pergunta qual opção foi comprada, quando o item tiver duas.
- O item marcado **continua visível** com o selo **"Já presenteado"** e os botões desativados, para todos e em tempo real.
- O nome de quem comprou **não aparece para visitantes**; só o casal vê.
- **Desfazer:** quem marcou pode desmarcar, **apenas no mesmo aparelho/navegador** usado na marcação (botão "Desfazer"). O casal pode desmarcar qualquer item pela área do casal.
- Ao desfazer, a compra é apagada e o item volta a ficar disponível; a mensagem enviada junto **continua** com o casal (D21).

### 3.3 Pix
- Chave Pix: **htkarater10@gmail.com** (e-mail).
- QR Code Pix estático (BR Code, padrão EMV com CRC16), gerado no próprio navegador, sem serviço externo. Recebedor **Heitor Tomazeli**, cidade **Vitória** (gravada como "Vitoria", sem acento, porque o BR Code aceita só ASCII).
- Junto do QR: a chave com botão **"Copiar"** e o botão **"Copiar código Pix (copia e cola)"**, porque no celular a pessoa não consegue escanear o QR da própria tela (D24).
- **Pix de um item** ("Presentear via Pix"): o valor exibido e gravado no QR é **o valor do item** (`precoPix` quando existe, senão `valor`; em item com duas opções, o da opção escolhida). A pessoa informa o nome (obrigatório) e a mensagem (opcional) e confirma "Enviei o Pix". **O item é marcado como "Já presenteado" na hora.**
- **Pixinho solidário:** card próprio, QR **sem valor** (quem paga digita no banco). A pessoa informa o nome (obrigatório) e a mensagem (opcional) e confirma "Enviei o Pix". **Não se informa nem se registra valor** (D19); o casal confere no extrato.

### 3.4 Mensagens
- Campos: **nome** e **texto**.
- Dois lugares: junto da marcação de um presente **e** num mural separado ("Deixe sua mensagem"), aberto a qualquer pessoa.
- **Privadas:** só o casal lê. O mural avisa: "Só Ana e Heitor vão ler."

### 3.5 Área do casal
- Página `casal.html`, acessada pelo link discreto "Área do casal" no rodapé. Não é indexada por buscadores.
- **Login único** pelo Google: conta **heitortomazeli@gmail.com** (o Gmail ignora pontos; as regras aceitam também heitor.tomazeli@gmail.com), compartilhada por Ana e Heitor (D26). As regras exigem esse e-mail, verificado, com login Google.
- Abas:
  - **Presentes:** os 35 itens com status e, quando marcados, quem comprou, data/hora, opção escolhida, forma (loja ou Pix com valor) e mensagem. Botão "Desmarcar" em cada item marcado (D8).
  - **Mensagens:** mural e mensagens deixadas junto de presentes (com o nome do item), com opção de apagar.
  - **Pix informados:** Pix de itens (com valor) e Pixinhos (sem valor).
- O login do casal não substitui o login anônimo do visitante no mesmo navegador (D22).

---

## 4. Identidade visual (extraída do PDF)

### Cores
| Uso | Cor |
|---|---|
| Fundo da página | `#F2EDE4` |
| Cards | `#FFFFFF`, borda fina bege, cantos bem arredondados |
| Verde principal (botões, números) | `#6E8362` |
| Verde escuro (títulos de seção, assinatura) | `#4E6343` |
| Texto dos nomes | `#333F2A` |
| Notas (cinza-esverdeado, itálico) | aprox. `#9A9A8A` |

### Fontes (todas gratuitas no Google Fonts)
| No PDF | Fonte | Uso |
|---|---|---|
| CG / CG-Italic / CG-Bold | Cormorant Garamond | Textos, subtítulos, nomes dos itens |
| GV | Great Vibes | Títulos de seção ("Casa & Móveis"), "Como participar?", assinatura |
| LT / LT-Bold | Lato | Botões e textos do "Como participar?" |

### Layout
- Mobile em primeiro lugar: a maioria dos familiares abre pelo celular.
- Grade de 3 colunas no desktop; 2 no tablet; 1 no celular. Quando a última linha de uma seção não fecha (ex.: 13 itens em 3 colunas), os cards dela ficam centralizados.
- Botões em pílula, verde cheio (o estilo em contorno do "Escolha livre" do PDF não é mais usado; continua disponível pelo campo `"estilo": "contorno"` no `itens.json`). No celular, os botões têm altura mínima de 44 px para o toque (maiores que no PDF).
- Os rodapés "Ana & Heitor · 2/3/4" do PDF são numeração de página e não entram no site.

---

## 5. Modelo de dados

Coleções no Firestore (ver seção 6):

| Coleção | Conteúdo | Quem lê | Quem escreve |
|---|---|---|---|
| `status/{itemId}` | `presenteado: true`, `uidMarcador`, `criadoEm` | Todos | Visitante cria (só se ainda não existe); o próprio marcador ou o casal apaga |
| `compras/{itemId}` | `nome`, `opcao` (índice da opção ou `null`), `forma` (`loja` ou `pix`), `mensagem`, `uidMarcador`, `criadoEm` | Só o casal | Visitante cria junto com o `status`; o próprio marcador ou o casal apaga |
| `mensagens/{id}` | `nome`, `texto`, `itemId` (ou `null` no mural), `criadoEm` | Só o casal | Visitante cria; o casal apaga |
| `pixinhos/{id}` | `nome`, `mensagem`, `criadoEm` (sem valor) | Só o casal | Visitante cria; o casal apaga |

- Marcar grava `status` e `compras` numa única gravação em lote; as regras exigem os dois juntos, e desmarcar apaga os dois.
- A mensagem deixada ao marcar fica em `compras.mensagem` e também em `mensagens` (com `itemId`), que sobrevive ao desfazer.
- `criadoEm` é sempre a hora do servidor. Ninguém altera documentos depois de criados.
- O catálogo de itens fica fora do banco, em `dados/itens.json`.

---

## 6. Infraestrutura (decidida): Firebase, plano Spark gratuito

Não pede cartão de crédito. Limites do plano gratuito, mais que suficientes para uma lista de família:
- Firestore: 1 GiB armazenado, 50 mil leituras, 20 mil gravações e 20 mil exclusões por dia.
- Hosting: 10 GB de armazenamento e 360 MB de transferência por dia. As fotos foram convertidas para WebP e reduzidas: de 8,3 MB em PNG para 0,54 MB. Os PNG originais ficam na pasta, mas não são publicados.
- Authentication: login Google (área do casal) e login anônimo (visitantes), incluídos.

Como a regra de privacidade funciona:
- Cada visitante recebe um login anônimo invisível, que fica no navegador. É isso que permite "quem marcou pode desmarcar" sem pedir cadastro.
- As regras de segurança do Firestore (`firestore.rules`) garantem que nomes e mensagens só sejam lidos pela conta do casal (e-mail exato **e** verificado), mesmo que alguém inspecione o código da página. Testes automatizados cobrem isso (`npm test`).

Desenvolvimento local: **Firebase Emulator Suite** (projeto `demo-cha-casa-nova`, que só existe no emulador), sem criar o projeto na nuvem até a publicação.

Stack: HTML + CSS + JavaScript puro (sem framework, sem build), SDK web do Firebase 12.19.0 por módulos ES, gerador de QR Code local (qrcode-generator, MIT).

---

## 7. Preços dos itens (levantados em 23/10/2026)

Valores no campo `precos` do `itens.json`. Em **negrito**, o valor usado no Pix do item (regra D13). Na Shopee, o preço no Pix é o exibido com cupom na página.

| Item | Preço |
|---|---|
| **Casa & Móveis** | |
| Guarda-roupa | **R$ 1.117,96** |
| Guarda-roupa 4 portas (Ditália DM-580, Shopee) | **R$ 413,91 no Pix** (R$ 459,90 em outros meios) |
| Cômoda | **R$ 269,98** |
| Box baú para cama | **R$ 608,88 no Pix** (R$ 689,00 em outros meios) |
| Cabeceira de cama | **R$ 236,70 no Pix** (R$ 262,99 em outros meios) |
| Sofá | **R$ 1.299,90** |
| Mesa com cadeiras (Espanha Yescasa, novo link) | **R$ 682,50 no Pix** (R$ 769,02 em outros meios) |
| Televisão (Samsung 50" Mini LED 4K M75H, Fast Shop) | **R$ 2.569,00 no Pix** (R$ 2.732,98 em outros meios) |
| Armário de cozinha (Completa 293 cm Rustic Emilly Madesa) | **R$ 840,44 no Pix** (R$ 940,69 em outros meios) |
| Filtro de água | **R$ 483,92** |
| Ventilador de coluna com controle | **R$ 238,99** |
| Toalhas de banho e rosto | **R$ 218,35** (Mercado Livre não mostra preço diferente no Pix) |
| **Cozinha & Mesa** | |
| Aparelho de jantar 30 peças | **R$ 403,65 no Pix** (R$ 424,90 em outros meios) |
| Faqueiro inox | **R$ 199,99** |
| Jogo de panelas | **R$ 155,71 no Pix** (R$ 163,90 em outros meios) |
| Jogo de frigideiras | **R$ 104,41 no Pix** (R$ 109,90 em outros meios) |
| Jogo de canecões | **R$ 54,33** |
| Jogo de colheres de silicone | **R$ 45,48** |
| Kit utensílios de cozinha | **R$ 123,50 no Pix** (R$ 129,99 em outros meios) |
| Jogo de facas | **R$ 112,01 no Pix** (R$ 117,90 em outros meios) |
| Conjunto de formas (Kit 12 Formas) | **R$ 195,21 no Pix** (R$ 216,90 em outros meios) |
| Conjunto de Marinex | **R$ 123,41 no Pix** (R$ 129,90 em outros meios) |
| Jogo de copos | **R$ 37,89** |
| Conjunto de sobremesa | Opção 1: **R$ 95,75**<br>Opção 2: **R$ 55,90** |
| Kit 10 potes de vidro herméticos | **R$ 69,90** |
| **Eletroportáteis** | |
| Airfryer | **R$ 560,95 no Pix** (R$ 636,90 em outros meios) |
| Sanduicheira elétrica 3 em 1 | **R$ 157,69 no Pix** (R$ 165,98 em outros meios) |
| Panela de arroz elétrica | **R$ 188,91 no Pix** (R$ 209,90 em outros meios) |
| Panela de pressão elétrica | **R$ 299,90** |
| Multiprocessador 9 em 1 | **R$ 271,13** |
| Mixer 5 em 1 | **R$ 231,42** |
| Batedeira planetária | **R$ 269,10** |
| Cafeteira elétrica | **R$ 419,90** |
| Panificadora | **R$ 471,71 no Pix** (R$ 539,90 em outros meios) |

Todos os itens têm valor de Pix. No Conjunto de formas, o card avisa que o presente é o **Kit 12 Formas**, a variação a escolher na loja.

---

## 8. Pendências

| # | Pendência | Situação |
|---|---|---|
| P1 | PDF modelo | ✅ Recebido |
| P2 | QR Code do Pix: recebedor **Heitor Tomazeli**, cidade **Vitória**, chave **htkarater10@gmail.com**. BR Code estático com o valor do item; no Pixinho solidário, sem valor | ✅ Implementado e validado com o exemplo do Manual do BR Code (Banco Central) |
| P3 | Endereço de entrega | Adiado |
| P4 | Publicação | Pendente. Firebase Hosting; roteiro no `README.md` ("O que falta para publicar") |
| P5 | Preços dos itens | ✅ Levantados (seção 7) |
| P6 | Link do Mixer 5 em 1 | ✅ Substituído pelo link enviado |
| P7 | Link das toalhas ("Escolha livre") | ✅ Recebido em 23/10/2026 e colocado no `itens.json` |
| P8 | Preço das toalhas | ✅ R$ 218,35, levantado em 23/10/2026 |

---

## 8.1 Regras e decisões

### Regras de preço
- **Pix do item usa o preço no Pix** quando a loja mostra um (campo `precoPix`); senão, usa o preço único da página (`valor`).
- **Preços fixos**, com a data do levantamento (`precosLevantadosEm` no `itens.json`). Os preços ficam só no `itens.json`, separados do código, para que um agente possa atualizá-los no futuro sem mexer no site. `null` em `precos` = preço não levantado.

### Textos do PDF
- Banner e texto de boas-vindas ficam como no PDF ("chá de panela online") por enquanto. Só o título do site muda.

### Textos novos (não estão no PDF)
"Já comprei este presente" · "Presentear via Pix" · selo "Já presenteado" · "Desfazer" · "Na loja, escolha a opção Kit 12 Formas" (e "Bege", na cabeceira) · "Pixinho solidário" · "Contribua com o valor que quiser." · "Deixe sua mensagem" · "Só Ana e Heitor vão ler." · "Enviei o Pix" · "Copiar" · "Copiar código Pix (copia e cola)" · "Área do casal".

### Decisões registradas
- D1 Firebase · D2 login único · D3 nome obrigatório · D4 quem marcou desmarca · D5 Pixinho solidário + Pix do item
- D6 itens com duas opções = um presente só · D7 desmarcar só no mesmo aparelho · D8 casal desmarca qualquer item
- D9 mensagem opcional ao marcar · D10 Pix marca na hora · D11 link das toalhas depois (recebido, P7) · D12 título "Chá de casa nova Heitor e Ana"
- D13 Pix usa preço no Pix · D14 preço fixo do dia (agente de atualização no futuro) · D15 banner e textos do PDF por enquanto
- D16 aparelho de jantar com opção única · D17 formas: Kit 12 Formas (na loja, a pessoa precisa escolher essa variação)
- D18 **Eletroportáteis por último** (ordem: Casa & Móveis, Cozinha & Mesa, Eletroportáteis)
- D19 **Pixinho sem valor**: não pede nem registra valor; o casal confere no extrato
- D20 **Chave Pix htkarater10@gmail.com; login do casal htkarater10@hotmail.com**, com e-mail verificado
- D21 desfazer apaga a compra e mantém a mensagem
- D22 área do casal em `casal.html`, com login separado do login anônimo do visitante
- D23 preço não aparece no card, só no fluxo de Pix
- D24 botão "copia e cola" do Pix, além do QR e da chave
- D25 fotos em WebP (originais PNG mantidos); `itens.json` aponta para os `.webp`
- D26 **login do casal pelo Google com heitortomazeli@gmail.com** (substitui o login htkarater10@hotmail.com com senha da D20); projeto Firebase `lista-heitor-ana`
- D27 cabeceira de cama na cor **Bege** (campo `variacao` do `itens.json`, mesmo aviso do Kit 12 Formas)

---

## 9. Critérios de aceite

Conferidos em 23/10/2026 no Firebase Emulator Suite, com testes automatizados (34 testes de Pix e regras, 50 verificações no navegador em celular, tablet e desktop).

- [x] Título da página: "Chá de casa nova Heitor e Ana".
- [x] Página única com banner, textos, "Como participar?", agradecimento e assinatura idênticos ao PDF.
- [x] As 3 seções com os 35 itens, fotos e os 36 links do `itens.json` (reconferido após as mudanças da seção 11, incluindo o Pix das toalhas com R$ 218,35).
- [x] Cores e fontes da seção 4; layout funcional no celular.
- [x] Marcar presente exige nome; o item passa a "Já presenteado" para todos.
- [x] Quem marcou consegue desmarcar no mesmo aparelho; o casal desmarca qualquer item.
- [x] Nomes de compradores e mensagens visíveis só na área do casal, garantido por regras do Firestore.
- [x] Mural de mensagens com nome e texto.
- [x] Card Pixinho solidário sem valor fixo; Pix de item com o valor do item, marcando o item na hora.
- [x] Chave Pix com botão "Copiar".
- [x] Área do casal com login único.
- [x] Roda localmente com o Firebase Emulator Suite, sem custo.

---

## 10. Mudanças em relação à versão 7

- Chave Pix trocada para **htkarater10@gmail.com** (o login do casal continua htkarater10@hotmail.com).
- Eletroportáteis passou para a última seção.
- Pixinho solidário não pede nem registra valor; nova coleção `pixinhos`.
- `compras` ganhou `uidMarcador`; mensagens deixadas ao marcar também vão para `mensagens`.
- Link das toalhas recebido (P7) e preço preenchido (P8: R$ 218,35). Total de links: 36.
- Fotos convertidas para WebP; caminhos no `itens.json` atualizados.
- Registradas as decisões D18 a D25 e os textos novos.
- Depois: login do casal passou a ser pelo Google, com heitortomazeli@gmail.com (D26; o Google entrega a conta sem ponto, e as regras aceitam as duas formas).

---

## 11. Mudanças de 23/10/2026 (após a versão 8)

Itens adicionados (não estão no PDF; preços levantados em 23/10/2026):
- **Guarda-roupa 4 portas** (Ditália DM-580, Shopee), em Casa & Móveis, logo após o Guarda-roupa.
- **Kit 100 cabides de veludo** (Shopee), no fim de Casa & Móveis.
- **Kit 10 potes de vidro herméticos** (Shopee), no fim de Cozinha & Mesa.

Itens trocados (link, preço e foto):
- **Televisão:** agora Smart TV Samsung 50" Mini LED 4K M75H 2027, na Fast Shop (botão "Ver na Fast Shop").
- **Armário de cozinha:** agora Armário de Cozinha Completa 293 cm Rustic Emilly Madesa (antes Compacta 229 cm).
- **Mesa com cadeiras:** novo link do mesmo conjunto Espanha Yescasa; preço igual.

Fotos novas em `assets/produtos/` (PNG original + WebP de 600 px): `guarda-roupa-4-portas`, `cabides`, `potes-vidro`; substituídas: `televisao`, `armario-cozinha`, `mesa-cadeiras`. Total: 36 itens, 39 links.

Item removido (depois):
- **Armário para escritório**, retirado da lista a pedido do casal. Fotos mantidas em `assets/produtos/` (`armario-escritorio`), mas fora do `itens.json`. Total atual: **35 itens, 38 links** (Casa & Móveis 13, Cozinha & Mesa 13, Eletroportáteis 9).

## 12. Mudanças de 24/10/2026

- **Filtro de água:** retirada a Opção 1 (R$ 484,40). Ficou só a antiga Opção 2 (R$ 483,92), com o botão "Ver na Amazon" e sem a nota "Amazon · duas opções", como os demais itens de uma opção. Total atual: **35 itens, 37 links**.
- **Guarda-roupa 4 portas:** cor pré-definida **Branco Riviera** (campo `variacao`, mesmo aviso da Cabeceira: "Na loja, escolha a opção Branco Riviera"). Link igual; foto trocada pela da cor Riviera (`guarda-roupa-4-portas`, PNG + WebP).
- **Box baú para cama:** retirada a Opção 2 (Casas Bahia, R$ 446,11 no Pix). Ficou só a antiga Opção 1 (Shopee, R$ 608,88 no Pix, R$ 689,00 em outros meios), com o botão "Ver na Shopee" e sem a nota "Shopee ou Casas Bahia · duas opções". Total atual: **35 itens, 36 links**.
