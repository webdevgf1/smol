// Environment variables are exposed by Vercel at build time
// They need to be prefixed with VITE_ or use a serverless function
// For now, we'll load them via a config endpoint

async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        window.ENV = config;
    } catch (error) {
        console.error('Error loading config:', error);
        // Fallback - try to use inline env vars (set by build process)
        window.ENV = {
            ANTHROPIC_API_KEY: '',
            ELEVENLABS_API_KEY: '',
            FIREBASE_API_KEY: '',
            FIREBASE_AUTH_DOMAIN: '',
            FIREBASE_PROJECT_ID: '',
            FIREBASE_STORAGE_BUCKET: '',
            FIREBASE_MESSAGING_SENDER_ID: '',
            FIREBASE_APP_ID: ''
        };
    }
}

// Initialize the application
import { initModel } from './model.js';
import { initChat } from './chat.js';
import { initUI } from './ui.js';
import { initFirebase } from './firebase.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Load configuration first
    await loadConfig();
    
    // Initialize Firebase
    initFirebase();
    
    // Initialize 3D model
    initModel();
    
    // Initialize chat functionality
    initChat();
    
    // Initialize UI controls
    initUI();
});
