// Área do casal: login único pelo Google (heitor.tomazeli@gmail.com).
// Quem pode ler o quê é decidido pelo firestore.rules; esta página só mostra.
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  writeBatch,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { carregarCatalogo, el, formatarReais, valorPix } from './catalogo.js';
import { iniciarFirebase } from './firebase.js';

const { auth, db } = iniciarFirebase('casal');

const formLogin = document.getElementById('form-login');
const naoAutorizado = document.getElementById('nao-autorizado');
const painel = document.getElementById('painel');

const dados = { status: new Map(), compras: new Map(), mensagens: [], pixinhos: [] };
let catalogo = null;
let cancelamentos = [];

const dataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const formatarData = (ts) => (ts?.toDate ? dataHora.format(ts.toDate()) : 'agora');

function mostrar(qual) {
  formLogin.hidden = qual !== 'login';
  naoAutorizado.hidden = qual !== 'nao-autorizado';
  painel.hidden = qual !== 'painel';
}

// ---------- Login ----------
const provedorGoogle = new GoogleAuthProvider();
provedorGoogle.setCustomParameters({ prompt: 'select_account' });

document.getElementById('entrar-google').addEventListener('click', async (evento) => {
  const botao = evento.currentTarget;
  const erro = formLogin.querySelector('.erro');
  erro.hidden = true;
  botao.disabled = true;
  try {
    await signInWithPopup(auth, provedorGoogle);
  } catch (e) {
    console.error(e);
    if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
      erro.textContent = e.code === 'auth/popup-blocked'
        ? 'O navegador bloqueou a janela do Google. Libere pop-ups para este site e tente de novo.'
        : 'Não foi possível entrar com o Google.';
      erro.hidden = false;
    }
  } finally {
    botao.disabled = false;
  }
});

for (const botao of document.querySelectorAll('[data-sair]')) {
  botao.addEventListener('click', () => signOut(auth));
}

function negarAcesso(usuario) {
  pararDeOuvir();
  naoAutorizado.querySelector('.aviso-conta').textContent =
    `A conta ${usuario.email ?? ''} não tem acesso à área do casal.`;
  mostrar('nao-autorizado');
}

onAuthStateChanged(auth, async (usuario) => {
  pararDeOuvir();
  if (!usuario || usuario.isAnonymous) {
    mostrar('login');
    return;
  }
  if (!catalogo) catalogo = await carregarCatalogo();
  ouvir(usuario);
});

// ---------- Dados em tempo real ----------
function pararDeOuvir() {
  cancelamentos.forEach((cancelar) => cancelar());
  cancelamentos = [];
}

function ouvir(usuario) {
  const aoErro = (erro) => {
    console.error(erro);
    if (erro.code === 'permission-denied') negarAcesso(usuario);
  };
  const aoReceber = (aplicar) => (snap) => {
    aplicar(snap);
    renderizar();
  };

  cancelamentos = [
    // "compras" é privada: se ela respondeu, as regras reconheceram o casal.
    onSnapshot(collection(db, 'compras'), aoReceber((snap) => {
      dados.compras = new Map(snap.docs.map((d) => [d.id, d.data()]));
      mostrar('painel');
    }), aoErro),
    onSnapshot(collection(db, 'status'), aoReceber((snap) => {
      dados.status = new Map(snap.docs.map((d) => [d.id, d.data()]));
    }), aoErro),
    onSnapshot(query(collection(db, 'mensagens'), orderBy('criadoEm', 'desc')), aoReceber((snap) => {
      dados.mensagens = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }), aoErro),
    onSnapshot(query(collection(db, 'pixinhos'), orderBy('criadoEm', 'desc')), aoReceber((snap) => {
      dados.pixinhos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }), aoErro),
  ];
}

// ---------- Ações ----------
async function desmarcar(item) {
  if (!confirm(`Desmarcar “${item.nome}”? O item volta a ficar disponível na lista.`)) return;
  const lote = writeBatch(db);
  lote.delete(doc(db, 'status', item.id));
  lote.delete(doc(db, 'compras', item.id));
  try {
    await lote.commit();
  } catch (e) {
    console.error(e);
    alert('Não foi possível desmarcar.');
  }
}

async function apagarMensagem(mensagem) {
  if (!confirm(`Apagar a mensagem de ${mensagem.nome}?`)) return;
  await deleteDoc(doc(db, 'mensagens', mensagem.id)).catch((e) => {
    console.error(e);
    alert('Não foi possível apagar.');
  });
}

// ---------- Renderização ----------
function rotuloOpcao(item, opcao) {
  return opcao == null ? null : item.botoes[opcao]?.rotulo ?? `Opção ${opcao + 1}`;
}

