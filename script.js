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
             data-brand="${esc(item.brand)}"
             data-title="${esc(item.title)}"
             data-price="${esc(item.price)}"
             data-img="${item.img}"
             data-desc="${esc(item.desc)}"
             data-specs="${esc(item.specs)}">
            <div class="${isCar ? 'car-img-container' : 'herb-img-container'}">
                <img loading="lazy" src="${item.img}" alt="${esc(item.title)}">
                ${isCar ? '<div class="heart-btn">❤️</div>' : ''}
            </div>
            <div class="${isCar ? 'car-info-compact' : 'herb-info-compact'}">
                <span class="${isCar ? 'brand' : 'category'}">${isCar ? esc(item.brand) : esc(item.category)}</span>
                <h4>${esc(item.title)}</h4>
                <p class="${isCar ? 'price-sm' : 'rating'}">${isCar ? esc(item.price) : '⭐ 5.0'}</p>
            </div>
        </div>
    `;
}

/* ============================================================
   PRODUCT DETAIL OVERLAY (Restored)
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
let isRefreshing = false;

function isContentAtTop() {
    return contentArea.scrollTop <= 0;
}

function performRefresh() {
    if (isRefreshing) return;
    isRefreshing = true;
    
    // Ensure current page is saved before refresh
    const currentPage = localStorage.getItem('adex_active_page') || 'home';
    localStorage.setItem('adex_active_page', currentPage);
    
    pullRefresh.style.transform = 'translateY(60px)';
    if (window.navigator.vibrate) window.navigator.vibrate(20);
    
    // Use a soft reload that preserves page state
    setTimeout(() => {
        window.location.href = window.location.href;
    }, 500);
}

if (contentArea && pullRefresh) {
    contentArea.addEventListener('touchstart', (e) => {
        // Capture initial touch position if at top or content is not scrollable
        if (isContentAtTop()) {
            touchStart = e.touches[0].clientY;
        } else {
            touchStart = 0;
        }
    }, { passive: true });

    contentArea.addEventListener('touchmove', (e) => {
        // Allow pull-to-refresh if at top of content
        if (touchStart > 0 && isContentAtTop()) {
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
        // Trigger refresh if pulled far enough and at the top
        if (touchDiff > 80 && isContentAtTop()) {
            performRefresh();
        } else {
            // Reset pull-to-refresh indicator
            pullRefresh.style.transform = 'translateY(0)';
            pullRefresh.style.opacity = '0';
        }
        touchStart = 0;
        touchDiff = 0;
    });

    // Also allow refresh on document/body for better mobile support
    document.addEventListener('touchstart', (e) => {
        if (contentArea.scrollTop <= 0 && e.target === contentArea) {
            touchStart = e.touches[0].clientY;
        }
    }, { passive: true });
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

/* ============================================================
   PWA INSTALL HANDLING
   ============================================================ */
let deferredPrompt = null;
const installBanner = document.querySelector('#install-banner');
const installBtn = document.querySelector('#install-btn');
const installClose = document.querySelector('#install-close');
const profileInstallBtn = document.querySelector('#profile-install-btn');
const profileInstallGuideBtn = document.querySelector('#profile-install-guide-btn');

// Capture the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBanner) installBanner.classList.add('show');
});

// Hide banner when app is installed
window.addEventListener('appinstalled', () => {
    if (installBanner) installBanner.classList.remove('show');
    deferredPrompt = null;
});

// Install button in banner
if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) {
            alert('AdexMoshow is already installed or not available for your device.');
            return;
        }
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            if (installBanner) installBanner.classList.remove('show');
        }
        deferredPrompt = null;
    });
}

// Close banner button
if (installClose) {
    installClose.addEventListener('click', () => {
        if (installBanner) installBanner.classList.remove('show');
        localStorage.setItem('adex_install_banner_dismissed', 'true');
    });
}

// Profile install button
if (profileInstallBtn) {
    profileInstallBtn.addEventListener('click', async () => {
        if (!deferredPrompt) {
            alert('AdexMoshow is already installed or not available for your device. See the "How to Install" guide below.');
            return;
        }
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            alert('AdexMoshow has been installed! Find it on your home screen.');
            if (installBanner) installBanner.classList.remove('show');
        }
        deferredPrompt = null;
    });
}

/* ============================================================
   INSTALL GUIDE MODAL
   ============================================================ */
const guideModal = document.querySelector('#install-guide-modal');
const guideCloseBtn = document.querySelector('#guide-close');
const guideInstallNowBtn = document.querySelector('#guide-install-now');

if (profileInstallGuideBtn) {
    profileInstallGuideBtn.addEventListener('click', () => {
        if (guideModal) guideModal.classList.add('active');
    });
}

if (guideCloseBtn) {
    guideCloseBtn.addEventListener('click', () => {
        if (guideModal) guideModal.classList.remove('active');
    });
}

if (guideInstallNowBtn) {
    guideInstallNowBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                alert('AdexMoshow has been installed! Find it on your home screen.');
                if (guideModal) guideModal.classList.remove('active');
                if (installBanner) installBanner.classList.remove('show');
            }
            deferredPrompt = null;
        } else {
            alert('Please follow the platform-specific instructions shown above.');
        }
    });
}

// Close guide modal when clicking outside
if (guideModal) {
    guideModal.addEventListener('click', (e) => {
        if (e.target === guideModal) {
            guideModal.classList.remove('active');
        }
    });
}

/* ============================================================
   CHAT WITH AGENT BUTTON (Product Detail)
   ============================================================ */
document.addEventListener('click', (e) => {
    const chatWithAgentBtn = e.target.closest('.detail-actions .secondary-action');
    if (!chatWithAgentBtn) return;
    
    // Navigate to chat page
    const chatNav = document.querySelector('[data-target="chat"]');
    if (chatNav) {
        chatNav.click();
    } else {
        setActivePage('chat');
    }
    
    // Close the product overlay
    const overlay = document.querySelector('#product-detail-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    // Focus on chat input
    setTimeout(() => {
        const chatInput = document.querySelector('#sc-input');
        if (chatInput) chatInput.focus();
    }, 100);
});

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
    // Restore previous page state with a small delay to ensure DOM is ready
    setTimeout(() => {
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
        
        // Scroll to top after page restoration
        setTimeout(() => {
            if (contentArea) contentArea.scrollTop = 0;
        }, 100);
    }, 50);
});
