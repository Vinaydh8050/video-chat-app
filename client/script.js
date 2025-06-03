const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');
const nextButton = document.getElementById('nextButton');

let localStream = null;
let peer = null;
let roomId = null;

// Function to reset the UI and prepare for a new chat
function resetChatUI() {
    if (peer) {
        peer.destroy();
        peer = null;
    }
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    localStream = null;
    roomId = null;
    startButton.disabled = false;
    nextButton.disabled = true;
    console.log('Chat UI reset.');
}

startButton.onclick = async () => {
    try {
        // Request camera and microphone access
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        localVideo.srcObject = localStream;
        // Attempt to play local video to handle autoplay policies
        localVideo.play().catch(e => console.error("Local video autoplay failed:", e));

        console.log('Local stream obtained. Emitting join request.');
        socket.emit('join');
        startButton.disabled = true;
        nextButton.disabled = false;
    } catch (err) {
        alert('Please allow camera and microphone access to start video chat.');
        console.error('getUserMedia error:', err);
        resetChatUI(); // Reset UI if access is denied
    }
};

nextButton.onclick = () => {
    console.log('Next button clicked. Leaving current chat.');
    if (roomId) {
        socket.emit('leave', roomId); // Notify server about leaving the room
    }
    resetChatUI(); // Reset UI immediately
};

// Called when a room is assigned by the server
socket.on('room', id => {
    roomId = id;
    console.log('Joined room:', roomId);
    // Ensure local stream is available before creating the peer
    if (localStream) {
        // This user is the initiator for the first connection in the room
        createPeer(true);
    } else {
        console.warn('Local stream not yet available when room event received. This might cause issues.');
        // Consider a retry mechanism or ensure getUserMedia completes first
        alert('Failed to get local stream before connecting. Please try again.');
        resetChatUI();
    }
});

// Called when signaling data is received from the other peer via the server
socket.on('signal', data => {
    console.log('Received signal:', data);
    // If a peer doesn't exist, create it (meaning the other side initiated)
    if (!peer) {
        if (localStream) {
            createPeer(false); // Other side is the initiator
        } else {
            console.warn('Local stream not available when signal received. Dropping signal.');
            return; // Cannot process signal without local stream
        }
    }
    peer.signal(data);
});

// Called when the other stranger disconnects or leaves the room
socket.on('leave', () => {
    console.log('Stranger disconnected or left the room.');
    alert('Stranger disconnected.');
    resetChatUI(); // Reset UI to allow finding a new chat
});

function createPeer(initiator) {
    // If a peer already exists, destroy it before creating a new one
    if (peer) {
        console.log('Destroying existing peer before creating new one.');
        peer.destroy();
        peer = null;
    }

    peer = new SimplePeer({
        initiator: initiator,
        trickle: false, // Set to false to send all ICE candidates in one go (simpler for initial setup)
                         // For production, `true` is often preferred for faster connection
        stream: localStream, // Pass the local stream directly to SimplePeer
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                // You might need additional STUN/TURN servers for more robust NAT traversal
                // { urls: 'turn:your.turn.server.com:3478', username: 'user', credential: 'password' }
            ]
        }
    });

    // Event when SimplePeer generates signaling data
    peer.on('signal', data => {
        console.log('SimplePeer generated signal. Emitting to server.');
        if (roomId) {
            socket.emit('signal', { roomId, data });
        } else {
            console.warn('No roomId available to send signal.');
        }
    });

    // Event when the remote stream is received
    peer.on('stream', remoteStream => {
        console.log('Received remote stream!');
        remoteVideo.srcObject = remoteStream;
        // Attempt to play the remote video, handling potential autoplay issues
        remoteVideo.play().catch(err => {
            console.error('Autoplay error for remote video:', err);
            alert('Your browser might be blocking autoplay for the stranger\'s video. Please click on the video area or anywhere on the page to enable it.');
        });
    });

    // Event when the peer connection is established
    peer.on('connect', () => {
        console.log('Peer connection established successfully!');
    });

    // Event when the peer connection is closed
    peer.on('close', () => {
        console.log('Peer connection closed.');
        // If the connection closes unexpectedly, reset the UI
        if (peer && !roomId) { // Only reset if not already in the process of leaving/resetting
            resetChatUI();
        }
    });

    // Event for any peer-related errors
    peer.on('error', err => {
        console.error('Peer error:', err);
        alert('An error occurred during video chat. Please try again.');
        resetChatUI(); // Reset UI on error
    });
}