// Inventory Data (Simulated for dynamic rendering)
const inventory = {
    cars: [],
    herbs: []
};

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
    const productImg = document.querySelector('#detail-img').src;

    detailOverlay.classList.remove('active');
    document.body.style.overflow = '';

    // Switch to Chat Tab (nav handler also toggles body.chat-open for full-screen)
    const chatNavItem = document.querySelector('.nav-item[data-target="chat"]');
    if (chatNavItem) chatNavItem.click();

    // Open specific room
    openChatRoom(productName);
});

// Reserve / Book Now action in the product detail overlay
const reserveBtn = document.querySelector('#reserve-btn');
reserveBtn.addEventListener('click', () => {
    const productName = document.querySelector('#detail-title').textContent;
    const price = document.querySelector('#detail-price').textContent;
    const isService = (document.querySelector('#detail-price').textContent || '').includes('On Request');

    // Show confirmation state
    reserveBtn.disabled = true;
    const original = reserveBtn.innerHTML;
    reserveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Confirming...';

    setTimeout(() => {
        reserveBtn.disabled = false;
        reserveBtn.innerHTML = original;
        detailOverlay.classList.remove('active');
        document.body.style.overflow = '';

        const msg = isService
            ? `📅 Consultation request received for "${productName}". Our practitioner will contact you shortly to schedule your visit.`
            : `✅ Reservation request received for "${productName}" (${price}). A member of our team will reach out shortly to finalize.`;

        // Build a small confirmation toast
        const toast = document.createElement('div');
        toast.className = 'reserve-toast';
        toast.innerHTML = `
            <div class="reserve-toast-icon"><i class="fas fa-check-circle"></i></div>
            <div class="reserve-toast-body">
                <strong>Request Received!</strong>
                <p>${msg}</p>
                <div class="reserve-toast-actions">
                    <a class="btn-glow small" href="tel:+2348028765972"><i class="fas fa-phone-alt"></i> Call</a>
                    <a class="btn-glow small secondary" href="https://wa.me/2348028765972"><i class="fab fa-whatsapp"></i> WhatsApp</a>
                </div>
            </div>
            <button class="reserve-toast-close"><i class="fas fa-times"></i></button>
        `;
        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('show'));

        const dismiss = () => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); };
        toast.querySelector('.reserve-toast-close').addEventListener('click', dismiss);
        setTimeout(dismiss, 6000);

        if (window.navigator.vibrate) window.navigator.vibrate([10, 40, 10]);
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
   ADEX CONNECT — Brand New Chat / Support Hub Logic
   ============================================================ */
const scList = document.querySelector('#sc-list');
const scRoom = document.querySelector('#sc-room');
const scConvos = document.querySelectorAll('.sc-convo');
const scBackBtn = document.querySelector('#sc-back');
const scSendBtn = document.querySelector('#sc-send');
const scInput = document.querySelector('#sc-input');
const scMessages = document.querySelector('#sc-messages');
const scSearchInput = document.querySelector('#sc-search-input');
const scPrompts = document.querySelectorAll('.sc-prompt');
const scEmojiBtn = document.querySelector('#sc-emoji');
const scTyping = document.querySelector('#sc-typing');

// Thread data keyed by data-thread attribute
const scThreads = {
    porsche: {
        title: 'Porsche 911',
        img: 'lib/porsche.jpg',
        messages: [
            { text: 'Hello! I see you are interested in the Porsche 911. How can I assist you today?', out: false }
        ]
    },
    agbo: {
        title: 'Agbo Power',
        img: 'lib/herb.jpg',
        messages: [
            { text: 'Hi there! Agbo Power is our high-potency wellness blend. What would you like to know?', out: false }
        ]
    },
    aloe: {
        title: 'Aloe Vera',
        img: 'lib/aloe.jpg',
        messages: [
            { text: 'Welcome! How can we help with your Aloe Vera order?', out: false }
        ]
    },
    range: {
        title: 'Range Rover Vogue',
        img: 'lib/range_rover.jpg',
        messages: [
            { text: 'Great choice! The Range Rover Vogue is in high demand. How may we assist?', out: false }
        ]
    },
    consult: {
        title: 'Home Consultation',
        img: 'Adewale.jpeg',
        messages: [
            { text: 'We have flexible consultation slots this week. When would you like to book?', out: false }
        ]
    }
};

let activeThread = 'porsche';

function scAppend(text, isOut) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const bubble = document.createElement('div');
    bubble.className = `sc-bubble ${isOut ? 'out' : 'in'}`;
    bubble.innerHTML = `
        <div class="sc-bubble-text">${text}</div>
        <span class="sc-bubble-meta">${time}</span>
    `;
    scMessages.appendChild(bubble);
    scMessages.scrollTop = scMessages.scrollHeight;
}

