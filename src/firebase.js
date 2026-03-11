// src/firebase.js – Firebase Config
// Replace with your Firebase project credentials (from Firebase Console)
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// Only initialize if config is present
let app = null;
let db = null;

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}

// ---- Contact CRUD Operations ----

export async function saveContactToFirebase(contact) {
  if (!db) {
    console.warn("Firebase not configured – saving locally only");
    return null;
  }
  try {
    const docRef = await addDoc(collection(db, "contacts"), {
      ...contact,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (err) {
    console.error("Firebase save error:", err);
    return null;
  }
}

export function subscribeToContacts(callback) {
  if (!db) {
    callback([]);
    return () => {};
  }
  const q = query(collection(db, "contacts"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const contacts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(contacts);
  });
}

export async function updateContactInFirebase(id, data) {
  if (!db) return;
  try {
    await updateDoc(doc(db, "contacts", id), data);
  } catch (err) {
    console.error("Firebase update error:", err);
  }
}

export async function deleteContactFromFirebase(id) {
  if (!db) return;
  try {
    await deleteDoc(doc(db, "contacts", id));
  } catch (err) {
    console.error("Firebase delete error:", err);
  }
}

export function isFirebaseConfigured() {
  return !!db;
}

export { db };
