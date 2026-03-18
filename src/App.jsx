import { useState, useEffect, useRef } from "react";
import {
  saveContactToFirebase, subscribeToContacts, isFirebaseConfigured,
  updateContactInFirebase, deleteContactFromFirebase,
  loginUser, registerUser, logoutUser, onAuthChange,
  saveUserSettings, getUserSettings, addTimelineEvent, syncToCrm,
  uploadCustomerAvatarBase64
} from "./firebase.js";
import { detectSystemLanguage, useTranslation } from "./i18n.js";

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

async function sendEmail(to, contactName, messeName, salesPerson, smtp, customMessage) {
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
        userPhone: smtp.userPhone || "",
        avatar: smtp.avatar || "",
        customMessage: customMessage || ""
      }),
    });
    const data = await res.json();
    if (data.success) return { success: true, language: data.language || "en", htmlBody: data.htmlBody };
    return { success: false, error: data.message || data.error || "Unbekannter Fehler" };
  } catch (err) { return { success: false, error: err.message }; }
}


const LANG_LABELS = { de: "Deutsch", tr: "Türkçe", en: "English", es: "Español", fr: "Français", it: "Italiano" };

// WhatsApp message templates per language
function getWhatsAppMessage(lang, contactName, messeName, salesPerson, catalogUrl) {
  const msgs = {
    de: `Sehr geehrte/r ${contactName},\n\nvielen Dank für Ihren Besuch an unserem Stand auf der ${messeName}. Es war uns eine Freude, Sie kennenzulernen.\n\nHier finden Sie unseren Katalog:\n${catalogUrl}\n\nBei Fragen stehe ich Ihnen gerne zur Verfügung.\n\nMit freundlichen Grüßen,\n${salesPerson}`,
    tr: `Sayın ${contactName},\n\n${messeName} fuarında standımızı ziyaret ettiğiniz için çok teşekkür ederiz. Sizinle tanışmak bizim için büyük bir memnuniyet oldu.\n\nKataloğumuzu buradan inceleyebilirsiniz:\n${catalogUrl}\n\nHerhangi bir sorunuz olursa lütfen benimle iletişime geçin.\n\nSaygılarımla,\n${salesPerson}`,
    en: `Dear ${contactName},\n\nThank you for visiting our booth at ${messeName}. It was a great pleasure meeting you.\n\nPlease find our catalog here:\n${catalogUrl}\n\nDon't hesitate to reach out if you have any questions.\n\nBest regards,\n${salesPerson}`,
    es: `Estimado/a ${contactName},\n\nGracias por visitar nuestro stand en ${messeName}. Fue un placer conocerle.\n\nAquí puede ver nuestro catálogo:\n${catalogUrl}\n\nNo dude en contactarme si tiene alguna pregunta.\n\nAtentamente,\n${salesPerson}`,
    fr: `Cher/Chère ${contactName},\n\nMerci pour votre visite sur notre stand au ${messeName}. Ce fut un plaisir de vous rencontrer.\n\nVoici notre catalogue:\n${catalogUrl}\n\nN'hésitez pas à me contacter.\n\nCordialement,\n${salesPerson}`,
    it: `Gentile ${contactName},\n\nGrazie per aver visitato il nostro stand al ${messeName}. È stato un piacere conoscerLa.\n\nEcco il nostro catalogo:\n${catalogUrl}\n\nPer qualsiasi domanda, non esiti a contattarmi.\n\nCordiali saluti,\n${salesPerson}`,
  };
  return msgs[lang] || msgs.en;
}

function detectContactLang(email, name) {
  const domain = (email || "").toLowerCase().split("@")[1] || "";
  const n = (name || "").toLowerCase();
  const trDomains = [".tr", ".com.tr"];
  const trChars = /[çğıöşüÇĞİÖŞÜ]/;
  if (trDomains.some((d) => domain.endsWith(d)) || trChars.test(name || "")) return "tr";
  const deDomains = [".de", ".at", ".ch"];
  if (deDomains.some((d) => domain.endsWith(d))) return "de";
  if (domain.endsWith(".es") || domain.endsWith(".mx")) return "es";
  if (domain.endsWith(".fr") || domain.endsWith(".be")) return "fr";
  if (domain.endsWith(".it")) return "it";
  return "en";
}

// Smart mobile number detection
function cleanPhoneNumber(phone) {
  return (phone || "").replace(/[\s\-\(\)\.\/]/g, "");
}

function isMobileNumber(phone) {
  const clean = cleanPhoneNumber(phone);
  
  // Turkey: +90 5xx
  if (/^\+?90\s?5/.test(clean)) return true;
  // Germany: +49 1xx (15x, 16x, 17x)
  if (/^\+?49\s?1[567]/.test(clean)) return true;
  // Germany local: 01xx
  if (/^01[567]/.test(clean)) return true;
  // USA/Canada: all numbers are mobile-capable
  if (/^\+?1[2-9]/.test(clean)) return true;
  // UK: +44 7xx
  if (/^\+?44\s?7/.test(clean)) return true;
  // France: +33 [67]
  if (/^\+?33\s?[67]/.test(clean)) return true;
  // Italy: +39 3xx
  if (/^\+?39\s?3/.test(clean)) return true;
  // Spain: +34 [67]
  if (/^\+?34\s?[67]/.test(clean)) return true;
  // Netherlands: +31 6
  if (/^\+?31\s?6/.test(clean)) return true;
  // Austria: +43 6xx
  if (/^\+?43\s?6/.test(clean)) return true;
  // Switzerland: +41 7x
  if (/^\+?41\s?7[5-9]/.test(clean)) return true;
  // Poland: +48 [5-8]
  if (/^\+?48\s?[5-8]/.test(clean)) return true;
  // If mobile field is explicitly set, trust it
  return false;
}

function getBestWhatsAppNumber(contact) {
  // Priority 1: explicit mobile number
  if (contact.mobile && cleanPhoneNumber(contact.mobile).length > 5) return contact.mobile;
  // Priority 2: phone number that is actually mobile
  if (contact.phone && isMobileNumber(contact.phone)) return contact.phone;
  // Priority 3: any phone number (user might have entered mobile as phone)
  if (contact.phone && cleanPhoneNumber(contact.phone).length > 5) return contact.phone;
  return null;
}

function formatPhoneForWhatsApp(phone) {
  let clean = cleanPhoneNumber(phone);
  // Turkish local: 05xx → +90 5xx
  if (/^05/.test(clean)) clean = "+90" + clean.substring(1);
  // German local: 01xx → +49 1xx
  if (/^01[567]/.test(clean)) clean = "+49" + clean.substring(1);
  // Generic local: 0xx → assume +49
  if (clean.startsWith("0")) clean = "+49" + clean.substring(1);
  // Add + if missing
  if (!clean.startsWith("+")) clean = "+" + clean;
  // Remove + for wa.me URL
  return clean.replace("+", "");
}

