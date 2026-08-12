// Inventory Data (Linked to Firebase Realtime Database)
let inventory = {
    cars: [],
    herbs: []
};

// Listen to Firebase Inventory
function initInventorySync() {
    if (typeof rtdb === 'undefined') return;

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

// Render Inventory to the UI
function renderInventory() {
    const carGrid = document.querySelector('.car-grid-3');
    const tradoGrid = document.querySelector('.trado-grid-3');

    if (carGrid) {
        carGrid.innerHTML = inventory.cars.length > 0
            ? inventory.cars.map(car => createProductCard(car, 'car')).join('')
            : '<p class="empty-msg">No cars available in the lot.</p>';
    }

    if (tradoGrid) {
        tradoGrid.innerHTML = inventory.herbs.length > 0
            ? inventory.herbs.map(herb => createProductCard(herb, 'herb')).join('')
            : '<p class="empty-msg">No herbal products available.</p>';
    }
}

function createProductCard(item, type) {
    const isCar = type === 'car';
    return `
        <div class="card ${isCar ? 'car-compact' : 'medical-compact'} clickable-product"
             data-type="${type}"
             data-category="${item.category}"
             data-brand="${item.brand}"
             data-title="${item.title}"
             data-price="${item.price}"
             data-img="${item.img}"
             data-desc="${item.desc}"
             data-specs="${item.specs || ''}">
            <div class="${isCar ? 'car-img-container' : 'herb-img-container'}">
                <img loading="lazy" src="${item.img}" alt="${item.title}">
                ${isCar ? '<div class="heart-btn"><i class="far fa-heart"></i></div>' : ''}
            </div>
            <div class="${isCar ? 'car-info-compact' : 'herb-info-compact'}">
                <span class="${isCar ? 'brand' : 'category'}">${isCar ? item.brand : item.category}</span>
                <h4>${item.title}</h4>
                <p class="${isCar ? 'price-sm' : 'rating'}">
                    ${isCar ? item.price : '<i class="fas fa-star"></i> 5.0'}
                </p>
            </div>
        </div>
    `;
}

// Navigation Logic
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const target = item.getAttribute('data-target');

        // Update nav state
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        // Show the selected page
        pages.forEach(page => {
            page.classList.toggle('active', page.id === target);
        });

        // Toggle full-screen immersive chat: hide header & bottom nav when in chat
        document.body.classList.toggle('chat-open', target === 'chat');

        if (window.navigator.vibrate) {
            window.navigator.vibrate(10);
        }
    });
});

// Scroll Auto-Hide Logic for Header and Bottom Nav
const contentArea = document.querySelector('#content');
const header = document.querySelector('header');
const bottomNav = document.querySelector('.bottom-nav');
let isScrolling;

contentArea.addEventListener('scroll', () => {
    // Hide tabs when scrolling starts
    header.classList.add('nav-hidden');
    bottomNav.classList.add('nav-hidden');

    // Clear our timeout throughout the scroll
    window.clearTimeout(isScrolling);

    // Set a timeout to run after scrolling ends
    isScrolling = setTimeout(() => {
        // Show tabs when scrolling stops
        header.classList.remove('nav-hidden');
        bottomNav.classList.remove('nav-hidden');
    }, 150); // 150ms after scrolling stops
}, { passive: true });

// Pull to Refresh Logic (Reduced Sensitivity)
const pullRefresh = document.querySelector('#pull-to-refresh');
let touchStart = 0;
let touchDiff = 0;

contentArea.addEventListener('touchstart', (e) => {
    touchStart = e.touches[0].clientY;
});

contentArea.addEventListener('touchmove', (e) => {
    if (contentArea.scrollTop === 0) {
        let currentTouch = e.touches[0].clientY;
        // Apply a resistance factor (0.4) so it moves slower than the finger
        touchDiff = (currentTouch - touchStart) * 0.4;

        if (touchDiff > 0 && touchDiff < 150) {
            pullRefresh.style.transform = `translateY(${touchDiff}px)`;
        }
    }
}, { passive: true });

contentArea.addEventListener('touchend', () => {
    // Increased threshold from 70 to 110 for reduced sensitivity
    if (touchDiff > 110 && contentArea.scrollTop === 0) {
        pullRefresh.style.transform = 'translateY(100px)';

        if (window.navigator.vibrate) window.navigator.vibrate(20);

        setTimeout(() => {
            window.location.reload();
        }, 800);
    } else {
        pullRefresh.style.transform = 'translateY(0)';
    }
    touchDiff = 0;
});

