const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Serve built frontend in production
app.use(express.static(path.join(__dirname, '../dist')));

const io = new Server(server, {
  cors: { origin: '*' },
});

// --- State ---
const waitingUsers = new Set(); // socket ids waiting for a match
const pairs = new Map(); // socketId -> partnerSocketId
const activeUsers = new Set(); // sockets that clicked "Start" (actually active)

function getOnlineCount() {
  return activeUsers.size;
}

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id} | online: ${getOnlineCount()}`);
  io.emit('online_count', getOnlineCount());

  // --- Join waiting queue & match ---
  socket.on('find_partner', () => {
    console.log(`[find_partner] ${socket.id}`);
    activeUsers.add(socket.id);
    io.emit('online_count', getOnlineCount());

    // Don't queue if already in a pair
    if (pairs.has(socket.id)) return;
    // Don't queue twice
    if (waitingUsers.has(socket.id)) return;

    // Remove any existing pair first
    if (pairs.has(socket.id)) {
      const oldPartner = pairs.get(socket.id);
      pairs.delete(socket.id);
      pairs.delete(oldPartner);
      io.to(oldPartner).emit('partner_left');
    }

    // Try to match with a waiting user
    let matched = false;
    for (const waitingId of waitingUsers) {
      if (waitingId !== socket.id) {
        // Match!
        waitingUsers.delete(waitingId);
        pairs.set(socket.id, waitingId);
        pairs.set(waitingId, socket.id);
        matched = true;

        console.log(`[matched] ${socket.id} <-> ${waitingId}`);

        // Tell both users — the one who receives 'matched' first is the caller
        io.to(socket.id).emit('matched', { initiator: true, partnerId: waitingId });
        io.to(waitingId).emit('matched', { initiator: false, partnerId: socket.id });
        break;
      }
    }

    if (!matched) {
      waitingUsers.add(socket.id);
      console.log(`[waiting] ${socket.id} | queue: ${waitingUsers.size}`);
    }
  });

  // --- WebRTC signaling ---
  socket.on('offer', (data) => {
    const partner = pairs.get(socket.id);
    if (partner) {
      io.to(partner).emit('offer', data);
    }
  });

  socket.on('answer', (data) => {
    const partner = pairs.get(socket.id);
    if (partner) {
      io.to(partner).emit('answer', data);
    }
  });

  socket.on('ice_candidate', (data) => {
    const partner = pairs.get(socket.id);
    if (partner) {
      io.to(partner).emit('ice_candidate', data);
    }
  });

  // --- Next / Skip partner ---
  socket.on('next', () => {
    const partner = pairs.get(socket.id);
    if (partner) {
      pairs.delete(socket.id);
      pairs.delete(partner);
      io.to(partner).emit('partner_left');
    }
    waitingUsers.delete(socket.id);
    socket.emit('partner_left');
    // Re-queue
    socket.emit('find_again');
  });

  // --- Chat messages ---
  socket.on('chat_message', (data) => {
    const partner = pairs.get(socket.id);
    if (partner) {
      io.to(partner).emit('chat_message', data);
    }
  });

  // --- Disconnect ---
  socket.on('disconnect', () => {
    console.log(`[disconnect] ${socket.id}`);
    waitingUsers.delete(socket.id);
    activeUsers.delete(socket.id);

    const partner = pairs.get(socket.id);
    if (partner) {
      pairs.delete(socket.id);
      pairs.delete(partner);
      io.to(partner).emit('partner_left');
    }

    io.emit('online_count', getOnlineCount());
  });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});