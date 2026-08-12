/* ============================================================
   FIREBASE INITIALIZATION
   ============================================================ */
const firebaseConfig = {
    apiKey: "AIzaSyBcN3Us41kP8Q0r6ftoSZQOoAZvTJHmRzE",
    authDomain: "adexmosho.firebaseapp.com",
    projectId: "adexmosho",
    storageBucket: "adexmosho.firebasestorage.app",
    messagingSenderId: "249462316956",
    appId: "1:249462316956:web:61ee1465f7c2eedd9db259",
    measurementId: "G-PLQL0LL490"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const rtdb = firebase.database();
const auth = firebase.auth();

// Global State
let inventory = { cars: [], herbs: [] };
let chatSessionId = localStorage.getItem('adex_chat_session_v1');
if (!chatSessionId) {
    chatSessionId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('adex_chat_session_v1', chatSessionId);
}

/* ============================================================
   UTILITIES
   ============================================================ */
function esc(str) {
    if (!str) return "";
    return str.toString().replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function loadProfile() {
    const raw = localStorage.getItem('adex_user_profile_v3');
    return raw ? JSON.parse(raw) : { name: 'Guest User' };
}

function saveProfile(p) {
    localStorage.setItem('adex_user_profile_v3', JSON.stringify(p));
}

/* ============================================================
   NAVIGATION ENGINE
   ============================================================ */
function setActivePage(target, skipHistory = false) {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');

    navItems.forEach(i => i.classList.toggle('active', i.getAttribute('data-target') === target));
    pages.forEach(p => p.classList.toggle('active', p.id === target));

    // Immersive chat mode
    document.body.classList.toggle('chat-open', target === 'chat');

    // Support hub panel logic
    if (target === 'chat') {
        const list = document.querySelector('#sc-list');
        const room = document.querySelector('#sc-room');
        if (list) list.classList.remove('active');
        if (room) room.classList.add('active');
    }

    if (!skipHistory) {
        localStorage.setItem('adex_active_page', target);
    }

    const content = document.querySelector('#content');
    if (content) content.scrollTop = 0;
}

/* ============================================================
   INVENTORY ENGINE
   ============================================================ */
function initInventorySync() {
    rtdb.ref("inventory").on("value", (snapshot) => {
        inventory.cars = [];
        inventory.herbs = [];
        snapshot.forEach((child) => {
            const data = child.val();
            const product = {
                category: data.category || "General",
                brand: data.brand || "",
                title: data.title || "Untitled",
                price: data.price || "Contact for Price",
                img: data.imageBase64 || (data.type === 'CAR' ? 'lib/porsche.jpg' : 'lib/herb.jpg'),
                desc: data.description || "No description provided.",
                specs: data.specs ? data.specs.join(' | ') : ""
            };
            if (data.type === "CAR") inventory.cars.push(product);
            else if (data.type === "HERB") inventory.herbs.push(product);
        });
        renderInventory();
    });
}

function renderInventory() {
    const carGrid = document.querySelector('.car-grid-3');
    const tradoGrid = document.querySelector('.trado-grid-3');
    
    if (carGrid) {
        carGrid.innerHTML = inventory.cars.length > 0
            ? inventory.cars.map(c => createProductCard(c, 'car')).join('')
            : '<p class="empty-msg">No cars available.</p>';
    }
    if (tradoGrid) {
        tradoGrid.innerHTML = inventory.herbs.length > 0
            ? inventory.herbs.map(h => createProductCard(h, 'herb')).join('')
            : '<p class="empty-msg">No herbs available.</p>';
    }
}

function createProductCard(item, type) {
    const isCar = type === 'car';
    return `
        <div class="card ${isCar ? 'car-compact' : 'medical-compact'} clickable-product"
             data-brand="${esc(item.brand)}" data-title="${esc(item.title)}" data-price="${esc(item.price)}"
             data-img="${item.img}" data-desc="${esc(item.desc)}" data-specs="${esc(item.specs)}">
            <div class="${isCar ? 'car-img-container' : 'herb-img-container'}">
                <img loading="lazy" src="${item.img}" alt="${esc(item.title)}">
                ${isCar ? '<div class="heart-btn">❤️</div>' : ''}
            </div>
            <div class="${isCar ? 'car-info-compact' : 'herb-info-compact'}">
                <span class="${isCar ? 'brand' : 'category'}">${isCar ? esc(item.brand) : esc(item.category)}</span>
                <h4>${esc(item.title)}</h4>
                <p class="${isCar ? 'price-sm' : 'rating'}">${isCar ? item.price : '⭐ 5.0'}</p>
            </div>
        </div>
    `;
}

/* ============================================================
   CHAT ENGINE
   ============================================================ */
const CHAT_HISTORY_KEY = () => 'adex_chat_history_' + chatSessionId;
function loadLocalChat() { return JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY()) || '[]'); }
function saveLocalChat(msgs) { localStorage.setItem(CHAT_HISTORY_KEY(), JSON.stringify(msgs)); }

