import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
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

export async function loginWithGoogle(){
  if(Capacitor.isNativePlatform()){
    // Drives the native Google Sign-In SDK; the plugin syncs the result
    // into `auth` automatically, so onAuthChange() picks it up same as
    // any other sign-in method.
    const result = await FirebaseAuthentication.signInWithGoogle();
    return result.user;
  }
  const cred = await signInWithPopup(auth, new GoogleAuthProvider());
  return cred.user;
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
  };
  return map[code] || 'Algo salió mal. Probá de nuevo.';
}
