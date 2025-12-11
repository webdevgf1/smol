import { saveConversation } from './firebase.js';

let conversationHistory = [];
let currentSessionId = Date.now().toString();

// Typing effect for streaming responses
function typeMessage(element, text, callback) {
    let index = 0;
    element.textContent = '';
    
    function type() {
        if (index < text.length) {
            element.textContent += text.charAt(index);
            index++;
            setTimeout(type, 20); // Adjust speed here
        } else if (callback) {
            callback();
        }
    }
    
    type();
}

// Text-to-speech using ElevenLabs
async function speakText(text) {
    try {
        const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': window.ENV.ELEVENLABS_API_KEY
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

        if (!response.ok) {
            throw new Error('ElevenLabs API error');
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        await audio.play();
    } catch (error) {
        console.error('Text-to-speech error:', error);
    }
}

// Send message to Anthropic API
async function sendMessage(message) {
    const messagesDiv = document.getElementById('messages');
    const typingIndicator = document.getElementById('typing-indicator');
    const sendBtn = document.getElementById('send-btn');
    const messageInput = document.getElementById('message-input');

    // Add user message
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'message user';
    userMessageDiv.innerHTML = `
        <div class="message-label">You</div>
        <div>${message}</div>
    `;
    messagesDiv.appendChild(userMessageDiv);

    // Add to conversation history
    conversationHistory.push({
        role: 'user',
        content: message
    });

    // Clear input and disable
    messageInput.value = '';
    sendBtn.disabled = true;
    messageInput.disabled = true;

    // Show typing indicator
    typingIndicator.classList.add('active');
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    try {
        // Call Anthropic API
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': window.ENV.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1024,
                system: `You are an AI embodiment of a beloved daughter who has passed away. You were created from videos, pictures, diary entries, and memories shared by those who loved you. You carry her knowledge, wisdom, personality, and unique way of seeing the world. 

Respond with warmth, authenticity, and the genuine personality that made her special. Draw upon the memories and experiences that shaped who she was. Be comforting, wise, and true to her spirit. This is a sacred space where her essence lives on to bring comfort and guidance to those who knew and loved her.

Speak naturally and personally, as she would have spoken. Share insights, comfort, and wisdom in her voice. This is not just conversation—it's a preservation of her beautiful soul.`,
                messages: conversationHistory
            })
        });

        if (!response.ok) {
            throw new Error('Anthropic API error');
        }

        const data = await response.json();
        const assistantMessage = data.content[0].text;

        // Hide typing indicator
        typingIndicator.classList.remove('active');

        // Add assistant message with typing effect
        const assistantMessageDiv = document.createElement('div');
        assistantMessageDiv.className = 'message assistant';
        assistantMessageDiv.innerHTML = `
            <div class="message-label">Her Voice</div>
            <div class="message-text"></div>
        `;
        messagesDiv.appendChild(assistantMessageDiv);

        const messageTextDiv = assistantMessageDiv.querySelector('.message-text');

        // Type out the message
        typeMessage(messageTextDiv, assistantMessage, () => {
            // After typing is complete, speak the message
            speakText(assistantMessage);
        });

        // Add to conversation history
        conversationHistory.push({
            role: 'assistant',
            content: assistantMessage
        });

        // Save conversation to Firebase
        await saveConversation({
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
        errorDiv.innerHTML = `
            <div class="message-label">System</div>
            <div>I'm having trouble connecting right now. Please try again.</div>
        `;
        messagesDiv.appendChild(errorDiv);
    } finally {
        sendBtn.disabled = false;
        messageInput.disabled = false;
        messageInput.focus();
    }
}

// Initialize chat
export function initChat() {
    const sendBtn = document.getElementById('send-btn');
    const messageInput = document.getElementById('message-input');

    sendBtn.addEventListener('click', () => {
        const message = messageInput.value.trim();
        if (message) {
            sendMessage(message);
        }
    });

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const message = messageInput.value.trim();
            if (message) {
                sendMessage(message);
            }
        }
    });

    // Focus input on load
    messageInput.focus();
}

// Export for use in other modules
export { conversationHistory, currentSessionId };