function initChatSync() {
    const msgArea = document.querySelector('#sc-messages');
    if (!msgArea) return;

    // Permissions
    if ("Notification" in window) Notification.requestPermission();

    // Local history first
    const localMsgs = loadLocalChat();
    if (localMsgs.length > 0) {
        msgArea.innerHTML = '';
        localMsgs.forEach(m => scAppend(m.text, m.isSentByUser));
    }

    rtdb.ref("chats/" + chatSessionId).on("value", (snapshot) => {
        const data = snapshot.val();
        if (data && data.messages) {
            const remoteMsgs = Object.values(data.messages).sort((a,b) => a.time - b.time);

            // New message notification
            const lastMsg = remoteMsgs[remoteMsgs.length - 1];
            const localMsgs = loadLocalChat();
            const lastLocalTime = localMsgs.length > 0 ? localMsgs[localMsgs.length - 1].time : 0;
            if (!lastMsg.isSentByUser && lastMsg.time > lastLocalTime) {
                if (Notification.permission === "granted") {
                    new Notification("Adex Admin", { body: lastMsg.text, icon: 'icon.svg' });
                    if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100]);
                }
            }

            msgArea.innerHTML = '';
            remoteMsgs.forEach(m => scAppend(m.text, m.isSentByUser));
            saveLocalChat(remoteMsgs);
        } else if (!data) {
            // Seed initial message
            const initialMsg = { text: 'Hello! 👋 How can I help you today?', isSentByUser: false, time: Date.now() };
            rtdb.ref("chats/" + chatSessionId).set({ id: chatSessionId, userName: loadProfile().name, timestamp: Date.now() });
            rtdb.ref("chats/" + chatSessionId + "/messages").push(initialMsg);
        }
    });
}

function scAppend(text, isOut) {
    const el = document.querySelector('#sc-messages');
    if (!el) return;
    const bubble = document.createElement('div');
    bubble.className = `sc-bubble ${isOut ? 'out' : 'in'}`;
    bubble.innerHTML = `<div class="sc-bubble-text">${text}</div>`;
    el.appendChild(bubble);
    el.scrollTop = el.scrollHeight;
}

async function scSend() {
    const input = document.querySelector('#sc-input');
    const text = input ? input.value.trim() : "";
    if (!text) return;

    const profile = loadProfile();
    if (profile.name === 'Guest User') {
        alert("Please set a username in your Profile first.");
        setActivePage('profile');
        return;
    }

    const newMsg = { text, isSentByUser: true, time: Date.now() };
    await rtdb.ref("chats/" + chatSessionId + "/messages").push(newMsg);
    await rtdb.ref("chats/" + chatSessionId).update({ lastMessage: text, timestamp: Date.now(), userName: profile.name });
    input.value = '';
}

function scSendInquiry(text) {
    const profile = loadProfile();
    const newMsg = { text, isSentByUser: true, time: Date.now() };
    rtdb.ref("chats/" + chatSessionId + "/messages").push(newMsg);
    rtdb.ref("chats/" + chatSessionId).update({ lastMessage: text, timestamp: Date.now(), userName: profile.name });
}

/* ============================================================
   PWA & INSTALL
   ============================================================ */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.querySelector('#install-banner')?.classList.add('show');
});

async function triggerInstall() {
    if (!deferredPrompt) return alert('Installation not available. Use your browser menu "Add to Home Screen".');
    deferredPrompt.prompt();
    deferredPrompt = null;
    document.querySelector('#install-banner')?.classList.remove('show');
}

