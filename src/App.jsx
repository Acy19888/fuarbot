import { useState, useEffect, useRef } from "react";
import {
  saveContactToFirebase, subscribeToContacts, isFirebaseConfigured,
  updateContactInFirebase, deleteContactFromFirebase,
  loginUser, registerUser, logoutUser, onAuthChange,
  saveUserSettings, getUserSettings,
} from "./firebase.js";

// ============================================================
// CONFIG
// ============================================================
const MESSEN = [
  { id: "fensterbau2026", name: "Fensterbau Frontale", city: "Nürnberg", year: "2026", date: "18.–21. März 2026" },
  { id: "bau2027", name: "BAU", city: "München", year: "2027", date: "11.–16. Januar 2027" },
];

const T = {
  bg: "#0A1628", sf: "#0F2035", sf2: "#142A42", acc: "#2B5597",
  accH: "#3A6BB5", accG: "rgba(43,85,151,0.15)", accS: "#4A8FD4",
  ok: "#34D399", okG: "rgba(52,211,153,0.12)", tx: "#ECE9E1",
  txM: "#A7A9AC", txD: "#6d6e71", bd: "#1E3A5A", wh: "#FFF",
  warn: "#FBBF24",
};

const S = {
  card: { background: T.sf, borderRadius: 16, border: `1px solid ${T.bd}` },
  input: {
    width: "100%", padding: "12px 16px", background: T.bg, border: `1px solid ${T.bd}`,
    borderRadius: 12, color: T.tx, fontSize: 15, outline: "none",
    fontFamily: "'Montserrat',sans-serif", transition: "border-color .2s",
  },
  label: { fontSize: 11, color: T.txM, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6, display: "block" },
  btn: (bg, c) => ({
    width: "100%", padding: "16px", background: bg, border: "none", borderRadius: 14,
    cursor: "pointer", fontSize: 15, fontWeight: 700, color: c,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
  }),
};

// ============================================================
// Scan + Email API
// ============================================================
async function scanCard(base64, mediaType) {
  try {
    const res = await fetch("/api/scan", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64, mediaType }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.contact : null;
  } catch { return null; }
}

async function sendEmail(to, contactName, messeName, salesPerson, smtp) {
  if (!smtp?.smtpHost || !smtp?.smtpUser || !smtp?.smtpPass) return null;
  try {
    const res = await fetch("/api/email", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to, contactName, messeName, salesPerson,
        smtpHost: smtp.smtpHost, smtpPort: smtp.smtpPort,
        smtpUser: smtp.smtpUser, smtpPass: smtp.smtpPass,
        smtpFrom: smtp.smtpFrom || smtp.smtpUser,
        companyName: smtp.companyName, catalogUrl: smtp.catalogUrl,
      }),
    });
    const data = await res.json();
    if (data.success) return data.language || "en";
    return null;
  } catch { return null; }
}

const LANG_LABELS = { de: "Deutsch", tr: "Türkçe", en: "English", es: "Español", fr: "Français", it: "Italiano" };

function demoContact() {
  const d = [
    { name: "Dr. Stefan Müller", company: "Siemens AG", position: "Head of Digital Transformation", email: "s.mueller@siemens.com", phone: "+49 89 636 00", mobile: "", website: "siemens.com", address: "München", linkedin: "", notes: "" },
    { name: "Ayşe Demir", company: "Bosch Türkiye", position: "Business Development", email: "ayse.demir@bosch.com.tr", phone: "+90 216 432 0000", mobile: "", website: "bosch.com.tr", address: "Istanbul", linkedin: "", notes: "" },
  ];
  return d[Math.floor(Math.random() * d.length)];
}