// Service Worker Registration (deferred to idle to avoid blocking startup)
if ('serviceWorker' in navigator) {
    const registerSW = () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => {
                console.log('Service Worker registered', reg);
                // Check for updates periodically
                reg.update();
            })
            .catch(err => console.log('Service Worker registration failed', err));
    };

    // Reload the page when a new service worker takes over
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
            refreshing = true;
            window.location.reload();
        }
    });

    if ('requestIdleCallback' in window) {
        requestIdleCallback(registerSW, { timeout: 5000 });
    } else {
        // Fallback: register a few seconds after load
        window.addEventListener('load', () => setTimeout(registerSW, 3000));
    }
}

// PWA Install Logic
let deferredPrompt;
const installBanner = document.querySelector('#install-banner');
const installBtn = document.querySelector('#install-btn');
const installClose = document.querySelector('#install-close');
const profileInstallRow = document.querySelector('#profile-install-row');
const profileInstallBtn = document.querySelector('#profile-install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;

    // Show the custom install banner
    setTimeout(() => {
        installBanner.classList.add('show');
    }, 2000); // Show after 2 seconds

    // Show the install button in profile
    if (profileInstallRow) profileInstallRow.style.display = 'flex';
});

async function triggerInstall() {
    if (deferredPrompt) {
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        // We've used the prompt, and can't use it again, throw it away
        deferredPrompt = null;
        // Hide the banner and profile row
        installBanner.classList.remove('show');
        if (profileInstallRow) profileInstallRow.style.display = 'none';
    }
}

installBtn.addEventListener('click', triggerInstall);
if (profileInstallBtn) profileInstallBtn.addEventListener('click', triggerInstall);

installClose.addEventListener('click', () => {
    installBanner.classList.remove('show');
});

// Check if app is already installed
window.addEventListener('appinstalled', () => {
    installBanner.classList.remove('show');
    if (profileInstallRow) profileInstallRow.style.display = 'none';
    deferredPrompt = null;
    console.log('PWA was installed');
});

/* -------------------- Install Guide Modal -------------------- */
const guideModal = document.querySelector('#install-guide-modal');
const guideCloseBtn = document.querySelector('#guide-close');
const guideInstallNowBtn = document.querySelector('#guide-install-now');
const profileGuideBtn = document.querySelector('#profile-install-guide-btn');

function openGuide() {
    if (!guideModal) return;
    guideModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (window.navigator.vibrate) window.navigator.vibrate(10);
}

function closeGuide() {
    if (!guideModal) return;
    guideModal.classList.remove('active');
    document.body.style.overflow = '';
}

if (profileGuideBtn) profileGuideBtn.addEventListener('click', openGuide);
if (guideCloseBtn) guideCloseBtn.addEventListener('click', closeGuide);

// Close when clicking the overlay backdrop
if (guideModal) guideModal.addEventListener('click', (e) => {
    if (e.target === guideModal) closeGuide();
});

// "Install Now" in the guide triggers the deferred install prompt
guideInstallNowBtn.addEventListener('click', () => {
    if (deferredPrompt) {
        triggerInstall();
    } else {
        // Fallback: show a helpful message if install isn't available (e.g. iOS)
        closeGuide();
        const info = document.createElement('div');
        info.className = 'reserve-toast';
        info.innerHTML = `
            <div class="reserve-toast-icon"><i class="fas fa-info-circle"></i></div>
            <div class="reserve-toast-body">
                <strong>Install from your browser menu</strong>
                <p>Tap the browser menu (⋮ on Android, Share on iPhone) and choose "Add to Home screen".</p>
            </div>
            <button class="reserve-toast-close"><i class="fas fa-times"></i></button>
        `;
        document.body.appendChild(info);
        requestAnimationFrame(() => info.classList.add('show'));
        const dismiss = () => { info.classList.remove('show'); setTimeout(() => info.remove(), 300); };
        info.querySelector('.reserve-toast-close').addEventListener('click', dismiss);
        setTimeout(dismiss, 6000);
    }
});

