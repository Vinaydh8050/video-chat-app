const socket = io();
let localStream, peer, roomId;

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startBtn = document.getElementById('startBtn');
const nextBtn = document.getElementById('nextBtn');

startBtn.onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;
  socket.emit('join');
  startBtn.disabled = true;
  nextBtn.disabled = false;
};

nextBtn.onclick = () => {
  if (peer) peer.destroy();
  socket.emit('leave', roomId);
  resetUI();
};

function resetUI() {
  if (peer) peer.destroy();
  peer = null;
  roomId = null;
  remoteVideo.srcObject = null;
  startBtn.disabled = false;
  nextBtn.disabled = true;
}

socket.on('joined', id => {
  roomId = id;
});

socket.on('ready', () => {
  createPeer(true);
});

socket.on('signal', data => {
  if (!peer) createPeer(false);
  peer.signal(data);
});

socket.on('leave', () => {
  resetUI();
});

function createPeer(initiator) {
  peer = new SimplePeer({
    initiator,
    trickle: false,
    stream: localStream
  });

  peer.on('signal', data => {
    socket.emit('signal', { roomId, data });
  });

  peer.on('stream', stream => {
    remoteVideo.srcObject = stream;
  });

  peer.on('close', () => resetUI());
  peer.on('error', err => {
    console.error(err);
    resetUI();
  });
}
