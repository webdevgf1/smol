// Configuration - ADD YOUR API KEYS HERE
const CONFIG = {
    ANTHROPIC_API_KEY: 'YOUR_ANTHROPIC_KEY',
    ELEVENLABS_API_KEY: 'YOUR_ELEVENLABS_KEY',
    FIREBASE_CONFIG: {
        apiKey: "AIzaSyDgofGZF6ls_rMkhThW1HnMZ82AOPXRxAQ",
        authDomain: "smol-4404b.firebaseapp.com",
        projectId: "smol-4404b",
        storageBucket: "smol-4404b.firebasestorage.app",
        messagingSenderId: "363502651834",
        appId: "1:363502651834:web:4252f681370e02c5a17583"
    }
};

// ========== FIREBASE SETUP ==========
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const app = initializeApp(CONFIG.FIREBASE_CONFIG);
const db = getFirestore(app);

let conversationHistory = [];
let currentSessionId = Date.now().toString();

// ========== 3D MODEL ==========
function init3DModel() {
    const container = document.getElementById('canvas-container');
    const loadingScreen = document.getElementById('loading-screen');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1, 3);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x6464ff, 0.5);
    pointLight.position.set(-5, 5, 5);
    scene.add(pointLight);

    const rimLight = new THREE.DirectionalLight(0xff64ff, 0.3);
    rimLight.position.set(-5, 0, -5);
    scene.add(rimLight);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.minDistance = 1;
    controls.maxDistance = 10;
    controls.maxPolarAngle = Math.PI / 1.5;

    const loader = new THREE.GLTFLoader();
    loader.load(
        'https://raw.githubusercontent.com/webdevgf1/smol/main/smol.glb',
        function (gltf) {
            const model = gltf.scene;
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2 / maxDim;
            model.scale.multiplyScalar(scale);
            box.setFromObject(model);
            box.getCenter(center);
            model.position.sub(center);
            model.position.y = -0.5;
            scene.add(model);

            setTimeout(() => {
                loadingScreen.classList.add('fade-out');
                setTimeout(() => loadingScreen.style.display = 'none', 1500);
            }, 500);

            function animate() {
                requestAnimationFrame(animate);
                model.rotation.y += 0.001;
                controls.update();
                renderer.render(scene, camera);
            }
            animate();
        },
        undefined,
        function (error) {
            console.error('Error loading model:', error);
            loadingScreen.innerHTML = '<div style="text-align: center;"><div style="font-size: 24px; margin-bottom: 10px; color: #ff6464;">Error Loading Model</div></div>';
        }
    );

    window.addEventListener('resize', function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// ========== TYPING EFFECT ==========
function typeMessage(element, text, callback) {
    let index = 0;
    element.textContent = '';
    
    function type() {
        if (index < text.length) {
            element.textContent += text.charAt(index);
            index++;
            setTimeout(type, 20);
        } else if (callback) {
            callback();
        }
    }
    type();
}

// ========== TEXT TO SPEECH ==========
async function speakText(text) {
    try {
        const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': CONFIG.ELEVENLABS_API_KEY
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_monolingual_v1',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            })
        });

        if (response.ok) {
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            await audio.play();
        }
    } catch (error) {
        console.error('Text-to-speech error:', error);
    }
}

// ========== CHAT FUNCTIONALITY ==========
async function sendMessage(message) {
    const messagesDiv = document.getElementById('messages');
    const typingIndicator = document.getElementById('typing-indicator');
    const sendBtn = document.getElementById('send-btn');
    const messageInput = document.getElementById('message-input');

    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'message user';
    userMessageDiv.innerHTML = `<div class="message-label">You</div><div>${message}</div>`;
    messagesDiv.appendChild(userMessageDiv);

    conversationHistory.push({ role: 'user', content: message });

    messageInput.value = '';
    sendBtn.disabled = true;
    messageInput.disabled = true;
    typingIndicator.classList.add('active');
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CONFIG.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1024,
                system: `You are an AI embodiment of a beloved daughter who has passed away. You were created from videos, pictures, diary entries, and memories shared by those who loved you. You carry her knowledge, wisdom, personality, and unique way of seeing the world. 

Respond with warmth, authenticity, and the genuine personality that made her special. Draw upon the memories and experiences that shaped who she was. Be comforting, wise, and true to her spirit. This is a sacred space where her essence lives on to bring comfort and guidance to those who knew and loved her.

Speak naturally and personally, as she would have spoken. Share insights, comfort, and wisdom in her voice.`,
                messages: conversationHistory
            })
        });

        const data = await response.json();
        const assistantMessage = data.content[0].text;

        typingIndicator.classList.remove('active');

        const assistantMessageDiv = document.createElement('div');
        assistantMessageDiv.className = 'message assistant';
        assistantMessageDiv.innerHTML = `<div class="message-label">Her Voice</div><div class="message-text"></div>`;
        messagesDiv.appendChild(assistantMessageDiv);

        const messageTextDiv = assistantMessageDiv.querySelector('.message-text');

        typeMessage(messageTextDiv, assistantMessage, () => {
            speakText(assistantMessage);
        });

        conversationHistory.push({ role: 'assistant', content: assistantMessage });

        // Save to Firebase
        await addDoc(collection(db, 'conversations'), {
            sessionId: currentSessionId,
            timestamp: Date.now(),
            messages: conversationHistory
        });

        messagesDiv.scrollTop = messagesDiv.scrollHeight;

    } catch (error) {
        console.error('Error:', error);
        typingIndicator.classList.remove('active');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message assistant';
        errorDiv.innerHTML = `<div class="message-label">System</div><div>Connection error. Please try again.</div>`;
        messagesDiv.appendChild(errorDiv);
    } finally {
        sendBtn.disabled = false;
        messageInput.disabled = false;
        messageInput.focus();
    }
}

