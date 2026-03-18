import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, orderBy, where, onSnapshot, doc, updateDoc, deleteDoc, arrayUnion } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

let app = null;
let db = null;
let auth = null;

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
}

// ---- Auth ----
export async function loginUser(email, password) {
  if (!auth) throw new Error("Firebase not configured");
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function registerUser(email, password, displayName) {
  if (!auth) throw new Error("Firebase not configured");
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) await updateProfile(cred.user, { displayName });
  return cred.user;
}

export async function logoutUser() {
  if (!auth) return;
  await signOut(auth);
}

export function onAuthChange(callback) {
  if (!auth) { callback(null); return () => {}; }
  return onAuthStateChanged(auth, callback);
}

// ---- Contacts (filtered by userId) ----
export async function saveContactToFirebase(contact) {
  if (!db) return null;
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

export function subscribeToContacts(userId, callback) {
  if (!db) { callback([]); return () => {}; }
  const q = query(
    collection(db, "contacts"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, () => {
    // Fallback if composite index not ready yet
    const fq = query(collection(db, "contacts"), orderBy("createdAt", "desc"));
    onSnapshot(fq, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((c) => c.userId === userId));
    });
  });
}

export async function updateContactInFirebase(id, data) {
  if (!db) return;
  await updateDoc(doc(db, "contacts", id), data);
}

export async function deleteContactFromFirebase(id) {
  if (!db) return;
  await deleteDoc(doc(db, "contacts", id));
}

export async function addTimelineEvent(contactId, event) {
  if (!db) return;
  try {
    const timestamp = new Date().toISOString();
    await updateDoc(doc(db, "contacts", contactId), {
      timeline: arrayUnion({ ...event, timestamp }),
    });

    // CRM Integration: Sync timeline event to crm_activities
    if (auth.currentUser) {
      const typeMap = { scanned: "note", edit: "status", email: "email", whatsapp: "note" };
      let text = event.label;
      if (event.to) text += ` (An: ${event.to})`;
      if (event.phone) text += ` (Tel: ${event.phone})`;
  
      await addDoc(collection(db, "crm_activities"), {
        parentId: contactId,
        parentType: "kunde",
        type: typeMap[event.type] || "note",
        text: text,
        createdBy: auth.currentUser.displayName || auth.currentUser.email || "Fuarbot",
        createdByUid: auth.currentUser.uid,
        createdAt: timestamp
      });
    }
  } catch (err) {
    console.error("Timeline event error:", err);
  }
}

// ---- CRM Integration Helpers ----
export async function syncToCrm(contactId, contactData, user, messeName) {
  if (!db) return;
  try {
    const { setDoc } = await import("firebase/firestore");
    const crmData = {
      name: contactData.name || "",
      company: contactData.company || "",
      position: contactData.position || "",
      email: contactData.email || "",
      phone: contactData.phone || "",
      mobile: contactData.mobile || "",
      website: contactData.website || "",
      address: contactData.address || "",
      notes: contactData.notes || "",
      source: messeName ? `Fuarbot: ${messeName}` : "Fuarbot",
      status: "new",
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, "crm_customers", contactId), crmData, { merge: true });
  } catch (err) {
    console.error("CRM sync error:", err);
  }
}

// ---- Customer Avatar Upload ----
export async function uploadCustomerAvatarBase64(contactId, dataUrl) {
  if (!app) return null;
  try {
    const { getStorage, ref, uploadString, getDownloadURL } = await import("firebase/storage");
    const sRef = ref(getStorage(app), `customers/${contactId}/avatar_${Date.now()}.jpg`);
    await uploadString(sRef, dataUrl, "data_url");
    return await getDownloadURL(sRef);
  } catch (err) {
    console.error("Avatar upload error:", err);
    return null;
  }
}


export function isFirebaseConfigured() { return !!db; }

// ---- User Settings (SMTP etc.) ----
export async function saveUserSettings(userId, settings) {
  if (!db) return;
  try {
    const { setDoc } = await import("firebase/firestore");
    await setDoc(doc(db, "userSettings", userId), {
      ...settings,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Save settings error:", err);
  }
}

export async function getUserSettings(userId) {
  if (!db) return null;
  try {
    const { getDoc } = await import("firebase/firestore");
    const snap = await getDoc(doc(db, "userSettings", userId));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error("Get settings error:", err);
    return null;
  }
}

export { db, auth };