/* ============================================================
   GLOBAL EVENT LISTENERS
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Navigation Restorer
    const savedPage = localStorage.getItem('adex_active_page') || 'home';
    setActivePage(savedPage, true);

    // 2. Profile Initializer
    const applyProfile = () => {
        const p = loadProfile();
        const isGuest = p.name === 'Guest User';
        const dispName = document.querySelector('#profile-display-name');
        const dispHandle = document.querySelector('#profile-display-handle');
        const loginSec = document.querySelector('#username-login-section');
        if (dispName) dispName.textContent = p.name;
        if (dispHandle) dispHandle.textContent = isGuest ? 'Set a username to start chatting' : '@' + p.name.toLowerCase().replace(/\s+/g, '');
        if (loginSec) loginSec.style.display = isGuest ? 'flex' : 'none';
    };
    applyProfile();

    // 3. Set Username Handler
    const setBtn = document.querySelector('#set-username-btn');
    if (setBtn) {
        setBtn.addEventListener('click', async () => {
            const input = document.querySelector('#login-username-input');
            const name = input ? input.value.trim() : "";
            if (!name) return alert('Please enter a username');

            setBtn.disabled = true;
            setBtn.innerHTML = 'Registering...';
            try {
                const userCred = await auth.signInAnonymously();
                const uid = userCred.user.uid;
                await rtdb.ref("users/" + uid).set({ uid, username: name, createdAt: Date.now() });
                saveProfile({ uid, name });
                chatSessionId = uid;
                localStorage.setItem('adex_chat_session_v1', uid);
                applyProfile();
                initChatSync();
            } catch (e) { alert("Registration failed."); }
            finally { setBtn.disabled = false; setBtn.innerHTML = 'Set Username'; }
        });
    }

    // 4. Logout Handler
    document.querySelector('.logout-btn')?.addEventListener('click', async () => {
        if (!confirm('Sign out?')) return;
        await auth.signOut();
        localStorage.clear();
        window.location.reload();
    });

    // 5. PWA Handlers
    document.querySelector('#install-btn')?.addEventListener('click', triggerInstall);
    document.querySelector('#profile-install-btn')?.addEventListener('click', triggerInstall);
    document.querySelector('#install-close')?.addEventListener('click', () => document.querySelector('#install-banner')?.classList.remove('show'));

    const guideModal = document.querySelector('#install-guide-modal');
    document.querySelector('#profile-install-guide-btn')?.addEventListener('click', () => guideModal?.classList.add('active'));
    document.querySelector('#guide-close')?.addEventListener('click', () => guideModal?.classList.remove('active'));
    document.querySelector('#guide-install-now')?.addEventListener('click', triggerInstall);

    // 6. Navigation Tabs
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => setActivePage(item.getAttribute('data-target')));
    });

    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tab');
            document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${target}`));
        });
    });

    // 7. Product Details
    document.addEventListener('click', (e) => {
        const product = e.target.closest('.clickable-product');
        if (product) {
            const brand = product.getAttribute('data-brand');
            const title = product.getAttribute('data-title');
            const price = product.getAttribute('data-price');
            const img = product.getAttribute('data-img');
            const desc = product.getAttribute('data-desc');
            const specs = product.getAttribute('data-specs');

            const overlay = document.querySelector('#product-detail-overlay');
            if (overlay) {
                document.querySelector('#detail-brand').textContent = brand;
                document.querySelector('#detail-title').textContent = title;
                document.querySelector('#detail-price').textContent = price;
                document.querySelector('#detail-img').src = img;
                document.querySelector('#detail-desc').textContent = desc;
                const container = document.querySelector('#detail-specs');
                container.innerHTML = (specs || "").split('|').map(s => `<div class="spec-chip"><i class="fas fa-info-circle"></i> ${s.trim()}</div>`).join('');
                overlay.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        }

        // Chat buttons in detail overlay
        const chatBtn = e.target.closest('.detail-actions .secondary-action');
        const reserveBtn = e.target.closest('#reserve-btn');
        if (chatBtn || reserveBtn) {
            if (loadProfile().name === 'Guest User') {
                alert("Please set a username first.");
                document.querySelector('#product-detail-overlay').classList.remove('active');
                document.body.style.overflow = '';
                setActivePage('profile');
                return;
            }
            const title = document.querySelector('#detail-title').textContent;
            document.querySelector('#product-detail-overlay').classList.remove('active');
            document.body.style.overflow = '';
            setActivePage('chat');
            scSendInquiry(chatBtn ? `Interested in "${title}".` : `RESERVATION: I want "${title}".`);
        }
    });

    document.querySelector('.close-detail')?.addEventListener('click', () => {
        document.querySelector('#product-detail-overlay').classList.remove('active');
        document.body.style.overflow = '';
    });

    // Start background syncs
    initInventorySync();
    initChatSync();
});

// Service Worker Logic
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js'); });
}
