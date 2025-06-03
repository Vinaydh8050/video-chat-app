const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'client')));

let waiting = null;

io.on('connection', socket => {
  console.log('User connected:', socket.id);

  socket.on('join', () => {
    if (waiting && waiting.id !== socket.id) {
      const roomId = socket.id + '#' + waiting.id;
      socket.join(roomId);
      waiting.join(roomId);
      socket.emit('room', roomId);
      waiting.emit('room', roomId);
      console.log(`Paired ${socket.id} with ${waiting.id}`);
      waiting = null;
    } else {
      console.log(`${socket.id} is waiting for a partner.`);
      waiting = socket;
    }
  });

  socket.on('signal', ({ roomId, data }) => {
    socket.to(roomId).emit('signal', data);
  });

  socket.on('leave', roomId => {
    socket.to(roomId).emit('leave');
    socket.leave(roomId);
    if (waiting && waiting.id === socket.id) {
      waiting = null;
    }
  });

  socket.on('disconnect', () => {
    if (waiting && waiting.id === socket.id) {
      waiting = null;
    }
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
