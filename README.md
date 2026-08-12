# ⚡ StrangerChat

> Random video chat app built with React, WebRTC, and Socket.IO. Connect with strangers instantly — no sign-up needed.
>
> *Inspired by many similar platforms in the random video chat space.*

<div align="center">

![StrangerChat Banner](https://via.placeholder.com/1200x400/0a0a0f/6c5ce7?text=StrangerChat+%E2%9A%A1+Random+Video+Chat)

**WebRTC Peer-to-Peer Video • Random Matching • Text Chat • Test Bot Mode**

</div>

---

## 📸 Screenshots

### 🏠 Start Screen
Branding: `StrangerChat` with animated gradient icon, video/voice toggle, and test room option.

```
┌─────────────────────────────────────────┐
│              ⚡ StrangerChat              │
│                                          │
│   Connect with random strangers via      │
│   video chat. No sign-up needed.         │
│                                          │
│   [📹 Video + Voice] [🎙️ Voice Only]    │
│                                          │
│      [🎥 Start Video Chat]              │
│                                          │
│   Camera & mic will be used.            │
│   Toggle anytime.                       │
│                                          │
│           ─────── or ───────            │
│                                          │
│    [🤖 Test Room (Solo with Bot)]       │
│                                          │
│   Test with a simulated bot — no real   │
│   person needed.                        │
└─────────────────────────────────────────┘
```

### 📹 Connected (Active Chat)
Large video view of the stranger + draggable self-cam PiP. Floating controls at bottom.

```
┌──────────────────────────────────────────────────────┐
│ ⚡ StrangerChat                          🟢 2 online │
├──────────────────────────────────────────────────────┤
│ [Connected Badge: 🟢 Connected]   [📶 Signal Bars]   │
│                                                       │
│                                                       │
│            ╔════════════════════════╗                 │
│            ║                        ║                 │
│            ║   STRANGER VIDEO       ║                 │
│            ║   (fullscreen)         ║                 │
│            ║                        ║   ╔═══════╗     │
│            ║                        ║   ║ You   ║     │
│            ║                        ║   ║ (drag)║     │
│            ╚════════════════════════╝   ╚═══⤢═══╝     │
│                                          ↑ enlarge     │
│  [🔇][📹][💬][⏭️ Next][⏹️ Stop]                       │
└──────────────────────────────────────────────────────┘
```

### 💬 Chat Open
Text chat slides in from the right. Unread badge on chat button.

```
┌────────────────────────────────────────┬─────────────┐
│                                        │ 💬 Chat  ✕ │
│                                        │             │
│         STRANGER VIDEO                 │  ┌────────┐ │
│         (fullscreen)                   │  │Bot: Hey│ │
│                                        │  │ 👋     │ │
│                                        │  └────────┘ │
│   [Self-cam PiP]                       │  ┌────────┐ │
│                                        │  │  Me:   │ │
│                                        │  │ hello! │ │
│                                        │  └────────┘ │
│                                        │             │
│                                        │ [Type.. ➤] │
│ [🔇][📹][💬 2][⏭️ Next][⏹️ Stop]                   │
└────────────────────────────────────────┴─────────────┘
```

### 🔄 Dragging the PiP
Self-cam is fully draggable around the viewport. Click 🔀 to swap with main view.

```
         Drag from any corner
              ↓
        ┌─────────────┐
        │             │
        │             │
        │   Main      │
        │   Video     │
        │             │
        │         ┌───╗─────┐
        │         │You│  ⤢  │
        │         └───╝─────┘
        │         (draggable)
        └─────────────┘
```

### 🔍 Enlarged (Swapped)
Click the enlarge button — your cam fills the screen, stranger's cam becomes the floating PiP.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎲 **Random Matching** | Auto-pair with any waiting user via Socket.IO queue |
| 📹 **WebRTC Video** | Real peer-to-peer video streaming (low latency) |
| 🎙️ **Audio** | Echo cancellation + noise suppression enabled by default |
| 💬 **Text Chat** | Send messages alongside the call |
| ⏭️ **Next Stranger** | Skip to a new random partner instantly |
| 🟢 **Online Counter** | Live count of users actively waiting |
| 🧪 **Test Room** | Solo mode with an animated bot — no partner needed |
| 🎛️ **Voice Only Mode** | Match with audio only, no camera |
| 📦 **Draggable PiP** | Move your self-cam anywhere on screen |
| 🔄 **Enlarge/Swap** | One click swaps main view and PiP |
| 📷 **Camera Toggle** | Turn your video off mid-call |
| 🔇 **Mute Mic** | Mute/unmute audio instantly |
| 📊 **Signal Bars** | Visual indicator when WebRTC connects |
| 🔔 **Unread Badge** | Count of unread chat messages |
| 📱 **Mobile Responsive** | Works on phones (100dvh handles browser chrome) |

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        YOUR BROWSER                             │
│                                                                  │
│  ┌──────────────┐                          ┌──────────────┐     │
│  │  React UI    │                          │ WebRTC Layer │     │
│  │  (Vite)      │                          │ (getUserMedia│     │
│  │  Port 5174   │                          │ RTCPeerConn) │     │
│  │              │                          │              │     │
│  │ • Controls   │                          │ • ICE cand.  │     │
│  │ • PiP logic  │                          │ • STUN ping  │     │
│  │ • Chat state │                          │ • P2P media  │     │
│  └──────┬───────┘                          └──────┬───────┘     │
│         │                                          │             │
│         │ WebSocket (signaling)         Direct media│             │
│         │ /socket.io                    (peer-to-peer)            │
│         │                                          │             │
└─────────┼──────────────────────────────────────────┼─────────────┘
          │                                          │
          │ HTTPS                          ┌────────▼─────────┐
          │                                │  STRANGER'S      │
          ▼                                │  BROWSER         │
   ┌────────────────┐                      │  (their React+   │
   │   Node.js      │                      │   WebRTC)        │
   │   Signaling    │                      │                  │
   │   Server       │                      └──────────────────┘
   │   Port 3002    │
   │                │
   │ • Match queue  │
   │ • Waiting list │
   │ • Pair tracking│
   │ • Chat relay   │
   │ • Online count │
   │ • STUN config  │
   └────────────────┘
```

### Component Flow

```
┌─────────────────────────────────────────────────────────────┐
│  USER clicks "Start Video Chat"                              │
│         ↓                                                    │
│  navigator.mediaDevices.getUserMedia({video, audio})        │
│         ↓                                                    │
│  localStream ready → render in localVideo element            │
│         ↓                                                    │
│  socket.emit('find_partner')                                 │
│         ↓                                                    │
│  Server checks waitingUsers Set:                            │
│    • Empty → add to waitingUsers, status='searching'        │
│    • Has user → pair them, emit 'matched' to both            │
│         ↓                                                    │
│  Client receives 'matched' with initiator flag              │
│         ↓                                                    │
│  If initiator: peerConnection.createOffer() → send 'offer'  │
│  Else: wait for 'offer' → createAnswer() → send 'answer'    │
│         ↓                                                    │
│  Exchange ICE candidates via signaling                      │
│         ↓                                                    │
│  STUN resolves public IP — direct P2P media flows 🎥        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
| Tech | Purpose |
|---|---|
| **React 19** | UI framework, hooks (useState, useEffect, useRef) |
| **Vite 7** | Dev server + bundler (HMR, fast builds) |
| **Socket.IO Client 4.x** | WebSocket signaling |
| **Vanilla CSS** | Theming with CSS variables, animations |
| **Canvas 2D API** | Bot avatar (test mode) |
| **getUserMedia API** | Camera + mic access |
| **RTCPeerConnection** | WebRTC peer connection |

### Backend
| Tech | Purpose |
|---|---|
| **Node.js 18+** | Runtime |
| **Express 4** | HTTP server + static file serving (optional) |
| **Socket.IO 4.x** | WebSocket signaling server |

### DevOps / Infra
| Tech | Purpose |
|---|---|
| **ngrok** | Public HTTPS tunnel for testing |
| **Git + GitHub** | Version control |
| **macOS Terminal** | Local dev |

### WebRTC Stack
| Tech | Purpose |
|---|---|
| **STUN servers** | Public IP discovery (Google's free STUN) |
| **ICE candidates** | Connection path discovery |
| **DTLS-SRTP** | Encrypted media streams |

---

## 📦 Project Structure

```
random-video-chat/
├── server/
│   └── index.js              # Socket.IO signaling server
├── src/
│   ├── App.jsx               # Main React component
│   ├── App.css               # Production CSS (variables, animations)
│   └── main.jsx              # React entry point
├── index.html                # HTML entry
├── vite.config.js            # Vite + proxy config
├── package.json
├── .gitignore                # Blocks .env, node_modules, dist
└── README.md
```

### Key Files

- **`server/index.js`** — WebSocket signaling, match queue, online count
- **`src/App.jsx`** — All React logic (WebRTC, state, handlers)
- **`src/App.css`** — Production-grade styling (CSS variables, animations, responsive)
- **`vite.config.js`** — Proxies `/socket.io` from 5174 → 3002

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm
- Modern browser (Chrome, Firefox, Safari, Edge)
- Camera + mic (for actual use)

### Install
```bash
git clone https://github.com/theyashjaiswal/random-video-chat.git
cd random-video-chat
npm install
```

### Run (dev mode)
```bash
# Terminal 1: signaling server
node server/index.js    # → http://localhost:3002

# Terminal 2: frontend
npx vite                # → http://localhost:5174
```

Open **http://localhost:5174** in two tabs → click "Start Video Chat" in both → they auto-match.

### Production build
```bash
npm run build           # bundles to /dist
# serve /dist via any static host (Vercel, Netlify, Nginx, etc.)
node server/index.js    # run signaling server
```

### Expose publicly (ngrok)
```bash
ngrok http 5174         # tunnel for frontend
# OR tunnel signaling separately
ngrok http 3002
```

Update `vite.config.js` `allowedHosts` to include your ngrok domain.

---

## ⚠️ Limitations — STUN vs TURN

### What works out of the box
This app ships with **Google's free STUN servers**:

```js
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
}
```

STUN servers help each browser discover its **public IP address**. Works for **~70-80% of users** (simple NAT setups, home WiFi, mobile networks with cone NAT).

### What's missing — TURN server

For the other **20-30%** of users (corporate firewalls, symmetric NATs, strict networks), **direct peer-to-peer is impossible**. STUN alone can't punch through these.

A **TURN server** acts as a relay — both browsers send media to the TURN server, which forwards it. Adds latency and bandwidth cost, but **always works**.

This app does **NOT include TURN servers**. In restricted networks, calls will fail to connect.

### Add TURN for production

Replace the `ICE_SERVERS` config:

```js
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:turn.your-domain.com:3478',
      username: 'your-user',
      credential: 'your-pass',
    },
    {
      urls: 'turns:turn.your-domain.com:5349',
      username: 'your-user',
      credential: 'your-pass',
    },
  ],
}
```

### TURN provider options

| Provider | Cost | Setup |
|---|---|---|
| **[Cloudflare Calls](https://developers.cloudflare.com/calls/)** | Free tier (1,000 mins/day) | Easiest |
| **[Twilio Network Traversal](https://www.twilio.com/stun-turn)** | $0.001/participant/min | Managed |
| **[Metered.ca](https://www.metered.ca/tools/openrelay/)** | Free tier + paid | Simple |
| **[Xirsys](https://xirsys.com/)** | Free tier + paid | Reliable |
| **Self-host [coturn](https://github.com/coturn/coturn)** | VPS cost only | Full control |

### Privacy note
Google's STUN servers can see **metadata** (who's calling whom, when, IP addresses). For privacy-sensitive deployments, self-host or use a paid provider.

---

## 🎨 Design Decisions

- **No backend storage** — All state is ephemeral. Chat history lives only in your browser's memory for the session.
- **No sign-up** — Pure WebRTC, no user accounts or auth needed.
- **Peer-to-peer media** — Video/audio never touches the server (only signaling does).
- **Glass morphism** — Backdrop-filter blur for modern depth.
- **100dvh** — Dynamic viewport height (handles mobile browser chrome).
- **CSS variables** — Single theme, easy to rebrand.

---

## 🔒 Security Notes

- **STUN metadata leakage** — Google sees connection metadata. Use TURN for privacy.
- **No moderation** — This is a 1-to-1 random chat app. Add NSFW filtering, profanity detection, or rate limiting for production use.
- **No peer abuse prevention** — Add reporting/flagging system for production.
- **HTTPS required** — WebRTC APIs only work on HTTPS (or localhost). ngrok provides HTTPS by default.

---

## 📈 Scaling for Production

To scale beyond a handful of users:

1. **Horizontal signaling** — Replace single Node.js with Socket.IO + Redis adapter
2. **TURN servers** — Required for 100% connectivity
3. **TURN billing** — TURN bandwidth is expensive; budget $0.001-0.005/min
4. **Recording** — Add `MediaRecorder` API if you want call recording
5. **Moderation** — Add a moderation layer (perspective API, etc.)
6. **TURN auth** — Use time-limited credentials, not static
7. **CDN** — Serve static frontend from Cloudflare/Vercel/Netlify
8. **STUN redundancy** — Add Cloudflare STUN (1.1.1.1) alongside Google

---

## 🤝 Contributing

PRs welcome! This is a learning/demo project.

## 📄 License

MIT — do whatever you want, no warranty.

---

<div align="center">

Built with ⚡ by [theyashjaiswal](https://github.com/theyashjaiswal)

[GitHub](https://github.com/theyashjaiswal/random-video-chat) • [Issues](https://github.com/theyashjaiswal/random-video-chat/issues)

</div>
