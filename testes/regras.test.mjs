// Testes das regras do Firestore. Rodar com: npm run teste:regras
// (sobe o emulador do Firestore, roda os testes e desliga).
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

// Forma oficial da conta, como o Google entrega no token.
const EMAIL_CASAL = 'heitortomazeli@gmail.com';

let ambiente;

before(async () => {
  ambiente = await initializeTestEnvironment({
    projectId: 'demo-cha-casa-nova',
    firestore: {
      rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

after(async () => {
  await ambiente?.cleanup();
});

beforeEach(async () => {
  await ambiente.clearFirestore();
});

// Contextos de autenticação
const visitante = (uid) =>
  ambiente.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const casal = () =>
  ambiente
    .authenticatedContext('uid-casal', {
      email: EMAIL_CASAL,
      email_verified: true,
      firebase: { sign_in_provider: 'google.com' },
    })
    .firestore();
const semLogin = () => ambiente.unauthenticatedContext().firestore();

// Marca um item do jeito que o site faz: status + compra (+ mensagem) num lote.
function marcar(db, uid, itemId, extras = {}) {
  const lote = writeBatch(db);
  lote.set(doc(db, 'status', itemId), {
    presenteado: true,
    uidMarcador: uid,
    criadoEm: serverTimestamp(),
  });
  lote.set(doc(db, 'compras', itemId), {
    nome: 'Tia Maria',
    opcao: null,
    forma: 'loja',
    mensagem: '',
    uidMarcador: uid,
    criadoEm: serverTimestamp(),
    ...extras,
  });
  return lote.commit();
}

function desmarcar(db, itemId) {
  const lote = writeBatch(db);
  lote.delete(doc(db, 'status', itemId));
  lote.delete(doc(db, 'compras', itemId));
  return lote.commit();
}

function novaMensagem(db, dados = {}) {
  return addDoc(collection(db, 'mensagens'), {
    nome: 'Primo João',
    texto: 'Felicidades!',
    itemId: null,
    criadoEm: serverTimestamp(),
    ...dados,
  });
}

function novoPixinho(db, dados = {}) {
  return addDoc(collection(db, 'pixinhos'), {
    nome: 'Vó Lurdes',
    mensagem: '',
    criadoEm: serverTimestamp(),
    ...dados,
  });
}

// Grava dados direto, ignorando as regras (para montar cenários).
async function semRegras(fn) {
  await ambiente.withSecurityRulesDisabled(async (ctx) => fn(ctx.firestore()));
}

describe('visitante não lê compras nem mensagens', () => {
  beforeEach(async () => {
    await marcar(visitante('ana-anon'), 'ana-anon', 'sofa');
    await novaMensagem(visitante('ana-anon'));
    await novoPixinho(visitante('ana-anon'));
  });

  test('visitante não lê a compra, nem a própria', async () => {
    await assertFails(getDoc(doc(visitante('outro'), 'compras', 'sofa')));
    await assertFails(getDoc(doc(visitante('ana-anon'), 'compras', 'sofa')));
    await assertFails(getDocs(collection(visitante('outro'), 'compras')));
  });

  test('visitante não lê mensagens', async () => {
    await assertFails(getDocs(collection(visitante('outro'), 'mensagens')));
    await assertFails(getDocs(collection(visitante('ana-anon'), 'mensagens')));
  });

  test('visitante não lê pixinhos', async () => {
    await assertFails(getDocs(collection(visitante('outro'), 'pixinhos')));
  });

  test('sem login também não lê', async () => {
    await assertFails(getDocs(collection(semLogin(), 'compras')));
    await assertFails(getDocs(collection(semLogin(), 'mensagens')));
  });

  test('status é público e não tem nome de ninguém', async () => {
    const snap = await assertSucceeds(getDoc(doc(semLogin(), 'status', 'sofa')));
    const campos = Object.keys(snap.data()).sort();
    if (campos.join() !== 'criadoEm,presenteado,uidMarcador') {
      throw new Error(`status expõe campos inesperados: ${campos}`);
    }
  });

  test('conta com o e-mail do casal mas sem verificação não lê', async () => {
    const naoVerificado = ambiente
      .authenticatedContext('impostor', {
        email: EMAIL_CASAL,
        email_verified: false,
        firebase: { sign_in_provider: 'google.com' },
      })
      .firestore();
    await assertFails(getDocs(collection(naoVerificado, 'compras')));
    await assertFails(getDocs(collection(naoVerificado, 'mensagens')));
  });

  test('conta com o e-mail do casal fora do login Google não lê', async () => {
    const porSenha = ambiente
      .authenticatedContext('impostor', {
        email: EMAIL_CASAL,
        email_verified: true,
        firebase: { sign_in_provider: 'password' },
      })
      .firestore();
    await assertFails(getDocs(collection(porSenha, 'compras')));
    await assertFails(getDocs(collection(porSenha, 'mensagens')));
  });

  test('o casal lê com o e-mail com ponto (mesma conta no Gmail)', async () => {
    const comPonto = ambiente
      .authenticatedContext('uid-casal', {
        email: 'heitor.tomazeli@gmail.com',
        email_verified: true,
        firebase: { sign_in_provider: 'google.com' },
      })
      .firestore();
    await assertSucceeds(getDocs(collection(comPonto, 'compras')));
  });

  test('outro Gmail parecido não lê', async () => {
    const outro = ambiente
      .authenticatedContext('impostor', {
        email: 'heitortomazeli2@gmail.com',
        email_verified: true,
        firebase: { sign_in_provider: 'google.com' },
      })
      .firestore();
    await assertFails(getDocs(collection(outro, 'compras')));
  });
});

describe('marcar presente', () => {
  test('visitante marca com nome, opção e mensagem', async () => {
    const db = visitante('v1');
    await assertSucceeds(marcar(db, 'v1', 'box-bau', { opcao: 1, mensagem: 'Com carinho' }));
    await assertSucceeds(novaMensagem(db, { itemId: 'box-bau' }));
  });

  test('sem login não marca', async () => {
    await assertFails(marcar(semLogin(), 'x', 'sofa'));
  });

  test('nome é obrigatório', async () => {
    await assertFails(marcar(visitante('v1'), 'v1', 'sofa', { nome: '   ' }));
    await assertFails(marcar(visitante('v1'), 'v1', 'sofa', { nome: '' }));
  });

  test('não grava status sem a compra correspondente', async () => {
    const db = visitante('v1');
    await assertFails(
      setDoc(doc(db, 'status', 'sofa'), {
        presenteado: true,
        uidMarcador: 'v1',
        criadoEm: serverTimestamp(),
      }),
    );
  });

  test('não marca em nome de outro uid', async () => {
    await assertFails(marcar(visitante('v1'), 'v2', 'sofa'));
  });

  test('não aceita campos extras nem forma inválida', async () => {
    await assertFails(marcar(visitante('v1'), 'v1', 'sofa', { cpf: '123' }));
    await assertFails(marcar(visitante('v1'), 'v1', 'sofa', { forma: 'boleto' }));
    await assertFails(marcar(visitante('v1'), 'v1', 'sofa', { opcao: 5 }));
  });
});

describe('um item já presenteado não pode ser marcado de novo', () => {
  beforeEach(async () => {
    await marcar(visitante('v1'), 'v1', 'televisao');
  });

  test('outro visitante não consegue marcar', async () => {
    await assertFails(marcar(visitante('v2'), 'v2', 'televisao'));
  });

  test('o próprio marcador não consegue sobrescrever', async () => {
    await assertFails(marcar(visitante('v1'), 'v1', 'televisao', { nome: 'Outro nome' }));
  });

  test('o casal também não sobrescreve', async () => {
    await assertFails(marcar(casal(), 'uid-casal', 'televisao'));
  });

  test('ninguém altera o status nem a compra', async () => {
    await assertFails(updateDoc(doc(visitante('v1'), 'status', 'televisao'), { presenteado: false }));
    await assertFails(updateDoc(doc(visitante('v1'), 'compras', 'televisao'), { nome: 'X' }));
  });

  test('depois de desmarcado, pode ser marcado de novo', async () => {
    await assertSucceeds(desmarcar(visitante('v1'), 'televisao'));
    await assertSucceeds(marcar(visitante('v2'), 'v2', 'televisao'));
  });
});

describe('visitante só apaga a marcação que ele mesmo fez', () => {
  beforeEach(async () => {
    await marcar(visitante('v1'), 'v1', 'airfryer');
  });

  test('quem marcou desmarca', async () => {
    await assertSucceeds(desmarcar(visitante('v1'), 'airfryer'));
  });

  test('outro visitante não desmarca', async () => {
    await assertFails(desmarcar(visitante('v2'), 'airfryer'));
    await assertFails(deleteDoc(doc(visitante('v2'), 'status', 'airfryer')));
    await assertFails(deleteDoc(doc(visitante('v2'), 'compras', 'airfryer')));
  });

  test('sem login não desmarca', async () => {
    await assertFails(desmarcar(semLogin(), 'airfryer'));
  });

  test('não apaga só o status, deixando a compra órfã', async () => {
    await assertFails(deleteDoc(doc(visitante('v1'), 'status', 'airfryer')));
  });

  test('visitante não apaga mensagens nem pixinhos', async () => {
    const msg = await novaMensagem(visitante('v1'));
    const pix = await novoPixinho(visitante('v1'));
    await assertFails(deleteDoc(doc(visitante('v1'), 'mensagens', msg.id)));
    await assertFails(deleteDoc(doc(visitante('v1'), 'pixinhos', pix.id)));
  });
});

describe('o casal lê tudo e apaga qualquer marcação', () => {
  beforeEach(async () => {
    await marcar(visitante('v1'), 'v1', 'cafeteira', { forma: 'pix', mensagem: 'Bom café!' });
    await marcar(visitante('v2'), 'v2', 'filtro-agua', { opcao: 0 });
    await novaMensagem(visitante('v3'));
    await novoPixinho(visitante('v3'));
  });

  test('casal lê status, compras, mensagens e pixinhos', async () => {
    const db = casal();
    await assertSucceeds(getDocs(collection(db, 'status')));
    const compras = await assertSucceeds(getDocs(collection(db, 'compras')));
    if (compras.size !== 2) throw new Error(`esperava 2 compras, veio ${compras.size}`);
    await assertSucceeds(getDoc(doc(db, 'compras', 'cafeteira')));
    await assertSucceeds(getDocs(collection(db, 'mensagens')));
    await assertSucceeds(getDocs(collection(db, 'pixinhos')));
  });

  test('casal desmarca item marcado por qualquer visitante', async () => {
    await assertSucceeds(desmarcar(casal(), 'cafeteira'));
    await assertSucceeds(desmarcar(casal(), 'filtro-agua'));
  });

  test('casal apaga mensagens e pixinhos', async () => {
    let ids = [];
    await semRegras(async (db) => {
      ids = (await getDocs(collection(db, 'mensagens'))).docs.map((d) => d.id);
    });
    await assertSucceeds(deleteDoc(doc(casal(), 'mensagens', ids[0])));
  });
});

describe('mural e Pixinho', () => {
  test('mensagem exige nome e texto', async () => {
    await assertSucceeds(novaMensagem(visitante('v1')));
    await assertFails(novaMensagem(visitante('v1'), { nome: '' }));
    await assertFails(novaMensagem(visitante('v1'), { texto: '  ' }));
    await assertFails(novaMensagem(visitante('v1'), { texto: 'x'.repeat(1001) }));
  });

  test('mensagem exige data do servidor', async () => {
    await assertFails(novaMensagem(visitante('v1'), { criadoEm: new Date(2000, 0, 1) }));
  });

  test('pixinho exige nome e não guarda valor', async () => {
    await assertSucceeds(novoPixinho(visitante('v1'), { mensagem: 'Um mimo' }));
    await assertFails(novoPixinho(visitante('v1'), { nome: '' }));
    await assertFails(novoPixinho(visitante('v1'), { valor: 50 }));
  });

  test('coleções desconhecidas são negadas', async () => {
    await assertFails(setDoc(doc(visitante('v1'), 'outra', 'x'), { a: 1 }));
  });
});