function openWhatsApp(phone, message) {
  const waNumber = formatPhoneForWhatsApp(phone);
  // Copy message to clipboard instead of pre-filling (avoids WhatsApp spam detection)
  navigator.clipboard.writeText(message).catch(() => {});
  // Open WhatsApp chat without pre-filled text
  window.open(`https://wa.me/${waNumber}`, "_blank");
}

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
    whatsapp: <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
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

  // Language
  const [lang, setLang] = useState(() => detectSystemLanguage());
  const t = useTranslation(lang);

  // Messe selection
  const [selectedMesse, setSelectedMesse] = useState(null);

  // SMTP settings per user (stored in Firebase under users/{uid}/settings)
  const [smtp, setSmtp] = useState({ smtpHost: "", smtpPort: "465", smtpUser: "", smtpPass: "", smtpFrom: "", companyName: "Windoform", catalogUrl: "https://windoform.de", emailSignature: "" });
  const [smtpSaved, setSmtpSaved] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);

  const SMTP_PRESETS = [
    { label: "Google Workspace / Gmail", host: "smtp.gmail.com", port: "465" },
    { label: "Microsoft 365 / Outlook", host: "smtp.office365.com", port: "587" },
    { label: "United Domains", host: "smtp.udag.de", port: "465" },
    { label: "IONOS / 1&1", host: "smtp.ionos.de", port: "465" },
    { label: "Strato", host: "smtp.strato.de", port: "465" },
    { label: "Hetzner", host: "mail.your-server.de", port: "465" },
    { label: t("other"), host: "", port: "465" },
  ];

  // App state
  const [view, setView] = useState("home");
  const [contacts, setContacts] = useState([]);
  const [current, setCurrent] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [capturedImg, setCapturedImg] = useState(null);
  const [capturedCustomerPic, setCapturedCustomerPic] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [toast, setToast] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [demoMode, setDemoMode] = useState(false);
  const [editingContact, setEditingContact] = useState(null); // for editing existing contacts
  const [showDupeWarning, setShowDupeWarning] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null); // for detail view
  const [viewingEmail, setViewingEmail] = useState(null); // stores html string to preview
  const [emailViewerModal, setEmailViewerModal] = useState(null); // {htmlBody, to, date}

  // --- AI Compose Email State ---
  const [composeModal, setComposeModal] = useState(null); // { contact, isNewScan?: boolean, scanData?: any, savedId?: string }
  const [customMsg, setCustomMsg] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

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
      const msg = err.code === "auth/invalid-credential" ? t("emailOrPassWrong")
        : err.code === "auth/user-not-found" ? t("noUserFound")
        : err.code === "auth/too-many-requests" ? t("tooManyAttempts")
        : err.message;
      setAuthError(msg);
    }
    setAuthLoading(false);
  };

  const handleRegister = async () => {
    setAuthError("");
    if (!authName.trim()) { setAuthError(t("enterName")); return; }
    if (authPass.length < 6) { setAuthError(t("minPassword")); return; }
    setAuthLoading(true);
    try {
      await registerUser(authEmail.trim(), authPass, authName.trim());
    } catch (err) {
      const msg = err.code === "auth/email-already-in-use" ? t("emailInUse")
        : err.code === "auth/weak-password" ? t("weakPassword")
        : err.code === "auth/invalid-email" ? t("invalidEmail")
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
      setCameraError(err.name === "NotAllowedError" ? t("cameraBlocked") : t("noCamera"));
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
    if (contact) { setDemoMode(false); notify(t("recognized")); }
    else { setDemoMode(true); await new Promise((r) => setTimeout(r, 1500)); contact = demoContact(); notify(t("demoMode"), "warn"); }
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

  // ---- AUTO-DETECT WEBSITE FROM EMAIL ----
  const autoFillWebsite = (contact) => {
    if (contact.website || !contact.email) return contact;
    const domain = contact.email.split("@")[1];
    if (domain && !domain.includes("gmail") && !domain.includes("yahoo") && !domain.includes("hotmail") && !domain.includes("outlook") && !domain.includes("icloud") && !domain.includes("aol") && !domain.includes("web.de") && !domain.includes("gmx")) {
      return { ...contact, website: domain };
    }
    return contact;
  };

  // ---- SAVE + CONTACT (Email always + WhatsApp if mobile exists) ----
  const saveContact = async (withContact = true, forceOverwrite = false) => {
    if (!current) return;

    // Auto-fill website from email domain
    const enriched = autoFillWebsite(current);
    setCurrent(enriched);

    // Duplicate check
    if (!forceOverwrite && !editingContact) {
      const dupe = findDuplicate(enriched);
      if (dupe) {
        setShowDupeWarning({ existing: dupe, withEmail: withContact });
        return;
      }
    }

    const contactData = { ...enriched, emailSent: false, whatsappSent: false, savedAt: new Date().toISOString() };

    // If editing existing contact, update instead of create
    let savedId = editingContact?.id;
    if (editingContact) {
      await updateContactInFirebase(editingContact.id, contactData);
      notify(t("contactUpdated"));
      // Record edit event
      addTimelineEvent(editingContact.id, { type: "edit", label: "Kontakt bearbeitet", icon: "edit" });
    } else {
      savedId = await saveContactToFirebase(contactData);
      // Record scan event on first save
      if (savedId) {
        addTimelineEvent(savedId, { type: "scanned", label: "Visitenkarte gescannt", icon: "camera", messe: selectedMesse?.name + " " + selectedMesse?.city, scannedBy: user?.displayName || user?.email });
      }
    }

    if (!savedId) return;

    // Upload customer photo if taken AFTER document is created
    if (capturedCustomerPic) {
      try {
        const url = await uploadCustomerAvatarBase64(savedId, capturedCustomerPic);
        if (url) {
          contactData.customerAvatar = url;
          await updateContactInFirebase(savedId, { customerAvatar: url });
        }
      } catch (e) {
        console.error("Avatar upload failed", e);
      }
    }

    // CRM Sync (now includes avatar if uploaded)
    if (savedId) {
      await syncToCrm(savedId, contactData, user, selectedMesse?.name ? `${selectedMesse.name} ${selectedMesse.city || ""}`.trim() : "");
    }

    if (withContact) {
      if (enriched.email) {
        setComposeModal({ contact: enriched, isNewScan: true, scanData: enriched, savedId });
        setCustomMsg("");
      } else {
        const waPhone = getBestWhatsAppNumber(enriched);
        if (waPhone) {
          const contactLang = detectContactLang(enriched.email, enriched.name);
          const catalog = smtp.catalogUrl || "https://windoform.de";
          const message = getWhatsAppMessage(contactLang, enriched.name, selectedMesse?.name + " " + selectedMesse?.city, user?.displayName || user?.email, catalog);
          if (savedId) addTimelineEvent(savedId, { type: "whatsapp", label: "WhatsApp geöffnet", icon: "whatsapp", phone: waPhone });
          setTimeout(() => { openWhatsApp(waPhone, message); notify(t("whatsappCopied")); }, 800);
        } else {
          notify(t("noEmailAddress"), "warn");
        }
      }
    } else if (!editingContact) {
      notify(t("contactSaved"));
    }

    setCurrent(null); setCapturedImg(null); setCapturedCustomerPic(null); setEditingContact(null); setShowDupeWarning(null); setView("home");
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
    notify(t("contactDeleted"));
    setCurrent(null); setEditingContact(null); setView("contacts");
  };

  const upd = (k, v) => setCurrent((p) => ({ ...p, [k]: v }));

  const exportCSV = () => {
    const h = ["Name", t("firma"), t("position"), "Email", t("phone"), t("mobile"), t("website"), t("address"), "Gescannt von", "Datum", "Messe", t("notes")];
    const rows = contacts.map((c) => [c.name, c.company, c.position, c.email, c.phone, c.mobile, c.website, c.address, c.scannedBy, new Date(c.scannedAt).toLocaleDateString("de-DE"), c.messe, c.notes].map((v) => `"${(v || "").replace(/"/g, '""')}"`));
    const blob = new Blob(["\ufeff" + [h.join(","), ...rows.map((r) => r.join(","))].join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `fuarbot-${selectedMesse?.id || "export"}-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    notify(t("csvExported"));
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
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>{t("possibleDuplicate")}</h3>
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

      {/* Email Viewer Modal */}
      {viewingEmail && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(11,14,20,.92)", backdropFilter: "blur(12px)", padding: 20 }}>
          <div style={{ ...S.card, width: "100%", maxWidth: 600, height: "calc(100vh - 40px)", display: "flex", flexDirection: "column", animation: "slideUp .3s ease", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.bd}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: T.sf }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Gesendete E-Mail</h3>
              <button onClick={() => setViewingEmail(null)} style={{ background: "none", border: "none", color: T.txM, fontSize: 24, cursor: "pointer", lineHeight: 1 }}>&times;</button>
            </div>
            <div style={{ flex: 1, background: "#fff" }}>
              <iframe
                srcDoc={viewingEmail}
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Email Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* ============ LOADING ============ */}
      {user === undefined && (
        <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 48, height: 48, border: `3px solid ${T.bd}`, borderTopColor: T.acc, borderRadius: "50%", animation: "pulse 1s linear infinite", margin: "0 auto 16px" }} />
            <p style={{ color: T.txM }}>{t("login")}...</p>
          </div>
        </div>
      )}

      {/* ============ LOGIN ============ */}
      {user === null && (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 24px", animation: "fadeIn .4s" }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <img src="/logo.jpg" alt="Windoform" style={{ width: 80, height: 80, borderRadius: 20, margin: "0 auto 16px", display: "block", boxShadow: `0 8px 32px rgba(43,85,151,.3)` }} />
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.02em" }}>WINDOFORM</h1>
            <p style={{ fontSize: 13, color: T.txM, marginTop: 4, letterSpacing: ".1em", fontWeight: 500 }}>FUAR ASISTANI</p>
          </div>

          {/* Form */}
          <div style={{ ...S.card, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, textAlign: "center" }}>
              {authView === "login" ? t("login") : t("register")}
            </h2>

            {authView === "register" && (
              <div style={{ marginBottom: 14 }}>
                <label style={S.label}>{t("name")}</label>
                <input type="text" placeholder={t("yourName")} value={authName} onChange={(e) => setAuthName(e.target.value)} style={S.input} onFocus={(e) => e.target.style.borderColor = T.acc} onBlur={(e) => e.target.style.borderColor = T.bd} />
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>{t("email")}</label>
              <input type="email" placeholder="name@windoform.de" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} style={S.input} onFocus={(e) => e.target.style.borderColor = T.acc} onBlur={(e) => e.target.style.borderColor = T.bd} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={S.label}>{t("password")}</label>
              <input type="password" placeholder="••••••" value={authPass} onChange={(e) => setAuthPass(e.target.value)} style={S.input} onFocus={(e) => e.target.style.borderColor = T.acc} onBlur={(e) => e.target.style.borderColor = T.bd}
                onKeyDown={(e) => e.key === "Enter" && (authView === "login" ? handleLogin() : handleRegister())}
              />
            </div>

            {authError && <p style={{ color: T.acc, fontSize: 13, marginBottom: 14, textAlign: "center" }}>{authError}</p>}

            <button onClick={authView === "login" ? handleLogin : handleRegister} disabled={authLoading} style={{ ...S.btn(`linear-gradient(135deg,${T.acc},#1E4080)`, T.wh), opacity: authLoading ? .6 : 1, boxShadow: `0 6px 24px rgba(43,85,151,.3)` }}>
              <Ic name="lock" size={18} color={T.wh} />
              {authLoading ? "..." : authView === "login" ? t("login") : t("register")}
            </button>

            <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: T.txM }}>
              {authView === "login" ? t("noAccount") + " " : t("hasAccount") + " "}
              <button onClick={() => { setAuthView(authView === "login" ? "register" : "login"); setAuthError(""); }} style={{ background: "none", border: "none", color: T.acc, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {authView === "login" ? t("register") : t("login")}
              </button>
            </p>
          </div>

          {/* Language selector */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
            {[{ code: "de", flag: "🇩🇪" }, { code: "tr", flag: "🇹🇷" }, { code: "en", flag: "🇬🇧" }].map((l) => (
              <button key={l.code} onClick={() => setLang(l.code)} style={{
                padding: "8px 16px", borderRadius: 10, fontSize: 14, cursor: "pointer",
                background: lang === l.code ? T.accG : "transparent",
                border: `1px solid ${lang === l.code ? T.acc : T.bd}`,
                color: lang === l.code ? T.tx : T.txM,
              }}>
                {l.flag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ============ MESSE SELECTION ============ */}
      {user && !selectedMesse && view !== "scan" && (
        <div style={{ minHeight: "100vh", padding: "40px 24px", animation: "fadeIn .4s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36 }}>
            <div>
              <p style={{ fontSize: 13, color: T.txM }}>{t("welcome")}</p>
              <h1 style={{ fontSize: 22, fontWeight: 800 }}>{user.displayName || user.email}</h1>
            </div>
            <button onClick={handleLogout} style={{ background: T.sf, border: `1px solid ${T.bd}`, borderRadius: 10, padding: "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: T.txM, fontSize: 12, fontWeight: 600 }}>
              <Ic name="logout" size={14} color={T.txM} /> {t("logout")}
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <Ic name="map" size={20} color={T.acc} />
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>{t("selectMesse")}</h2>
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
                <img src="/logo.jpg" alt="W" style={{ width: 38, height: 38, borderRadius: 10, boxShadow: `0 4px 16px rgba(43,85,151,.3)` }} />
                <div>
                  <h1 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-.01em", lineHeight: 1 }}>WINDOFORM</h1>
                  <p style={{ fontSize: 9, color: T.txM, letterSpacing: ".1em", fontWeight: 600 }}>FUAR ASISTANI</p>
                </div>
              </div>
              <p style={{ fontSize: 13, color: T.accS, fontWeight: 500 }}>{selectedMesse.name} – {selectedMesse.city}</p>
              <p style={{ fontSize: 12, color: T.txD, marginTop: 2 }}>{user.displayName || user.email}</p>
            </div>
            <button onClick={() => setSelectedMesse(null)} style={{ background: T.sf, border: `1px solid ${T.bd}`, borderRadius: 10, padding: "8px 12px", cursor: "pointer", color: T.txM, fontSize: 11, fontWeight: 600 }}>
              {t("changeMesse")}
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 28 }}>
            {[
              { l: t("total"), v: stats.total, c: T.acc },
              { l: t("today"), v: stats.today, c: T.accS },
              { l: t("emails"), v: stats.emailed, c: T.ok },
            ].map((s, i) => (
              <div key={i} style={{ ...S.card, padding: "14px 16px", textAlign: "center", animation: `slideUp .4s ease ${i * .07}s both` }}>
                <span style={{ fontSize: 11, color: T.txM, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 6 }}>{s.l}</span>
                <span style={{ fontSize: 26, fontWeight: 800, color: s.c, fontFamily: "'JetBrains Mono',monospace" }}>{s.v}</span>
              </div>
            ))}
          </div>

          <button onClick={startCamera} style={{ ...S.btn(`linear-gradient(135deg,${T.acc},#1E4080)`, T.wh), marginBottom: 10, boxShadow: `0 8px 32px rgba(43,85,151,.4)`, padding: "20px", fontSize: 17 }}>
            <Ic name="camera" size={24} color={T.wh} /> {t("scanCard")}
          </button>
          <button onClick={() => fileRef.current?.click()} style={{ ...S.btn("transparent", T.txM), border: `1px dashed ${T.bd}`, marginBottom: 28, padding: 14, fontSize: 14, fontWeight: 500 }}>
            {t("uploadPhoto")}
          </button>

          {/* Contacts */}
          {contacts.length > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>{t("myContacts")}</h2>
                <button onClick={() => setView("contacts")} style={{ background: "none", border: "none", color: T.acc, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{t("showAll")}</button>
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
              <p style={{ fontSize: 15, fontWeight: 600, color: T.txM, marginTop: 12 }}>{t("noContacts")}</p>
              <p style={{ fontSize: 13, color: T.txD, marginTop: 6 }}>{t("scanFirst")}</p>
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
                {cameraError && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.9)", padding: 32 }}><div style={{ textAlign: "center" }}><Ic name="wifiOff" size={40} color={T.acc} /><p style={{ color: T.tx, fontSize: 14, marginTop: 16, lineHeight: 1.6 }}>{cameraError}</p><button onClick={() => fileRef.current?.click()} style={{ marginTop: 20, padding: "12px 28px", background: T.acc, border: "none", borderRadius: 10, color: T.wh, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{t("uploadPhotoBtn")}</button></div></div>}
                {cameraActive && !cameraError && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: "88%", height: "52%", position: "relative", border: `2px solid rgba(43,85,151,.4)`, borderRadius: 16 }}>
                      <div style={{ position: "absolute", left: "5%", right: "5%", height: 2, background: `linear-gradient(90deg, transparent, ${T.acc}, transparent)`, animation: "scanLine 2s ease-in-out infinite alternate", boxShadow: `0 0 12px ${T.acc}` }} />
                      {[["top","left"],["top","right"],["bottom","left"],["bottom","right"]].map(([v,h]) => <div key={v+h} style={{ position: "absolute", [v]: -2, [h]: -2, width: 24, height: 24, borderColor: T.acc, borderStyle: "solid", borderWidth: 0, [`border${v==="top"?"Top":"Bottom"}Width`]: 3, [`border${h==="left"?"Left":"Right"}Width`]: 3, borderRadius: 8 }} />)}
                      <p style={{ position: "absolute", bottom: -40, width: "100%", textAlign: "center", fontSize: 13, color: "rgba(255,255,255,.6)", fontWeight: 500 }}>{t("positionCard")}</p>
                    </div>
                  </div>
                )}
              </>
            )}
            {scanning && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(11,14,20,.88)", backdropFilter: "blur(10px)", zIndex: 10 }}><div style={{ textAlign: "center" }}><div style={{ width: 84, height: 84, margin: "0 auto 20px", border: `3px solid ${T.acc}`, borderRadius: 18, animation: "pulse 1.2s ease-in-out infinite", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic name="zap" size={34} color={T.acc} /></div><p style={{ color: T.tx, fontSize: 17, fontWeight: 700 }}>{t("aiAnalyzing")}</p></div></div>}
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

          {/* Customer Avatar Capture */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24, flexDirection: "column", alignItems: "center" }}>
            <input type="file" accept="image/*" capture="environment" id="customerPicCamera" style={{ display: "none" }} onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                const r = new FileReader(); r.onload = (ev) => setCapturedCustomerPic(ev.target.result); r.readAsDataURL(f);
              }
            }} />
            <input type="file" accept="image/*" id="customerPicGallery" style={{ display: "none" }} onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                const r = new FileReader(); r.onload = (ev) => setCapturedCustomerPic(ev.target.result); r.readAsDataURL(f);
              }
            }} />

            <div style={{ ...S.card, width: 88, height: 88, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: 0, border: `2px dashed ${T.acc}`, marginBottom: 12 }}>
              {capturedCustomerPic || current.customerAvatar ? (
                <img src={capturedCustomerPic || current.customerAvatar} alt="Kunde" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 15%" }} />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <Ic name="user" size={32} color={T.txD} />
                  <span style={{ fontSize: 10, color: T.txM, fontWeight: 600, textAlign: "center", padding: "0 4px", lineHeight: 1.1 }}>{capturedCustomerPic || current.customerAvatar ? t("changePhoto") : t("addCustomerPhoto")}</span>
                </div>
              )}
            </div>
            
            <div style={{ display: "flex", gap: 12 }}>
              <label htmlFor="customerPicCamera" style={{ ...S.btn(T.sf, T.tx), padding: "10px 16px", borderRadius: 20, fontSize: 13, border: `1px solid ${T.bd}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                <Ic name="camera" size={16} color={T.tx} /> {t("takePhoto")}
              </label>
              <label htmlFor="customerPicGallery" style={{ ...S.btn(T.sf, T.tx), padding: "10px 16px", borderRadius: 20, fontSize: 13, border: `1px solid ${T.bd}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                <Ic name="image" size={16} color={T.tx} /> {t("chooseGallery")}
              </label>
            </div>
          </div>

          {capturedImg && <div style={{ ...S.card, overflow: "hidden", marginBottom: 20, height: 140 }}><img src={capturedImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>}
          <div style={{ ...S.card, padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}><Ic name={editingContact ? "edit" : "zap"} size={14} color={editingContact ? T.accS : T.ok} /><span style={{ fontSize: 11, fontWeight: 700, color: editingContact ? T.accS : T.ok, textTransform: "uppercase", letterSpacing: ".06em" }}>{editingContact ? "Bearbeiten" : "AI-erkannt"}</span></div>
            {[{ k: "name", l: t("name") }, { k: "company", l: t("firma") }, { k: "position", l: t("position") }, { k: "email", l: t("email") }, { k: "phone", l: t("phone") }, { k: "mobile", l: t("mobile") }, { k: "website", l: t("website") }, { k: "address", l: t("address") }, { k: "linkedin", l: "LinkedIn" }].map((f) => (
              <div key={f.k} style={{ marginBottom: 12 }}>
                <label style={S.label}>{f.l}</label>
                <input type="text" value={current[f.k] || ""} onChange={(e) => upd(f.k, e.target.value)} placeholder={`${f.l}...`} style={S.input} onFocus={(e) => e.target.style.borderColor = T.acc} onBlur={(e) => e.target.style.borderColor = T.bd} />
              </div>
            ))}
            <div><label style={S.label}>{t("notes")}</label><textarea value={current.notes || ""} onChange={(e) => upd("notes", e.target.value)} placeholder={t("notesPlaceholder")} rows={3} style={{ ...S.input, resize: "vertical" }} onFocus={(e) => e.target.style.borderColor = T.acc} onBlur={(e) => e.target.style.borderColor = T.bd} /></div>
          </div>

          {/* Email preview – only for new contacts */}
          {!editingContact && (
            <div style={{ ...S.card, padding: 20, marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}><Ic name="mail" size={16} color={T.accS} /><span style={{ fontSize: 13, fontWeight: 600 }}>{t("followUpEmail")}</span></div>
              <div style={{ background: T.bg, borderRadius: 10, padding: 16, border: `1px solid ${T.bd}`, fontSize: 13, lineHeight: 1.7, color: T.txM }}>
                <p><span style={{ color: T.txD }}>{t("to")}:</span> <span style={{ color: T.tx }}>{current.email || "—"}</span></p>
                <p><span style={{ color: T.txD }}>{t("subject")}:</span> <span style={{ color: T.tx }}>{t("thankYou")} – {selectedMesse?.name} {selectedMesse?.city}</span></p>
                <hr style={{ border: "none", borderTop: `1px solid ${T.bd}`, margin: "12px 0" }} />
                <p>{current.name}, {t("thankVisit")}</p>
                <p style={{ marginTop: 8 }}><span style={{ color: T.acc }}>{t("viewCatalog")}</span></p>
                <p style={{ marginTop: 8 }}>{t("bestRegards")} <span style={{ color: T.tx, fontWeight: 600 }}>{user?.displayName || user?.email}</span></p>
              </div>
            </div>
          )}

          {/* Delete button for existing contacts */}
          {editingContact && (
            <button onClick={() => { if (confirm(t("confirmDelete"))) deleteContact(editingContact); }} style={{ ...S.btn("transparent", "#EF4444"), border: "1px solid rgba(239,68,68,.3)", marginBottom: 24, padding: 12, fontSize: 13, fontWeight: 600 }}>
              {t("deleteContact")}
            </button>
          )}

          {/* Bottom actions */}
          <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", maxWidth: 480, width: "100%", padding: "16px 20px 32px", background: `linear-gradient(transparent, ${T.bg} 25%)` }}>
            {editingContact ? (
              <>
                <button onClick={() => saveContact(false)} style={{ ...S.btn(`linear-gradient(135deg,${T.acc},#1E4080)`, T.wh), boxShadow: `0 6px 24px rgba(43,85,151,.35)`, marginBottom: 8 }}><Ic name="check" size={18} color={T.wh} /> {t("saveChanges")}</button>
                <button onClick={() => saveContact(true)} style={{ ...S.btn(T.sf, T.txM), border: `1px solid ${T.bd}`, padding: 12, fontSize: 13 }}><Ic name="mail" size={14} color={T.txM} /> {t("saveAndContact")}</button>
              </>
            ) : (
              <>
                <button onClick={() => saveContact(true)} style={{ ...S.btn(`linear-gradient(135deg,${T.acc},#1E4080)`, T.wh), boxShadow: `0 6px 24px rgba(43,85,151,.35)`, marginBottom: 8, position: "relative" }}>
                  <Ic name="mail" size={18} color={T.wh} /> {t("saveAndContact")}
                  {getBestWhatsAppNumber(current) && <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)" }}><Ic name="whatsapp" size={16} color="rgba(255,255,255,.7)" /></span>}
                </button>
                <button onClick={() => saveContact(false)} style={{ ...S.btn(T.sf, T.txM), border: `1px solid ${T.bd}`, padding: 12, fontSize: 13 }}>{t("saveOnly")}</button>
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
            <h2 style={{ fontSize: 18, fontWeight: 700, flex: 1 }}>{t("myContacts")} <span style={{ fontSize: 13, color: T.txM, fontWeight: 400 }}>({contacts.length})</span></h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, ...S.card, padding: "10px 16px", marginBottom: 20 }}><Ic name="search" size={16} color={T.txD} /><input type="text" placeholder={t("search")} value={searchQ} onChange={(e) => setSearchQ(e.target.value)} style={{ flex: 1, background: "none", border: "none", color: T.tx, fontSize: 14, outline: "none" }} /></div>
          {filtered.map((c, i) => (
            <div key={c.id} onClick={() => { setSelectedContact(c); setView("contactDetail"); }} style={{ ...S.card, padding: 16, marginBottom: 8, animation: `slideUp .3s ease ${i * .03}s both`, cursor: "pointer", transition: "border-color .2s" }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = T.acc + "66"}
              onMouseOut={(e) => e.currentTarget.style.borderColor = T.bd}
            >
              <div style={{ display: "flex", gap: 12 }}>
                {c.customerAvatar ? (
                  <img src={c.customerAvatar} style={{ width: 46, height: 46, borderRadius: 12, objectFit: "cover", objectPosition: "center 15%", flexShrink: 0 }} alt="" />
                ) : (
                  <div style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, background: `linear-gradient(135deg,${T.sf2},${T.bd})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: T.acc }}>{c.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}</div>
                )}
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
                <div style={{ display: "flex", gap: 6 }}>{c.emailSent && <span style={{ fontSize: 10, fontWeight: 600, color: T.ok, background: T.okG, padding: "3px 8px", borderRadius: 6 }}>✓ Email</span>}{c.whatsappSent && <span style={{ fontSize: 10, fontWeight: 600, color: "#25D366", background: "rgba(37,211,102,.12)", padding: "3px 8px", borderRadius: 6 }}>✓ WhatsApp</span>}</div>
                <span style={{ fontSize: 11, color: T.txD }}>{new Date(c.scannedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p style={{ textAlign: "center", color: T.txM, padding: 40, fontSize: 14 }}>{searchQ ? t("noResults") : t("noContacts")}</p>}
          {contacts.length > 0 && <button onClick={exportCSV} style={{ ...S.btn(T.sf, T.tx), border: `1px solid ${T.bd}`, marginTop: 16, fontSize: 14, fontWeight: 600 }}><Ic name="download" size={16} color={T.acc} /> {t("exportCsv")}</button>}
        </div>
      )}

      {/* ============ CONTACT DETAIL ============ */}
      {view === "contactDetail" && selectedContact && (() => {
        const c = selectedContact;
        const waPhone = getBestWhatsAppNumber(c);
        const timeline = [...(c.timeline || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const tlIconColor = { scanned: T.acc, email: T.ok, whatsapp: "#25D366", edit: T.warn };
        const tlBg = { scanned: T.accG, email: T.okG, whatsapp: "rgba(37,211,102,.12)", edit: "rgba(251,191,36,.12)" };
        return (
          <div style={{ padding: "20px 20px 110px", animation: "fadeIn .3s" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <button onClick={() => setView("contacts")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><Ic name="back" size={22} color={T.txM} /></button>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{t("contactTitle")}</h2>
            </div>

            {/* Avatar + Info */}
            <div style={{ ...S.card, padding: 24, marginBottom: 14, textAlign: "center" }}>
              {c.customerAvatar ? (
                <img src={c.customerAvatar} style={{ width: 88, height: 88, borderRadius: "50%", objectFit: "cover", objectPosition: "center 15%", margin: "0 auto 16px", display: "block", boxShadow: `0 8px 24px rgba(43,85,151,.35)`, border: `2px solid ${T.bd}` }} alt="" />
              ) : (
                <div style={{ width: 72, height: 72, borderRadius: 20, background: `linear-gradient(135deg,${T.acc},#1E4080)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: T.wh, margin: "0 auto 16px", boxShadow: `0 8px 24px rgba(43,85,151,.35)` }}>
                  {c.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
              )}
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{c.name}</h3>
              {c.position && <p style={{ fontSize: 13, color: T.accS, fontWeight: 600, marginBottom: 2 }}>{c.position}</p>}
              {c.company && <p style={{ fontSize: 14, color: T.txM, marginBottom: 12 }}>{c.company}</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, textAlign: "left" }}>
                {c.email && <div style={{ display: "flex", gap: 10, alignItems: "center" }}><Ic name="mail" size={14} color={T.txD} /><span style={{ fontSize: 13, color: T.txM }}>{c.email}</span></div>}
                {(c.phone || c.mobile) && <div style={{ display: "flex", gap: 10, alignItems: "center" }}><Ic name="phone" size={14} color={T.txD} /><span style={{ fontSize: 13, color: T.txM }}>{c.mobile || c.phone}</span></div>}
                {c.website && <div style={{ display: "flex", gap: 10, alignItems: "center" }}><Ic name="globe" size={14} color={T.txD} /><span style={{ fontSize: 13, color: T.txM }}>{c.website}</span></div>}
                {c.address && <div style={{ display: "flex", gap: 10, alignItems: "center" }}><Ic name="map" size={14} color={T.txD} /><span style={{ fontSize: 13, color: T.txM }}>{c.address}</span></div>}
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
              {c.email && <button onClick={() => {
                setComposeModal({ contact: c, savedId: c.id });
                setCustomMsg("");
              }} style={{ ...S.card, padding: "14px 8px", cursor: "pointer", border: `1px solid ${T.bd}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: T.sf }}>
                <Ic name="mail" size={20} color={T.ok} />
                <span style={{ fontSize: 11, color: T.txM, fontWeight: 600 }}>Email</span>
              </button>}
              {waPhone && <button onClick={() => {
                const cl = detectContactLang(c.email, c.name);
                const msg = getWhatsAppMessage(cl, c.name, selectedMesse?.name + " " + selectedMesse?.city, user?.displayName || user?.email, smtp.catalogUrl || "https://windoform.de");
                addTimelineEvent(c.id, { type: "whatsapp", label: "WhatsApp geöffnet", icon: "whatsapp", phone: waPhone });
                openWhatsApp(waPhone, msg); notify(t("whatsappCopied"));
              }} style={{ ...S.card, padding: "14px 8px", cursor: "pointer", border: `1px solid ${T.bd}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: T.sf }}>
                <Ic name="whatsapp" size={20} color="#25D366" />
                <span style={{ fontSize: 11, color: T.txM, fontWeight: 600 }}>WhatsApp</span>
              </button>}
              <button onClick={() => startEditing(c)} style={{ ...S.card, padding: "14px 8px", cursor: "pointer", border: `1px solid ${T.bd}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: T.sf }}>
                <Ic name="edit" size={20} color={T.accS} />
                <span style={{ fontSize: 11, color: T.txM, fontWeight: 600 }}>Bearbeiten</span>
              </button>
            </div>

            {/* Notes */}
            {c.notes && <div style={{ ...S.card, padding: 16, marginBottom: 14 }}>
              <p style={{ fontSize: 11, color: T.txM, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>{t("notes")}</p>
              <p style={{ fontSize: 14, color: T.tx, lineHeight: 1.6, fontStyle: "italic" }}>{c.notes}</p>
            </div>}

            {/* Timeline */}
            <div style={{ ...S.card, padding: 20, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <Ic name="clock" size={16} color={T.accS} />
                <h3 style={{ fontSize: 14, fontWeight: 700 }}>{t("activities")}</h3>
              </div>
              {timeline.length === 0 && <p style={{ fontSize: 13, color: T.txD, textAlign: "center", padding: "12px 0" }}>{t("noActivities")}</p>}
              {timeline.map((ev, idx) => {
                const isEmail = ev.type === "email";
                const hasHtml = !!ev.htmlBody;
                const canClick = isEmail;
                return (
                  <div key={idx} 
                       onClick={() => {
                         if (!canClick) return;
                         if (hasHtml) {
                           setViewingEmail(ev.htmlBody);
                         } else {
                           // Fallback for old emails
                           const fallback = `<html><body style="font-family:sans-serif;padding:30px;color:#333;line-height:1.6;max-width:600px;margin:0 auto;">
                             <h2 style="margin-top:0;">${t("emailPreviewUnavailable")}</h2>
                             <p>${t("emailWasSentTo")} <b>${c.name}</b> ${t("regarding")} <b>${ev.messe || selectedMesse?.name || ""}</b>.</p>
                             <p style="color:#666;background:#f5f5f5;padding:16px;border-radius:8px;font-size:14px;margin-top:24px;">
                               <i>${t("emailPreviewHint")}</i>
                             </p>
                           </body></html>`;
                           setViewingEmail(fallback);
                         }
                       }}
                       style={{ 
                         display: "flex", gap: 14, position: "relative", paddingBottom: idx < timeline.length - 1 ? 20 : 0,
                         cursor: canClick ? "pointer" : "default",
                         opacity: 1, transition: "opacity 0.2s"
                       }}
                       onMouseOver={(e) => { if (canClick) e.currentTarget.style.opacity = 0.7; }}
                       onMouseOut={(e) => { if (canClick) e.currentTarget.style.opacity = 1; }}
                  >
                  {/* Vertical line */}
                  {idx < timeline.length - 1 && <div style={{ position: "absolute", left: 15, top: 32, bottom: 0, width: 2, background: T.bd }} />}
                  {/* Icon */}
                  <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, background: tlBg[ev.type] || T.accG, border: `1px solid ${tlIconColor[ev.type] || T.acc}33`, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
                    <Ic name={ev.icon || "clock"} size={14} color={tlIconColor[ev.type] || T.acc} />
                  </div>
                  {/* Text */}
                  <div style={{ flex: 1, paddingTop: 4 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: canClick ? T.acc : T.tx, marginBottom: 2 }}>{ev.label}</p>
                    {ev.messe && <p style={{ fontSize: 11, color: T.accS }}>{ev.messe}</p>}
                    {ev.to && <p style={{ fontSize: 11, color: T.txD }}>{ev.to}</p>}
                    {ev.phone && <p style={{ fontSize: 11, color: T.txD }}>{ev.phone}</p>}
                    {ev.scannedBy && <p style={{ fontSize: 11, color: T.txD }}>von {ev.scannedBy}</p>}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                      <p style={{ fontSize: 11, color: T.txD }}>
                        {new Date(ev.timestamp).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })} · {new Date(ev.timestamp).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {isEmail && (
                        <button style={{ background: "none", border: "none", color: hasHtml ? T.accS : T.txD, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                          <Ic name="mail" size={12} color={hasHtml ? T.accS : T.txD} /> {hasHtml ? t("viewMail") : t("info")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )})}
            </div>
          </div>
        );
      })()}

      {/* ============ SETTINGS ============ */}
      {view === "settings" && (
        <div style={{ padding: "20px 20px 110px", animation: "fadeIn .3s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <button onClick={() => setView("home")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><Ic name="back" size={22} color={T.txM} /></button>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>{t("settings")}</h2>
          </div>

          {/* Language */}
          <div style={{ ...S.card, padding: 20, marginBottom: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>{t("language")}</h3>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ code: "de", flag: "🇩🇪", label: "Deutsch" }, { code: "tr", flag: "🇹🇷", label: "Türkçe" }, { code: "en", flag: "🇬🇧", label: "English" }].map((l) => (
                <button key={l.code} onClick={() => setLang(l.code)} style={{
                  flex: 1, padding: "12px 8px", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: lang === l.code ? T.accG : T.bg,
                  border: `1px solid ${lang === l.code ? T.acc : T.bd}`,
                  color: lang === l.code ? T.tx : T.txM,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                }}>
                  <span style={{ fontSize: 20 }}>{l.flag}</span>
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Account */}
          <div style={{ ...S.card, padding: 20, marginBottom: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>{t("account")}</h3>
            <p style={{ fontSize: 14, color: T.tx, marginBottom: 4 }}>{user?.displayName}</p>
            <p style={{ fontSize: 13, color: T.txM, marginBottom: 16 }}>{user?.email}</p>
            <button onClick={handleLogout} style={{ ...S.btn("transparent", T.acc), border: `1px solid ${T.acc}33`, padding: 12, fontSize: 13, fontWeight: 600 }}><Ic name="logout" size={16} color={T.acc} />  {t("logout")}</button>
          </div>

          {/* Messe */}
          <div style={{ ...S.card, padding: 20, marginBottom: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>{t("currentMesse")}</h3>
            <p style={{ fontSize: 14, color: T.accS, fontWeight: 500 }}>{selectedMesse?.name} – {selectedMesse?.city}</p>
            <button onClick={() => setSelectedMesse(null)} style={{ ...S.btn(T.sf2, T.txM), border: `1px solid ${T.bd}`, padding: 12, fontSize: 13, fontWeight: 600, marginTop: 14 }}>{t("changeMesse")}</button>
          </div>

          {/* Email / SMTP Setup */}
          <div style={{ ...S.card, padding: 20, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>{t("emailSetup")}</h3>
              {smtpSaved && <span style={{ fontSize: 10, fontWeight: 600, color: T.ok, background: T.okG, padding: "3px 10px", borderRadius: 6 }}>{t("configured")}</span>}
            </div>

            {/* Preset buttons */}
            <label style={S.label}>{t("emailProvider")}</label>
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
              <label style={S.label}>{t("smtpServer")}</label>
              <input type="text" value={smtp.smtpHost} onChange={(e) => setSmtp((s) => ({ ...s, smtpHost: e.target.value }))} placeholder="smtp.gmail.com" style={S.input} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>{t("port")}</label>
              <input type="text" value={smtp.smtpPort} onChange={(e) => setSmtp((s) => ({ ...s, smtpPort: e.target.value }))} placeholder="465" style={S.input} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>  {t("smtpUsername")}</label>
              <input type="text" value={smtp.smtpUser} onChange={(e) => setSmtp((s) => ({ ...s, smtpUser: e.target.value }))} placeholder="z.B. user123 oder email@domain.de" style={S.input} />
              <p style={{ fontSize: 11, color: T.txD, marginTop: 4 }}>{t("smtpUsernameHint")}</p>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>{t("senderEmail")}</label>
              <input type="email" value={smtp.smtpFrom} onChange={(e) => setSmtp((s) => ({ ...s, smtpFrom: e.target.value }))} placeholder="deinname@windoform.de" style={S.input} />
              <p style={{ fontSize: 11, color: T.txD, marginTop: 4 }}>{t("senderEmailHint")}</p>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>{t("passwordAppPassword")}</label>
              <input type="password" value={smtp.smtpPass} onChange={(e) => setSmtp((s) => ({ ...s, smtpPass: e.target.value }))} placeholder="••••••••" style={S.input} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>{t("companyNameInEmail")}</label>
              <input type="text" value={smtp.companyName} onChange={(e) => setSmtp((s) => ({ ...s, companyName: e.target.value }))} placeholder="Windoform" style={S.input} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>{t("catalogUrl")}</label>
              <input type="url" value={smtp.catalogUrl} onChange={(e) => setSmtp((s) => ({ ...s, catalogUrl: e.target.value }))} placeholder="https://windoform.de/katalog" style={S.input} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={S.label}>{t("emailAvatar")}</label>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {smtp.avatar ? (
                  <div style={{ position: "relative" }}>
                    <img src={smtp.avatar} alt="Avatar" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: `2px solid ${T.acc}` }} />
                    <button onClick={() => setSmtp((s) => ({ ...s, avatar: null }))} style={{ position: "absolute", top: -4, right: -4, background: T.err, color: T.wh, border: "none", borderRadius: "50%", width: 20, height: 20, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                  </div>
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.bg, border: `1px dashed ${T.bd}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.txD }}>
                    <Ic name="camera" size={24} color={T.txD} />
                  </div>
                )}
                <div>
                  <input type="file" accept="image/*" id="avatarUpload" style={{ display: "none" }} onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const img = new Image();
                      img.onload = () => {
                        const canvas = document.createElement("canvas");
                        canvas.width = 120; canvas.height = 120;
                        const ctx = canvas.getContext("2d");
                        const sSize = Math.min(img.width, img.height);
                        const sx = (img.width - sSize) / 2;
                        const sy = (img.height - sSize) / 2;
                        ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, 120, 120);
                        setSmtp((s) => ({ ...s, avatar: canvas.toDataURL("image/jpeg", 0.85) }));
                      };
                      img.src = ev.target.result;
                    };
                    reader.readAsDataURL(file);
                  }} />
                  <button onClick={() => document.getElementById("avatarUpload").click()} style={{ ...S.btn(T.sf, T.txM), fontSize: 12, padding: "6px 14px", border: `1px solid ${T.bd}` }}>
                    {smtp.avatar ? t("changePic") : t("uploadPic")}
                  </button>
                  <p style={{ fontSize: 11, color: T.txD, marginTop: 6, marginBottom: 0 }}>{t("avatarHint")}</p>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={S.label}>{t("yourPhoneForSignature")}</label>
              <input type="tel" value={smtp.userPhone || ""} onChange={(e) => setSmtp((s) => ({ ...s, userPhone: e.target.value }))} placeholder="+49 123 456789" style={S.input} />
              <p style={{ fontSize: 11, color: T.txD, marginTop: 4 }}>{t("phoneHint")}</p>
            </div>

            {/* Save + Test buttons */}
            <button onClick={async () => {
              if (!smtp.smtpHost || !smtp.smtpUser || !smtp.smtpPass) { notify(t("fillAllFields"), "error"); return; }
              try {
                const { setDoc, doc: fbDoc } = await import("firebase/firestore");
                const { db: fbDb } = await import("./firebase.js");
                await setDoc(fbDoc(fbDb, "userSettings", user.uid), { smtp, updatedAt: new Date().toISOString() }, { merge: true });
                setSmtpSaved(true);
                notify(t("smtpSaved"));
              } catch (e) { notify(t("saveFailed") + ": " + e.message, "error"); }
            }} style={{ ...S.btn(`linear-gradient(135deg,${T.acc},#1E4080)`, T.wh), marginBottom: 10, boxShadow: `0 4px 16px rgba(43,85,151,.25)` }}>
              {t("save")}
            </button>

            <button onClick={async () => {
              if (!smtp.smtpHost || !smtp.smtpUser || !smtp.smtpPass) { notify(t("enterSmtpFirst"), "error"); return; }
              setSmtpTesting(true);
              const testTo = smtp.smtpFrom || smtp.smtpUser;
              const result = await sendEmail(testTo, "Test", "Test-Messe", user?.displayName || "Test", smtp);
              setSmtpTesting(false);
              if (result && result.success) notify(t("testSentTo") + " " + testTo + "!");
              else notify(result?.error || t("testFailed"), "error");
            }} disabled={smtpTesting} style={{ ...S.btn(T.sf2, T.txM), border: `1px solid ${T.bd}`, padding: 12, fontSize: 13, fontWeight: 600, opacity: smtpTesting ? .6 : 1 }}>
              <Ic name="mail" size={14} color={T.txM} />
              {smtpTesting ? t("sendingTest") : t("sendTestEmail")}
            </button>
          </div>
        </div>
      )}

      {/* ============ NAV ============ */}
      {user && selectedMesse && view !== "scan" && (
        <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", maxWidth: 480, width: "100%", background: T.sf, borderTop: `1px solid ${T.bd}`, display: "flex", justifyContent: "space-around", padding: "12px 0 28px", zIndex: 100 }}>
          {[
            { id: "home", i: "camera", l: t("navScan") },
            { id: "contacts", i: "users", l: t("navContacts") },
            { id: "settings", i: "db", l: t("navSetup") },
          ].map((nav) => (
            <button key={nav.id} onClick={() => setView(nav.id)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "4px 20px" }}>
              <Ic name={nav.i} size={20} color={(view === nav.id || (nav.id === "contacts" && view === "contactDetail")) ? T.acc : T.txD} />
              <span style={{ fontSize: 10, fontWeight: 600, color: (view === nav.id || (nav.id === "contacts" && view === "contactDetail")) ? T.acc : T.txD, textTransform: "uppercase", letterSpacing: ".05em" }}>{nav.l}</span>
            </button>
          ))}
        </div>
      )}

      {/* ============ AI COMPOSE EMAIL MODAL ============ */}
      {composeModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,0.85)", backdropFilter: "blur(6px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ ...S.card, width: "100%", maxWidth: 500, padding: 24, boxShadow: "0 24px 48px rgba(0,0,0,0.4)", position: "relative" }}>
            <button onClick={() => {
              const { isNewScan, scanData } = composeModal;
              setComposeModal(null);
              if (isNewScan && scanData) {
                const waPhone = getBestWhatsAppNumber(scanData);
                if (waPhone) {
                  const cl = detectContactLang(scanData.email, scanData.name);
                  const message = getWhatsAppMessage(cl, scanData.name, selectedMesse?.name + " " + selectedMesse?.city, user?.displayName || user?.email, smtp.catalogUrl || "https://windoform.de");
                  setTimeout(() => { openWhatsApp(waPhone, message); notify(t("whatsappCopied")); }, 500);
                }
              }
            }} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: T.txM, cursor: "pointer" }}><Ic name="x" size={24} /></button>
            
            <h3 style={{ fontSize: 18, color: T.tx, marginBottom: 8, marginTop: 0 }}>{t("emailTo")} {composeModal.contact.name}</h3>
            <p style={{ fontSize: 13, color: T.txM, marginBottom: 20 }}>{t("aiEmailHint")}</p>
            
            <label style={S.label}>{t("customMsgLabel")}</label>
            <textarea
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              placeholder={t("customMsgPlaceholder")}
              rows={4}
              style={{ ...S.input, resize: "vertical", marginBottom: 16 }}
            />
            
            <button 
              disabled={!customMsg || isGeneratingAI}
              onClick={async () => {
                setIsGeneratingAI(true);
                try {
                  const tl = detectContactLang(composeModal.contact.email, composeModal.contact.name);
                  const res = await fetch("/api/ai", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt: customMsg, contactName: composeModal.contact.name, language: tl })
                  });
                  const data = await res.json();
                  if (res.ok && data.result) {
                    setCustomMsg(data.result);
                    notify(t("aiSuccess"), "success");
                  } else {
                    notify(t("aiError") + " " + (data.error || "Unbekannt"), "error");
                  }
                } catch(e) { notify("Verbindungsfehler zur KI", "error"); }
                setIsGeneratingAI(false);
              }}
              style={{ width: "100%", padding: "12px", background: "linear-gradient(90deg, #10B981, #059669)", border: "none", borderRadius: 12, color: T.wh, fontSize: 13, fontWeight: 700, cursor: (!customMsg || isGeneratingAI) ? "not-allowed" : "pointer", marginBottom: 24, opacity: (!customMsg || isGeneratingAI) ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "opacity 0.2s" }}
            >
              <Ic name="edit" size={16} /> {/* Using edit as a replacement for sparkles since sparkless may not exist in Ic */}
              {isGeneratingAI ? t("aiTranslating") : t("aiTranslateBtn")}
            </button>

            <button onClick={async () => {
              const { contact, isNewScan, scanData, savedId } = composeModal;
              setComposeModal(null);
              const emailResult = await sendEmail(contact.email, contact.name, selectedMesse?.name + " " + selectedMesse?.city, user?.displayName || user?.email, smtp, customMsg);
              if (emailResult && emailResult.success) {
                notify("Email gesendet!", "success");
                const sid = savedId || contact.id;
                if (sid) addTimelineEvent(sid, { type: "email", label: "Email gesendet", icon: "mail", to: contact.email, htmlBody: emailResult.htmlBody });
              } else {
                notify(emailResult?.error || "Fehler beim E-Mail Versand", "error");
              }

              if (isNewScan && scanData) {
                const waPhone = getBestWhatsAppNumber(scanData);
                if (waPhone) {
                  const cl = detectContactLang(scanData.email, scanData.name);
                  const message = getWhatsAppMessage(cl, scanData.name, selectedMesse?.name + " " + selectedMesse?.city, user?.displayName || user?.email, smtp.catalogUrl || "https://windoform.de");
                  setTimeout(() => { openWhatsApp(waPhone, message); notify(t("whatsappCopied")); }, 1500);
                }
              }
            }} style={S.btn(T.acc, T.wh)}>
              <Ic name="send" size={18} color={T.wh} /> {t("sendNow")}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
