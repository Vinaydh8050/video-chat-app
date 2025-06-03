const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.static('client'));  // Serve files from client folder

let waiting = null;  // Store waiting socket for pairing

io.on('connection', socket => {
  console.log('User connected:', socket.id);

  socket.on('join', () => {
    if (waiting) {
      const roomId = socket.id + '#' + waiting.id;
      socket.join(roomId);
      waiting.join(roomId);

      socket.emit('room', roomId);
      waiting.emit('room', roomId);

      waiting = null;
    } else {
      waiting = socket;
    }
  });

  socket.on('signal', ({ roomId, data }) => {
    socket.to(roomId).emit('signal', data);
  });

  socket.on('leave', (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit('leave');
  });

  socket.on('disconnect', () => {
    if (waiting === socket) waiting = null;
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
