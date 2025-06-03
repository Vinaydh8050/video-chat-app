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
    // Request camera and mic access
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    // Show your video
    localVideo.srcObject = localStream;

    // Join socket room
    socket.emit('join');

    // Update button states
    startButton.disabled = true;
    nextButton.disabled = false;
  } catch (err) {
    alert('Please allow access to your camera and microphone.');
    console.error(err);
  }
};

nextButton.onclick = () => {
  if (peer) {
    peer.destroy();
    peer = null;
  }
  socket.emit('leave', roomId);
  location.reload(); // reload to start fresh
};

socket.on('room', id => {
  roomId = id;
  createPeer(true); // start peer connection
});

socket.on('signal', data => {
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
    trickle: false,
    stream: localStream,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' } // Free STUN server
      ]
    }
  });

  // Send signaling data through socket
  peer.on('signal', data => {
    socket.emit('signal', { roomId, data });
  });

  // When you get a remote stream, show it
  peer.on('stream', stream => {
    remoteVideo.srcObject = stream;
  });

  peer.on('error', err => {
    console.error('WebRTC error:', err);
  });

  peer.on('close', () => {
    console.log('Peer connection closed');
  });
}