function scOpenRoom(threadKey) {
    const thread = scThreads[threadKey];
    if (!thread) return;
    activeThread = threadKey;

    document.querySelector('#sc-room-title').textContent = thread.title;
    document.querySelector('#sc-room-img').src = thread.img;

    // Render messages
    scMessages.innerHTML = '';
    thread.messages.forEach(m => scAppend(m.text, m.out));

    // Clear unread badge on the active conversation
    const convoEl = document.querySelector(`.sc-convo[data-thread="${threadKey}"]`);
    if (convoEl) {
        const badge = convoEl.querySelector('.sc-unread');
        if (badge) badge.style.display = 'none';
    }

    scList.classList.remove('active');
    scRoom.classList.add('active');
}

// Open conversation on click
scConvos.forEach(convo => {
    convo.addEventListener('click', () => {
        const thread = convo.getAttribute('data-thread');
        scOpenRoom(thread);
        if (window.navigator.vibrate) window.navigator.vibrate(10);
    });
});

// Back to list
scBackBtn.addEventListener('click', () => {
    scRoom.classList.remove('active');
    scList.classList.add('active');
});

// Send message
function scSend() {
    const text = scInput.value.trim();
    if (!text) return;

    scThreads[activeThread].messages.push({ text, out: true });
    scAppend(text, true);
    scInput.value = '';

    // Show typing, then auto-reply
    scTyping.style.display = 'flex';
    scMessages.scrollTop = scMessages.scrollHeight;

    setTimeout(() => {
        scTyping.style.display = 'none';
        const reply = scAutoReply(text);
        scThreads[activeThread].messages.push({ text: reply, out: false });
        scAppend(reply, false);
        if (window.navigator.vibrate) window.navigator.vibrate(5);
    }, 1400);
}

function scAutoReply(text) {
    const lower = text.toLowerCase();

    // Greetings
    if (lower.includes('hello') || lower.includes('hi ') || lower === 'hi' || lower === 'hey' || lower.includes('good morning') || lower.includes('good afternoon')) {
        return 'Hello! 👋 Thanks for reaching out to AdexMoshow. How can I help you today — are you interested in one of our cars or a Trado-Medical remedy?';
    }

    // Price / cost
    if (lower.includes('price') || lower.includes('cost') || lower.includes('how much') || lower.includes('what is the fee') || lower.includes('how many naira')) {
        return 'We have transparent pricing for all our vehicles and herbal products. Could you tell me the exact item you are interested in so I can share the precise price? I can also help you reserve it today.';
    }

    // Stock / availability
    if (lower.includes('stock') || lower.includes('available') || lower.includes('in store') || lower.includes('do you have')) {
        return 'Great news — that item is currently in stock ✅ and we deliver nationwide within 1-3 business days. Would you like me to place a reservation for you?';
    }

    // Delivery / shipping
    if (lower.includes('deliver') || lower.includes('shipping') || lower.includes('ship') || lower.includes('dispatch') || lower.includes('delivery')) {
        return 'We deliver nationwide across all 36 states in Nigeria. Orders are usually dispatched within 24 hours and arrive within 1-3 business days. Delivery costs depend on your location — may I know your city?';
    }

    // Consultation / booking
    if (lower.includes('consult') || lower.includes('book') || lower.includes('appointment') || lower.includes('visit') || lower.includes('schedule')) {
        return 'I can book a home consultation for you with one of our certified Trado-Medical practitioners. We have slots this week — which day works best for you?';
    }

    // Warranty / guarantee / trust (car + herb)
    if (lower.includes('warranty') || lower.includes('guarantee') || lower.includes('genuine') || lower.includes('authentic') || lower.includes('trust') || lower.includes('certified')) {
        return 'Absolutely — every vehicle we sell comes with verified documentation, and all our herbal products are sourced from trusted native providers under our official CAC registration (Reg. No. 9723919). Quality is guaranteed.';
    }

    // Financing / payment (cars)
    if (lower.includes('payment') || lower.includes('installment') || lower.includes('finance') || lower.includes('loan') || lower.includes('pay in')) {
        return 'We offer flexible payment plans on selected vehicles, including part-payment arrangements. Please let me know which vehicle you are interested in and our team will share the available options.';
    }

    // Herbal / medical efficacy questions
    if (lower.includes('herb') || lower.includes('medicine') || lower.includes('cure') || lower.includes('effective') || lower.includes('side effect') || lower.includes('dose') || lower.includes('dosage')) {
        return 'Our Trado-Medical remedies are prepared from native African herbs and are meant to support wellness. For specific usage, dosage, or any health questions, I recommend speaking directly with our certified practitioner — may I book a brief consultation for you?';
    }

    // Component/spec questions (cars)
    if (lower.includes('engine') || lower.includes('horsepower') || lower.includes('spec') || lower.includes('color') || lower.includes('condition') || lower.includes('mileage') || lower.includes('year')) {
        return 'I can provide full specifications, mileage details, and the condition report for any vehicle in our lot. Which car would you like more details on? I can also arrange a physical inspection.';
    }

    // Trade-in
    if (lower.includes('trade') || lower.includes('exchange') || lower.includes('swap') || lower.includes('part exchange')) {
        return 'Yes, we accept trade-ins! Bring your current vehicle for a free appraisal and we will give you a competitive offer toward any car in our inventory. Would you like to arrange an inspection?';
    }

    // Contact / talk to human
    if (lower.includes('agent') || lower.includes('human') || lower.includes('real person') || lower.includes('representative') || lower.includes('call')) {
        return 'Of course! You can reach our team directly at 📞 +234 802 876 5972 or on WhatsApp at any time. One of our agents will assist you right away.';
    }

    // Thanks
    if (lower.includes('thank') || lower.includes('great') || lower.includes('nice') || lower.includes('awesome')) {
        return "You're very welcome! 😊 Is there anything else I can help you with today?";
    }

    // Goodbye
    if (lower.includes('bye') || lower.includes('goodbye') || lower.includes('see you') || lower.includes('later')) {
        return 'Goodbye! 👋 Thank you for contacting AdexMoshow. Feel free to message us anytime — we are here 24/7.';
    }

    return "Thanks for your message! 🙏 Our team is reviewing it and will get back to you shortly. For immediate assistance, you can call or WhatsApp us at +234 802 876 5972.";
}

