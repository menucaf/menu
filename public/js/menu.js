// ============================================
// MENU SYSTEM - Core Functionality
// ============================================

// Configuration
const CONFIG = {
    WORKER_URL: 'https://your-worker.workers.dev', // Replace with your Worker URL
    CACHE_DURATION: 300000, // 5 minutes
    MAX_RETRIES: 3,
};

// State management
let menuState = {
    items: [],
    categories: [],
    activeCategory: 'all',
    activeQuickFilter: null,
    searchQuery: '',
};

// ============================================
// API HELPERS
// ============================================

async function fetchWithRetry(url, options = {}, retries = CONFIG.MAX_RETRIES) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

// ============================================
// MENU LOADING
// ============================================

async function loadMenu() {
    const loadingEl = document.getElementById('loading');
    const menuGrid = document.getElementById('menuGrid');
    
    try {
        loadingEl.style.display = 'block';
        menuGrid.innerHTML = '';
        
        // Fetch menu data
        const response = await fetchWithRetry(`${CONFIG.WORKER_URL}/api/menu`);
        
        if (response.success && response.data) {
            menuState.items = response.data.items || [];
            menuState.categories = response.data.categories || [];
            
            renderCategories();
            renderMenuItems(menuState.items);
            loadingEl.style.display = 'none';
        } else {
            throw new Error('Invalid menu data');
        }
    } catch (error) {
        console.error('Failed to load menu:', error);
        loadingEl.style.display = 'none';
        menuGrid.innerHTML = `
            <div class="error-state">
                <span>⚠️</span>
                <h3>Unable to load menu</h3>
                <p>Please try refreshing the page</p>
                <button onclick="loadMenu()" class="btn-primary">Retry</button>
            </div>
        `;
    }
}

// ============================================
// RENDERING
// ============================================

function renderCategories() {
    const container = document.getElementById('categoryFilters');
    const categories = ['all', ...menuState.categories];
    
    container.innerHTML = categories.map(cat => `
        <button class="filter-btn ${menuState.activeCategory === cat ? 'active' : ''}" 
                data-category="${cat}" 
                onclick="filterByCategory('${cat}')">
            ${cat.charAt(0).toUpperCase() + cat.slice(1)}
        </button>
    `).join('');
}

function renderMenuItems(items) {
    const grid = document.getElementById('menuGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (!items || items.length === 0) {
        grid.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    grid.innerHTML = items.map(item => createMenuItemCard(item)).join('');
}

function createMenuItemCard(item) {
    const badges = [];
    if (item.isNew) badges.push('<span class="badge-new">🆕 New</span>');
    if (item.isSecret) badges.push('<span class="badge-secret">🤫 Secret</span>');
    if (item.isPopular) badges.push('<span class="badge-popular">⭐ Popular</span>');
    
    return `
        <div class="menu-item" onclick="showItemDetails('${item.id}')">
            <div class="menu-item-image">
                <img src="${item.image || 'https://via.placeholder.com/400x300?text=No+Image'}" 
                     alt="${item.name}" 
                     loading="lazy"
                     onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
                <div class="item-badges">
                    ${badges.join('')}
                </div>
            </div>
            <div class="menu-item-content">
                <h3>${item.name}</h3>
                <p class="menu-item-description">${truncateText(item.description, 80)}</p>
                <div class="menu-item-footer">
                    <span class="menu-item-price">$${item.price.toFixed(2)}</span>
                    <div class="menu-item-meta">
                        ${item.waitTime ? `<span>⏱️ ${item.waitTime}min</span>` : ''}
                        ${item.portionSize ? `<span>📏 ${item.portionSize}</span>` : ''}
                    </div>
                </div>
                <button class="btn-order-item" onclick="event.stopPropagation(); placeOrder('${item.id}')">
                    Order Now
                </button>
            </div>
        </div>
    `;
}

function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// ============================================
// FILTERING & SEARCH
// ============================================

function filterByCategory(category) {
    menuState.activeCategory = category;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === category);
    });
    applyFilters();
}

function filterMenu() {
    menuState.searchQuery = document.getElementById('searchInput').value.toLowerCase();
    applyFilters();
}

function quickFilter(filterType) {
    menuState.activeQuickFilter = filterType;
    applyFilters();
}

function applyFilters() {
    let filteredItems = [...menuState.items];
    
    // Category filter
    if (menuState.activeCategory !== 'all') {
        filteredItems = filteredItems.filter(item => 
            item.category.toLowerCase() === menuState.activeCategory.toLowerCase()
        );
    }
    
    // Search filter
    if (menuState.searchQuery) {
        const query = menuState.searchQuery;
        filteredItems = filteredItems.filter(item =>
            item.name.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query) ||
            item.category.toLowerCase().includes(query)
        );
    }
    
    // Quick filters
    if (menuState.activeQuickFilter === 'under10') {
        filteredItems = filteredItems.filter(item => item.price < 10);
    } else if (menuState.activeQuickFilter === 'vegetarian') {
        filteredItems = filteredItems.filter(item => 
            item.isVegetarian || item.category === 'Salads'
        );
    } else if (menuState.activeQuickFilter === 'new') {
        filteredItems = filteredItems.filter(item => item.isNew);
    } else if (menuState.activeQuickFilter === 'popular') {
        filteredItems = filteredItems.filter(item => item.isPopular);
    }
    
    renderMenuItems(filteredItems);
}

