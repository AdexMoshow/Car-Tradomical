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

// Initialize Firebase globally
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
   INVENTORY ENGINE (Syncs adverts for everyone)
   ============================================================ */
function initInventorySync() {
    rtdb.ref("inventory").on("value", (snapshot) => {
        inventory.cars = [];
        inventory.herbs = [];
        snapshot.forEach((child) => {
            const data = child.val();
            const product = {
                category: data.category,
                brand: data.brand,
                title: data.title,
                price: data.price,
                img: data.imageBase64 || (data.type === 'CAR' ? 'lib/porsche.jpg' : 'lib/herb.jpg'),
                desc: data.description,
                specs: data.specs ? data.specs.join(' | ') : ''
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
    if (carGrid) carGrid.innerHTML = inventory.cars.length > 0 ? inventory.cars.map(c => createProductCard(c, 'car')).join('') : '<p class="empty-msg">No cars available.</p>';
    if (tradoGrid) tradoGrid.innerHTML = inventory.herbs.length > 0 ? inventory.herbs.map(h => createProductCard(h, 'herb')).join('') : '<p class="empty-msg">No herbs available.</p>';
}

function createProductCard(item, type) {
    const isCar = type === 'car';
    return `
        <div class="card ${isCar ? 'car-compact' : 'medical-compact'} clickable-product"
             data-brand="${item.brand}" data-title="${item.title}" data-price="${item.price}"
             data-img="${item.img}" data-desc="${item.desc}" data-specs="${item.specs}">
            <div class="${isCar ? 'car-img-container' : 'herb-img-container'}">
                <img loading="lazy" src="${item.img}" alt="${item.title}">
                ${isCar ? '<div class="heart-btn">❤️</div>' : ''}
            </div>
            <div class="${isCar ? 'car-info-compact' : 'herb-info-compact'}">
                <span class="${isCar ? 'brand' : 'category'}">${isCar ? item.brand : item.category}</span>
                <h4>${item.title}</h4>
                <p class="${isCar ? 'price-sm' : 'rating'}">${isCar ? item.price : '⭐ 5.0'}</p>
            </div>
        </div>
    `;
}

/* ============================================================
   NAVIGATION & TABS (With Persistence)
   ============================================================ */
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');

function setActivePage(target, skipHistory = false) {
    navItems.forEach(i => {
        const isTarget = i.getAttribute('data-target') === target;
        i.classList.toggle('active', isTarget);
    });
    pages.forEach(p => {
        p.classList.toggle('active', p.id === target);
    });
    document.body.classList.toggle('chat-open', target === 'chat');

    if (!skipHistory) {
        localStorage.setItem('adex_active_page', target);
    }
}

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const target = item.getAttribute('data-target');
        setActivePage(target);
        if (window.navigator.vibrate) window.navigator.vibrate(10);
    });
});

document.querySelectorAll('.profile-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-tab');
        document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(c => {
            const isActive = c.id === `tab-${target}`;
            c.classList.toggle('active', isActive);
            if (isActive) localStorage.setItem('adex_active_profile_tab', target);
        });
    });
});

/* ============================================================
   PULL TO REFRESH ENGINE (Optimized)
   ============================================================ */
const contentArea = document.querySelector('#content');
const pullRefresh = document.querySelector('#pull-to-refresh');
let touchStart = 0;
let touchDiff = 0;

if (contentArea && pullRefresh) {
    contentArea.addEventListener('touchstart', (e) => {
        if (contentArea.scrollTop <= 0) {
            touchStart = e.touches[0].clientY;
        } else {
            touchStart = 0;
        }
    }, { passive: true });

    contentArea.addEventListener('touchmove', (e) => {
        if (touchStart > 0 && contentArea.scrollTop <= 0) {
            const currentTouch = e.touches[0].clientY;
            touchDiff = (currentTouch - touchStart) * 0.5;

            if (touchDiff > 0) {
                if (touchDiff > 120) touchDiff = 120 + (touchDiff - 120) * 0.2; // Resistance
                pullRefresh.style.transform = `translateY(${touchDiff}px)`;
                pullRefresh.style.opacity = Math.min(touchDiff / 80, 1);
            }
        }
    }, { passive: true });

    contentArea.addEventListener('touchend', () => {
        if (touchDiff > 80 && contentArea.scrollTop <= 0) {
            pullRefresh.style.transform = 'translateY(60px)';
            if (window.navigator.vibrate) window.navigator.vibrate(20);

            // STAY AT SAME PAGE: Handled by Persistence logic
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } else {
            pullRefresh.style.transform = 'translateY(0)';
            pullRefresh.style.opacity = '0';
        }
        touchStart = 0;
        touchDiff = 0;
    });
}

