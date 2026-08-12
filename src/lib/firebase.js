import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
  signOut,
  deleteUser,
  onAuthStateChanged,
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

const firebaseConfig = {
  apiKey: 'AIzaSyCSCgz9nBq0iyQx9_USuCgjKDC3ogH2awU',
  authDomain: 'study-zoo.firebaseapp.com',
  projectId: 'study-zoo',
  storageBucket: 'study-zoo.firebasestorage.app',
  messagingSenderId: '1009620250842',
  appId: '1:1009620250842:web:dc4192b96b92faeb1f75e3',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const db = getFirestore(app);

// Now always available: on native, @capacitor-firebase/authentication
// drives Google's native sign-in SDK and syncs the result back into this
// same `auth` instance, so onAuthChange() below sees it either way — no
// more need to hide the button on native.
export const googleSignInAvailable = true;

export function onAuthChange(callback){
  return onAuthStateChanged(auth, callback);
}

export async function registerWithEmail(email, password){
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function loginWithEmail(email, password){
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// Mobile browsers routinely block or kill the popup window signInWithPopup
// opens (shows as a blank about:blank tab that closes itself), so mobile web
// uses a full-page redirect instead. Desktop keeps the popup since it's a
// smoother UX there and doesn't hit that failure mode.
function isMobileWeb(){
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export async function loginWithGoogle(){
  if(Capacitor.isNativePlatform()){
    // This only signs the user into the plugin's NATIVE layer — despite
    // `skipNativeAuth: false`, it does NOT automatically sign `auth` (the
    // JS SDK instance) in too. Everything else in this app (onAuthChange,
    // Firestore reads/writes) is built on the JS SDK, so without this next
    // step the native picker succeeds but the app never leaves guest mode.
    // Bridge it manually: take the ID token the native sign-in returned
    // and use it to sign `auth` in for real via signInWithCredential.
    const result = await FirebaseAuthentication.signInWithGoogle();
    if(result.credential && result.credential.idToken){
      const jsCredential = GoogleAuthProvider.credential(
        result.credential.idToken,
        result.credential.accessToken
      );
      const jsResult = await signInWithCredential(auth, jsCredential);
      return jsResult.user;
    }
    return result.user;
  }
  if(isMobileWeb()){
    // Navigates away immediately — this promise never resolves in normal
    // operation. The result comes back via checkGoogleRedirectResult() on
    // the next page load, and onAuthChange() picks up the signed-in user.
    await signInWithRedirect(auth, new GoogleAuthProvider());
    return null;
  }
  const cred = await signInWithPopup(auth, new GoogleAuthProvider());
  return cred.user;
}

// Call once on app startup (web only) to pick up the result of a redirect
// sign-in that completed on this page load, and to surface any error from
// it — errors that happen during the redirect round-trip have no login
// modal left open to catch them inline the way popup/email errors do.
export async function checkGoogleRedirectResult(){
  const cred = await getRedirectResult(auth);
  return cred ? cred.user : null;
}

export async function logout(){
  await signOut(auth);
}

export async function deleteAccount(){
  if(!auth.currentUser) return;
  await deleteDoc(doc(db, 'users', auth.currentUser.uid));
  await deleteUser(auth.currentUser);
}

export async function fetchCloudState(uid){
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

export async function saveCloudState(uid, state){
  await setDoc(doc(db, 'users', uid), state);
}

export function authErrorMessage(err){
  const code = err && err.code;
  // Logged unconditionally (not just for unmapped codes) so the console
  // always has the real Firebase error to diagnose against, regardless of
  // which of the friendlier messages below ends up on screen.
  console.error('[Firebase auth error]', code, err && err.message);
  const map = {
    'auth/email-already-in-use': 'Ese email ya tiene una cuenta — probá iniciar sesión.',
    'auth/invalid-email': 'Email inválido.',
    'auth/weak-password': 'La contraseña necesita al menos 6 caracteres.',
    'auth/user-not-found': 'No hay ninguna cuenta con ese email.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/invalid-credential': 'Email o contraseña incorrectos.',
    'auth/too-many-requests': 'Demasiados intentos — esperá un momento y probá de nuevo.',
    'auth/requires-recent-login': 'Por seguridad, cerrá sesión y volvé a iniciar sesión antes de eliminar la cuenta.',
    'auth/popup-closed-by-user': 'Se cerró la ventana de Google antes de terminar.',
    'auth/popup-blocked': 'El navegador bloqueó la ventana de Google — probá de nuevo.',
    'auth/cancelled-popup-request': 'Se canceló el intento anterior — probá de nuevo.',
    'auth/account-exists-with-different-credential': 'Ese email ya tiene una cuenta con otro método de acceso (por ej. contraseña) — iniciá sesión con ese método.',
    'auth/unauthorized-domain': 'Este sitio no está autorizado para iniciar sesión con Google todavía.',
    'auth/network-request-failed': 'Fallo de conexión — revisá tu internet y probá de nuevo.',
  };
  return map[code] || `Algo salió mal (${code || 'error desconocido'}). Probá de nuevo.`;
}
