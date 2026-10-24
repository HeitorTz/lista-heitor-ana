// Inicialização do Firebase, compartilhada pela página pública e pela área do casal.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {
  connectAuthEmulator,
  getAuth,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  connectFirestoreEmulator,
  getFirestore,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

// Rodando em localhost ou com projeto "demo-": fala só com o Emulator Suite, nunca com a nuvem.
const usarEmulador =
  ['localhost', '127.0.0.1'].includes(location.hostname) ||
  firebaseConfig.projectId.startsWith('demo-');

// Cada página usa uma instância com nome próprio. Assim o login do casal
// (casal.html) não substitui o login anônimo do visitante (index.html)
// no mesmo navegador, e o "Desfazer" continua funcionando.
// No emulador, o projeto é sempre o "demo-…" dos scripts do package.json.
export function iniciarFirebase(nomeInstancia) {
  const config = usarEmulador
    ? { ...firebaseConfig, projectId: 'demo-cha-casa-nova', authDomain: 'demo-cha-casa-nova.firebaseapp.com' }
    : firebaseConfig;
  const app = initializeApp(config, nomeInstancia);
  const auth = getAuth(app);
  const db = getFirestore(app);
  if (usarEmulador) {
    connectAuthEmulator(auth, `http://${location.hostname}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, location.hostname, 8080);
  }
  return { app, auth, db };
}
