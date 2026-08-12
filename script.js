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

function esc(str) {
    if (!str) return "";
    return str.toString().replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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
   PRODUCT DETAIL OVERLAY
   ============================================================ */
document.addEventListener('click', (e) => {
    const product = e.target.closest('.clickable-product');
    if (!product) return;

    const brand = product.getAttribute('data-brand');
    const title = product.getAttribute('data-title');
    const price = product.getAttribute('data-price');
    const img = product.getAttribute('data-img');
    const desc = product.getAttribute('data-desc');
    const specs = product.getAttribute('data-specs');

    const overlay = document.querySelector('#product-detail-overlay');
    if (!overlay) return;

    document.querySelector('#detail-brand').textContent = brand;
    document.querySelector('#detail-title').textContent = title;
    document.querySelector('#detail-price').textContent = price;
    document.querySelector('#detail-img').src = img;
    document.querySelector('#detail-desc').textContent = desc;

    const specsContainer = document.querySelector('#detail-specs');
    specsContainer.innerHTML = '';
    if (specs) {
        specs.split('|').forEach(spec => {
            const chip = document.createElement('div');
            chip.className = 'spec-chip';
            chip.innerHTML = `<i class="fas fa-info-circle"></i> ${spec.trim()}`;
            specsContainer.appendChild(chip);
        });
    }

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
});

const closeDetailBtn = document.querySelector('.close-detail');
if (closeDetailBtn) {
    closeDetailBtn.addEventListener('click', () => {
        document.querySelector('#product-detail-overlay').classList.remove('active');
        document.body.style.overflow = '';
    });
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

    // Switch panels automatically when clicking Chat
    if (target === 'chat') {
        openChatRoom();
        document.body.classList.add('chat-open');
    } else {
        document.body.classList.remove('chat-open');
    }

    if (!skipHistory) {
        localStorage.setItem('adex_active_page', target);
    }

    const content = document.querySelector('#content');
    if (content) content.scrollTop = 0;
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
let isRefreshing = false;

if (contentArea && pullRefresh) {
    contentArea.addEventListener('touchstart', (e) => {
        if (contentArea.scrollTop <= 0) { touchStart = e.touches[0].clientY; } else { touchStart = 0; }
    }, { passive: true });

    contentArea.addEventListener('touchmove', (e) => {
        if (touchStart > 0 && contentArea.scrollTop <= 0) {
            const currentTouch = e.touches[0].clientY;
            touchDiff = (currentTouch - touchStart) * 0.5;
            if (touchDiff > 0) {
                if (touchDiff > 120) touchDiff = 120 + (touchDiff - 120) * 0.2;
                pullRefresh.style.transform = `translateY(${touchDiff}px)`;
                pullRefresh.style.opacity = Math.min(touchDiff / 80, 1);
            }
        }
    }, { passive: true });

    contentArea.addEventListener('touchend', () => {
        if (touchDiff > 80 && contentArea.scrollTop <= 0) {
            if (isRefreshing) return;
            isRefreshing = true;
            pullRefresh.style.transform = 'translateY(60px)';
            if (window.navigator.vibrate) window.navigator.vibrate(20);
            setTimeout(() => { window.location.reload(); }, 500);
        } else {
            pullRefresh.style.transform = 'translateY(0)';
            pullRefresh.style.opacity = '0';
        }
        touchStart = 0; touchDiff = 0;
    });
}

/* ============================================================
   CHAT ENGINE (Real-time Messaging & Notifications)
   ============================================================ */
function initChatSync() {
    const scMessages = document.querySelector('#sc-messages');
    if (!scMessages) return;

    requestNotificationPermission();
    const localMsgs = loadLocalChat();
    if (localMsgs.length > 0) {
        scMessages.innerHTML = '';
        localMsgs.forEach(m => scAppend(m.text, m.isSentByUser));
    }

    rtdb.ref("chats/" + chatSessionId).on("value", (snapshot) => {
        const data = snapshot.val();
        const msgArea = document.querySelector('#sc-messages');
        if (data && data.messages && msgArea) {
            const remoteMsgs = Object.values(data.messages).sort((a,b) => a.time - b.time);
            if (remoteMsgs.length > 0) {
                const lastMsg = remoteMsgs[remoteMsgs.length - 1];
                const localMsgs = loadLocalChat();
                const lastLocalTime = localMsgs.length > 0 ? localMsgs[localMsgs.length - 1].time : 0;
                if (!lastMsg.isSentByUser && lastMsg.time > lastLocalTime) {
                    showWebNotification("Adex Admin", lastMsg.text);
                }
            }
            msgArea.innerHTML = '';
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
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const profile = loadProfile();
    if (profile.name === 'Guest User') {
        alert("Please set a username in your Profile first.");
        setActivePage('profile');
        return;
    }
    const newMsg = { text, isSentByUser: true, time: Date.now() };
    rtdb.ref("chats/" + chatSessionId + "/messages").push(newMsg);
    rtdb.ref("chats/" + chatSessionId).update({ lastMessage: text, timestamp: Date.now(), userName: profile.name });
    input.value = '';
}

if (scSendBtn) scSendBtn.addEventListener('click', scSend);
if (scInput) scInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') scSend(); });

function scSendInquiry(text) {
    const profile = loadProfile();
    const newMsg = { text, isSentByUser: true, time: Date.now() };
    rtdb.ref("chats/" + chatSessionId + "/messages").push(newMsg).then(() => {
        rtdb.ref("chats/" + chatSessionId).update({ lastMessage: text, timestamp: Date.now(), userName: profile.name });
    });
}

function openChatRoom() {
    const list = document.querySelector('#sc-list');
    const room = document.querySelector('#sc-room');
    if (list) list.classList.remove('active');
    if (room) room.classList.add('active');
}

if (scBackBtn) {
    scBackBtn.addEventListener('click', () => {
        if (scRoom) scRoom.classList.remove('active');
        if (scList) scList.classList.add('active');
    });
}

// Global delegated listener for inquiry buttons
document.addEventListener('click', (e) => {
    const chatBtn = e.target.closest('.detail-actions .secondary-action');
    const reserveBtn = e.target.closest('#reserve-btn');

    if (chatBtn || reserveBtn) {
        const profile = loadProfile();
        if (profile.name === 'Guest User') {
            alert("Please set a username in your Profile first to identify yourself.");
            document.querySelector('#product-detail-overlay').classList.remove('active');
            document.body.style.overflow = '';
            setActivePage('profile');
            return;
        }

        const title = document.querySelector('#detail-title').textContent;
        const price = document.querySelector('#detail-price').textContent;

        document.querySelector('#product-detail-overlay').classList.remove('active');
        document.body.style.overflow = '';
        setActivePage('chat');
        openChatRoom();

        if (chatBtn) {
            scSendInquiry(`I am interested in "${title}". Can you provide more details?`);
        } else {
            scSendInquiry(`RESERVATION REQUEST: I want to reserve "${title}" for ${price}.`);
            alert("Request Sent! Your reservation has been sent to the Admin.");
        }
    }
});

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

// PWA Install Logic
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; document.querySelector('#install-banner')?.classList.add('show'); });
document.querySelector('#install-btn')?.addEventListener('click', () => { if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; } });
document.querySelector('#install-close')?.addEventListener('click', () => { document.querySelector('#install-banner')?.classList.remove('show'); });

// Initial startup
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const savedPage = localStorage.getItem('adex_active_page') || 'home';
        setActivePage(savedPage, true);
        const savedProfileTab = localStorage.getItem('adex_active_profile_tab');
        if (savedProfileTab) {
            document.querySelector(`.profile-tab[data-tab="${savedProfileTab}"]`)?.click();
        }
        applyProfile();
        initInventorySync();
        initChatSync();
    }, 50);
});