// Defer heavy loading until the page is interactive and add deferred image loading
window.addEventListener('DOMContentLoaded', () => {
    // Delay non-blocking initialization slightly after DOM readiness
    setTimeout(() => {
        // Defer remote images: replace src with tiny placeholder and load when visible
        try {
            const placeholder = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="6"></svg>';
            document.querySelectorAll('img').forEach(img => {
                const src = img.getAttribute('src');
                if (src && src.startsWith('https://') && !img.hasAttribute('data-src')) {
                    img.setAttribute('data-src', src);
                    img.setAttribute('src', placeholder);
                    img.loading = 'lazy';
                    img.classList.add('defer-img');
                }
            });

            if ('IntersectionObserver' in window) {
                const io = new IntersectionObserver((entries, obs) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const el = entry.target;
                            const dataSrc = el.getAttribute('data-src');
                            if (dataSrc) {
                                el.src = dataSrc;
                                el.removeAttribute('data-src');
                            }
                            obs.unobserve(el);
                        }
                    });
                }, { rootMargin: '200px' });

                document.querySelectorAll('img.defer-img').forEach(i => io.observe(i));
            } else {
                // Fallback: load deferred images after a short delay
                setTimeout(() => {
                    document.querySelectorAll('img.defer-img').forEach(i => {
                        const ds = i.getAttribute('data-src');
                        if (ds) i.src = ds;
                    });
                }, 600);
            }
        } catch (e) {
            console.warn('Deferred image loader failed', e);
        }
    }, 250);
});

// Card 3D Tilt Effect - Refined
document.querySelectorAll('.card, .floating-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / 20;
        const rotateY = (centerX - x) / 20;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = `perspective(1000px) rotateX(0) rotateY(0)`;
    });
});

// Startup Tab Switch Logic
const startupTabs = document.querySelectorAll('.startup-tab');
const startupPanels = document.querySelectorAll('.startup-panel');

startupTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-target');

        startupTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        startupPanels.forEach(panel => {
            panel.classList.toggle('active', panel.id === target);
        });

        if (window.navigator.vibrate) window.navigator.vibrate(10);
    });
});

// Profile Tabs Switch Logic
const profileTabs = document.querySelectorAll('.profile-tab');
const tabContents = document.querySelectorAll('.tab-content');

profileTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab');

        // Update Tab UI
        profileTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update Content visibility
        tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === `tab-${targetTab}`) {
                content.classList.add('active');
            }
        });

        if (window.navigator.vibrate) window.navigator.vibrate(5);
    });
});

// Product Detail Overlay Logic (Event Delegation)
const detailOverlay = document.querySelector('#product-detail-overlay');
const closeDetailBtn = document.querySelector('.close-detail');

document.addEventListener('click', (e) => {
    // Ignore clicks on elements with their own interaction (e.g. heart buttons)
    if (e.target.closest('.heart-btn') || e.target.closest('.filter-icon')) return;

    // Find the nearest clickable-product ancestor
    const product = e.target.closest('.clickable-product');
    if (!product) return;

    const brand = product.getAttribute('data-brand');
    const title = product.getAttribute('data-title');
    const price = product.getAttribute('data-price');
    const img = product.getAttribute('data-img');
    const desc = product.getAttribute('data-desc');
    const specs = product.getAttribute('data-specs');

    if (!title) return;

    // Update UI
    document.querySelector('#detail-brand').textContent = brand;
    document.querySelector('#detail-title').textContent = title;
    document.querySelector('#detail-price').textContent = price;
    document.querySelector('#detail-img').src = img;
    document.querySelector('#detail-desc').textContent = desc;

    // Handle Specs
    const specsContainer = document.querySelector('#detail-specs');
    specsContainer.innerHTML = '';
    if (specs) {
        specs.split('|').forEach(spec => {
            const chip = document.createElement('div');
            chip.className = 'spec-chip';
            // Add icons based on common spec types
            let icon = '<i class="fas fa-info-circle"></i>';
            if (spec.includes('Petrol') || spec.includes('Electric')) icon = '<i class="fas fa-gas-pump"></i>';
            if (spec.includes('Auto') || spec.includes('Manual')) icon = '<i class="fas fa-cog"></i>';
            if (spec.includes('HP')) icon = '<i class="fas fa-bolt"></i>';

            chip.innerHTML = `${icon} ${spec.trim()}`;
            specsContainer.appendChild(chip);
        });
    }

    // Show Overlay
    detailOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Lock background scroll

    if (window.navigator.vibrate) window.navigator.vibrate(10);
});

