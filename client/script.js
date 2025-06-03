const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');
const nextButton = document.getElementById('nextButton');

let localStream = null;
let peer = null;
let roomId = null;

function resetChatUI() {
  if (peer) {
    peer.destroy();
    peer = null;
  }
  remoteVideo.srcObject = null;
  roomId = null;
  startButton.disabled = false;
  nextButton.disabled = true;
}

startButton.onclick = async () => {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
    localVideo.play().catch(e => console.error("Local autoplay failed:", e));

    socket.emit('join');
    startButton.disabled = true;
    nextButton.disabled = false;
  } catch (err) {
    alert('Please allow camera and microphone access.');
    console.error(err);
  }
};

nextButton.onclick = () => {
  if (roomId) socket.emit('leave', roomId);
  resetChatUI();
  socket.emit('join'); // Immediately try to connect to a new stranger
};

socket.on('room', id => {
  roomId = id;
  if (localStream) {
    createPeer(true);
  } else {
    alert("Local stream not ready. Refresh and try again.");
  }
});

socket.on('signal', data => {
  if (!peer) {
    if (localStream) {
      createPeer(false);
    } else {
      console.warn('No local stream available.');
      return;
    }
  }
  peer.signal(data);
});

socket.on('leave', () => {
  alert('Stranger disconnected.');
  resetChatUI();
});

function createPeer(initiator) {
  if (peer) {
    peer.destroy();
    peer = null;
  }

  peer = new SimplePeer({
    initiator,
    trickle: false,
    stream: localStream,
    config: {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    }
  });

  peer.on('signal', data => {
    if (roomId) socket.emit('signal', { roomId, data });
  });

  peer.on('stream', remoteStream => {
    remoteVideo.srcObject = remoteStream;
    remoteVideo.muted = true;
    remoteVideo.play().then(() => {
      setTimeout(() => { remoteVideo.muted = false; }, 1000);
    }).catch(err => {
      console.error("Remote autoplay error:", err);
      alert('Click on the video area to allow audio playback.');
    });
  });

  peer.on('connect', () => {
    console.log('✅ Connected to peer');
  });

  peer.on('error', err => {
    console.error('Peer error:', err);
    resetChatUI();
  });

  peer.on('close', () => {
    console.log('Peer connection closed');
    resetChatUI();
  });
}