scSendBtn.addEventListener('click', scSend);
scInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') scSend();
});

// Quick prompts
scPrompts.forEach(prompt => {
    prompt.addEventListener('click', () => {
        scInput.value = prompt.getAttribute('data-prompt');
        scSend();
    });
});

// Emoji button (simple toggle)
scEmojiBtn.addEventListener('click', () => {
    scInput.value += '🙂 ';
    scInput.focus();
});

// Search conversations
scSearchInput.addEventListener('input', () => {
    const query = scSearchInput.value.trim().toLowerCase();
    scConvos.forEach(convo => {
        const haystack = (convo.getAttribute('data-search') || '').toLowerCase();
        convo.style.display = haystack.includes(query) ? '' : 'none';
    });
});

// Compatibility wrapper for "Chat with Agent" buttons that relied on
// the previous openChatRoom(productName, productImg) signature.
function openChatRoom(productName) {
    const name = (productName || '').toLowerCase();
    let key = 'porsche';
    if (name.includes('agbo')) key = 'agbo';
    else if (name.includes('aloe')) key = 'aloe';
    else if (name.includes('range') || name.includes('rover')) key = 'range';
    else if (name.includes('consult')) key = 'consult';
    scOpenRoom(key);
}

/* ============================================================
   EDITABLE PROFILE — localStorage-backed (real user, not a bot)
   ============================================================ */
const PROFILE_KEY = 'adex_user_profile_v2';

// Clear old demo data from previous versions
if (localStorage.getItem('adex_user_profile_v1')) {
    localStorage.removeItem('adex_user_profile_v1');
}

const defaultProfile = {
    name: 'Guest User',
    email: 'Sign in to sync your data',
    phone: '',
    location: '',
    handle: 'guest',
    avatar: null, // data URL
    cover: null    // data URL
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
    const emailEl = document.querySelector('#profile-email');
    const phoneEl = document.querySelector('#profile-phone');
    const locEl = document.querySelector('#profile-location');
    const displayName = document.querySelector('#profile-display-name');
    const displayHandle = document.querySelector('#profile-display-handle');
    const nameInput = document.querySelector('#profile-name-input');
    const emailInput = document.querySelector('#profile-email-input');
    const phoneInput = document.querySelector('#profile-phone-input');
    const locInput = document.querySelector('#profile-location-input');
    const avatarImg = document.querySelector('#profile-avatar-img');
    const coverImg = document.querySelector('#profile-cover-img');

    const isGuest = p.name === 'Guest User';

    if (nameEl) nameEl.textContent = p.name;
    if (emailEl) emailEl.textContent = p.email;
    if (phoneEl) phoneEl.textContent = p.phone || '—';
    if (locEl) locEl.textContent = p.location || '—';

    if (displayName) {
        displayName.innerHTML = isGuest
            ? escHtml(p.name)
            : `${escHtml(p.name)} <i class="fas fa-check-circle verified-icon"></i>`;
    }

    if (displayHandle) {
        displayHandle.textContent = isGuest ? p.email : '@' + (p.handle || 'user');
    }

    if (nameInput) nameInput.value = isGuest ? '' : p.name;
    if (emailInput) emailInput.value = isGuest ? '' : p.email;
    if (phoneInput) phoneInput.value = p.phone || '';
    if (locInput) locInput.value = p.location || '';

    if (avatarImg) {
        if (p.avatar) {
            avatarImg.src = p.avatar;
        } else {
            // Default generic avatar for guest
            avatarImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
        }
    }
    if (coverImg && p.cover) coverImg.src = p.cover;
}

