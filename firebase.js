// Firebase configuration and functions for conversation storage
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let db = null;
let firebaseInitialized = false;

// Initialize Firebase
export function initFirebase() {
    if (firebaseInitialized) return;

    try {
        const firebaseConfig = {
            apiKey: window.ENV.FIREBASE_API_KEY,
            authDomain: window.ENV.FIREBASE_AUTH_DOMAIN,
            projectId: window.ENV.FIREBASE_PROJECT_ID,
            storageBucket: window.ENV.FIREBASE_STORAGE_BUCKET,
            messagingSenderId: window.ENV.FIREBASE_MESSAGING_SENDER_ID,
            appId: window.ENV.FIREBASE_APP_ID
        };

        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        firebaseInitialized = true;
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Firebase initialization error:', error);
    }
}

// Save conversation to Firestore
export async function saveConversation(conversationData) {
    if (!firebaseInitialized) {
        initFirebase();
    }

    try {
        const docRef = await addDoc(collection(db, 'conversations'), conversationData);
        console.log('Conversation saved with ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error saving conversation:', error);
        return null;
    }
}

// Get all conversations
export async function getConversations() {
    if (!firebaseInitialized) {
        initFirebase();
    }

    try {
        const q = query(collection(db, 'conversations'), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const conversations = [];
        querySnapshot.forEach((doc) => {
            conversations.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return conversations;
    } catch (error) {
        console.error('Error getting conversations:', error);
        return [];
    }
}
