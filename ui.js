import { getConversations } from './firebase.js';

export function initUI() {
    // Modal controls
    const archivesBtn = document.getElementById('archives-btn');
    const aboutBtn = document.getElementById('about-btn');
    const archivesModal = document.getElementById('archives-modal');
    const aboutModal = document.getElementById('about-modal');

    const closeButtons = document.querySelectorAll('.close-btn');

    archivesBtn.addEventListener('click', async () => {
        archivesModal.classList.add('active');
        await loadArchives();
    });

    aboutBtn.addEventListener('click', () => {
        aboutModal.classList.add('active');
    });

    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            archivesModal.classList.remove('active');
            aboutModal.classList.remove('active');
        });
    });

    // Close modals on outside click
    [archivesModal, aboutModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Close modals on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            archivesModal.classList.remove('active');
            aboutModal.classList.remove('active');
        }
    });
}

async function loadArchives() {
    const archivesList = document.getElementById('archives-list');
    archivesList.innerHTML = '<div style="text-align: center; padding: 20px; opacity: 0.6;">Loading conversations...</div>';

    try {
        const conversations = await getConversations();

        if (conversations.length === 0) {
            archivesList.innerHTML = '<div style="text-align: center; padding: 20px; opacity: 0.6;">No conversations yet. Start chatting to create memories.</div>';
            return;
        }

        archivesList.innerHTML = '';

        conversations.forEach(conv => {
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

            archiveItem.addEventListener('click', () => {
                showConversationDetail(conv);
            });

            archivesList.appendChild(archiveItem);
        });

    } catch (error) {
        console.error('Error loading archives:', error);
        archivesList.innerHTML = '<div style="text-align: center; padding: 20px; color: #ff6464;">Error loading conversations. Please try again.</div>';
    }
}

function showConversationDetail(conversation) {
    const archivesList = document.getElementById('archives-list');
    
    const date = new Date(conversation.timestamp);
    const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    let detailHTML = `
        <button id="back-to-archives" style="margin-bottom: 20px;">← Back to Archives</button>
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
