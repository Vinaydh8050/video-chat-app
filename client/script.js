const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');
const nextButton = document.getElementById('nextButton');

let localStream;
let peer;
let roomId;

startButton.onclick = async () => {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    socket.emit('join');
    startButton.disabled = true;
    nextButton.disabled = false;
  } catch (err) {
    alert('Could not access your camera and microphone.');
    console.error(err);
  }
};

nextButton.onclick = () => {
  if (peer) {
    peer.destroy();
    peer = null;
  }
  socket.emit('leave', roomId);
  location.reload(); // simple reload to reset app and connect again
};

socket.on('room', (room) => {
  roomId = room;
  createPeer(true);
});

socket.on('signal', (data) => {
  if (!peer) createPeer(false);
  peer.signal(data);
});

socket.on('leave', () => {
  alert('Stranger disconnected.');
  location.reload();
});

function createPeer(initiator) {
  peer = new SimplePeer({
    initiator,
    stream: localStream,
    trickle: false,
  });

  peer.on('signal', data => {
    socket.emit('signal', { roomId, data });
  });

  peer.on('stream', stream => {
    remoteVideo.srcObject = stream;
  });

  peer.on('close', () => {
    console.log('Peer disconnected');
  });

  peer.on('error', err => {
    console.error('Peer error:', err);
  });
}
