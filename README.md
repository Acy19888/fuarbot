# FuarBot 🔥

AI Visitenkarten-Scanner für Messen. Kamera → AI liest Kontakte → Firebase speichert → Follow-up Email automatisch.

> **Repo**: [github.com/Acy19888/fuarbot](https://github.com/Acy19888/fuarbot)

## Features

- 📸 **Echte Kamera** – Visitenkarte live fotografieren (Rückkamera auf Handy)
- 🤖 **Claude AI OCR** – Erkennt Name, Firma, Position, Email, Telefon, LinkedIn etc.
- 🔥 **Firebase Firestore** – Alle Kontakte in Echtzeit in der Cloud gespeichert
- 📧 **Auto Follow-up Email** – Sofortige Dankes-Email mit Katalog-Link
- 👥 **Multi-User** – Team-Mitglieder wählbar, alle sehen alle Kontakte
- 📱 **PWA** – Auf Homescreen installierbar
- 📊 **CSV Export** – Für HubSpot / Salesforce / jedes CRM
- 🔒 **Sicher** – Claude API Key bleibt auf dem Server (Vercel Serverless)

## Architektur

```
Handy (Browser)                    Vercel Server              Cloud
┌──────────────┐    POST /api/scan  ┌─────────────┐     ┌──────────┐
│  Kamera Foto │ ────────────────→  │ Serverless  │ ──→ │ Claude   │
│  (base64)    │ ←────────────────  │ Function    │ ←── │ API      │
│              │    JSON Kontakt    └─────────────┘     └──────────┘
│              │
│  Kontakt     │ ──────────────────────────────────────→ ┌──────────┐
│  speichern   │ ←────────────────── realtime sync ───── │ Firebase │
└──────────────┘                                         └──────────┘
```

## Quick Start

```bash
git clone https://github.com/Acy19888/fuarbot.git
cd fuarbot
npm install
cp .env.example .env    # → API Keys eintragen
npm run dev
```

## Setup-Anleitung

### 1. Firebase einrichten (kostenlos)

1. Gehe zu [console.firebase.google.com](https://console.firebase.google.com)
2. "Projekt hinzufügen" → Name: `fuarbot`
3. **Firestore Database** aktivieren:
   - Build → Firestore Database → "Datenbank erstellen"
   - Standort: `europe-west3` (Frankfurt)
   - Im **Testmodus** starten (für Entwicklung)
4. **Web-App registrieren**:
   - Projekteinstellungen (Zahnrad) → "App hinzufügen" → Web (</> Icon)
   - Name: `FuarBot Web`
   - Die angezeigten Config-Werte in `.env` eintragen

### 2. Claude API Key holen

1. Gehe zu [console.anthropic.com](https://console.anthropic.com)
2. Account erstellen / einloggen
3. API Keys → "Create Key"
4. Key kopieren → in `.env` als `CLAUDE_API_KEY` eintragen

### 3. Auf Vercel deployen

1. Push alles zu GitHub
2. Gehe zu [vercel.com](https://vercel.com) → "Import Project" → `Acy19888/fuarbot`
3. **Environment Variables** setzen (alle aus `.env`):
   - `CLAUDE_API_KEY` (OHNE `VITE_` Prefix! – Server-side)
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_ID`
   - `VITE_FIREBASE_APP_ID`
4. Deploy → Fertig!

### 4. Team testen

- URL teilen (z.B. `fuarbot.vercel.app`)
- Auf dem Handy öffnen → "Zum Startbildschirm" hinzufügen
- Los scannen!

## Demo-Modus

Ohne API Keys funktioniert die App im Demo-Modus:
- Kamera funktioniert trotzdem
- Kontaktdaten werden simuliert (kein echtes OCR)
- Daten werden lokal im Browser gespeichert (kein Firebase)

Perfekt zum Testen der UI und des Workflows.

## Environment Variables

| Variable | Wo? | Beschreibung |
|---|---|---|
| `CLAUDE_API_KEY` | Server | Anthropic API Key (OCR) |
| `VITE_FIREBASE_API_KEY` | Client | Firebase Web API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Client | z.B. `fuarbot.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Client | z.B. `fuarbot` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Client | z.B. `fuarbot.appspot.com` |
| `VITE_FIREBASE_MESSAGING_ID` | Client | Sender ID |
| `VITE_FIREBASE_APP_ID` | Client | App ID |

## Team anpassen

In `src/App.jsx` das `team` Array ändern:

```javascript
const team = ["Mehmet", "Ayşe", "Emre", "Deniz", "Zeynep", "Ali", "Selin", "Can"];
```

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Vercel Serverless Functions
- **AI/OCR**: Claude API (Sonnet)
- **Database**: Firebase Firestore (Echtzeit)
- **Styling**: Custom CSS (keine Dependencies)
- **Hosting**: Vercel

## Lizenz

MIT