// ============================================
// SPECIAL FEATURES
// ============================================

function feelingLucky() {
    if (menuState.items.length === 0) return;
    
    const randomItem = menuState.items[Math.floor(Math.random() * menuState.items.length)];
    
    // Open chat and ask AI for a fun recommendation
    if (typeof toggleChat === 'function') {
        toggleChat(true);
        setTimeout(() => {
            sendQuickReply(`I'm feeling lucky! What about the ${randomItem.name}? 🎲`);
        }, 500);
    }
}

function openMoodMatcher() {
    document.getElementById('moodModal').classList.add('active');
}

function matchMood(mood) {
    closeModal('moodModal');
    
    const moodMessages = {
        tired: "I'm feeling tired and need an energy boost! ☕",
        happy: "I'm feeling happy and want to celebrate! 🎉",
        comfort: "I need some comfort food right now 🤗",
        adventurous: "I'm feeling adventurous! Surprise me 🌍"
    };
    
    if (typeof toggleChat === 'function') {
        toggleChat(true);
        setTimeout(() => {
            sendQuickReply(moodMessages[mood]);
        }, 500);
    }
}

async function placeOrder(itemId) {
    const item = menuState.items.find(i => i.id === itemId);
    if (!item) return;
    
    // Show order confirmation
    document.getElementById('orderItemName').textContent = `You ordered: ${item.name}`;
    
    // Generate fun food fact
    const facts = [
        `Fun Fact: Pizza was named after Queen Margherita of Italy in 1889! 🇮🇹`,
        `Did you know? Pasta comes in over 600 different shapes worldwide! 🍝`,
        `Food fact: The world's oldest bread dates back over 14,000 years! 🍞`,
        `Interesting: Chocolate was once used as currency by the Aztecs! 🍫`,
        `Fun fact: The Caesar salad was invented in Mexico, not Italy! 🥗`
    ];
    
    document.getElementById('foodFact').innerHTML = `
        <p>${facts[Math.floor(Math.random() * facts.length)]}</p>
    `;
    
    document.getElementById('orderModal').classList.add('active');
    
    // Track analytics (optional)
    if (typeof gtag === 'function') {
        gtag('event', 'order', {
            'event_category': 'engagement',
            'event_label': item.name,
            'value': item.price
        });
    }
}

function showItemDetails(itemId) {
    const item = menuState.items.find(i => i.id === itemId);
    if (!item) return;
    
    if (typeof toggleChat === 'function') {
        toggleChat(true);
        setTimeout(() => {
            sendQuickReply(`Tell me more about the ${item.name}`);
        }, 300);
    }
}

// ============================================
// LOCATION DETECTION
// ============================================

async function detectLocation() {
    const locationText = document.getElementById('locationText');
    
    try {
        if ('geolocation' in navigator) {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: false,
                    timeout: 5000
                });
            });
            
            const { latitude, longitude } = position.coords;
            
            // Fetch nearest branch
            const response = await fetchWithRetry(
                `${CONFIG.WORKER_URL}/api/branches`
            );
            
            if (response.success && response.data) {
                const nearest = findNearestBranch(
                    latitude, longitude, 
                    response.data.branches
                );
                
                if (nearest) {
                    const distance = calculateDistance(
                        latitude, longitude,
                        nearest.coordinates.lat,
                        nearest.coordinates.lng
                    );
                    
                    locationText.textContent = `Nearest: ${nearest.name} - ${distance.toFixed(1)} miles (${getWalkingTime(distance)} min walk)`;
                }
            }
        } else {
            locationText.textContent = '📍 Enable location for nearest branch info';
        }
    } catch (error) {
        console.log('Location detection failed:', error);
        locationText.textContent = '📍 Select your preferred location';
    }
}

function findNearestBranch(userLat, userLng, branches) {
    let nearest = null;
    let minDistance = Infinity;
    
    branches.forEach(branch => {
        const distance = calculateDistance(
            userLat, userLng,
            branch.coordinates.lat,
            branch.coordinates.lng
        );
        
        if (distance < minDistance) {
            minDistance = distance;
            nearest = branch;
        }
    });
    
    return nearest;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function getWalkingTime(distance) {
    return Math.round(distance * 20); // Average walking speed: 3mph = 20min/mile
}

// ============================================
// MODAL MANAGEMENT
// ============================================

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Close modals on outside click
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
    
    if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
    }
});
