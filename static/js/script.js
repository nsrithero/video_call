const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const socket = io();

let localStream;
let peerConnection;

const config = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302'
        }
    ]
};

async function startLocalStream() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
    } catch (err) {
        console.error('Error accessing media devices.', err);
    }
}

startLocalStream();

socket.on('message', async message => {
    if (message.type === 'offer') {
        await handleOffer(message);
    } else if (message.type === 'answer') {
        await handleAnswer(message);
    } else if (message.type === 'candidate') {
        await handleCandidate(message);
    }
});

async function startCall() {
    peerConnection = new RTCPeerConnection(config);
    peerConnection.onicecandidate = handleICECandidateEvent;
    peerConnection.ontrack = handleTrackEvent;
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('message', { type: 'offer', sdp: offer.sdp });
}

async function handleOffer(offer) {
    peerConnection = new RTCPeerConnection(config);
    peerConnection.onicecandidate = handleICECandidateEvent;
    peerConnection.ontrack = handleTrackEvent;
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('message', { type: 'answer', sdp: answer.sdp });
}

async function handleAnswer(answer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

function handleICECandidateEvent(event) {
    if (event.candidate) {
        socket.emit('message', { type: 'candidate', candidate: event.candidate });
    }
}

function handleTrackEvent(event) {
    remoteVideo.srcObject = event.streams[0];
}

async function handleCandidate(message) {
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
    } catch (e) {
        console.error('Error adding received ice candidate', e);
    }
}
