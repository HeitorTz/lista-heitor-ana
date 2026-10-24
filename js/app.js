// Página pública: lista de presentes, marcação, Pix e mural.
import {
  onAuthStateChanged,
  signInAnonymously,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { aceitaPix, carregarCatalogo, el, formatarReais, temDuasOpcoes, valorPix } from './catalogo.js';
import { iniciarFirebase } from './firebase.js';
import { brCodeDoCasal, PIX } from './pix.js';
import qrcode from './vendor/qrcode.mjs';

const { auth, db } = iniciarFirebase('visitante');

let catalogo = null;
let meuUid = null;
let presenteados = new Map(); // itemId → { uidMarcador }
const cards = new Map(); // itemId → elemento do card

// ---------- Login anônimo invisível ----------
// Fica salvo no navegador; é o que permite a quem marcou desmarcar no mesmo aparelho.
const usuarioPronto = new Promise((resolve) => {
  onAuthStateChanged(auth, (usuario) => {
    if (usuario) {
      meuUid = usuario.uid;
      resolve(usuario);
      atualizarTodosOsCards();
    } else {
      signInAnonymously(auth).catch((erro) => console.error('Login anônimo falhou', erro));
    }
  });
});

// ---------- Utilidades ----------
function svgDoQr(texto) {
  const qr = qrcode(0, 'M');
  qr.addData(texto);
  qr.make();
  const n = qr.getModuleCount();
  const margem = 2;
  let caminho = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) caminho += `M${c + margem},${r + margem}h1v1h-1z`;
    }
  }
  const lado = n + margem * 2;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${lado} ${lado}`);
  svg.setAttribute('class', 'qr');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'QR Code Pix');
  svg.setAttribute('shape-rendering', 'crispEdges');
  const fundo = document.createElementNS(ns, 'rect');
  fundo.setAttribute('width', lado);
  fundo.setAttribute('height', lado);
  fundo.setAttribute('fill', '#fff');
  const modulos = document.createElementNS(ns, 'path');
  modulos.setAttribute('d', caminho);
  modulos.setAttribute('fill', '#1f2a1a');
  svg.append(fundo, modulos);
  return svg;
}

async function copiar(texto, botao) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    const area = el('textarea', { readonly: true, style: 'position:fixed;opacity:0' });
    area.value = texto;
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
  const original = botao.textContent;
  botao.textContent = 'Copiado!';
  botao.classList.add('copiado');
  setTimeout(() => {
    botao.textContent = original;
    botao.classList.remove('copiado');
  }, 1800);
}

// Bloco com valor, QR Code, chave e "copia e cola".
function blocoPix(valor) {
  const codigo = brCodeDoCasal(valor);
  const botaoChave = el('button', { type: 'button', class: 'botao botao-pequeno' }, 'Copiar');
  botaoChave.addEventListener('click', () => copiar(PIX.chave, botaoChave));
  const botaoCodigo = el('button', { type: 'button', class: 'botao botao-contorno botao-largo' }, 'Copiar código Pix (copia e cola)');
  botaoCodigo.addEventListener('click', () => copiar(codigo, botaoCodigo));
  return el('div', { class: 'bloco-pix' },
    valor != null ? el('p', { class: 'valor-pix' }, 'Valor: ', el('strong', {}, formatarReais(valor))) : null,
    svgDoQr(codigo),
    el('div', { class: 'linha-chave' },
      el('div', {},
        el('span', { class: 'rotulo-chave' }, 'Chave Pix (e-mail)'),
        el('code', { class: 'chave' }, PIX.chave)),
      botaoChave),
    botaoCodigo,
    el('p', { class: 'ajuda' }, `Recebedor: ${PIX.recebedor} · ${PIX.cidade}`),
  );
}

function separador() {
  const div = el('div', { class: 'separador', 'aria-hidden': 'true' });
  div.innerHTML = '<svg><use href="#coracao"/></svg>';
  return div;
}

function lerFormulario(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function mostrarErro(form, mensagem) {
  const p = form.querySelector('.erro');
  p.textContent = mensagem;
  p.hidden = !mensagem;
}

// ---------- Renderização da lista ----------
function criarCard(item) {
  const fotos = el('div', { class: `fotos${item.fotos.length > 1 ? ' fotos-duas' : ''}` },
    item.fotos.map((src, i) =>
      el('img', {
        src,
        alt: item.fotos.length > 1 ? `${item.nome}, foto ${i + 1}` : item.nome,
        loading: 'lazy',
        decoding: 'async',
      })));

  const botoesLoja = el('div', { class: 'botoes-loja' },
    item.botoes.map((botao) => {
      const classe = `botao${botao.estilo === 'contorno' ? ' botao-contorno' : ''}`;
      if (!botao.url) {
        // Link ainda não definido no itens.json (ex.: toalhas): botão visível, inativo.
        return el('span', { class: `${classe} desativado`, 'aria-disabled': 'true', title: 'Link em breve' }, botao.rotulo);
      }
      return el('a', {
        class: classe,
        href: botao.url,
        target: '_blank',
        rel: 'noopener noreferrer',
        'data-href': botao.url,
      }, botao.rotulo);
    }));

  const acoes = el('div', { class: 'acoes' },
    el('button', { type: 'button', class: 'botao-texto', onclick: () => abrirDialogoCompra(item, 'loja') }, 'Já comprei este presente'),
    aceitaPix(item)
      ? el('button', { type: 'button', class: 'botao-texto', onclick: () => abrirDialogoCompra(item, 'pix') }, 'Presentear via Pix')
      : null,
  );

  const estado = el('div', { class: 'estado', hidden: true },
    el('span', { class: 'selo' }, 'Já presenteado'),
    el('button', { type: 'button', class: 'botao-texto desfazer', hidden: true, onclick: () => desfazer(item) }, 'Desfazer'),
  );

  const card = el('article', { class: 'cartao card-item', 'data-id': item.id },
    fotos,
    el('h3', { class: 'nome-item' }, item.nome),
    item.nota ? el('p', { class: 'nota' }, item.nota) : null,
    item.variacao ? el('p', { class: 'aviso-variacao' }, 'Na loja, escolha a opção ', el('strong', {}, item.variacao)) : null,
    botoesLoja,
    acoes,
    estado,
  );
  cards.set(item.id, card);
  return card;
}

function renderizarLista() {
  const lista = document.getElementById('lista');
  lista.replaceChildren(
    ...catalogo.secoes.map((secao) =>
      el('section', { class: 'secao', id: secao.id, 'aria-labelledby': `titulo-${secao.id}` },
        el('p', { class: 'subtitulo-secao' }, secao.subtitulo),
        el('h2', { class: 'titulo-secao manuscrita', id: `titulo-${secao.id}` }, secao.titulo),
        separador(),
        el('div', { class: 'grade' }, secao.itens.map(criarCard)),
      )),
  );
}

function atualizarCard(itemId) {
  const card = cards.get(itemId);
  if (!card) return;
  const status = presenteados.get(itemId);
  const marcado = Boolean(status);
  card.classList.toggle('presenteado', marcado);
  card.querySelector('.estado').hidden = !marcado;
  card.querySelector('.acoes').hidden = marcado;
  card.querySelector('.desfazer').hidden = !(marcado && meuUid && status.uidMarcador === meuUid);
  for (const link of card.querySelectorAll('a.botao')) {
    if (marcado) {
      link.removeAttribute('href');
      link.setAttribute('aria-disabled', 'true');
      link.setAttribute('tabindex', '-1');
    } else {
      link.setAttribute('href', link.dataset.href);
      link.removeAttribute('aria-disabled');
      link.removeAttribute('tabindex');
    }
  }
}

function atualizarTodosOsCards() {
  for (const id of cards.keys()) atualizarCard(id);
}

// ---------- Marcar como presenteado (loja ou Pix) ----------
const dialogo = document.getElementById('dialogo');
const dialogoForm = document.getElementById('dialogo-form');

function fecharDialogo() {
  dialogo.close();
}

dialogo.addEventListener('click', (evento) => {
  // Toque fora do conteúdo fecha.
  if (evento.target === dialogo) fecharDialogo();
});

function abrirDialogoCompra(item, forma) {
  const duas = temDuasOpcoes(item);
  const pix = forma === 'pix';
  const areaPix = el('div', { class: 'area-pix' });

  const mostrarPix = (opcao) => {
    const valor = valorPix(item, opcao);
    areaPix.replaceChildren(valor != null ? blocoPix(valor) : el('p', { class: 'ajuda' }, 'Esta opção ainda não tem valor definido.'));
  };

  const opcoes = duas
    ? el('fieldset', { class: 'opcoes' },
        el('legend', {}, pix ? 'Qual opção você quer presentear?' : 'Qual opção você comprou?'),
        item.botoes.map((botao, i) => {
          const valor = valorPix(item, i);
          const desabilitada = pix && valor == null;
          return el('label', { class: 'opcao' },
            el('input', {
              type: 'radio',
              name: 'opcao',
              value: String(i),
              required: true,
              disabled: desabilitada,
              onchange: () => pix && mostrarPix(i),
            }),
            pix && valor != null ? `${botao.rotulo} · ${formatarReais(valor)}` : botao.rotulo);
        }))
    : null;

  if (pix) {
    if (duas) areaPix.append(el('p', { class: 'ajuda' }, 'Escolha a opção para ver o valor e o QR Code.'));
    else mostrarPix(0);
  }

  // replaceChildren nativo escreveria "null" como texto: filtra antes.
  dialogoForm.replaceChildren(...[
    el('h2', { id: 'dialogo-titulo', class: 'dialogo-titulo' }, pix ? 'Presentear via Pix' : 'Já comprei este presente'),
    el('p', { class: 'dialogo-item' }, item.nome),
    item.variacao ? el('p', { class: 'aviso-variacao' }, 'Opção: ', el('strong', {}, item.variacao)) : null,
    opcoes,
    pix ? areaPix : null,
    el('label', {}, 'Seu nome',
      el('input', { name: 'nome', autocomplete: 'name', maxlength: '80', required: true })),
    el('label', {}, 'Mensagem (opcional)',
      el('textarea', { name: 'mensagem', rows: '3', maxlength: '1000' })),
    el('p', { class: 'erro', role: 'alert', hidden: true }),
    el('div', { class: 'dialogo-botoes' },
      el('button', { type: 'button', class: 'botao botao-contorno', onclick: fecharDialogo }, 'Cancelar'),
      el('button', { type: 'submit', class: 'botao', value: 'confirmar' }, pix ? 'Enviei o Pix' : 'Confirmar')),
  ].filter(Boolean));

  dialogoForm.onsubmit = async (evento) => {
    evento.preventDefault();
    const dados = lerFormulario(dialogoForm);
    const nome = (dados.nome || '').trim();
    if (duas && dados.opcao == null) return mostrarErro(dialogoForm, 'Escolha qual opção.');
    if (!nome) return mostrarErro(dialogoForm, 'Informe seu nome.');
    mostrarErro(dialogoForm, '');
    const enviar = dialogoForm.querySelector('button[type=submit]');
    enviar.disabled = true;
    enviar.textContent = 'Salvando…';
    try {
      await marcar(item, {
        nome,
        opcao: duas ? Number(dados.opcao) : null,
        forma,
        mensagem: (dados.mensagem || '').trim(),
      });
      dialogoForm.replaceChildren(
        el('h2', { id: 'dialogo-titulo', class: 'dialogo-titulo' }, `Obrigado, ${nome.split(' ')[0]}!`),
        el('p', { class: 'dialogo-item' }, `${item.nome} agora aparece como “Já presenteado”.`),
        el('div', { class: 'dialogo-botoes' },
          el('button', { type: 'button', class: 'botao', onclick: fecharDialogo }, 'Fechar')),
      );
    } catch (erro) {
      console.error(erro);
      const jaMarcado = (await getDoc(doc(db, 'status', item.id)).catch(() => null))?.exists();
      mostrarErro(dialogoForm, jaMarcado
        ? 'Este presente acabou de ser marcado por outra pessoa.'
        : 'Não foi possível salvar. Verifique a internet e tente de novo.');
      enviar.disabled = false;
      enviar.textContent = pix ? 'Enviei o Pix' : 'Confirmar';
    }
  };

  dialogo.showModal();
  if (!duas && !pix) dialogoForm.querySelector('input[name=nome]').focus();
}

async function marcar(item, { nome, opcao, forma, mensagem }) {
  const usuario = await usuarioPronto;
  const lote = writeBatch(db);
  lote.set(doc(db, 'status', item.id), {
    presenteado: true,
    uidMarcador: usuario.uid,
    criadoEm: serverTimestamp(),
  });
  lote.set(doc(db, 'compras', item.id), {
    nome,
    opcao,
    forma,
    mensagem,
    uidMarcador: usuario.uid,
    criadoEm: serverTimestamp(),
  });
  // A mensagem também vai para o mural do casal, e fica lá mesmo se a marcação for desfeita.
  if (mensagem) {
    lote.set(doc(collection(db, 'mensagens')), {
      nome,
      texto: mensagem,
      itemId: item.id,
      criadoEm: serverTimestamp(),
    });
  }
  await lote.commit();
}

async function desfazer(item) {
  if (!confirm(`Desfazer a marcação de “${item.nome}”?`)) return;
  const lote = writeBatch(db);
  lote.delete(doc(db, 'status', item.id));
  lote.delete(doc(db, 'compras', item.id));
  try {
    await lote.commit();
  } catch (erro) {
    console.error(erro);
    alert('Não foi possível desfazer. Tente de novo.');
  }
}

// ---------- Pixinho solidário ----------
function renderizarPixinho() {
  const form = el('form', { class: 'formulario', novalidate: true },
    el('label', {}, 'Seu nome',
      el('input', { name: 'nome', autocomplete: 'name', maxlength: '80', required: true })),
    el('label', {}, 'Mensagem (opcional)',
      el('textarea', { name: 'mensagem', rows: '3', maxlength: '1000' })),
    el('p', { class: 'erro', role: 'alert', hidden: true }),
    el('button', { type: 'submit', class: 'botao' }, 'Enviei o Pix'),
    el('p', { class: 'sucesso', role: 'status', hidden: true }, 'Recebemos seu aviso. Muito obrigado!'),
  );

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const dados = lerFormulario(form);
    const nome = (dados.nome || '').trim();
    if (!nome) return mostrarErro(form, 'Informe seu nome.');
    mostrarErro(form, '');
    const enviar = form.querySelector('button[type=submit]');
    enviar.disabled = true;
    try {
      await usuarioPronto;
      await addDoc(collection(db, 'pixinhos'), {
        nome,
        mensagem: (dados.mensagem || '').trim(),
        criadoEm: serverTimestamp(),
      });
      form.reset();
      form.querySelector('.sucesso').hidden = false;
    } catch (erro) {
      console.error(erro);
      mostrarErro(form, 'Não foi possível enviar. Verifique a internet e tente de novo.');
    } finally {
      enviar.disabled = false;
    }
  });

  document.getElementById('pixinho-conteudo').replaceChildren(
    el('p', { class: 'texto-pixinho' }, 'Contribua com o valor que quiser.'),
    blocoPix(null),
    form,
  );
}

// ---------- Mural ----------
function ligarMural() {
  const form = document.getElementById('form-mural');
  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    form.querySelector('.sucesso').hidden = true;
    const dados = lerFormulario(form);
    const nome = (dados.nome || '').trim();
    const texto = (dados.texto || '').trim();
    if (!nome) return mostrarErro(form, 'Informe seu nome.');
    if (!texto) return mostrarErro(form, 'Escreva sua mensagem.');
    mostrarErro(form, '');
    const enviar = form.querySelector('button[type=submit]');
    enviar.disabled = true;
    try {
      await usuarioPronto;
      await addDoc(collection(db, 'mensagens'), {
        nome,
        texto,
        itemId: null,
        criadoEm: serverTimestamp(),
      });
      form.reset();
      form.querySelector('.sucesso').hidden = false;
    } catch (erro) {
      console.error(erro);
      mostrarErro(form, 'Não foi possível enviar. Verifique a internet e tente de novo.');
    } finally {
      enviar.disabled = false;
    }
  });
}

// ---------- Início ----------
async function iniciar() {
  renderizarPixinho();
  ligarMural();
  try {
    catalogo = await carregarCatalogo();
  } catch (erro) {
    console.error(erro);
    document.getElementById('lista').replaceChildren(
      el('p', { class: 'carregando' }, 'Não foi possível carregar a lista. Atualize a página.'));
    return;
  }
  renderizarLista();
  onSnapshot(
    collection(db, 'status'),
    (snap) => {
      presenteados = new Map(snap.docs.map((d) => [d.id, d.data()]));
      atualizarTodosOsCards();
    },
    (erro) => console.error('Erro ao ler status', erro),
  );
}

iniciar();