closeDetailBtn.addEventListener('click', () => {
    detailOverlay.classList.remove('active');
    document.body.style.overflow = ''; // Unlock scroll
});

// Advanced Filter Drawer Logic
const filterIcon = document.querySelector('.filter-icon');
const filterDrawer = document.querySelector('#filter-drawer');
const closeDrawerBtn = document.querySelector('.close-drawer');
const applyFiltersBtn = document.querySelector('#apply-filters');
const resetFiltersBtn = document.querySelector('#reset-filters');
const chipSelects = document.querySelectorAll('.chip-select');
const optionBtns = document.querySelectorAll('.option-btn');

filterIcon.addEventListener('click', () => {
    filterDrawer.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (window.navigator.vibrate) window.navigator.vibrate(10);
});

closeDrawerBtn.addEventListener('click', () => {
    filterDrawer.classList.remove('active');
    document.body.style.overflow = '';
});

// Toggle Chips
chipSelects.forEach(chip => {
    chip.addEventListener('click', () => {
        chip.classList.toggle('active');
        if (window.navigator.vibrate) window.navigator.vibrate(5);
    });
});

// Single select for Sort options
optionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        optionBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (window.navigator.vibrate) window.navigator.vibrate(5);
    });
});

resetFiltersBtn.addEventListener('click', () => {
    chipSelects.forEach(c => c.classList.remove('active'));
    optionBtns.forEach(b => b.classList.remove('active'));
    optionBtns[0].classList.add('active');
    document.querySelectorAll('.price-inputs input').forEach(i => i.value = '');
    if (window.navigator.vibrate) window.navigator.vibrate(20);
});

applyFiltersBtn.addEventListener('click', () => {
    applyFiltersBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying...';
    setTimeout(() => {
        applyFiltersBtn.innerHTML = 'Apply Filters';
        filterDrawer.classList.remove('active');
        document.body.style.overflow = '';
        if (window.navigator.vibrate) window.navigator.vibrate([10, 50, 10]);
    }, 800);
});

// Link "Chat with Agent" button to Chat Page
const chatWithAgentBtn = document.querySelector('.secondary-action');
chatWithAgentBtn.addEventListener('click', () => {
    const productName = document.querySelector('#detail-title').textContent;

    detailOverlay.classList.remove('active');
    document.body.style.overflow = '';

    // Switch to Chat Tab
    const chatNavItem = document.querySelector('.nav-item[data-target="chat"]');
    if (chatNavItem) chatNavItem.click();

    // Send automated inquiry message
    const msgText = `I am interested in "${productName}". Can you provide more details?`;
    scSendInquiry(msgText);
});