// Edit toggle
const editToggle = document.querySelector('#profile-edit-toggle');
const infoView = document.querySelector('#profile-info-view');
const infoEdit = document.querySelector('#profile-info-edit');
const saveBtn = document.querySelector('#profile-save-btn');
const cancelBtn = document.querySelector('#profile-cancel-btn');

if (editToggle) editToggle.addEventListener('click', () => {
    const p = loadProfile();
    document.querySelector('#profile-name-input').value = p.name;
    document.querySelector('#profile-email-input').value = p.email;
    document.querySelector('#profile-phone-input').value = p.phone;
    document.querySelector('#profile-location-input').value = p.location;
    infoView.style.display = 'none';
    infoEdit.style.display = 'block';
    editToggle.textContent = 'Cancel';
    if (window.navigator.vibrate) window.navigator.vibrate(5);
});

if (saveBtn) saveBtn.addEventListener('click', () => {
    const p = loadProfile();
    p.name = (document.querySelector('#profile-name-input').value || '').trim() || p.name;
    p.email = (document.querySelector('#profile-email-input').value || '').trim() || p.email;
    p.phone = (document.querySelector('#profile-phone-input').value || '').trim() || p.phone;
    p.location = (document.querySelector('#profile-location-input').value || '').trim() || p.location;
    saveProfile(p);
    applyProfile();
    infoEdit.style.display = 'none';
    infoView.style.display = 'block';
    editToggle.textContent = 'Edit';
    if (window.navigator.vibrate) window.navigator.vibrate([10, 50, 10]);
});

if (cancelBtn) cancelBtn.addEventListener('click', () => {
    infoEdit.style.display = 'none';
    infoView.style.display = 'block';
    editToggle.textContent = 'Edit';
});

// Avatar & cover upload with localStorage persistence
function handleImageUpload(inputEl, imgEl, key) {
    if (!inputEl) return;
    inputEl.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { alert('Please choose an image file.'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const p = loadProfile();
            p[key] = ev.target.result;
            saveProfile(p);
            if (imgEl) imgEl.src = ev.target.result;
            if (window.navigator.vibrate) window.navigator.vibrate(10);
        };
        reader.readAsDataURL(file);
    });
}

const avatarBtn = document.querySelector('#profile-avatar-btn');
const avatarInput = document.querySelector('#profile-avatar-input');
const coverBtn = document.querySelector('#profile-cover-btn');
const coverInput = document.querySelector('#profile-cover-input');
const avatarImg = document.querySelector('#profile-avatar-img');
const coverImg = document.querySelector('#profile-cover-img');

if (avatarBtn) avatarBtn.addEventListener('click', () => avatarInput && avatarInput.click());
if (coverBtn) coverBtn.addEventListener('click', () => coverInput && coverInput.click());
handleImageUpload(avatarInput, avatarImg, 'avatar');
handleImageUpload(coverInput, coverImg, 'cover');

// Apply saved profile on load (script is deferred, so DOM is ready)
applyProfile();
renderInventory();

/* ============================================================
   GOOGLE SIGN-IN — Google Identity Services
   ============================================================ */
function handleCredentialResponse(response) {
    // In a real app, you would send this token to your backend
    console.log("Encoded JWT ID token: " + response.credential);

    // Decoding the JWT locally for demo purposes (using a simple base64 decode)
    try {
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const user = JSON.parse(jsonPayload);
        console.log("User data:", user);

        // Update local profile with Google data
        const p = loadProfile();
        p.name = user.name;
        p.email = user.email;
        p.avatar = user.picture;
        p.handle = user.given_name.toLowerCase() + Math.floor(Math.random() * 1000);

        saveProfile(p);
        applyProfile();

        // Show a success message
        const toast = document.createElement('div');
        toast.className = 'reserve-toast show';
        toast.innerHTML = `
            <div class="reserve-toast-icon"><i class="fas fa-check-circle"></i></div>
            <div class="reserve-toast-body">
                <strong>Welcome, ${user.given_name}!</strong>
                <p>You have successfully signed in with Google.</p>
            </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 4000);

    } catch (e) {
        console.error("Error decoding Google credential", e);
    }
}

window.onload = function () {
    if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com", // REPLACE WITH REAL ID
            callback: handleCredentialResponse
        });
        google.accounts.id.renderButton(
            document.getElementById("google-signin-btn"),
            { theme: "outline", size: "large", width: "100%" }
        );
        // Optional: Show the One Tap prompt
        google.accounts.id.prompt();
    }
};