// ============================================================
// Icons
// ============================================================
function Ic({ name, size = 20, color = T.tx }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    camera: <svg {...p}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    check: <svg {...p} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
    users: <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    mail: <svg {...p}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    search: <svg {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    download: <svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    phone: <svg {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    building: <svg {...p}><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><line x1="9" y1="18" x2="15" y2="18"/></svg>,
    back: <svg {...p}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
    edit: <svg {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    globe: <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    clock: <svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    zap: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    image: <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
    refresh: <svg {...p}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
    logout: <svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    lock: <svg {...p}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    map: <svg {...p}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
    linkedin: <svg {...p}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>,
    db: <svg {...p}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
    wifiOff: <svg {...p}><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><circle cx="12" cy="20" r="1" fill={color}/></svg>,
  };
  return icons[name] || null;
}

// ============================================================
// APP
// ============================================================
export default function App() {
  // Auth state
  const [user, setUser] = useState(undefined); // undefined=loading, null=logged out
  const [authView, setAuthView] = useState("login"); // login | register
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Messe selection
  const [selectedMesse, setSelectedMesse] = useState(null);

  // SMTP settings per user (stored in Firebase under users/{uid}/settings)
  const [smtp, setSmtp] = useState({ smtpHost: "", smtpPort: "465", smtpUser: "", smtpPass: "", smtpFrom: "", companyName: "Windoform", catalogUrl: "https://windoform.de" });
  const [smtpSaved, setSmtpSaved] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);

  const SMTP_PRESETS = [
    { label: "Google Workspace / Gmail", host: "smtp.gmail.com", port: "465" },
    { label: "Microsoft 365 / Outlook", host: "smtp.office365.com", port: "587" },
    { label: "United Domains", host: "smtp.udag.de", port: "465" },
    { label: "IONOS / 1&1", host: "smtp.ionos.de", port: "465" },
    { label: "Strato", host: "smtp.strato.de", port: "465" },
    { label: "Hetzner", host: "mail.your-server.de", port: "465" },
    { label: "Anderer", host: "", port: "465" },
  ];

  // App state
  const [view, setView] = useState("home");
  const [contacts, setContacts] = useState([]);
  const [current, setCurrent] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [capturedImg, setCapturedImg] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [toast, setToast] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [demoMode, setDemoMode] = useState(false);
  const [editingContact, setEditingContact] = useState(null); // for editing existing contacts
  const [showDupeWarning, setShowDupeWarning] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);

  // Listen for auth changes
  useEffect(() => {
    return onAuthChange(async (u) => {
      setUser(u || null);
      // Load SMTP settings from Firebase
      if (u && isFirebaseConfigured()) {
        try {
          const { getDoc, doc: fbDoc } = await import("firebase/firestore");
          const { db: fbDb } = await import("./firebase.js");
          const snap = await getDoc(fbDoc(fbDb, "userSettings", u.uid));
          if (snap.exists()) {
            const d = snap.data();
            setSmtp(d.smtp || smtp);
            setSmtpSaved(!!d.smtp?.smtpHost);
          }
        } catch (e) { console.log("No SMTP settings yet"); }
      }
    });
  }, []);

  // Subscribe to contacts when user + messe selected
  useEffect(() => {
    if (!user || !selectedMesse) return;
    const unsub = subscribeToContacts(user.uid, (data) => {
      // Filter by selected messe
      setContacts(data.filter((c) => c.messeId === selectedMesse.id));
    });
    return unsub;
  }, [user, selectedMesse]);

  useEffect(() => () => stopCamera(), []);

  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ---- AUTH ----
  const handleLogin = async () => {
    setAuthError("");
    setAuthLoading(true);
    try {
      await loginUser(authEmail.trim(), authPass);
    } catch (err) {
      const msg = err.code === "auth/invalid-credential" ? "Email oder Passwort falsch"
        : err.code === "auth/user-not-found" ? "Kein Konto mit dieser Email"
        : err.code === "auth/too-many-requests" ? "Zu viele Versuche – warte kurz"
        : err.message;
      setAuthError(msg);
    }
    setAuthLoading(false);
  };

  const handleRegister = async () => {
    setAuthError("");
    if (!authName.trim()) { setAuthError("Name eingeben"); return; }
    if (authPass.length < 6) { setAuthError("Passwort muss min. 6 Zeichen haben"); return; }
    setAuthLoading(true);
    try {
      await registerUser(authEmail.trim(), authPass, authName.trim());
    } catch (err) {
      const msg = err.code === "auth/email-already-in-use" ? "Email wird bereits verwendet"
        : err.code === "auth/weak-password" ? "Passwort zu schwach (min. 6 Zeichen)"
        : err.code === "auth/invalid-email" ? "Ungültige Email-Adresse"
        : err.message;
      setAuthError(msg);
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await logoutUser();
    setSelectedMesse(null);
    setContacts([]);
    setView("home");
  };

  // ---- CAMERA ----
  const startCamera = async () => {
    setCameraError(null); setCapturedImg(null); setView("scan");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false,
      });
      streamRef.current = stream; setCameraActive(true);
      await new Promise((r) => setTimeout(r, 100));
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.setAttribute("playsinline", "true"); await videoRef.current.play(); }
    } catch (err) {
      setCameraError(err.name === "NotAllowedError" ? "Kamera-Zugriff verweigert. Bitte erlaube den Zugriff." : "Keine Kamera gefunden.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; setCameraActive(false); };

  const capturePhoto = () => {
    const v = videoRef.current; if (!v) return;
    const c = canvasRef.current || document.createElement("canvas");
    c.width = v.videoWidth || 1280; c.height = v.videoHeight || 720;
    c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
    const d = c.toDataURL("image/jpeg", 0.85);
    setCapturedImg(d); stopCamera(); processImage(d, "image/jpeg");
  };

  const handleFileUpload = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => { setCapturedImg(ev.target.result); setView("scan"); processImage(ev.target.result, f.type || "image/jpeg"); };
    r.readAsDataURL(f); e.target.value = "";
  };

  const processImage = async (dataUrl, mediaType) => {
    setScanning(true);
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    const mType = dataUrl.match(/^data:(image\/\w+);/)?.[1] || mediaType;
    let contact = await scanCard(base64, mType);
    if (contact) { setDemoMode(false); notify("Visitenkarte erkannt!"); }
    else { setDemoMode(true); await new Promise((r) => setTimeout(r, 1500)); contact = demoContact(); notify("Demo-Modus", "warn"); }
    setCurrent({ ...contact, scannedBy: user?.displayName || user?.email || "?", scannedAt: new Date().toISOString(), messe: selectedMesse?.name + " " + selectedMesse?.city, messeId: selectedMesse?.id, userId: user?.uid, emailSent: false, notes: "" });
    setScanning(false); setView("review");
  };

  // ---- DUPLICATE CHECK ----
  const findDuplicate = (contact) => {
    if (!contact) return null;
    const email = (contact.email || "").toLowerCase().trim();
    const name = (contact.name || "").toLowerCase().trim();
    return contacts.find((c) => {
      if (email && c.email && c.email.toLowerCase().trim() === email) return true;
      if (name && c.name && c.name.toLowerCase().trim() === name && c.company && contact.company && c.company.toLowerCase().trim() === (contact.company || "").toLowerCase().trim()) return true;
      return false;
    });
  };

  // ---- SAVE ----
  const saveContact = async (withEmail = true, forceOverwrite = false) => {
    if (!current) return;

    // Duplicate check
    if (!forceOverwrite && !editingContact) {
      const dupe = findDuplicate(current);
      if (dupe) {
        setShowDupeWarning({ existing: dupe, withEmail });
        return;
      }
    }

    const contactData = { ...current, emailSent: false, savedAt: new Date().toISOString() };

    // If editing existing contact, update instead of create
    if (editingContact) {
      await updateContactInFirebase(editingContact.id, contactData);
      notify("Kontakt aktualisiert");
    } else {
      await saveContactToFirebase(contactData);
    }

    if (withEmail && current.email) {
      const lang = await sendEmail(current.email, current.name, selectedMesse?.name + " " + selectedMesse?.city, user?.displayName || user?.email, smtp);
      if (lang) { contactData.emailSent = true; setEmailSent(true); setTimeout(() => setEmailSent(false), 2500); notify(`Email (${LANG_LABELS[lang] || lang}) an ${current.email} gesendet!`); }
      else notify(smtpSaved ? "Email fehlgeschlagen – SMTP prüfen" : "Bitte zuerst Email in Settings einrichten", "error");
    } else if (withEmail && !current.email) { notify("Keine Email-Adresse", "warn"); }
    else if (!editingContact) { notify("Kontakt gespeichert"); }

    setCurrent(null); setCapturedImg(null); setEditingContact(null); setShowDupeWarning(null); setView("home");
  };

  // ---- EDIT ----
  const startEditing = (contact) => {
    setEditingContact(contact);
    setCurrent({ ...contact });
    setCapturedImg(null);
    setView("review");
  };

  // ---- DELETE ----
  const deleteContact = async (contact) => {
    if (!contact?.id) return;
    await deleteContactFromFirebase(contact.id);
    notify("Kontakt gelöscht");
    setCurrent(null); setEditingContact(null); setView("contacts");
  };

  const upd = (k, v) => setCurrent((p) => ({ ...p, [k]: v }));

  const exportCSV = () => {
    const h = ["Name", "Firma", "Position", "Email", "Telefon", "Mobil", "Website", "Adresse", "Gescannt von", "Datum", "Messe", "Notizen"];
    const rows = contacts.map((c) => [c.name, c.company, c.position, c.email, c.phone, c.mobile, c.website, c.address, c.scannedBy, new Date(c.scannedAt).toLocaleDateString("de-DE"), c.messe, c.notes].map((v) => `"${(v || "").replace(/"/g, '""')}"`));
    const blob = new Blob(["\ufeff" + [h.join(","), ...rows.map((r) => r.join(","))].join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `fuarbot-${selectedMesse?.id || "export"}-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    notify("CSV exportiert!");
  };

  const filtered = contacts.filter((c) => {
    if (!searchQ) return true;
    const q = searchQ.toLowerCase();
    return [c.name, c.company, c.email, c.position].some((f) => f?.toLowerCase().includes(q));
  });

  const stats = {
    total: contacts.length,
    today: contacts.filter((c) => new Date(c.scannedAt).toDateString() === new Date().toDateString()).length,
    emailed: contacts.filter((c) => c.emailSent).length,
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'Montserrat','Segoe UI',sans-serif", color: T.tx, maxWidth: 480, margin: "0 auto", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.1);opacity:.6}}
        @keyframes slideUp{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes toastIn{from{transform:translate(-50%,-120%)}to{transform:translate(-50%,0)}}
        @keyframes burst{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
        @keyframes scanLine{0%{top:10%}100%{top:85%}}
        *{box-sizing:border-box;margin:0;padding:0}
        input,textarea,select{font-family:'Montserrat',sans-serif}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:${T.bd};border-radius:4px}
        video::-webkit-media-controls{display:none!important}
      `}</style>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />

      {/* Toast */}
      {toast && <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: toast.type === "error" ? T.acc : toast.type === "warn" ? T.warn : T.ok, color: toast.type === "warn" ? "#000" : T.wh, padding: "12px 24px", borderRadius: 14, fontSize: 13, fontWeight: 600, zIndex: 1000, animation: "toastIn .3s ease", boxShadow: "0 12px 40px rgba(0,0,0,.5)", maxWidth: "88%", textAlign: "center" }}>{toast.msg}</div>}

      {/* Email overlay */}
      {emailSent && <div style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(11,14,20,.92)", backdropFilter: "blur(16px)" }}><div style={{ textAlign: "center", animation: "burst .5s ease" }}><div style={{ width: 88, height: 88, borderRadius: "50%", background: T.okG, border: `2px solid ${T.ok}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}><Ic name="mail" size={36} color={T.ok} /></div><p style={{ fontSize: 20, fontWeight: 700 }}>Email gesendet!</p></div></div>}

      {/* Duplicate Warning Modal */}
      {showDupeWarning && (
        <div style={{ position: "fixed", inset: 0, zIndex: 998, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(11,14,20,.92)", backdropFilter: "blur(12px)", padding: 24 }}>
          <div style={{ ...S.card, padding: 24, maxWidth: 360, width: "100%", animation: "slideUp .3s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(251,191,36,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ic name="users" size={20} color={T.warn} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Mögliche Dublette</h3>
            </div>
            <p style={{ fontSize: 13, color: T.txM, lineHeight: 1.6, marginBottom: 16 }}>
              Ein ähnlicher Kontakt existiert bereits:
            </p>
            <div style={{ background: T.bg, borderRadius: 10, padding: 14, border: `1px solid ${T.bd}`, marginBottom: 20 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: T.tx }}>{showDupeWarning.existing.name}</p>
              <p style={{ fontSize: 12, color: T.txM }}>{showDupeWarning.existing.company}</p>
              <p style={{ fontSize: 11, color: T.txD, marginTop: 4 }}>{showDupeWarning.existing.email}</p>
            </div>
            <button onClick={() => saveContact(showDupeWarning.withEmail, true)} style={{ ...S.btn(`linear-gradient(135deg,${T.acc},#1E4080)`, T.wh), marginBottom: 10, fontSize: 13, padding: 14 }}>
              Trotzdem speichern
            </button>
            <button onClick={() => { startEditing(showDupeWarning.existing); setShowDupeWarning(null); }} style={{ ...S.btn(T.sf2, T.accS), border: `1px solid ${T.bd}`, marginBottom: 10, fontSize: 13, padding: 14 }}>
              Bestehenden bearbeiten
            </button>
            <button onClick={() => { setShowDupeWarning(null); }} style={{ ...S.btn("transparent", T.txM), fontSize: 13, padding: 14 }}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* ============ LOADING ============ */}
      {user === undefined && (
        <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 48, height: 48, border: `3px solid ${T.bd}`, borderTopColor: T.acc, borderRadius: "50%", animation: "pulse 1s linear infinite", margin: "0 auto 16px" }} />
            <p style={{ color: T.txM }}>Laden...</p>
          </div>
        </div>
      )}

      {/* ============ LOGIN ============ */}
      {user === null && (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 24px", animation: "fadeIn .4s" }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: T.acc, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: `0 8px 32px rgba(43,85,151,.4)` }}>
              <svg width="36" height="36" viewBox="0 0 100 80" fill="none">
                <path d="M10 10 L25 70 L38 30 L50 70 L62 30 L75 70 L90 10" stroke="#fff" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.02em" }}>WINDOFORM</h1>
            <p style={{ fontSize: 13, color: T.txM, marginTop: 4, letterSpacing: ".1em", fontWeight: 500 }}>FUAR ASISTANI</p>
          </div>

          {/* Form */}
          <div style={{ ...S.card, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, textAlign: "center" }}>
              {authView === "login" ? "Anmelden" : "Konto erstellen"}
            </h2>

            {authView === "register" && (
              <div style={{ marginBottom: 14 }}>
                <label style={S.label}>Name</label>
                <input type="text" placeholder="Dein Name" value={authName} onChange={(e) => setAuthName(e.target.value)} style={S.input} onFocus={(e) => e.target.style.borderColor = T.acc} onBlur={(e) => e.target.style.borderColor = T.bd} />
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Email</label>
              <input type="email" placeholder="name@windoform.de" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} style={S.input} onFocus={(e) => e.target.style.borderColor = T.acc} onBlur={(e) => e.target.style.borderColor = T.bd} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={S.label}>Passwort</label>
              <input type="password" placeholder="••••••" value={authPass} onChange={(e) => setAuthPass(e.target.value)} style={S.input} onFocus={(e) => e.target.style.borderColor = T.acc} onBlur={(e) => e.target.style.borderColor = T.bd}
                onKeyDown={(e) => e.key === "Enter" && (authView === "login" ? handleLogin() : handleRegister())}
              />
            </div>

            {authError && <p style={{ color: T.acc, fontSize: 13, marginBottom: 14, textAlign: "center" }}>{authError}</p>}

            <button onClick={authView === "login" ? handleLogin : handleRegister} disabled={authLoading} style={{ ...S.btn(`linear-gradient(135deg,${T.acc},#1E4080)`, T.wh), opacity: authLoading ? .6 : 1, boxShadow: `0 6px 24px rgba(43,85,151,.3)` }}>
              <Ic name="lock" size={18} color={T.wh} />
              {authLoading ? "..." : authView === "login" ? "Anmelden" : "Registrieren"}
            </button>

            <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: T.txM }}>
              {authView === "login" ? "Noch kein Konto? " : "Schon ein Konto? "}
              <button onClick={() => { setAuthView(authView === "login" ? "register" : "login"); setAuthError(""); }} style={{ background: "none", border: "none", color: T.acc, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {authView === "login" ? "Registrieren" : "Anmelden"}
              </button>
            </p>
          </div>
        </div>
      )}

      {/* ============ MESSE SELECTION ============ */}
      {user && !selectedMesse && view !== "scan" && (
        <div style={{ minHeight: "100vh", padding: "40px 24px", animation: "fadeIn .4s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36 }}>
            <div>
              <p style={{ fontSize: 13, color: T.txM }}>Willkommen,</p>
              <h1 style={{ fontSize: 22, fontWeight: 800 }}>{user.displayName || user.email}</h1>
            </div>
            <button onClick={handleLogout} style={{ background: T.sf, border: `1px solid ${T.bd}`, borderRadius: 10, padding: "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: T.txM, fontSize: 12, fontWeight: 600 }}>
              <Ic name="logout" size={14} color={T.txM} /> Logout
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <Ic name="map" size={20} color={T.acc} />
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Messe auswählen</h2>
          </div>

          {MESSEN.map((m, i) => (
            <button key={m.id} onClick={() => setSelectedMesse(m)} style={{
              ...S.card, width: "100%", padding: "20px 24px", marginBottom: 12, cursor: "pointer",
              textAlign: "left", display: "block", animation: `slideUp .4s ease ${i * .1}s both`,
              transition: "border-color .2s",
            }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = T.acc}
              onMouseOut={(e) => e.currentTarget.style.borderColor = T.bd}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: T.tx, marginBottom: 4 }}>{m.name}</h3>
                  <p style={{ fontSize: 14, color: T.accS, fontWeight: 500 }}>{m.city} {m.year}</p>
                  <p style={{ fontSize: 12, color: T.txD, marginTop: 4 }}>{m.date}</p>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: T.accG, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Ic name="map" size={18} color={T.acc} />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ============ HOME ============ */}
      {user && selectedMesse && view === "home" && (
        <div style={{ padding: "24px 20px 110px", animation: "fadeIn .3s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: T.acc, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 16px rgba(43,85,151,.3)` }}>
                  <svg width="20" height="20" viewBox="0 0 100 80" fill="none"><path d="M10 10 L25 70 L38 30 L50 70 L62 30 L75 70 L90 10" stroke="#fff" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                </div>
                <div>
                  <h1 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-.01em", lineHeight: 1 }}>WINDOFORM</h1>
                  <p style={{ fontSize: 9, color: T.txM, letterSpacing: ".1em", fontWeight: 600 }}>FUAR ASISTANI</p>
                </div>
              </div>
              <p style={{ fontSize: 13, color: T.accS, fontWeight: 500 }}>{selectedMesse.name} – {selectedMesse.city}</p>
              <p style={{ fontSize: 12, color: T.txD, marginTop: 2 }}>{user.displayName || user.email}</p>
            </div>
            <button onClick={() => setSelectedMesse(null)} style={{ background: T.sf, border: `1px solid ${T.bd}`, borderRadius: 10, padding: "8px 12px", cursor: "pointer", color: T.txM, fontSize: 11, fontWeight: 600 }}>
              Messe wechseln
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 28 }}>
            {[
              { l: "Gesamt", v: stats.total, c: T.acc },
              { l: "Heute", v: stats.today, c: T.accS },
              { l: "Emails", v: stats.emailed, c: T.ok },
            ].map((s, i) => (
              <div key={i} style={{ ...S.card, padding: "14px 16px", textAlign: "center", animation: `slideUp .4s ease ${i * .07}s both` }}>
                <span style={{ fontSize: 11, color: T.txM, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 6 }}>{s.l}</span>
                <span style={{ fontSize: 26, fontWeight: 800, color: s.c, fontFamily: "'JetBrains Mono',monospace" }}>{s.v}</span>
              </div>
            ))}
          </div>

          <button onClick={startCamera} style={{ ...S.btn(`linear-gradient(135deg,${T.acc},#1E4080)`, T.wh), marginBottom: 10, boxShadow: `0 8px 32px rgba(43,85,151,.4)`, padding: "20px", fontSize: 17 }}>
            <Ic name="camera" size={24} color={T.wh} /> Visitenkarte scannen
          </button>
          <button onClick={() => fileRef.current?.click()} style={{ ...S.btn("transparent", T.txM), border: `1px dashed ${T.bd}`, marginBottom: 28, padding: 14, fontSize: 14, fontWeight: 500 }}>
            📷 Foto aus Galerie wählen
          </button>

          {/* Contacts */}
          {contacts.length > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>Meine Kontakte</h2>
                <button onClick={() => setView("contacts")} style={{ background: "none", border: "none", color: T.acc, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Alle →</button>
              </div>
              {contacts.slice(0, 4).map((c, i) => (
                <div key={c.id} style={{ ...S.card, padding: "14px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, animation: `slideUp .3s ease ${i * .05}s both` }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, flexShrink: 0, background: `linear-gradient(135deg,${T.sf2},${T.bd})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: T.acc }}>
                    {c.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</p>
                    <p style={{ fontSize: 11, color: T.txM, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.company}{c.position ? ` · ${c.position}` : ""}</p>
                  </div>
                  {c.emailSent && <div style={{ width: 22, height: 22, borderRadius: 6, background: T.okG, display: "flex", alignItems: "center", justifyContent: "center" }}><Ic name="mail" size={11} color={T.ok} /></div>}
                </div>
              ))}
            </>
          )}
          {contacts.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <Ic name="camera" size={30} color={T.txD} />
              <p style={{ fontSize: 15, fontWeight: 600, color: T.txM, marginTop: 12 }}>Noch keine Kontakte</p>
              <p style={{ fontSize: 13, color: T.txD, marginTop: 6 }}>Scanne deine erste Visitenkarte</p>
            </div>
          )}
        </div>
      )}

      {/* ============ SCAN ============ */}
      {view === "scan" && (
        <div style={{ height: "100vh", position: "relative", background: "#000", animation: "fadeIn .2s" }}>
          <div style={{ width: "100%", height: "70%", position: "relative", overflow: "hidden" }}>
            {capturedImg ? <img src={capturedImg} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", background: "#111" }} /> : (
              <>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                {cameraError && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.9)", padding: 32 }}><div style={{ textAlign: "center" }}><Ic name="wifiOff" size={40} color={T.acc} /><p style={{ color: T.tx, fontSize: 14, marginTop: 16, lineHeight: 1.6 }}>{cameraError}</p><button onClick={() => fileRef.current?.click()} style={{ marginTop: 20, padding: "12px 28px", background: T.acc, border: "none", borderRadius: 10, color: T.wh, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Foto hochladen</button></div></div>}
                {cameraActive && !cameraError && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: "88%", height: "52%", position: "relative", border: `2px solid rgba(43,85,151,.4)`, borderRadius: 16 }}>
                      <div style={{ position: "absolute", left: "5%", right: "5%", height: 2, background: `linear-gradient(90deg, transparent, ${T.acc}, transparent)`, animation: "scanLine 2s ease-in-out infinite alternate", boxShadow: `0 0 12px ${T.acc}` }} />
                      {[["top","left"],["top","right"],["bottom","left"],["bottom","right"]].map(([v,h]) => <div key={v+h} style={{ position: "absolute", [v]: -2, [h]: -2, width: 24, height: 24, borderColor: T.acc, borderStyle: "solid", borderWidth: 0, [`border${v==="top"?"Top":"Bottom"}Width`]: 3, [`border${h==="left"?"Left":"Right"}Width`]: 3, borderRadius: 8 }} />)}
                      <p style={{ position: "absolute", bottom: -40, width: "100%", textAlign: "center", fontSize: 13, color: "rgba(255,255,255,.6)", fontWeight: 500 }}>Visitenkarte im Rahmen positionieren</p>
                    </div>
                  </div>
                )}
              </>
            )}
            {scanning && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(11,14,20,.88)", backdropFilter: "blur(10px)", zIndex: 10 }}><div style={{ textAlign: "center" }}><div style={{ width: 84, height: 84, margin: "0 auto 20px", border: `3px solid ${T.acc}`, borderRadius: 18, animation: "pulse 1.2s ease-in-out infinite", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic name="zap" size={34} color={T.acc} /></div><p style={{ color: T.tx, fontSize: 17, fontWeight: 700 }}>AI analysiert Karte...</p></div></div>}
          </div>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 20px 44px", background: "linear-gradient(transparent, rgba(0,0,0,.95) 30%)" }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 24, alignItems: "center" }}>
              <button onClick={() => { stopCamera(); setView("home"); setCapturedImg(null); }} style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,.1)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic name="back" size={22} color={T.wh} /></button>
              {!capturedImg && cameraActive && <button onClick={capturePhoto} style={{ width: 76, height: 76, borderRadius: "50%", background: T.acc, border: `4px solid rgba(43,85,151,.35)`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 28px rgba(43,85,151,.5)` }}><div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,.3)" }} /></button>}
              {capturedImg && !scanning && <button onClick={() => { setCapturedImg(null); startCamera(); }} style={{ width: 76, height: 76, borderRadius: "50%", background: "rgba(255,255,255,.15)", border: `2px solid rgba(255,255,255,.3)`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic name="refresh" size={28} color={T.wh} /></button>}
              <button onClick={() => fileRef.current?.click()} style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,.1)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic name="image" size={22} color={T.wh} /></button>
            </div>
          </div>
        </div>
      )}

      {/* ============ REVIEW ============ */}
      {view === "review" && current && (
        <div style={{ padding: "20px 20px 150px", animation: "slideUp .35s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <button onClick={() => { setCurrent(null); setEditingContact(null); setView(editingContact ? "contacts" : "home"); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><Ic name="back" size={22} color={T.txM} /></button>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>{editingContact ? "Kontakt bearbeiten" : "Kontakt prüfen"}</h2>
          </div>
          {capturedImg && <div style={{ ...S.card, overflow: "hidden", marginBottom: 20, height: 140 }}><img src={capturedImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>}
          <div style={{ ...S.card, padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}><Ic name={editingContact ? "edit" : "zap"} size={14} color={editingContact ? T.accS : T.ok} /><span style={{ fontSize: 11, fontWeight: 700, color: editingContact ? T.accS : T.ok, textTransform: "uppercase", letterSpacing: ".06em" }}>{editingContact ? "Bearbeiten" : "AI-erkannt"}</span></div>
            {[{ k: "name", l: "Name" }, { k: "company", l: "Firma" }, { k: "position", l: "Position" }, { k: "email", l: "Email" }, { k: "phone", l: "Telefon" }, { k: "mobile", l: "Mobil" }, { k: "website", l: "Website" }, { k: "address", l: "Adresse" }, { k: "linkedin", l: "LinkedIn" }].map((f) => (
              <div key={f.k} style={{ marginBottom: 12 }}>
                <label style={S.label}>{f.l}</label>
                <input type="text" value={current[f.k] || ""} onChange={(e) => upd(f.k, e.target.value)} placeholder={`${f.l}...`} style={S.input} onFocus={(e) => e.target.style.borderColor = T.acc} onBlur={(e) => e.target.style.borderColor = T.bd} />
              </div>
            ))}
            <div><label style={S.label}>Notizen</label><textarea value={current.notes || ""} onChange={(e) => upd("notes", e.target.value)} placeholder="z.B. Interesse an Produkt X..." rows={3} style={{ ...S.input, resize: "vertical" }} onFocus={(e) => e.target.style.borderColor = T.acc} onBlur={(e) => e.target.style.borderColor = T.bd} /></div>
          </div>

          {/* Email preview – only for new contacts */}
          {!editingContact && (
            <div style={{ ...S.card, padding: 20, marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}><Ic name="mail" size={16} color={T.accS} /><span style={{ fontSize: 13, fontWeight: 600 }}>Follow-up Email</span></div>
              <div style={{ background: T.bg, borderRadius: 10, padding: 16, border: `1px solid ${T.bd}`, fontSize: 13, lineHeight: 1.7, color: T.txM }}>
                <p><span style={{ color: T.txD }}>An:</span> <span style={{ color: T.tx }}>{current.email || "—"}</span></p>
                <p><span style={{ color: T.txD }}>Betreff:</span> <span style={{ color: T.tx }}>Vielen Dank – {selectedMesse?.name} {selectedMesse?.city}</span></p>
                <hr style={{ border: "none", borderTop: `1px solid ${T.bd}`, margin: "12px 0" }} />
                <p>Sehr geehrte/r {current.name}, vielen Dank für Ihren Besuch...</p>
                <p style={{ marginTop: 8 }}><span style={{ color: T.acc }}>→ Katalog ansehen</span></p>
                <p style={{ marginTop: 8 }}>MfG, <span style={{ color: T.tx, fontWeight: 600 }}>{user?.displayName || user?.email}</span></p>
              </div>
            </div>
          )}

          {/* Delete button for existing contacts */}
          {editingContact && (
            <button onClick={() => { if (confirm("Kontakt wirklich löschen?")) deleteContact(editingContact); }} style={{ ...S.btn("transparent", "#EF4444"), border: "1px solid rgba(239,68,68,.3)", marginBottom: 24, padding: 12, fontSize: 13, fontWeight: 600 }}>
              Kontakt löschen
            </button>
          )}

          {/* Bottom actions */}
          <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", maxWidth: 480, width: "100%", padding: "16px 20px 32px", background: `linear-gradient(transparent, ${T.bg} 25%)` }}>
            {editingContact ? (
              <>
                <button onClick={() => saveContact(false)} style={{ ...S.btn(`linear-gradient(135deg,${T.acc},#1E4080)`, T.wh), boxShadow: `0 6px 24px rgba(43,85,151,.35)`, marginBottom: 10 }}><Ic name="check" size={18} color={T.wh} /> Änderungen speichern</button>
                <button onClick={() => saveContact(true)} style={{ ...S.btn(T.sf, T.txM), border: `1px solid ${T.bd}` }}><Ic name="mail" size={14} color={T.txM} /> Speichern + Email senden</button>
              </>
            ) : (
              <>
                <button onClick={() => saveContact(true)} style={{ ...S.btn(`linear-gradient(135deg,${T.acc},#1E4080)`, T.wh), boxShadow: `0 6px 24px rgba(43,85,151,.35)`, marginBottom: 10 }}><Ic name="check" size={18} color={T.wh} /> Speichern + Email senden</button>
                <button onClick={() => saveContact(false)} style={{ ...S.btn(T.sf, T.txM), border: `1px solid ${T.bd}` }}>Nur speichern</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ============ CONTACTS ============ */}
      {view === "contacts" && (
        <div style={{ padding: "20px 20px 110px", animation: "fadeIn .3s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <button onClick={() => setView("home")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><Ic name="back" size={22} color={T.txM} /></button>
            <h2 style={{ fontSize: 18, fontWeight: 700, flex: 1 }}>Meine Kontakte <span style={{ fontSize: 13, color: T.txM, fontWeight: 400 }}>({contacts.length})</span></h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, ...S.card, padding: "10px 16px", marginBottom: 20 }}><Ic name="search" size={16} color={T.txD} /><input type="text" placeholder="Suchen..." value={searchQ} onChange={(e) => setSearchQ(e.target.value)} style={{ flex: 1, background: "none", border: "none", color: T.tx, fontSize: 14, outline: "none" }} /></div>
          {filtered.map((c, i) => (
            <div key={c.id} onClick={() => startEditing(c)} style={{ ...S.card, padding: 16, marginBottom: 8, animation: `slideUp .3s ease ${i * .03}s both`, cursor: "pointer", transition: "border-color .2s" }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = T.acc + "66"}
              onMouseOut={(e) => e.currentTarget.style.borderColor = T.bd}
            >
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, background: `linear-gradient(135deg,${T.sf2},${T.bd})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: T.acc }}>{c.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{c.name}</p>
                  <p style={{ fontSize: 12, color: T.accS, fontWeight: 500 }}>{c.position}</p>
                  <p style={{ fontSize: 12, color: T.txM }}>{c.company}</p>
                  {c.email && <p style={{ fontSize: 11, color: T.txD, marginTop: 6 }}>{c.email}</p>}
                  {c.notes && <p style={{ fontSize: 12, color: T.txM, marginTop: 8, padding: "6px 10px", background: T.bg, borderRadius: 8, fontStyle: "italic" }}>{c.notes}</p>}
                </div>
                <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                  <Ic name="edit" size={16} color={T.txD} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.bd}` }}>
                <div style={{ display: "flex", gap: 6 }}>{c.emailSent && <span style={{ fontSize: 10, fontWeight: 600, color: T.ok, background: T.okG, padding: "3px 8px", borderRadius: 6 }}>✓ Email</span>}</div>
                <span style={{ fontSize: 11, color: T.txD }}>{new Date(c.scannedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p style={{ textAlign: "center", color: T.txM, padding: 40, fontSize: 14 }}>{searchQ ? "Keine Ergebnisse" : "Noch keine Kontakte"}</p>}
          {contacts.length > 0 && <button onClick={exportCSV} style={{ ...S.btn(T.sf, T.tx), border: `1px solid ${T.bd}`, marginTop: 16, fontSize: 14, fontWeight: 600 }}><Ic name="download" size={16} color={T.acc} /> CSV exportieren</button>}
        </div>
      )}

      {/* ============ SETTINGS ============ */}
      {view === "settings" && (
        <div style={{ padding: "20px 20px 110px", animation: "fadeIn .3s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <button onClick={() => setView("home")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><Ic name="back" size={22} color={T.txM} /></button>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Einstellungen</h2>
          </div>

          {/* Account */}
          <div style={{ ...S.card, padding: 20, marginBottom: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Konto</h3>
            <p style={{ fontSize: 14, color: T.tx, marginBottom: 4 }}>{user?.displayName}</p>
            <p style={{ fontSize: 13, color: T.txM, marginBottom: 16 }}>{user?.email}</p>
            <button onClick={handleLogout} style={{ ...S.btn("transparent", T.acc), border: `1px solid ${T.acc}33`, padding: 12, fontSize: 13, fontWeight: 600 }}><Ic name="logout" size={16} color={T.acc} /> Abmelden</button>
          </div>

          {/* Messe */}
          <div style={{ ...S.card, padding: 20, marginBottom: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Aktuelle Messe</h3>
            <p style={{ fontSize: 14, color: T.accS, fontWeight: 500 }}>{selectedMesse?.name} – {selectedMesse?.city}</p>
            <button onClick={() => setSelectedMesse(null)} style={{ ...S.btn(T.sf2, T.txM), border: `1px solid ${T.bd}`, padding: 12, fontSize: 13, fontWeight: 600, marginTop: 14 }}>Messe wechseln</button>
          </div>

          {/* Email / SMTP Setup */}
          <div style={{ ...S.card, padding: 20, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>Email-Versand</h3>
              {smtpSaved && <span style={{ fontSize: 10, fontWeight: 600, color: T.ok, background: T.okG, padding: "3px 10px", borderRadius: 6 }}>✓ Eingerichtet</span>}
            </div>

            {/* Preset buttons */}
            <label style={S.label}>Email-Anbieter</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {SMTP_PRESETS.map((p) => (
                <button key={p.label} onClick={() => setSmtp((s) => ({ ...s, smtpHost: p.host, smtpPort: p.port }))}
                  style={{
                    padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer",
                    background: smtp.smtpHost === p.host && p.host ? T.accG : T.bg,
                    border: `1px solid ${smtp.smtpHost === p.host && p.host ? T.acc : T.bd}`,
                    color: smtp.smtpHost === p.host && p.host ? T.acc : T.txM,
                  }}>
                  {p.label}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>SMTP Server</label>
              <input type="text" value={smtp.smtpHost} onChange={(e) => setSmtp((s) => ({ ...s, smtpHost: e.target.value }))} placeholder="smtp.gmail.com" style={S.input} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Port</label>
              <input type="text" value={smtp.smtpPort} onChange={(e) => setSmtp((s) => ({ ...s, smtpPort: e.target.value }))} placeholder="465" style={S.input} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>SMTP Benutzername (Login)</label>
              <input type="text" value={smtp.smtpUser} onChange={(e) => setSmtp((s) => ({ ...s, smtpUser: e.target.value }))} placeholder="z.B. user123 oder email@domain.de" style={S.input} />
              <p style={{ fontSize: 11, color: T.txD, marginTop: 4 }}>Bei den meisten Anbietern ist das deine Email. Bei United Domains etc. kann es ein separater Login sein.</p>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Absender-Email</label>
              <input type="email" value={smtp.smtpFrom} onChange={(e) => setSmtp((s) => ({ ...s, smtpFrom: e.target.value }))} placeholder="deinname@windoform.de" style={S.input} />
              <p style={{ fontSize: 11, color: T.txD, marginTop: 4 }}>Die Email die der Empfänger sieht (Von-Adresse).</p>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Passwort / App-Passwort</label>
              <input type="password" value={smtp.smtpPass} onChange={(e) => setSmtp((s) => ({ ...s, smtpPass: e.target.value }))} placeholder="••••••••" style={S.input} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Firmenname (in der Email)</label>
              <input type="text" value={smtp.companyName} onChange={(e) => setSmtp((s) => ({ ...s, companyName: e.target.value }))} placeholder="Windoform" style={S.input} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={S.label}>Katalog-URL (Link in der Email)</label>
              <input type="url" value={smtp.catalogUrl} onChange={(e) => setSmtp((s) => ({ ...s, catalogUrl: e.target.value }))} placeholder="https://windoform.de/katalog" style={S.input} />
            </div>

            {/* Save + Test buttons */}
            <button onClick={async () => {
              if (!smtp.smtpHost || !smtp.smtpUser || !smtp.smtpPass) { notify("Bitte alle Felder ausfüllen", "error"); return; }
              try {
                const { setDoc, doc: fbDoc } = await import("firebase/firestore");
                const { db: fbDb } = await import("./firebase.js");
                await setDoc(fbDoc(fbDb, "userSettings", user.uid), { smtp, updatedAt: new Date().toISOString() }, { merge: true });
                setSmtpSaved(true);
                notify("SMTP-Einstellungen gespeichert!");
              } catch (e) { notify("Speichern fehlgeschlagen: " + e.message, "error"); }
            }} style={{ ...S.btn(`linear-gradient(135deg,${T.acc},#1E4080)`, T.wh), marginBottom: 10, boxShadow: `0 4px 16px rgba(43,85,151,.25)` }}>
              Speichern
            </button>

            <button onClick={async () => {
              if (!smtp.smtpHost || !smtp.smtpUser || !smtp.smtpPass) { notify("Erst SMTP-Daten eingeben", "error"); return; }
              setSmtpTesting(true);
              const testTo = smtp.smtpFrom || smtp.smtpUser;
              const lang = await sendEmail(testTo, "Test", "Test-Messe", user?.displayName || "Test", smtp);
              setSmtpTesting(false);
              if (lang) notify("Test-Email gesendet an " + testTo + "!");
              else notify("Test fehlgeschlagen – Zugangsdaten prüfen", "error");
            }} disabled={smtpTesting} style={{ ...S.btn(T.sf2, T.txM), border: `1px solid ${T.bd}`, padding: 12, fontSize: 13, fontWeight: 600, opacity: smtpTesting ? .6 : 1 }}>
              <Ic name="mail" size={14} color={T.txM} />
              {smtpTesting ? "Sende Test-Email..." : "Test-Email an mich senden"}
            </button>
          </div>
        </div>
      )}

      {/* ============ NAV ============ */}
      {user && selectedMesse && view !== "scan" && (
        <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", maxWidth: 480, width: "100%", background: T.sf, borderTop: `1px solid ${T.bd}`, display: "flex", justifyContent: "space-around", padding: "12px 0 28px", zIndex: 100 }}>
          {[
            { id: "home", i: "camera", l: "Scan" },
            { id: "contacts", i: "users", l: "Kontakte" },
            { id: "settings", i: "db", l: "Setup" },
          ].map((nav) => (
            <button key={nav.id} onClick={() => setView(nav.id)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "4px 20px" }}>
              <Ic name={nav.i} size={20} color={view === nav.id ? T.acc : T.txD} />
              <span style={{ fontSize: 10, fontWeight: 600, color: view === nav.id ? T.acc : T.txD, textTransform: "uppercase", letterSpacing: ".05em" }}>{nav.l}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
