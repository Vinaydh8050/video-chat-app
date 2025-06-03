const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path'); // Import path module for correct static file serving

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// Serve static files from the 'client' directory relative to the server.js file
// Assuming your index.html, script.js, and style.css are in a 'client' folder
app.use(express.static(path.join(__dirname, 'client')));

let waiting = null; // Stores the socket of the user waiting for a partner

io.on('connection', socket => {
  console.log('User connected:', socket.id);

  socket.on('join', () => {
    // Check if there's someone waiting and it's not the same user trying to join themselves
    if (waiting && waiting.id !== socket.id) {
      const roomId = socket.id + '#' + waiting.id; // Create a unique room ID
      
      // Both sockets join the same room
      socket.join(roomId);
      waiting.join(roomId);

      // Notify both clients of the room ID they've joined
      socket.emit('room', roomId);
      waiting.emit('room', roomId);

      console.log(`Paired ${socket.id} with ${waiting.id} in room ${roomId}`);
      waiting = null; // Reset waiting as a pair has been formed
    } else {
      console.log(`${socket.id} is waiting for a partner.`);
      waiting = socket; // This user is now waiting
    }
  });

  socket.on('signal', ({ roomId, data }) => {
    console.log(`Relaying signal in room ${roomId} from ${socket.id}`);
    // Emit the signal data to all other sockets in the specified room (excluding the sender)
    socket.to(roomId).emit('signal', data);
  });

  socket.on('leave', (roomId) => {
    console.log(`${socket.id} is leaving room ${roomId}`);
    // Notify the other user in the room that this user is leaving
    socket.to(roomId).emit('leave');
    // Make the user leave the room on the server side
    socket.leave(roomId);
    
    // If the leaving user was currently 'waiting', clear them from waiting
    if (waiting && waiting.id === socket.id) {
      waiting = null;
      console.log(`${socket.id} was waiting and has now left.`);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // If the disconnected user was 'waiting', clear them
    if (waiting && waiting.id === socket.id) {
      waiting = null;
      console.log(`${socket.id} was waiting and disconnected.`);
    }
    // In a production app, you'd also want to check if the disconnected user
    // was in an active room and notify their partner. This would involve
    // tracking room assignments more persistently on the server.
    // For now, the client-side `peer.on('close')` and `peer.on('error')`
    // will handle unexpected disconnects from the other side.
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});