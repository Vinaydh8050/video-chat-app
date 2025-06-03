const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');
const nextButton = document.getElementById('nextButton');

let localStream = null;
let peer = null;
let roomId = null;

startButton.onclick = async () => {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    localVideo.srcObject = localStream;

    socket.emit('join');
    startButton.disabled = true;
    nextButton.disabled = false;
  } catch (err) {
    alert('Please allow camera and microphone access.');
    console.error(err);
  }
};

nextButton.onclick = () => {
  if (peer) {
    peer.destroy();
    peer = null;
  }
  socket.emit('leave', roomId);
  location.reload();
};

socket.on('room', id => {
  roomId = id;
  createPeer(true);
});

socket.on('signal', data => {
  if (!peer) createPeer(false);
  peer.signal(data);
});

socket.on('leave', () => {
  if (peer) {
    peer.destroy();
    peer = null;
  }
  alert('Stranger disconnected.');
  location.reload();
});

function createPeer(initiator) {
  peer = new SimplePeer({
    initiator,
    trickle: false,
    stream: localStream,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    }
  });

  peer.on('signal', data => {
    socket.emit('signal', { roomId, data });
  });

  peer.on('stream', remoteStream => {
    remoteVideo.srcObject = remoteStream;
    remoteVideo.play().catch(err => console.error('Autoplay error:', err));
  });

  peer.on('connect', () => {
    console.log('Peer connection established');
  });

  peer.on('close', () => {
    console.log('Peer connection closed');
  });

  peer.on('error', err => {
    console.error('Peer error:', err);
  });
}