/* ============================================================
   CHAT ENGINE (Real-time Messaging & Notifications)
   ============================================================ */
const CHAT_HISTORY_KEY = 'adex_chat_history_' + chatSessionId;
function loadLocalChat() { return JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]'); }
function saveLocalChat(msgs) { localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(msgs)); }

function requestNotificationPermission() {
    if ("Notification" in window) Notification.requestPermission();
}

function showWebNotification(title, body) {
    if (Notification.permission === "granted") {
        new Notification(title, { body: body, icon: 'icon.svg' });
        if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100]);
    }
}

function initChatSync() {
    requestNotificationPermission();
    const localMsgs = loadLocalChat();
    const scMessages = document.querySelector('#sc-messages');
    if (localMsgs.length > 0 && scMessages) {
        scMessages.innerHTML = '';
        localMsgs.forEach(m => scAppend(m.text, m.isSentByUser));
    }

    rtdb.ref("chats/" + chatSessionId).on("value", (snapshot) => {
        const data = snapshot.val();
        if (data && data.messages && scMessages) {
            const remoteMsgs = Object.values(data.messages).sort((a,b) => a.time - b.time);

            // Notification Detection
            if (remoteMsgs.length > 0) {
                const lastMsg = remoteMsgs[remoteMsgs.length - 1];
                const lastLocalTime = localMsgs.length > 0 ? localMsgs[localMsgs.length - 1].time : 0;
                if (!lastMsg.isSentByUser && lastMsg.time > lastLocalTime) {
                    showWebNotification("Adex Admin", lastMsg.text);
                }
            }

            scMessages.innerHTML = '';
            remoteMsgs.forEach(m => scAppend(m.text, m.isSentByUser));
            saveLocalChat(remoteMsgs);
        } else if (!data) {
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

function scSend() {
    const input = document.querySelector('#sc-input');
    const text = input.value.trim();
    if (!text) return;
    if (loadProfile().name === 'Guest User') {
        alert("Please set a username in your Profile first.");
        document.querySelector('[data-target="profile"]').click();
        return;
    }
    const newMsg = { text, isSentByUser: true, time: Date.now() };
    rtdb.ref("chats/" + chatSessionId + "/messages").push(newMsg);
    rtdb.ref("chats/" + chatSessionId).update({ lastMessage: text, timestamp: Date.now(), userName: loadProfile().name });
    input.value = '';
}

const scSendBtn = document.querySelector('#sc-send');
if (scSendBtn) scSendBtn.addEventListener('click', scSend);

/* ============================================================
   PROFILE & AUTH
   ============================================================ */
const PROFILE_KEY = 'adex_user_profile_v3';
function loadProfile() { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{"name":"Guest User"}'); }
function saveProfile(p) { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); }

function applyProfile() {
    const p = loadProfile();
    const isGuest = p.name === 'Guest User';
    const dispName = document.querySelector('#profile-display-name');
    const dispHandle = document.querySelector('#profile-display-handle');
    const loginSec = document.querySelector('#username-login-section');

    if (dispName) dispName.textContent = p.name;
    if (dispHandle) dispHandle.textContent = isGuest ? 'Set a username to start chatting' : '@' + p.name.toLowerCase().replace(/\s+/g, '');
    if (loginSec) loginSec.style.display = isGuest ? 'flex' : 'none';
}

const setUsernameBtn = document.querySelector('#set-username-btn');
if (setUsernameBtn) {
    setUsernameBtn.addEventListener('click', async () => {
        const input = document.querySelector('#login-username-input');
        const name = input.value.trim();
        if (!name) return alert('Please enter a username');
        setUsernameBtn.disabled = true;
        setUsernameBtn.innerHTML = 'Registering...';
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
        finally { setUsernameBtn.disabled = false; setUsernameBtn.innerHTML = 'Set Username'; }
    });
}

// Service Worker Logic
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js');
    });
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
    // Restore previous page state
    const savedPage = localStorage.getItem('adex_active_page') || 'home';
    setActivePage(savedPage, true);

    const savedProfileTab = localStorage.getItem('adex_active_profile_tab');
    if (savedProfileTab) {
        const tabEl = document.querySelector(`.profile-tab[data-tab="${savedProfileTab}"]`);
        if (tabEl) tabEl.click();
    }

    applyProfile();
    initInventorySync();
    initChatSync();
});