function renderizarPresentes() {
  const total = catalogo.porId.size;
  const marcados = [...catalogo.porId.keys()].filter((id) => dados.status.has(id)).length;
  document.getElementById('resumo').textContent = `${marcados} de ${total} presentes marcados`;

  document.getElementById('aba-presentes').replaceChildren(
    ...catalogo.secoes.flatMap((secao) => [
      el('h2', { class: 'grupo-titulo' }, secao.titulo),
      ...secao.itens.map((item) => {
        const status = dados.status.get(item.id);
        const compra = dados.compras.get(item.id);
        if (!status) {
          return el('article', { class: 'cartao registro disponivel' },
            el('div', { class: 'registro-topo' },
              el('p', { class: 'registro-titulo' }, item.nome),
              el('span', { class: 'etiqueta livre' }, 'Disponível')));
        }
        const opcao = rotuloOpcao(item, compra?.opcao ?? null);
        const forma = compra?.forma === 'pix'
          ? `Pix${valorPix(item, compra.opcao ?? 0) != null ? ` · ${formatarReais(valorPix(item, compra.opcao ?? 0))}` : ''}`
          : 'Comprou na loja';
        return el('article', { class: 'cartao registro' },
          el('div', { class: 'registro-topo' },
            el('p', { class: 'registro-titulo' }, item.nome),
            el('span', { class: 'etiqueta' }, 'Já presenteado')),
          el('p', { class: 'registro-meta' },
            [compra?.nome ?? '(sem registro de compra)', formatarData(compra?.criadoEm ?? status.criadoEm), opcao, compra ? forma : null]
              .filter(Boolean).join(' · ')),
          compra?.mensagem ? el('p', { class: 'registro-texto' }, `“${compra.mensagem}”`) : null,
          el('button', { type: 'button', class: 'botao-texto', onclick: () => desmarcar(item) }, 'Desmarcar'),
        );
      }),
    ]),
  );
}

function renderizarMensagens() {
  const aba = document.getElementById('aba-mensagens');
  if (!dados.mensagens.length) {
    aba.replaceChildren(el('p', { class: 'vazio' }, 'Nenhuma mensagem ainda.'));
    return;
  }
  aba.replaceChildren(...dados.mensagens.map((m) => {
    const item = m.itemId ? catalogo.porId.get(m.itemId) : null;
    return el('article', { class: 'cartao registro' },
      el('div', { class: 'registro-topo' },
        el('p', { class: 'registro-titulo' }, m.nome),
        el('span', { class: `etiqueta${item ? '' : ' livre'}` }, item ? item.nome : 'Mural')),
      el('p', { class: 'registro-meta' }, formatarData(m.criadoEm)),
      el('p', { class: 'registro-texto' }, m.texto),
      el('button', { type: 'button', class: 'botao-texto', onclick: () => apagarMensagem(m) }, 'Apagar'),
    );
  }));
}

function renderizarPix() {
  const pixDeItens = [...dados.compras.entries()]
    .filter(([, c]) => c.forma === 'pix')
    .map(([itemId, c]) => {
      const item = catalogo.porId.get(itemId);
      return { nome: c.nome, criadoEm: c.criadoEm, valor: item ? valorPix(item, c.opcao ?? 0) : null, sobre: item?.nome ?? itemId, opcao: item ? rotuloOpcao(item, c.opcao) : null, mensagem: c.mensagem };
    });
  // O Pixinho não informa valor: o casal confere no extrato do banco.
  const pixinhos = dados.pixinhos.map((p) => ({ ...p, valor: null, sobre: 'Pixinho solidário' }));
  const todos = [...pixDeItens, ...pixinhos].sort(
    (a, b) => (b.criadoEm?.toMillis?.() ?? Infinity) - (a.criadoEm?.toMillis?.() ?? Infinity));
  const soma = todos.reduce((t, p) => t + (p.valor ?? 0), 0);

  const aba = document.getElementById('aba-pix');
  if (!todos.length) {
    aba.replaceChildren(el('p', { class: 'vazio' }, 'Nenhum Pix informado ainda.'));
    return;
  }
  aba.replaceChildren(
    el('p', { class: 'registro-meta' }, `Total dos Pix de itens: ${formatarReais(soma)}. Confira tudo no extrato do banco.`),
    ...todos.map((p) =>
      el('article', { class: 'cartao registro' },
        el('div', { class: 'registro-topo' },
          el('p', { class: 'registro-titulo' }, p.nome),
          el('span', { class: 'etiqueta' }, p.valor != null ? formatarReais(p.valor) : 'Pixinho')),
        el('p', { class: 'registro-meta' }, [p.sobre, p.opcao, formatarData(p.criadoEm)].filter(Boolean).join(' · ')),
        p.mensagem ? el('p', { class: 'registro-texto' }, `“${p.mensagem}”`) : null,
      )),
  );
}

function renderizar() {
  if (!catalogo) return;
  renderizarPresentes();
  renderizarMensagens();
  renderizarPix();
}

// ---------- Abas ----------
for (const aba of document.querySelectorAll('[data-aba]')) {
  aba.addEventListener('click', () => {
    for (const outra of document.querySelectorAll('[data-aba]')) {
      const ativa = outra === aba;
      outra.setAttribute('aria-selected', String(ativa));
      document.getElementById(`aba-${outra.dataset.aba}`).hidden = !ativa;
    }
  });
}
