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
  let unsubFallback;
  const q = query(
    collection(db, "contacts"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const unsubMain = onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, () => {
    // Fallback if composite index not ready yet
    const fq = query(collection(db, "contacts"), orderBy("createdAt", "desc"));
    unsubFallback = onSnapshot(fq, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((c) => c.userId === userId));
    });
  });
  return () => {
    unsubMain();
    if (unsubFallback) unsubFallback();
  };
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
  
      const activityData = {
        parentId: contactId,
        parentType: "kunde",
        type: typeMap[event.type] || "note",
        text: text,
        createdBy: auth.currentUser.displayName || auth.currentUser.email || "Fuarbot",
        createdByUid: auth.currentUser.uid,
        createdAt: timestamp
      };
      if (event.htmlBody) activityData.htmlBody = event.htmlBody;
      if (event.message) activityData.text = text + "\n\n" + event.message;

      await addDoc(collection(db, "crm_activities"), activityData);
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
      customerAvatar: contactData.customerAvatar || null,
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

// ---- CRM Quotes Sync (crm_quotes collection — readable without auth for WindoformDepo) ----
export async function syncQuoteToCrm(contactId, quoteData, contactData) {
  if (!db) return;
  try {
    const { setDoc } = await import("firebase/firestore");
    const docId = quoteData.quoteNumber || `${contactId}_${Date.now()}`;
    await setDoc(doc(db, "crm_quotes", docId), {
      contactId,
      quoteNumber:    quoteData.quoteNumber    || "",
      product:        quoteData.product        || quoteData.lines?.[0]?.product || "",
      lines:          quoteData.lines          || [],
      totalNet:       quoteData.totalNet       || 0,
      totalGross:     quoteData.totalGross     || quoteData.totalNet || 0,
      currency:       quoteData.currency       || "EUR",
      status:         quoteData.status         || "draft",
      createdAt:      quoteData.createdAt      || new Date().toISOString(),
      sentAt:         quoteData.sentAt         || null,
      // Recipient snapshot for PDF preview in WindoformDepo
      contactName:    contactData?.name        || "",
      contactCompany: contactData?.company     || "",
      contactEmail:   contactData?.email       || "",
      contactPhone:   contactData?.phone || contactData?.mobile || "",
      contactAddress: contactData?.address     || "",
      // Exact PDF binary as base64 — identical to the email attachment
      ...(quoteData.pdfBase64 ? { pdfBase64: quoteData.pdfBase64 } : {}),
    }, { merge: true });
  } catch (err) {
    console.error("CRM quote sync error:", err);
  }
}

// ---- Migrate existing quotes → crm_quotes (one-time, run from settings) ----
export async function migrateAllQuotesToCrm(userId) {
  if (!db || !userId) return 0;
  try {
    const { getDocs, query: fbQuery, where: fbWhere, setDoc: fbSetDoc } = await import("firebase/firestore");
    const q = fbQuery(collection(db, "quotes"), fbWhere("userId", "==", userId));
    const snap = await getDocs(q);
    let count = 0;
    for (const d of snap.docs) {
      const data = d.data();
      const docId = data.quoteNumber || d.id;
      await fbSetDoc(doc(db, "crm_quotes", docId), {
        contactId:   data.contactId   || "",
        quoteNumber: data.quoteNumber || "",
        product:     data.product     || data.lines?.[0]?.product || "",
        lines:       data.lines       || [],
        totalNet:    data.totalNet    || 0,
        currency:    data.currency    || "EUR",
        status:      data.status      || "draft",
        createdAt:   data.createdAt   || new Date().toISOString(),
        sentAt:      data.sentAt      || null,
      }, { merge: true });
      count++;
    }
    return count;
  } catch (err) {
    console.error("Quote migration error:", err);
    return 0;
  }
}

// ---- Quotes (Angebote) ----
export async function saveQuote(quoteData) {
  if (!db) return null;
  try {
    const docRef = await addDoc(collection(db, "quotes"), {
      ...quoteData,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (err) {
    console.error("Save quote error:", err);
    return null;
  }
}

export async function getContactQuotes(userId, contactId) {
  if (!db) return [];
  try {
    const { getDocs, query: fbQuery, where: fbWhere, orderBy: fbOrderBy } = await import("firebase/firestore");
    const q = fbQuery(
      collection(db, "quotes"),
      fbWhere("userId", "==", userId),
      fbWhere("contactId", "==", contactId),
      fbOrderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Get quotes error:", err);
    return [];
  }
}

export function subscribeToContactQuotes(userId, contactId, callback) {
  if (!db) { callback([]); return () => {}; }
  const q = query(
    collection(db, "quotes"),
    where("userId", "==", userId),
    where("contactId", "==", contactId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, (err) => {
    console.error("Quote subscription error (missing index?):", err);
    // Fallback if composite index not ready yet
    const fq = query(collection(db, "quotes"), orderBy("createdAt", "desc"));
    onSnapshot(fq, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .filter((q) => q.userId === userId && q.contactId === contactId));
    }, (err2) => {
      // Ultimate fallback if even orderBy desc isn't allowed (should be allowed by default though)
      const uq = query(collection(db, "quotes"));
      onSnapshot(uq, (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          .filter((q) => q.userId === userId && q.contactId === contactId);
        docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        callback(docs);
      });
    });
  });
}

export function subscribeToAllQuotes(userId, callback) {
  if (!db) { callback([]); return () => {}; }
  const q = query(
    collection(db, "quotes"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, () => {
    // Fallback without composite index
    const fq = query(collection(db, "quotes"), orderBy("createdAt", "desc"));
    onSnapshot(fq, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .filter((q) => q.userId === userId));
    });
  });
}

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
