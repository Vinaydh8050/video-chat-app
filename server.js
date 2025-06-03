const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'client'))); // Serve all files from client directory

io.on('connection', socket => {
  console.log('User connected:', socket.id);

  socket.on('join', () => {
    const rooms = Array.from(io.sockets.adapter.rooms);
    const available = rooms.find(([name, room]) => room.size === 1 && !room.has(socket.id));
    const roomId = available ? available[0] : socket.id;

    socket.join(roomId);
    socket.emit('joined', roomId);
    if (available) {
      socket.to(roomId).emit('ready');
    }
  });

  socket.on('signal', ({ roomId, data }) => {
    socket.to(roomId).emit('signal', data);
  });

  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        socket.to(room).emit('leave');
      }
    }
  });

  socket.on('leave', roomId => {
    socket.leave(roomId);
    socket.to(roomId).emit('leave');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