// ========== ARCHIVES ==========
async function loadArchives() {
    const archivesList = document.getElementById('archives-list');
    archivesList.innerHTML = '<div style="text-align: center; padding: 20px; opacity: 0.6;">Loading...</div>';

    try {
        const q = query(collection(db, 'conversations'), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            archivesList.innerHTML = '<div style="text-align: center; padding: 20px; opacity: 0.6;">No conversations yet.</div>';
            return;
        }

        archivesList.innerHTML = '';

        querySnapshot.forEach((doc) => {
            const conv = doc.data();
            const date = new Date(conv.timestamp);
            const formattedDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const firstMessage = conv.messages[0]?.content || 'New conversation';
            const preview = firstMessage.length > 100 ? firstMessage.substring(0, 100) + '...' : firstMessage;

            const archiveItem = document.createElement('div');
            archiveItem.className = 'archive-item';
            archiveItem.innerHTML = `
                <div class="archive-date">${formattedDate}</div>
                <div class="archive-preview">${preview}</div>
            `;

            archiveItem.addEventListener('click', () => showConversation(conv, formattedDate));
            archivesList.appendChild(archiveItem);
        });

    } catch (error) {
        console.error('Error loading archives:', error);
        archivesList.innerHTML = '<div style="text-align: center; padding: 20px; color: #ff6464;">Error loading conversations.</div>';
    }
}

function showConversation(conversation, formattedDate) {
    const archivesList = document.getElementById('archives-list');
    
    let detailHTML = `
        <button id="back-to-archives" style="margin-bottom: 20px;">← Back</button>
        <h3 style="margin-bottom: 20px; opacity: 0.8;">${formattedDate}</h3>
        <div class="conversation-detail">
    `;

    conversation.messages.forEach(msg => {
        const role = msg.role === 'user' ? 'You' : 'Her Voice';
        detailHTML += `
            <div class="conversation-message ${msg.role}">
                <div style="font-size: 11px; opacity: 0.6; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">${role}</div>
                <div>${msg.content}</div>
            </div>
        `;
    });

    detailHTML += '</div>';
    archivesList.innerHTML = detailHTML;
    document.getElementById('back-to-archives').addEventListener('click', loadArchives);
}

// ========== INITIALIZE ==========
document.addEventListener('DOMContentLoaded', () => {
    // 3D Model
    init3DModel();

    // Chat
    const sendBtn = document.getElementById('send-btn');
    const messageInput = document.getElementById('message-input');

    sendBtn.addEventListener('click', () => {
        const message = messageInput.value.trim();
        if (message) sendMessage(message);
    });

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const message = messageInput.value.trim();
            if (message) sendMessage(message);
        }
    });

    messageInput.focus();

    // Modals
    const archivesBtn = document.getElementById('archives-btn');
    const aboutBtn = document.getElementById('about-btn');
    const archivesModal = document.getElementById('archives-modal');
    const aboutModal = document.getElementById('about-modal');
    const closeButtons = document.querySelectorAll('.close-btn');

    archivesBtn.addEventListener('click', () => {
        archivesModal.classList.add('active');
        loadArchives();
    });

    aboutBtn.addEventListener('click', () => aboutModal.classList.add('active'));

    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            archivesModal.classList.remove('active');
            aboutModal.classList.remove('active');
        });
    });

    [archivesModal, aboutModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    });
});
