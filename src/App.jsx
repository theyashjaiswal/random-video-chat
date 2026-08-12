import React, { useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'
import './App.css'

const socket = io(window.location.origin, { autoConnect: false })

let peerConnection = null
let localStream = null
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
}

export default function App() {
  const [connected, setConnected] = useState(false)
  const [status, setStatus] = useState('idle')
  const [onlineCount, setOnlineCount] = useState(0)
  const [muted, setMuted] = useState(false)
  const [videoOff, setVideoOff] = useState(false)
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [camReady, setCamReady] = useState(false)
  const [startWithVideo, setStartWithVideo] = useState(true)
  const [testMode, setTestMode] = useState(false)
  const [camEnlarged, setCamEnlarged] = useState(false)
  const [unreadChat, setUnreadChat] = useState(0)
  const [connectionState, setConnectionState] = useState('')

  const [pipPos, setPipPos] = useState({ x: 20, y: 80 })
  const [dragging, setDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const chatBoxRef = useRef(null)
  const botCanvasRef = useRef(null)
  const botStreamRef = useRef(null)
  const botAnimRef = useRef(null)
  const pipRef = useRef(null)

  useEffect(() => {
    if (camReady && localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream
    }
  }, [camReady, status, camEnlarged])

  function onPipMouseDown(e) {
    if (camEnlarged) return
    const touch = e.touches ? e.touches[0] : e
    const rect = pipRef.current.getBoundingClientRect()
    dragOffset.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
    setDragging(true)
    e.preventDefault()
  }

  useEffect(() => {
    if (!dragging) return
    function onMove(e) {
      const touch = e.touches ? e.touches[0] : e
      const x = touch.clientX - dragOffset.current.x
      const y = touch.clientY - dragOffset.current.y
      setPipPos({
        x: Math.max(0, Math.min(window.innerWidth - 220, x)),
        y: Math.max(60, Math.min(window.innerHeight - 165 - 60, y)),
      })
    }
    function onUp() { setDragging(false) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [dragging])

  useEffect(() => {
    socket.connect()
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('online_count', (count) => setOnlineCount(count))
    socket.on('matched', ({ initiator }) => {
      setStatus('connected')
      setMessages([])
      setUnreadChat(0)
      startWebRTC(initiator)
    })
    socket.on('offer', async (data) => {
      if (!peerConnection) return
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data))
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      socket.emit('answer', answer)
    })
    socket.on('answer', async (data) => {
      if (!peerConnection) return
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data))
    })
    socket.on('ice_candidate', (data) => {
      if (!peerConnection) return
      peerConnection.addIceCandidate(new RTCIceCandidate(data))
    })
    socket.on('partner_left', () => { cleanupPeer(); setStatus('searching'); socket.emit('find_partner') })
    socket.on('find_again', () => { cleanupPeer(); setStatus('searching'); socket.emit('find_partner') })
    socket.on('chat_message', (data) => {
      setMessages(p => [...p, data])
      if (!showChat) setUnreadChat(n => n + 1)
      scrollChat()
    })
    return () => { socket.disconnect(); cleanupPeer() }
  }, [showChat])

  function scrollChat() {
    setTimeout(() => { if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight }, 50)
  }

  async function startCamera(withVideo = true) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: withVideo ? { width: 1280, height: 720, facingMode: 'user' } : false,
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      setCamReady(true)
      setVideoOff(!withVideo)
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream
      return true
    } catch (e) {
      if (withVideo) {
        try {
          localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: { echoCancellation: true } })
          setCamReady(true); setVideoOff(true)
          if (localVideoRef.current) localVideoRef.current.srcObject = localStream
          return true
        } catch (e2) { return false }
      }
      return false
    }
  }

  async function startWebRTC(isInitiator) {
    cleanupPeer()
    if (!localStream) { const ok = await startCamera(); if (!ok) return }
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream
    peerConnection = new RTCPeerConnection(ICE_SERVERS)
    localStream.getTracks().forEach(t => peerConnection.addTrack(t, localStream))
    peerConnection.ontrack = (e) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0]
      setConnectionState('connected')
    }
    peerConnection.onicecandidate = (e) => { if (e.candidate) socket.emit('ice_candidate', e.candidate) }
    peerConnection.oniceconnectionstatechange = () => {
      setConnectionState(peerConnection?.iceConnectionState || '')
    }
    peerConnection.onconnectionstatechange = () => {
      const s = peerConnection?.connectionState
      setConnectionState(s)
      if (s === 'disconnected' || s === 'failed') {
        cleanupPeer(); setStatus('searching'); socket.emit('find_partner')
      }
    }
    if (isInitiator) {
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)
      socket.emit('offer', offer)
    }
  }

  function cleanupPeer() {
    if (peerConnection) { peerConnection.close(); peerConnection = null }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    setConnectionState('')
  }

  async function handleStart() {
    const ok = await startCamera(startWithVideo)
    if (ok) {
      setStatus('searching')
      setTimeout(() => {
        if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream
        socket.emit('find_partner')
      }, 100)
    }
  }

  function handleNext() {
    cleanupPeer(); setStatus('searching'); socket.emit('next')
    setTimeout(() => { if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream }, 50)
  }

  function handleStop() {
    cleanupPeer()
    if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null }
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    setCamReady(false); socket.emit('next'); setStatus('idle')
    setTestMode(false); setCamEnlarged(false)
  }

  function toggleMute() {
    if (localStream) { localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled); setMuted(!muted) }
  }

  function toggleVideo() {
    if (localStream) { localStream.getVideoTracks().forEach(t => t.enabled = !t.enabled); setVideoOff(!videoOff) }
  }

  function toggleChat() {
    setShowChat(!showChat)
    if (!showChat) setUnreadChat(0)
  }

  function sendChat() {
    if (!chatInput.trim()) return
    const msg = { text: chatInput, sender: 'me', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    setMessages(p => [...p, msg])
    if (testMode) {
      setTimeout(() => {
        const replies = ['Hey! 👋', 'Nice to meet you!', 'Where are you from?', "That's cool 😄", 'Haha yes!', 'Tell me more 🤖', 'I\'m a test bot', 'Video looks great!', 'What do you do?', 'Interesting!']
        setMessages(p => [...p, { text: replies[Math.floor(Math.random() * replies.length)], sender: 'them', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
        scrollChat()
      }, 1500 + Math.random() * 2000)
    } else {
      socket.emit('chat_message', { text: chatInput, sender: 'them', time: msg.time })
    }
    setChatInput(''); scrollChat()
  }

  function startBotAvatar() {
    const canvas = botCanvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = 1280; canvas.height = 720
    let frame = 0; const colors = ['#6c5ce7', '#a29bfe', '#00e676', '#fd79a8', '#fdcb6e', '#0984e3']; let ci = 0
    function draw() {
      frame++; const t = frame / 60
      const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      g.addColorStop(0, `hsl(${(t*20)%360},40%,15%)`); g.addColorStop(1, `hsl(${(t*20+60)%360},40%,10%)`)
      ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height)
      const cx = canvas.width / 2, cy = canvas.height / 2 + Math.sin(t*2)*20, r = 120 + Math.sin(t*3)*10
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r*2); glow.addColorStop(0, colors[ci]+'aa'); glow.addColorStop(1, 'transparent')
      ctx.fillStyle = glow; ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fillStyle = colors[ci]; ctx.fill()
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx-40, cy-20, 15, 0, Math.PI*2); ctx.arc(cx+40, cy-20, 15, 0, Math.PI*2); ctx.fill()
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(cx-40+Math.sin(t)*5, cy-20, 8, 0, Math.PI*2); ctx.arc(cx+40+Math.sin(t)*5, cy-20, 8, 0, Math.PI*2); ctx.fill()
      const mo = (Math.sin(t*8)+1)/2*20+5; ctx.beginPath(); ctx.arc(cx, cy+30, mo, 0, Math.PI); ctx.fillStyle = '#222'; ctx.fill()
      ctx.beginPath(); ctx.moveTo(cx-100, cy+r+20); ctx.quadraticCurveTo(cx, cy+r+180, cx+100, cy+r+20); ctx.fillStyle = colors[ci]; ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = 'bold 32px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('🤖 TEST BOT', cx, canvas.height-60)
      if (frame % 180 === 0) ci = (ci + 1) % colors.length
      botAnimRef.current = requestAnimationFrame(draw)
    }
    draw()
    botStreamRef.current = canvas.captureStream(30)
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = botStreamRef.current
  }

  function stopBotAvatar() {
    if (botAnimRef.current) { cancelAnimationFrame(botAnimRef.current); botAnimRef.current = null }
    if (botStreamRef.current) { botStreamRef.current.getTracks().forEach(t => t.stop()); botStreamRef.current = null }
  }

  async function handleTestRoom() {
    const ok = await startCamera(startWithVideo)
    if (ok) {
      setTestMode(true); setStatus('connected'); setMessages([]); setUnreadChat(0)
      setTimeout(() => { startBotAvatar(); if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream }, 100)
    }
  }

  function handleTestNext() {
    stopBotAvatar(); setStatus('searching')
    setTimeout(() => { setStatus('connected'); setMessages([]); startBotAvatar() }, 2000)
  }

  function handleTestStop() {
    stopBotAvatar(); cleanupPeer()
    if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null }
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    setCamReady(false); setTestMode(false); setStatus('idle'); setCamEnlarged(false)
  }

  const largeVideoRef = camEnlarged ? localVideoRef : remoteVideoRef
  const floatVideoRef = camEnlarged ? remoteVideoRef : localVideoRef

  if (!connected) {
    return (
      <div className="loading-screen">
        <div className="loader" />
        <p>Connecting to server…</p>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="header">
        <div className="logo">🎥 Random Video Chat</div>
        <div className="online-badge"><span className="dot" />{onlineCount} online</div>
      </div>

      {status === 'idle' ? (
        <div className="start-screen">
          <div className="start-card">
            <h1>Meet Strangers</h1>
            <p>Random video chat with people around the world</p>
            <div className="cam-toggle">
              <button className={`cam-option ${startWithVideo ? 'active' : ''}`} onClick={() => setStartWithVideo(true)}>📹 Video + Voice</button>
              <button className={`cam-option ${!startWithVideo ? 'active' : ''}`} onClick={() => setStartWithVideo(false)}>🎙️ Voice Only</button>
            </div>
            <button className="btn-start" onClick={handleStart}>{startWithVideo ? '🎥 Start Video Chat' : '🎙️ Start Voice Chat'}</button>
            <p className="note">{startWithVideo ? 'Camera & mic will be used' : 'Only mic — no camera'}. Toggle anytime.</p>
            <div className="divider"><span>or</span></div>
            <button className="btn-test" onClick={handleTestRoom}>🤖 Test Room (Solo with Bot)</button>
            <p className="note">Test with a simulated bot — no real person needed.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="main-video-area">
            <div className="large-video-container">
              <video ref={largeVideoRef} autoPlay playsInline muted={camEnlarged} className="video" />
              {status === 'searching' && !camEnlarged && (
                <div className="searching-overlay">
                  <div className="search-loader" />
                  <p>Looking for a stranger…</p>
                </div>
              )}
              {status === 'connected' && (
                <div className={`connected-badge ${testMode ? 'bot' : ''}`}>
                  {camEnlarged ? '👀 You (enlarged)' : testMode ? '🤖 Test Bot' : '🟢 Connected'}
                  {connectionState === 'connected' && !camEnlarged && !testMode && <span className="signal-bars"><span></span><span></span><span></span></span>}
                </div>
              )}
              {videoOff && !camEnlarged && (
                <div className="no-video-placeholder">
                  <div className="no-video-icon">📹</div>
                  <p>Camera is off</p>
                </div>
              )}
            </div>

            {showChat && (
              <div className="chat-panel">
                <div className="chat-header">
                  <span>💬 Chat</span>
                  <button className="chat-close" onClick={() => setShowChat(false)}>✕</button>
                </div>
                <div className="chat-messages" ref={chatBoxRef}>
                  {messages.length === 0 && <div className="no-msg">No messages yet. Say hi! 👋</div>}
                  {messages.map((m, i) => (
                    <div key={i} className={`chat-msg ${m.sender}`}>
                      {m.sender === 'them' && <div className="msg-name">{testMode ? 'Bot' : 'Stranger'}</div>}
                      <div className="msg-bubble">{m.text}</div>
                      <div className="msg-time">{m.time}</div>
                    </div>
                  ))}
                </div>
                <div className="chat-input-row">
                  <input className="chat-input" placeholder="Type a message…" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} />
                  <button className="btn-send" onClick={sendChat}>➤</button>
                </div>
              </div>
            )}
          </div>

          <div
            ref={pipRef}
            className={`floating-pip ${dragging ? 'dragging' : ''}`}
            style={{ left: pipPos.x, top: pipPos.y }}
            onMouseDown={onPipMouseDown}
            onTouchStart={onPipMouseDown}
          >
            <video ref={floatVideoRef} autoPlay playsInline muted={!camEnlarged} className="video" />
            {camEnlarged && !remoteVideoRef.current?.srcObject && (
              <div className="pip-no-video">No video</div>
            )}
            {!camEnlarged && videoOff && (
              <div className="pip-no-video">📷 Off</div>
            )}
            <div className="pip-label">{camEnlarged ? 'Stranger' : 'You'}</div>
            <button className="pip-enlarge-btn" onClick={(e) => { e.stopPropagation(); setCamEnlarged(!camEnlarged) }} title={camEnlarged ? 'Shrink' : 'Enlarge'}>
              {camEnlarged ? '🔀' : '⤢'}
            </button>
          </div>

          <canvas ref={botCanvasRef} style={{ display: 'none' }} />
        </>
      )}

      {status !== 'idle' && (
        <div className="controls">
          <button className={`ctrl-btn ${muted ? 'active' : ''}`} onClick={toggleMute} title="Mute mic">
            {muted ? '🔇' : '🎙️'}
          </button>
          <button className={`ctrl-btn ${videoOff ? 'active' : ''}`} onClick={toggleVideo} title="Camera">
            {videoOff ? '📵' : '📹'}
          </button>
          <button className={`ctrl-btn ${showChat ? 'active' : ''}`} onClick={toggleChat} title="Chat">
            💬
            {unreadChat > 0 && <span className="badge">{unreadChat}</span>}
          </button>
          <button className="ctrl-btn next" onClick={testMode ? handleTestNext : handleNext} title="Next stranger">
            ⏭️<span className="btn-text">Next</span>
          </button>
          <button className="ctrl-btn stop" onClick={testMode ? handleTestStop : handleStop} title="Stop">
            ⏹️<span className="btn-text">Stop</span>
          </button>
        </div>
      )}
    </div>
  )
}