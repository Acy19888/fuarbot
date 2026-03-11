import { useState, useEffect, useRef } from "react";
import {
  saveContactToFirebase,
  subscribeToContacts,
  isFirebaseConfigured,
} from "./firebase.js";

// ============================================================
// CONFIG
// ============================================================
const CONFIG = {
  defaultMesse: "Hannover Messe 2026",
  catalogUrl: "https://example.com/katalog",
  companyName: "Ihre Firma",
};

// ============================================================
// THEME – Dark industrial with warm accent
// ============================================================
const T = {
  bg: "#0B0E14", sf: "#141820", sf2: "#1C2030", acc: "#E8553D",
  accH: "#FF6B4F", accG: "rgba(232,85,61,0.12)", accS: "#F4A261",
  ok: "#34D399", okG: "rgba(52,211,153,0.12)", tx: "#ECE9E1",
  txM: "#858896", txD: "#4E5162", bd: "#252938", wh: "#FFF",
  warn: "#FBBF24", hub: "#FF7A59",
};

const S = {
  card: { background: T.sf, borderRadius: 16, border: `1px solid ${T.bd}` },
  input: {
    width: "100%", padding: "11px 14px", background: T.bg, border: `1px solid ${T.bd}`,
    borderRadius: 10, color: T.tx, fontSize: 14, outline: "none",
    fontFamily: "'Outfit',sans-serif", transition: "border-color .2s",
  },
  label: {
    fontSize: 11, color: T.txM, fontWeight: 600, textTransform: "uppercase",
    letterSpacing: ".06em", marginBottom: 6, display: "block",
  },
};

// ============================================================
// Scan API call (to our serverless function)
// ============================================================
async function scanCard(base64, mediaType) {
  try {
    const res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64, mediaType }),
    });
    const data = await res.json();
    if (data.success && data.contact) return data.contact;
    throw new Error(data.error || "Scan failed");
  } catch (err) {
    console.error("Scan error:", err);
    // Return null to signal demo mode
    return null;
  }
}

// Demo fallback
function demoContact() {
  const d = [
    { name: "Dr. Stefan Müller", company: "Siemens AG", position: "Head of Digital Transformation", email: "s.mueller@siemens.com", phone: "+49 89 636 00", mobile: "", website: "siemens.com", address: "München", linkedin: "", notes: "" },
    { name: "Ayşe Demir", company: "Bosch Türkiye", position: "Business Development", email: "ayse.demir@bosch.com.tr", phone: "+90 216 432 0000", mobile: "+90 532 111 2233", website: "bosch.com.tr", address: "Istanbul", linkedin: "", notes: "" },
    { name: "Fatih Özkan", company: "Arçelik A.Ş.", position: "Export Manager", email: "fatih.ozkan@arcelik.com", phone: "+90 212 314 3434", mobile: "", website: "arcelik.com.tr", address: "Istanbul", linkedin: "", notes: "" },
    { name: "Laura Schmidt", company: "TRUMPF GmbH", position: "Sales Director EMEA", email: "l.schmidt@trumpf.com", phone: "+49 7156 303 0", mobile: "", website: "trumpf.com", address: "Ditzingen", linkedin: "", notes: "" },
  ];
  return d[Math.floor(Math.random() * d.length)];
}