// Reserve / Book Now action in the product detail overlay
const reserveBtn = document.querySelector('#reserve-btn');
reserveBtn.addEventListener('click', () => {
    const productName = document.querySelector('#detail-title').textContent;
    const price = document.querySelector('#detail-price').textContent;

    // Show confirmation state
    reserveBtn.disabled = true;
    reserveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Confirming...';

    setTimeout(() => {
        reserveBtn.disabled = false;
        reserveBtn.innerHTML = "Reserve Now";
        detailOverlay.classList.remove('active');
        document.body.style.overflow = '';

        // Send reservation as a message to Admin
        const msgText = `RESERVATION REQUEST: I want to reserve "${productName}" for ${price}.`;
        scSendInquiry(msgText);

        const toast = document.createElement('div');
        toast.className = 'reserve-toast show';
        toast.innerHTML = `
            <div class="reserve-toast-icon"><i class="fas fa-check-circle"></i></div>
            <div class="reserve-toast-body">
                <strong>Request Sent!</strong>
                <p>Your reservation for "${productName}" has been sent to the Admin.</p>
            </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 5000);
    }, 900);
});

// Product Category Filtering - Cars
const categoryChips = document.querySelectorAll('.category-chip:not(.herb-filter)');
const carCards = document.querySelectorAll('.car-compact');

categoryChips.forEach(chip => {
    chip.addEventListener('click', () => {
        const category = chip.textContent.trim();

        // Update Active UI
        categoryChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        // Filter Cards
        carCards.forEach(card => {
            const cardCategory = card.getAttribute('data-category');

            if (category === 'All' || cardCategory === category) {
                card.style.display = 'block';
                // Add a small fade-in animation
                card.style.animation = 'none';
                card.offsetHeight; // trigger reflow
                card.style.animation = 'fadeIn 0.4s ease-out';
            } else {
                card.style.display = 'none';
            }
        });

        if (window.navigator.vibrate) window.navigator.vibrate(5);
    });
});

// Herb Category Filtering
const herbFilters = document.querySelectorAll('.herb-filter');
const herbCards = document.querySelectorAll('.medical-compact');

herbFilters.forEach(chip => {
    chip.addEventListener('click', () => {
        const category = chip.getAttribute('data-herb-cat');

        // Update Active UI
        herbFilters.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        // Filter Cards
        herbCards.forEach(card => {
            const cardCategory = card.querySelector('.category')?.textContent.trim();

            if (category === 'All' || cardCategory === category) {
                card.style.display = 'block';
                card.style.animation = 'none';
                card.offsetHeight;
                card.style.animation = 'fadeIn 0.4s ease-out';
            } else {
                card.style.display = 'none';
            }
        });

        if (window.navigator.vibrate) window.navigator.vibrate(5);
    });
});

// Close on background click
detailOverlay.addEventListener('click', (e) => {
    if (e.target === detailOverlay) {
        detailOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
});

/* ============================================================
   ADEX CONNECT — Real-time Chat via Firebase Realtime Database
   ============================================================ */
const scList = document.querySelector('#sc-list');
const scRoom = document.querySelector('#sc-room');
const scBackBtn = document.querySelector('#sc-back');
const scSendBtn = document.querySelector('#sc-send');
const scInput = document.querySelector('#sc-input');
const scMessages = document.querySelector('#sc-messages');
const scSearchInput = document.querySelector('#sc-search-input');
const scTyping = document.querySelector('#sc-typing');

let chatSessionId = localStorage.getItem('adex_chat_session_v1');
if (!chatSessionId) {
    chatSessionId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('adex_chat_session_v1', chatSessionId);
}

// Local chat history cache
const CHAT_HISTORY_KEY = 'adex_chat_history_' + chatSessionId;
function loadLocalChat() {
    const raw = localStorage.getItem(CHAT_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
}
function saveLocalChat(messages) {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
}

function initChatSync() {
    if (typeof rtdb === 'undefined') return;

    // Load local history first for instant display
    const localMsgs = loadLocalChat();
    if (localMsgs.length > 0) {
        scMessages.innerHTML = '';
        localMsgs.forEach(m => scAppend(m.text, m.isSentByUser));
    }

    rtdb.ref("chats/" + chatSessionId).on("value", (snapshot) => {
        const data = snapshot.val();
        if (data && data.messages) {
            const remoteMsgs = Object.values(data.messages).sort((a,b) => a.time - b.time);
            scMessages.innerHTML = '';
            remoteMsgs.forEach(m => scAppend(m.text, m.isSentByUser));
            saveLocalChat(remoteMsgs); // Update cache
        } else if (!data) {
            // Initial message
            const initialMsg = { text: 'Hello! 👋 Thanks for reaching out. How can I help you today?', isSentByUser: false, time: Date.now() };
            const newChat = {
                id: chatSessionId,
                userName: loadProfile().name,
                userEmail: loadProfile().email,
                lastMessage: initialMsg.text,
                timestamp: Date.now()
            };
            rtdb.ref("chats/" + chatSessionId).set(newChat);
            rtdb.ref("chats/" + chatSessionId + "/messages").push(initialMsg);
        }
    });
}

function scAppend(text, isOut) {
    const bubble = document.createElement('div');
    bubble.className = `sc-bubble ${isOut ? 'out' : 'in'}`;
    bubble.innerHTML = `
        <div class="sc-bubble-text">${text}</div>
    `;
    scMessages.appendChild(bubble);
    scMessages.scrollTop = scMessages.scrollHeight;
}

function scSend() {
    const text = scInput.value.trim();
    if (!text || typeof rtdb === 'undefined') return;

    const profile = loadProfile();
    if (profile.name === 'Guest User') {
        alert("Please set a username in your Profile to start chatting.");
        document.querySelector('[data-target="profile"]').click();
        return;
    }

    const newMsg = { text, isSentByUser: true, time: Date.now() };

    rtdb.ref("chats/" + chatSessionId + "/messages").push(newMsg);
    rtdb.ref("chats/" + chatSessionId).update({
        lastMessage: text,
        timestamp: Date.now(),
        userName: loadProfile().name,
        userEmail: loadProfile().email
    });

    scInput.value = '';
}

// Back to home from chat
scBackBtn.addEventListener('click', () => {
    document.querySelector('[data-target="home"]').click();
});

scSendBtn.addEventListener('click', scSend);
scInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') scSend();
});

function scSendInquiry(text) {
    if (typeof rtdb === 'undefined') return;

    const profile = loadProfile();
    if (profile.name === 'Guest User') {
        alert("Please set a username in your Profile to send inquiries.");
        document.querySelector('[data-target="profile"]').click();
        return;
    }

    const newMsg = { text, isSentByUser: true, time: Date.now() };

    rtdb.ref("chats/" + chatSessionId + "/messages").push(newMsg);
    rtdb.ref("chats/" + chatSessionId).update({
        lastMessage: text,
        timestamp: Date.now(),
        userName: loadProfile().name,
        userEmail: loadProfile().email
    });
}

/* ============================================================
   EDITABLE PROFILE — Username Only (localStorage-backed)
   ============================================================ */
const PROFILE_KEY = 'adex_user_profile_v2';

const defaultProfile = {
    name: 'Guest User',
    email: '',
    phone: '',
    location: '',
    handle: 'guest',
    avatar: null,
    cover: null
};

function loadProfile() {
    try {
        const raw = localStorage.getItem(PROFILE_KEY);
        if (raw) return Object.assign({}, defaultProfile, JSON.parse(raw));
    } catch (e) { console.warn('profile load error', e); }
    return Object.assign({}, defaultProfile);
}

function saveProfile(profile) {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch (e) { console.warn('profile save error', e); }
}

function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

function applyProfile() {
    const p = loadProfile();
    const nameEl = document.querySelector('#profile-name');
    const displayName = document.querySelector('#profile-display-name');
    const displayHandle = document.querySelector('#profile-display-handle');
    const avatarImg = document.querySelector('#profile-avatar-img');
    const loginSection = document.querySelector('#username-login-section');

    const isGuest = p.name === 'Guest User';

    if (nameEl) nameEl.textContent = p.name;

    if (displayName) {
        displayName.innerHTML = isGuest
            ? escHtml(p.name)
            : `${escHtml(p.name)} <i class="fas fa-check-circle verified-icon"></i>`;
    }

    if (displayHandle) {
        displayHandle.textContent = isGuest ? 'Set a username to start chatting' : '@' + p.name.toLowerCase().replace(/\s+/g, '');
    }

    if (loginSection) {
        loginSection.style.display = isGuest ? 'block' : 'none';
    }

    if (avatarImg) {
        avatarImg.src = p.avatar || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
    }
}

// Username Login Logic
const setUsernameBtn = document.querySelector('#set-username-btn');
const usernameInput = document.querySelector('#login-username-input');

if (setUsernameBtn) {
    setUsernameBtn.addEventListener('click', () => {
        const name = usernameInput.value.trim();
        if (!name) return alert('Please enter a username');

        const p = loadProfile();
        p.name = name;
        saveProfile(p);
        applyProfile();

        // Update chat metadata in Firebase if session exists
        if (typeof rtdb !== 'undefined') {
            rtdb.ref("chats/" + chatSessionId).update({ userName: name });
        }

        if (window.navigator.vibrate) window.navigator.vibrate(10);
    });
}

// Avatar upload
const avatarBtn = document.querySelector('#profile-avatar-btn');
const avatarInput = document.querySelector('#profile-avatar-input');
const avatarImg = document.querySelector('#profile-avatar-img');

if (avatarBtn) avatarBtn.addEventListener('click', () => avatarInput && avatarInput.click());
if (avatarInput) {
    avatarInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const p = loadProfile();
            p.avatar = ev.target.result;
            saveProfile(p);
            if (avatarImg) avatarImg.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Initial calls
applyProfile();
initInventorySync();
initChatSync();

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
const storage = firebase.storage();