// ============================================================
// SVG Icons
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
    hub: <svg {...p}><circle cx="12" cy="12" r="3"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><line x1="14.5" y1="9.5" x2="17.5" y2="6.5"/><line x1="9.5" y1="14.5" x2="6.5" y2="17.5"/><circle cx="5" cy="5" r="2"/><line x1="9.5" y1="9.5" x2="6.5" y2="6.5"/></svg>,
    phone: <svg {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    building: <svg {...p}><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><line x1="9" y1="18" x2="15" y2="18"/></svg>,
    back: <svg {...p}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
    edit: <svg {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    globe: <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    clock: <svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    zap: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    fire: <svg {...p}><path d="M12 2c0 4-4 6-4 10a4 4 0 0 0 8 0c0-4-4-6-4-10z"/></svg>,
    wifi: <svg {...p}><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill={color}/></svg>,
    wifiOff: <svg {...p}><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill={color}/></svg>,
    linkedin: <svg {...p}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>,
    image: <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
    x: <svg {...p} strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    refresh: <svg {...p}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
    db: <svg {...p}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  };
  return icons[name] || null;
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [view, setView] = useState("home");
  const [contacts, setContacts] = useState([]);
  const [current, setCurrent] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [capturedImg, setCapturedImg] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [person, setPerson] = useState("Mehmet");
  const [messe, setMesse] = useState(CONFIG.defaultMesse);
  const [toast, setToast] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [demoMode, setDemoMode] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);

  const team = ["Mehmet", "Ayşe", "Emre", "Deniz", "Zeynep", "Ali", "Selin", "Can"];

  // Firebase real-time listener
  useEffect(() => {
    if (isFirebaseConfigured()) {
      const unsub = subscribeToContacts((data) => setContacts(data));
      return unsub;
    }
  }, []);

  // Cleanup camera
  useEffect(() => {
    return () => stopCamera();
  }, []);

  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ---- CAMERA ----
  const startCamera = async () => {
    setCameraError(null);
    setCapturedImg(null);
    setView("scan");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);

      // Wait for video element to be ready
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError(
        err.name === "NotAllowedError"
          ? "Kamera-Zugriff wurde verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen."
          : err.name === "NotFoundError"
            ? "Keine Kamera gefunden. Du kannst stattdessen ein Foto hochladen."
            : `Kamera-Fehler: ${err.message}`
      );
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = canvasRef.current || document.createElement("canvas");
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, w, h);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImg(dataUrl);
    stopCamera();
    processImage(dataUrl, "image/jpeg");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mediaType = file.type || "image/jpeg";
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setCapturedImg(dataUrl);
      setView("scan");
      processImage(dataUrl, mediaType);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const processImage = async (dataUrl, mediaType) => {
    setScanning(true);

    // Extract base64 without prefix
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    const mType = dataUrl.match(/^data:(image\/\w+);/)?.[1] || mediaType;

    // Try real scan
    let contact = await scanCard(base64, mType);

    if (!contact) {
      // Fallback to demo
      setDemoMode(true);
      await new Promise((r) => setTimeout(r, 1500));
      contact = demoContact();
      notify("Demo-Modus: API nicht verfügbar", "warn");
    }

    setCurrent({
      ...contact,
      scannedBy: person,
      scannedAt: new Date().toISOString(),
      messe: messe,
      emailSent: false,
      hubspotSynced: false,
      priority: "normal",
    });
    setScanning(false);
    setView("review");
  };

  const retakePhoto = () => {
    setCapturedImg(null);
    setCurrent(null);
    setScanning(false);
    startCamera();
  };

  // ---- SAVE ----
  const saveContact = async (withEmail = true) => {
    if (!current) return;

    const contactData = {
      ...current,
      emailSent: withEmail,
      savedAt: new Date().toISOString(),
    };

    // Save to Firebase
    const fbId = await saveContactToFirebase(contactData);

    if (!fbId && !isFirebaseConfigured()) {
      // Local fallback
      setContacts((prev) => [{ id: Date.now().toString(), ...contactData }, ...prev]);
    }

    if (withEmail) {
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 2500);
    }

    notify(
      withEmail
        ? `Gespeichert + Email an ${contactData.email}`
        : "Kontakt gespeichert"
    );

    setCurrent(null);
    setCapturedImg(null);
    setView("home");
  };

  const upd = (k, v) => setCurrent((p) => ({ ...p, [k]: v }));

  // ---- EXPORT ----
  const exportCSV = () => {
    const headers = ["Name", "Firma", "Position", "Email", "Telefon", "Mobil", "Website", "Adresse", "LinkedIn", "Gescannt von", "Datum", "Messe", "Notizen"];
    const rows = contacts.map((c) =>
      [c.name, c.company, c.position, c.email, c.phone, c.mobile, c.website, c.address, c.linkedin, c.scannedBy, new Date(c.scannedAt).toLocaleDateString("de-DE"), c.messe, c.notes]
        .map((v) => `"${(v || "").replace(/"/g, '""')}"`)
    );
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fuarbot-kontakte-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    notify("CSV exportiert!");
  };

  // ---- FILTER ----
  const filtered = contacts.filter((c) => {
    if (!searchQ) return true;
    const q = searchQ.toLowerCase();
    return [c.name, c.company, c.email, c.position, c.scannedBy].some((f) =>
      f?.toLowerCase().includes(q)
    );
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
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'Outfit','Segoe UI',sans-serif", color: T.tx, maxWidth: 480, margin: "0 auto", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.1);opacity:.6}}
        @keyframes slideUp{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes toastIn{from{transform:translate(-50%,-120%)}to{transform:translate(-50%,0)}}
        @keyframes burst{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
        @keyframes scanLine{0%{top:10%}100%{top:85%}}
        *{box-sizing:border-box;margin:0;padding:0}
        input,textarea,select{font-family:'Outfit',sans-serif}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:${T.bd};border-radius:4px}
        video::-webkit-media-controls{display:none!important}
      `}</style>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: toast.type === "error" ? T.acc : toast.type === "warn" ? T.warn : T.ok,
          color: toast.type === "warn" ? "#000" : T.wh,
          padding: "12px 24px", borderRadius: 14, fontSize: 13, fontWeight: 600,
          zIndex: 1000, animation: "toastIn .3s ease",
          boxShadow: "0 12px 40px rgba(0,0,0,.5)", maxWidth: "88%", textAlign: "center",
        }}>
          {toast.msg}
        </div>
      )}

      {/* Email Success Overlay */}
      {emailSent && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(11,14,20,.92)", backdropFilter: "blur(16px)" }}>
          <div style={{ textAlign: "center", animation: "burst .5s ease" }}>
            <div style={{ width: 88, height: 88, borderRadius: "50%", background: T.okG, border: `2px solid ${T.ok}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Ic name="mail" size={36} color={T.ok} />
            </div>
            <p style={{ fontSize: 20, fontWeight: 700 }}>Email gesendet!</p>
            <p style={{ fontSize: 13, color: T.txM, marginTop: 6 }}>Follow-up mit Katalog-Link</p>
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />

      {/* ============ HOME ============ */}
      {view === "home" && (
        <div style={{ padding: "24px 20px 110px", animation: "fadeIn .3s" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `linear-gradient(135deg,${T.acc},${T.accS})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 4px 16px rgba(232,85,61,.3)`,
                }}>
                  <Ic name="zap" size={18} color={T.wh} />
                </div>
                <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.03em" }}>FuarBot</h1>
              </div>
              <p style={{ fontSize: 13, color: T.txM }}>{messe}</p>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
                  background: isFirebaseConfigured() ? T.okG : "rgba(251,191,36,.12)",
                  color: isFirebaseConfigured() ? T.ok : T.warn,
                }}>
                  {isFirebaseConfigured() ? "● Firebase verbunden" : "● Lokal"}
                </span>
                {demoMode && (
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: T.accG, color: T.acc }}>
                    Demo-Modus
                  </span>
                )}
              </div>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              ...S.card, padding: "8px 14px",
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                background: `linear-gradient(135deg,${T.acc},${T.accS})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: T.wh,
              }}>{person[0]}</div>
              <select value={person} onChange={(e) => setPerson(e.target.value)} style={{
                background: "transparent", border: "none", color: T.tx,
                fontSize: 13, fontWeight: 500, outline: "none", cursor: "pointer", appearance: "none",
              }}>
                {team.map((t) => <option key={t} value={t} style={{ background: T.sf }}>{t}</option>)}
              </select>
            </div>
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

          {/* Scan Button */}
          <button onClick={startCamera} style={{
            width: "100%", padding: "20px", marginBottom: 10,
            background: `linear-gradient(135deg,${T.acc},#C94430)`,
            border: "none", borderRadius: 16, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            boxShadow: `0 8px 32px rgba(232,85,61,.4)`,
            transition: "transform .15s",
          }}
            onMouseDown={(e) => e.currentTarget.style.transform = "scale(.97)"}
            onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            <Ic name="camera" size={24} color={T.wh} />
            <span style={{ fontSize: 17, fontWeight: 700, color: T.wh }}>Visitenkarte scannen</span>
          </button>

          <button onClick={() => fileRef.current?.click()} style={{
            width: "100%", padding: "14px", marginBottom: 28,
            background: "transparent", border: `1px dashed ${T.bd}`,
            borderRadius: 12, cursor: "pointer", color: T.txM, fontSize: 14, fontWeight: 500,
          }}>
            📷 Foto aus Galerie wählen
          </button>

          {/* Recent Contacts */}
          {contacts.length > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>Letzte Kontakte</h2>
                <button onClick={() => setView("contacts")} style={{ background: "none", border: "none", color: T.acc, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Alle →
                </button>
              </div>
              {contacts.slice(0, 4).map((c, i) => (
                <div key={c.id} style={{
                  ...S.card, padding: "14px 16px", marginBottom: 8,
                  display: "flex", alignItems: "center", gap: 12,
                  animation: `slideUp .3s ease ${i * .05}s both`,
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 11, flexShrink: 0,
                    background: `linear-gradient(135deg,${T.sf2},${T.bd})`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 700, color: T.acc,
                  }}>
                    {c.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</p>
                    <p style={{ fontSize: 11, color: T.txM, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.company}{c.position ? ` · ${c.position}` : ""}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    {c.emailSent && <div style={{ width: 22, height: 22, borderRadius: 6, background: T.okG, display: "flex", alignItems: "center", justifyContent: "center" }}><Ic name="mail" size={11} color={T.ok} /></div>}
                  </div>
                </div>
              ))}
            </>
          )}

          {contacts.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <div style={{ width: 72, height: 72, borderRadius: 18, background: T.sf, border: `1px solid ${T.bd}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Ic name="camera" size={30} color={T.txD} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: T.txM }}>Noch keine Kontakte</p>
              <p style={{ fontSize: 13, color: T.txD, marginTop: 6, lineHeight: 1.5 }}>Scanne deine erste Visitenkarte</p>
            </div>
          )}
        </div>
      )}

      {/* ============ SCAN ============ */}
      {view === "scan" && (
        <div style={{ height: "100vh", position: "relative", background: "#000", animation: "fadeIn .2s" }}>
          {/* Camera / Preview Area */}
          <div style={{ width: "100%", height: "70%", position: "relative", overflow: "hidden" }}>
            {capturedImg ? (
              <img src={capturedImg} alt="Captured card" style={{ width: "100%", height: "100%", objectFit: "contain", background: "#111" }} />
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />

                {/* Camera error */}
                {cameraError && (
                  <div style={{
                    position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(0,0,0,.9)", padding: 32,
                  }}>
                    <div style={{ textAlign: "center" }}>
                      <Ic name="wifiOff" size={40} color={T.acc} />
                      <p style={{ color: T.tx, fontSize: 14, marginTop: 16, lineHeight: 1.6 }}>{cameraError}</p>
                      <button onClick={() => fileRef.current?.click()} style={{
                        marginTop: 20, padding: "12px 28px", background: T.acc,
                        border: "none", borderRadius: 10, color: T.wh, fontSize: 14, fontWeight: 600, cursor: "pointer",
                      }}>
                        Foto hochladen
                      </button>
                    </div>
                  </div>
                )}

                {/* Viewfinder */}
                {cameraActive && !cameraError && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{
                      width: "88%", height: "52%", position: "relative",
                      border: `2px solid rgba(232,85,61,.4)`, borderRadius: 16,
                    }}>
                      {/* Scan line animation */}
                      <div style={{
                        position: "absolute", left: "5%", right: "5%", height: 2,
                        background: `linear-gradient(90deg, transparent, ${T.acc}, transparent)`,
                        animation: "scanLine 2s ease-in-out infinite alternate",
                        boxShadow: `0 0 12px ${T.acc}`,
                      }} />
                      {/* Corner markers */}
                      {[["top","left"],["top","right"],["bottom","left"],["bottom","right"]].map(([v,h]) => (
                        <div key={v+h} style={{
                          position: "absolute", [v]: -2, [h]: -2, width: 24, height: 24,
                          borderColor: T.acc, borderStyle: "solid", borderWidth: 0,
                          [`border${v==="top"?"Top":"Bottom"}Width`]: 3,
                          [`border${h==="left"?"Left":"Right"}Width`]: 3,
                          borderRadius: 8,
                        }} />
                      ))}
                      <p style={{
                        position: "absolute", bottom: -40, width: "100%",
                        textAlign: "center", fontSize: 13, color: "rgba(255,255,255,.6)", fontWeight: 500,
                      }}>
                        Visitenkarte im Rahmen positionieren
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Scanning Overlay */}
            {scanning && (
              <div style={{
                position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(11,14,20,.88)", backdropFilter: "blur(10px)", zIndex: 10,
              }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    width: 84, height: 84, margin: "0 auto 20px",
                    border: `3px solid ${T.acc}`, borderRadius: 18,
                    animation: "pulse 1.2s ease-in-out infinite",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Ic name="zap" size={34} color={T.acc} />
                  </div>
                  <p style={{ color: T.tx, fontSize: 17, fontWeight: 700 }}>AI analysiert Karte...</p>
                  <p style={{ color: T.txM, fontSize: 13, marginTop: 6 }}>Kontaktdaten werden extrahiert</p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Controls */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            padding: "20px 20px 44px",
            background: "linear-gradient(transparent, rgba(0,0,0,.95) 30%)",
          }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 24, alignItems: "center" }}>
              {/* Back */}
              <button onClick={() => { stopCamera(); setView("home"); setCapturedImg(null); setCameraError(null); }} style={{
                width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,.1)",
                border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Ic name="back" size={22} color={T.wh} />
              </button>

              {/* Capture / Retake */}
              {!capturedImg && cameraActive && (
                <button onClick={capturePhoto} style={{
                  width: 76, height: 76, borderRadius: "50%", background: T.acc,
                  border: `4px solid rgba(232,85,61,.35)`, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 4px 28px rgba(232,85,61,.5)`,
                  transition: "transform .1s",
                }}
                  onMouseDown={(e) => e.currentTarget.style.transform = "scale(.9)"}
                  onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                >
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,.3)" }} />
                </button>
              )}

              {capturedImg && !scanning && (
                <button onClick={retakePhoto} style={{
                  width: 76, height: 76, borderRadius: "50%", background: "rgba(255,255,255,.15)",
                  border: `2px solid rgba(255,255,255,.3)`, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Ic name="refresh" size={28} color={T.wh} />
                </button>
              )}

              {/* Gallery */}
              <button onClick={() => fileRef.current?.click()} style={{
                width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,.1)",
                border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Ic name="image" size={22} color={T.wh} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ REVIEW ============ */}
      {view === "review" && current && (
        <div style={{ padding: "20px 20px 150px", animation: "slideUp .35s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <button onClick={() => { setCurrent(null); setView("home"); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
              <Ic name="back" size={22} color={T.txM} />
            </button>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>Kontakt prüfen</h2>
            {demoMode && <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: T.accG, color: T.acc, marginLeft: "auto" }}>Demo</span>}
          </div>

          {/* Card image */}
          {capturedImg && (
            <div style={{ ...S.card, overflow: "hidden", marginBottom: 20, height: 140 }}>
              <img src={capturedImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}

          {/* Extracted fields */}
          <div style={{ ...S.card, padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <Ic name="zap" size={14} color={T.ok} />
              <span style={{ fontSize: 11, fontWeight: 700, color: T.ok, textTransform: "uppercase", letterSpacing: ".06em" }}>
                AI-erkannt
              </span>
            </div>

            {[
              { k: "name", l: "Name", i: "users" },
              { k: "company", l: "Firma", i: "building" },
              { k: "position", l: "Position", i: "edit" },
              { k: "email", l: "Email", i: "mail" },
              { k: "phone", l: "Telefon", i: "phone" },
              { k: "mobile", l: "Mobil", i: "phone" },
              { k: "website", l: "Website", i: "globe" },
              { k: "address", l: "Adresse", i: "building" },
              { k: "linkedin", l: "LinkedIn", i: "linkedin" },
            ].map((f) => (
              <div key={f.k} style={{ marginBottom: 12 }}>
                <label style={S.label}>{f.l}</label>
                <input
                  type="text"
                  value={current[f.k] || ""}
                  onChange={(e) => upd(f.k, e.target.value)}
                  placeholder={`${f.l} eingeben...`}
                  style={S.input}
                  onFocus={(e) => (e.target.style.borderColor = T.acc)}
                  onBlur={(e) => (e.target.style.borderColor = T.bd)}
                />
              </div>
            ))}

            <div>
              <label style={S.label}>Notizen</label>
              <textarea
                value={current.notes || ""}
                onChange={(e) => upd("notes", e.target.value)}
                placeholder="z.B. Interesse an Produkt X, Budget besprochen..."
                rows={3}
                style={{ ...S.input, resize: "vertical" }}
                onFocus={(e) => (e.target.style.borderColor = T.acc)}
                onBlur={(e) => (e.target.style.borderColor = T.bd)}
              />
            </div>
          </div>

          {/* Email Preview */}
          <div style={{ ...S.card, padding: 20, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Ic name="mail" size={16} color={T.accS} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Follow-up Email</span>
            </div>
            <div style={{
              background: T.bg, borderRadius: 10, padding: 16,
              border: `1px solid ${T.bd}`, fontSize: 13, lineHeight: 1.7, color: T.txM,
            }}>
              <p><span style={{ color: T.txD }}>An:</span> <span style={{ color: T.tx }}>{current.email || "—"}</span></p>
              <p><span style={{ color: T.txD }}>Betreff:</span> <span style={{ color: T.tx }}>Vielen Dank für Ihren Besuch – {messe}</span></p>
              <hr style={{ border: "none", borderTop: `1px solid ${T.bd}`, margin: "12px 0" }} />
              <p>Sehr geehrte/r {current.name},</p>
              <p style={{ marginTop: 8 }}>vielen Dank für Ihren Besuch an unserem Stand auf der {messe}.</p>
              <p style={{ marginTop: 8 }}><span style={{ color: T.acc }}>→ Katalog ansehen</span></p>
              <p style={{ marginTop: 8 }}>Mit freundlichen Grüßen,<br /><span style={{ color: T.tx, fontWeight: 600 }}>{person}</span></p>
            </div>
          </div>

          {/* Fixed bottom actions */}
          <div style={{
            position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
            maxWidth: 480, width: "100%", padding: "16px 20px 32px",
            background: `linear-gradient(transparent, ${T.bg} 25%)`,
          }}>
            <button onClick={() => saveContact(true)} style={{
              width: "100%", padding: "16px", marginBottom: 10,
              background: `linear-gradient(135deg,${T.acc},#C94430)`,
              border: "none", borderRadius: 14, cursor: "pointer",
              fontSize: 15, fontWeight: 700, color: T.wh,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              boxShadow: `0 6px 24px rgba(232,85,61,.35)`,
            }}>
              <Ic name="check" size={18} color={T.wh} />
              Speichern + Email senden
            </button>
            <button onClick={() => saveContact(false)} style={{
              width: "100%", padding: "14px",
              background: T.sf, border: `1px solid ${T.bd}`, borderRadius: 14,
              cursor: "pointer", fontSize: 14, fontWeight: 500, color: T.txM,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              Nur speichern
            </button>
          </div>
        </div>
      )}

      {/* ============ CONTACTS ============ */}
      {view === "contacts" && (
        <div style={{ padding: "20px 20px 110px", animation: "fadeIn .3s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <button onClick={() => setView("home")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
              <Ic name="back" size={22} color={T.txM} />
            </button>
            <h2 style={{ fontSize: 18, fontWeight: 700, flex: 1 }}>
              Kontakte <span style={{ fontSize: 13, color: T.txM, fontWeight: 400 }}>({contacts.length})</span>
            </h2>
          </div>

          {/* Search */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            ...S.card, padding: "10px 16px", marginBottom: 20,
          }}>
            <Ic name="search" size={16} color={T.txD} />
            <input
              type="text" placeholder="Suchen..."
              value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
              style={{ flex: 1, background: "none", border: "none", color: T.tx, fontSize: 14, outline: "none" }}
            />
          </div>

          {filtered.map((c, i) => (
            <div key={c.id} style={{ ...S.card, padding: 16, marginBottom: 8, animation: `slideUp .3s ease ${i * .03}s both` }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                  background: `linear-gradient(135deg,${T.sf2},${T.bd})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15, fontWeight: 700, color: T.acc,
                }}>
                  {c.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{c.name}</p>
                  <p style={{ fontSize: 12, color: T.accS, fontWeight: 500 }}>{c.position}</p>
                  <p style={{ fontSize: 12, color: T.txM }}>{c.company}</p>
                  {c.email && <p style={{ fontSize: 11, color: T.txD, marginTop: 6 }}>{c.email}</p>}
                  {c.notes && <p style={{ fontSize: 12, color: T.txM, marginTop: 8, padding: "6px 10px", background: T.bg, borderRadius: 8, fontStyle: "italic" }}>{c.notes}</p>}
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.bd}` }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {c.emailSent && <span style={{ fontSize: 10, fontWeight: 600, color: T.ok, background: T.okG, padding: "3px 8px", borderRadius: 6 }}>✓ Email</span>}
                </div>
                <span style={{ fontSize: 11, color: T.txD }}>
                  {c.scannedBy} · {new Date(c.scannedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <p style={{ textAlign: "center", color: T.txM, padding: 40, fontSize: 14 }}>
              {searchQ ? "Keine Ergebnisse" : "Noch keine Kontakte"}
            </p>
          )}

          {contacts.length > 0 && (
            <button onClick={exportCSV} style={{
              width: "100%", padding: "14px", marginTop: 16,
              ...S.card, cursor: "pointer", fontSize: 14, fontWeight: 600, color: T.tx,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}>
              <Ic name="download" size={16} color={T.acc} />
              CSV exportieren (HubSpot Import)
            </button>
          )}
        </div>
      )}

      {/* ============ SETTINGS ============ */}
      {view === "settings" && (
        <div style={{ padding: "20px 20px 110px", animation: "fadeIn .3s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <button onClick={() => setView("home")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
              <Ic name="back" size={22} color={T.txM} />
            </button>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Einstellungen</h2>
          </div>

          <div style={{ ...S.card, padding: 20, marginBottom: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Messe</h3>
            <label style={S.label}>Messe-Name</label>
            <input type="text" value={messe} onChange={(e) => setMesse(e.target.value)} style={S.input} />
          </div>

          <div style={{ ...S.card, padding: 20, marginBottom: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Verbindungen</h3>
            {[
              { n: "Firebase", i: "db", ok: isFirebaseConfigured(), c: T.ok },
              { n: "Claude AI", i: "zap", ok: !demoMode, c: T.acc },
            ].map((s) => (
              <div key={s.n} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 14px", background: T.bg, borderRadius: 10, border: `1px solid ${T.bd}`,
                marginBottom: 8,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Ic name={s.i} size={18} color={s.c} />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{s.n}</span>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 6,
                  color: s.ok ? T.ok : T.warn,
                  background: s.ok ? T.okG : "rgba(251,191,36,.12)",
                }}>
                  {s.ok ? "Verbunden" : "Nicht konfiguriert"}
                </span>
              </div>
            ))}
            <p style={{ fontSize: 12, color: T.txD, marginTop: 10, lineHeight: 1.5 }}>
              API Keys werden sicher als Environment Variables auf dem Server gespeichert (siehe README).
            </p>
          </div>
        </div>
      )}

      {/* ============ NAV ============ */}
      {view !== "scan" && (
        <div style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
          maxWidth: 480, width: "100%", background: T.sf,
          borderTop: `1px solid ${T.bd}`,
          display: "flex", justifyContent: "space-around",
          padding: "12px 0 28px", zIndex: 100,
        }}>
          {[
            { id: "home", i: "camera", l: "Scan" },
            { id: "contacts", i: "users", l: "Kontakte" },
            { id: "settings", i: "db", l: "Setup" },
          ].map((nav) => (
            <button key={nav.id} onClick={() => setView(nav.id)} style={{
              background: "none", border: "none", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              padding: "4px 20px",
            }}>
              <Ic name={nav.i} size={20} color={view === nav.id ? T.acc : T.txD} />
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: view === nav.id ? T.acc : T.txD,
                textTransform: "uppercase", letterSpacing: ".05em",
              }}>{nav.l}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
