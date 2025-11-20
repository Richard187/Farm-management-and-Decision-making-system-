document.addEventListener('DOMContentLoaded', () => {
    const priceGrid = document.querySelector('.price-grid');
    const profitCalculator = document.getElementById('profit-calculator');
    const profitResult = document.getElementById('profit-result');
    const cropSelect = document.getElementById('crop');
    const priceInput = document.getElementById('price');
    const useLivePriceBtn = document.getElementById('use-live-price');
    const livePriceHint = document.getElementById('live-price-hint');
    const sellTypeInput = document.getElementById('sell-type');
    const listingsGrid = document.getElementById('listings-grid');
    const filterCategory = document.getElementById('filter-category');
    const filterType = document.getElementById('filter-type');
    const searchInput = document.getElementById('search-input');
    const sellForm = document.getElementById('sell-form');
    const sellImageInput = document.getElementById('sell-image');
    const sellImageUrl = document.getElementById('sell-image-url');
    const sellImagePreview = document.getElementById('sell-image-preview');
    const trendingList = document.getElementById('trending-list');
    const needsList = document.getElementById('needs-list');
    const needForm = document.getElementById('need-form');
    const needText = document.getElementById('need-text');

    // Simulated market data
    const marketData = {
        maize: { name: 'Maize', price: 4500, image: 'images/Maize.jpg' },
        wheat: { name: 'Wheat', price: 5500, image: 'images/Wheat.jpg' },
        soybeans: { name: 'Soybeans', price: 7000, image: 'images/soybeans.jpg' },
        tobacco: { name: 'Tobacco', price: 35000, image: 'images/tobacco.jpg' },
        cotton: { name: 'Cotton', price: 12000, image: 'images/cotton.jpg' },
        cattle: { name: 'Cattle', price: 25000, image: 'images/cattle.webp' },
        goats: { name: 'Goats', price: 3000, image: 'images/Goats.jpg' },
        sheep: { name: 'Sheep', price: 4000, image: 'images/sheep.jpg' },
        pigs: { name: 'Pigs', price: 5000, image: 'images/pigs.jpg' },
        poultry: { name: 'Poultry', price: 150, image: 'images/poultry.jpeg' },
        fertilizer: { name: 'Fertilizer', price: 800, image: 'images/fertlizer.jpg' },
        pesticides: { name: 'Pesticides', price: 350, image: 'images/pestcides.jpg' },
    };

    const DEFAULT_IMAGE = 'images/farmer.jpg';

    function getImageForType(type) {
        const key = (type || '').toLowerCase();
        if (marketData[key]) return marketData[key].image;
        return DEFAULT_IMAGE;
    }

    function readFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Price board state for sparkline & ticks
    const priceHistory = {};
    const MAX_POINTS = 40;

    function ensureHistory(key, startPrice) {
        if (!priceHistory[key]) {
            priceHistory[key] = Array.from({ length: MAX_POINTS }, () => startPrice);
        }
    }

    function drawSparkline(canvas, data) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        const min = Math.min(...data);
        const max = Math.max(...data);
        const span = max - min || 1;
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 2;
        ctx.beginPath();
        data.forEach((v, i) => {
            const x = (i / (data.length - 1)) * (w - 4) + 2;
            const y = h - ((v - min) / span) * (h - 4) - 2;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
    }

    function renderPriceBoard(initial = false) {
        const tickerTrack = document.getElementById('market-ticker-track');
        if (initial) priceGrid.innerHTML = '';
        const tickerItems = [];
        for (const key in marketData) {
            const item = marketData[key];
            ensureHistory(key, item.price);
            let card = priceGrid.querySelector(`.price-item[data-type="${key}"]`);
            if (!card) {
                card = document.createElement('div');
                card.classList.add('price-item');
                card.dataset.type = key;
                card.innerHTML = `
                    <img src="${item.image}" alt="${item.name}">
                    <h3>${item.name}</h3>
                    <div class="quote-row">
                        <span class="quote" data-quote></span>
                        <span class="change-badge" data-change></span>
                    </div>
                    <canvas class="sparkline" width="220" height="40" data-spark></canvas>
                `;
                priceGrid.appendChild(card);
                // Click to filter listings
                card.addEventListener('click', () => {
                    if (filterType) filterType.value = key;
                    if (filterCategory) {
                        const cat = ['cattle','goats','sheep','pigs','poultry'].includes(key) ? 'livestock' : (['fertilizer','pesticides'].includes(key) ? 'inputs' : 'crops');
                        filterCategory.value = cat;
                    }
                    renderListings();
                    const section = document.querySelector('.marketplace');
                    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
            }
            const quoteEl = card.querySelector('[data-quote]');
            const changeEl = card.querySelector('[data-change]');
            const spark = card.querySelector('[data-spark]');
            const hist = priceHistory[key];
            const prev = hist[hist.length - 1];
            const curr = item.price;
            const pct = ((curr - prev) / (prev || curr)) * 100;
            quoteEl.textContent = `ZMW ${curr.toFixed(2)}`;
            changeEl.textContent = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
            changeEl.classList.toggle('up', pct >= 0);
            changeEl.classList.toggle('down', pct < 0);
            drawSparkline(spark, hist);

            tickerItems.push(`<span class="ticker-item"><span class="ticker-symbol">${item.name}</span><span class="ticker-price">ZMW ${curr.toFixed(2)}</span><span class="ticker-change ${pct >= 0 ? 'up':'down'}">${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(2)}%</span></span>`);
        }
        if (tickerTrack) {
            const content = tickerItems.join('');
            // Duplicate to create seamless loop
            tickerTrack.innerHTML = content + content;
        }
    }

    function tickPrices() {
        for (const key in marketData) {
            const item = marketData[key];
            const last = priceHistory[key][priceHistory[key].length - 1] || item.price;
            const drift = (Math.random() - 0.5) * 0.02; // +/-2%
            let next = last * (1 + drift);
            // Keep values sensible
            if (next < last * 0.9) next = last * 0.9;
            if (next > last * 1.1) next = last * 1.1;
            item.price = next;
            const hist = priceHistory[key];
            hist.push(next);
            if (hist.length > MAX_POINTS) hist.shift();
        }
        renderPriceBoard(false);
    }

    // Initial render
    renderPriceBoard(true);

    // Live feed settings and fetch
    const toggleFeedBtn = document.getElementById('toggle-feed-settings');
    const feedPanel = document.getElementById('feed-settings-panel');
    const feedUrlInput = document.getElementById('feed-url');
    const feedKeyInput = document.getElementById('feed-key');
    const feedMappingInput = document.getElementById('feed-mapping');
    const saveFeedBtn = document.getElementById('save-feed-settings');

    const FEED_STORAGE_KEY = 'fm_price_feed_cfg';
    function getFeedConfig() {
        try { return JSON.parse(localStorage.getItem(FEED_STORAGE_KEY)) || {}; } catch { return {}; }
    }
    function setFeedConfig(cfg) {
        localStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(cfg));
    }
    function loadFeedInputs() {
        const cfg = getFeedConfig();
        if (feedUrlInput) feedUrlInput.value = cfg.url || '';
        if (feedKeyInput) feedKeyInput.value = cfg.key || '';
        if (feedMappingInput) feedMappingInput.value = cfg.mapping || 'maize=MAIZE,wheat=WHEAT,soybeans=SOY,tobacco=TOB,cotton=COT,cattle=CATTLE,goats=GOATS,sheep=SHEEP,pigs=PIGS,poultry=POULTRY,fertilizer=FERT,pesticides=PEST';
    }
    loadFeedInputs();

    let simInterval = setInterval(tickPrices, 5000);
    let feedInterval = null;

    if (toggleFeedBtn && feedPanel) {
        toggleFeedBtn.addEventListener('click', () => {
            feedPanel.style.display = feedPanel.style.display === 'none' ? 'block' : 'none';
        });
    }

    if (saveFeedBtn) {
        saveFeedBtn.addEventListener('click', async () => {
            const cfg = {
                url: feedUrlInput ? feedUrlInput.value.trim() : '',
                key: feedKeyInput ? feedKeyInput.value.trim() : '',
                mapping: feedMappingInput ? feedMappingInput.value.trim() : ''
            };
            setFeedConfig(cfg);
            await refreshFromFeed();
            if (feedPanel) feedPanel.style.display = 'none';
        });
    }

    function parseMapping(str) {
        const map = {};
        (str || '').split(',').forEach(pair => {
            const [type, sym] = pair.split('=').map(s => (s || '').trim().toLowerCase());
            if (type && sym) map[type] = sym;
        });
        return map;
    }

    async function fetchFeed(cfg) {
        if (!cfg || !cfg.url) throw new Error('No feed URL');
        const headers = cfg.key ? { 'Authorization': `Bearer ${cfg.key}` } : {};
        const res = await fetch(cfg.url, { headers });
        if (!res.ok) throw new Error('Feed request failed');
        return await res.json();
    }

    function applyFeed(json, cfg) {
        const mapping = parseMapping(cfg.mapping);
        // Try common shapes
        // 1) { data: { SYMBOL: price, ... } }
        let lookupPrice = (symbol) => null;
        if (json && json.data && typeof json.data === 'object') {
            lookupPrice = (symbol) => Number(json.data[symbol]);
        }
        // 2) { prices: [{ symbol, price }] }
        if (json && Array.isArray(json.prices)) {
            const bySym = {};
            json.prices.forEach(p => { bySym[(p.symbol || '').toUpperCase()] = Number(p.price); });
            lookupPrice = (symbol) => bySym[symbol];
        }
        // 3) { quotes: [{ code, value }] }
        if (json && Array.isArray(json.quotes)) {
            const bySym = {};
            json.quotes.forEach(p => { bySym[(p.code || '').toUpperCase()] = Number(p.value); });
            lookupPrice = (symbol) => bySym[symbol];
        }

        Object.keys(marketData).forEach(typeKey => {
            const sym = (mapping[typeKey] || typeKey).toUpperCase();
            const val = lookupPrice(sym);
            if (typeof val === 'number' && !Number.isNaN(val)) {
                // Update price series and current value
                const hist = priceHistory[typeKey] || [val];
                hist.push(val);
                while (hist.length < MAX_POINTS) hist.unshift(val);
                if (hist.length > MAX_POINTS) hist.shift();
                priceHistory[typeKey] = hist;
                marketData[typeKey].price = val;
            }
        });
        renderPriceBoard(false);
    }

    async function refreshFromFeed() {
        const cfg = getFeedConfig();
        if (!cfg.url) return false;
        try {
            const json = await fetchFeed(cfg);
            applyFeed(json, cfg);
            if (simInterval) { clearInterval(simInterval); simInterval = null; }
            if (!feedInterval) {
                feedInterval = setInterval(async () => {
                    try {
                        const data = await fetchFeed(getFeedConfig());
                        applyFeed(data, getFeedConfig());
                    } catch (e) {
                        // On failure, keep last good prices; do not break UI
                    }
                }, 60000);
            }
            return true;
        } catch (e) {
            // If fetch fails, ensure simulator runs
            if (!simInterval) simInterval = setInterval(tickPrices, 5000);
            return false;
        }
    }

    // Try loading live feed on startup
    refreshFromFeed();

    // Update price input when crop is selected
    cropSelect.addEventListener('change', () => {
        const selectedCrop = cropSelect.value;
        if (marketData[selectedCrop]) {
            priceInput.value = marketData[selectedCrop].price.toFixed(2);
        }
    });

    // Calculate profit
    profitCalculator.addEventListener('submit', (e) => {
        e.preventDefault();
        const quantity = parseFloat(document.getElementById('quantity').value);
        const price = parseFloat(priceInput.value);

        if (isNaN(quantity) || isNaN(price)) {
            profitResult.textContent = 'Please enter valid numbers.';
            return;
        }

        const totalProfit = quantity * price;
        profitResult.textContent = `Estimated Profit: ZMW ${totalProfit.toFixed(2)}`;
    });

    // Trigger change event to set initial price
    cropSelect.dispatchEvent(new Event('change'));

    function getLivePriceForType(type) {
        const key = (type || '').toLowerCase();
        return marketData[key] ? marketData[key].price : null;
    }

    function updateSellLivePriceHint() {
        if (!livePriceHint) return;
        const t = sellTypeInput ? sellTypeInput.value.trim() : '';
        const live = getLivePriceForType(t);
        if (live) {
            livePriceHint.textContent = `Live: ZMW ${Number(live).toFixed(2)} (matches price board)`;
        } else {
            livePriceHint.textContent = 'No live price found for this type';
        }
    }

    // Marketplace state
    const STORAGE_KEYS = {
        listings: 'fm_listings',
        needs: 'fm_needs',
        views: 'fm_views'
    };

    function loadFromStorage(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (_) {
            return fallback;
        }
    }

    function saveToStorage(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function seedDemoData() {
        const existing = loadFromStorage(STORAGE_KEYS.listings, null);
        if (existing && existing.length) return;
        const demo = [
            { id: crypto.randomUUID(), category: 'crops', type: 'maize', quantity: 2000, unit: 'kg', price: 4.5, location: 'Mutoroshanga', contact: '+263 77 123 4567', image: getImageForType('maize'), createdAt: Date.now() - 86400000 },
            { id: crypto.randomUUID(), category: 'livestock', type: 'goats', quantity: 12, unit: 'head', price: 300, location: 'Banket', contact: '+263 71 555 0000', image: getImageForType('goats'), createdAt: Date.now() - 43200000 },
            { id: crypto.randomUUID(), category: 'inputs', type: 'fertilizer', quantity: 40, unit: 'bags', price: 28, location: 'Chinhoyi', contact: '+263 78 888 2222', image: getImageForType('Fertlizer'), createdAt: Date.now() - 21600000 }
        ];
        saveToStorage(STORAGE_KEYS.listings, demo);
        saveToStorage(STORAGE_KEYS.needs, [
            { id: crypto.randomUUID(), text: 'Buyer needs 3T Maize in Mutoroshanga', createdAt: Date.now() - 7200000 },
            { id: crypto.randomUUID(), text: 'Looking for 20 broilers in Raffingora', createdAt: Date.now() - 3600000 }
        ]);
        saveToStorage(STORAGE_KEYS.views, {});
    }

    function readState() {
        const listings = loadFromStorage(STORAGE_KEYS.listings, []);
        const needs = loadFromStorage(STORAGE_KEYS.needs, []);
        const views = loadFromStorage(STORAGE_KEYS.views, {});
        return { listings, needs, views };
    }

    function renderListings() {
        if (!listingsGrid) return;
        const { listings, views } = readState();

        const cat = filterCategory ? filterCategory.value : 'all';
        const type = filterType ? filterType.value : 'all';
        const q = searchInput ? searchInput.value.trim().toLowerCase() : '';

        const filtered = listings.filter(l => {
            const matchesCat = cat === 'all' || l.category === cat;
            const matchesType = type === 'all' || (l.type || '').toLowerCase() === type;
            const hay = `${l.type} ${l.location}`.toLowerCase();
            const matchesSearch = !q || hay.includes(q);
            return matchesCat && matchesType && matchesSearch;
        });

        listingsGrid.innerHTML = '';
        if (!filtered.length) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.textContent = 'No listings match your filters.';
            listingsGrid.appendChild(empty);
            return;
        }

        filtered
            .sort((a, b) => b.createdAt - a.createdAt)
            .forEach(l => {
                const card = document.createElement('div');
                card.className = 'listing-card';
                const viewCount = views[l.id] || 0;
                const live = getLivePriceForType(l.type);
                let deltaHtml = '';
                if (live) {
                    const delta = ((Number(l.price) - Number(live)) / Number(live)) * 100;
                    const dir = delta >= 0 ? 'up' : 'down';
                    deltaHtml = `<div class="price-compare">Live: ZMW ${Number(live).toFixed(2)} · <span class="delta ${dir}">${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%</span></div>`;
                }
                card.innerHTML = `
                    <img src="${l.image || getImageForType(l.type)}" alt="${l.type}">
                    <div class="listing-body">
                        <div class="listing-head">
                            <h4 class="listing-title">${(l.type || '').toUpperCase()} <span class="badge">${l.category}</span></h4>
                            <div class="price">ZMW ${Number(l.price).toFixed(2)}<span class="unit">/unit</span></div>
                        </div>
                        ${deltaHtml}
                        <div class="listing-meta">
                            <span>${l.quantity} ${l.unit || ''}</span>
                            <span>·</span>
                            <span>${l.location}</span>
                            <span>·</span>
                            <span>${viewCount} views</span>
                        </div>
                        <div class="listing-actions">
                            <a class="btn contact-btn" href="https://wa.me/${encodeURIComponent(l.contact.replace(/[^\d]/g,''))}?text=${encodeURIComponent('Interested in your listing: ' + (l.type || '') + ' (' + l.location + ')')}" target="_blank">Contact</a>
                            <button class="btn subtle-btn" data-view id="view-${l.id}">View</button>
                            <button class="btn subtle-btn" data-save id="save-${l.id}">Save</button>
                        </div>
                    </div>
                `;
                card.querySelector('[data-view]').addEventListener('click', () => incrementViews(l.id));
                card.querySelector('[data-save]').addEventListener('click', () => saveListing(l));
                listingsGrid.appendChild(card);
            });
    }

    function incrementViews(id) {
        const views = loadFromStorage(STORAGE_KEYS.views, {});
        views[id] = (views[id] || 0) + 1;
        saveToStorage(STORAGE_KEYS.views, views);
        renderListings();
        renderTrending();
    }

    function saveListing(listing) {
        // Placeholder for wishlist/bookmark; could write to storage under user scope
        alert('Saved to your wishlist');
    }

    async function handleSellSubmit(e) {
        e.preventDefault();
        const category = document.getElementById('sell-category').value;
        const type = document.getElementById('sell-type').value.trim();
        const quantity = Number(document.getElementById('sell-quantity').value);
        const price = Number(document.getElementById('sell-price').value);
        const location = document.getElementById('sell-location').value.trim();
        const contact = document.getElementById('sell-contact').value.trim();

        if (!type || !quantity || !price || !location || !contact) return;

        let image = '';
        const file = sellImageInput && sellImageInput.files && sellImageInput.files[0];
        const urlVal = sellImageUrl ? sellImageUrl.value.trim() : '';
        try {
            if (file) {
                image = await readFileAsDataUrl(file);
            } else if (urlVal) {
                image = urlVal;
            } else {
                image = getImageForType(type);
            }
        } catch (_) {
            image = getImageForType(type);
        }

        const unitGuess = category === 'livestock' ? 'head' : (category === 'inputs' ? 'bags' : 'kg');
        const newListing = {
            id: crypto.randomUUID(),
            category,
            type: type.toLowerCase(),
            quantity,
            unit: unitGuess,
            price,
            location,
            contact,
            image,
            createdAt: Date.now()
        };

        const listings = loadFromStorage(STORAGE_KEYS.listings, []);
        listings.push(newListing);
        saveToStorage(STORAGE_KEYS.listings, listings);
        renderListings();
        renderTrending();
        if (sellForm) sellForm.reset();
        if (sellImagePreview) sellImagePreview.style.display = 'none';
    }

    function updateImagePreviewFromUrl() {
        if (!sellImagePreview || !sellImageUrl) return;
        const url = sellImageUrl.value.trim();
        if (!url) {
            sellImagePreview.style.display = 'none';
            return;
        }
        sellImagePreview.src = url;
        sellImagePreview.style.display = 'block';
    }

    function updateImagePreviewFromFile() {
        if (!sellImagePreview || !sellImageInput || !sellImageInput.files[0]) return;
        const file = sellImageInput.files[0];
        const reader = new FileReader();
        reader.onload = () => {
            sellImagePreview.src = reader.result;
            sellImagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    function renderTrending() {
        if (!trendingList) return;
        const { listings, views } = readState();
        const top = [...listings]
            .map(l => ({
                id: l.id,
                label: `${(l.type || '').toUpperCase()} · ${l.location}`,
                views: views[l.id] || 0
            }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 5);
        trendingList.innerHTML = '';
        if (!top.length) {
            const li = document.createElement('li');
            li.textContent = 'No activity yet.';
            trendingList.appendChild(li);
            return;
        }
        top.forEach(t => {
            const li = document.createElement('li');
            li.textContent = `${t.label} — ${t.views} views`;
            trendingList.appendChild(li);
        });
    }

    function renderNeeds() {
        if (!needsList) return;
        const needs = loadFromStorage(STORAGE_KEYS.needs, []);
        needsList.innerHTML = '';
        if (!needs.length) {
            const li = document.createElement('li');
            li.textContent = 'No requests yet.';
            needsList.appendChild(li);
            return;
        }
        needs
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 8)
            .forEach(n => {
                const li = document.createElement('li');
                li.textContent = n.text;
                needsList.appendChild(li);
            });
    }

    function handleNeedSubmit(e) {
        e.preventDefault();
        const text = needText.value.trim();
        if (!text) return;
        const needs = loadFromStorage(STORAGE_KEYS.needs, []);
        needs.unshift({ id: crypto.randomUUID(), text, createdAt: Date.now() });
        saveToStorage(STORAGE_KEYS.needs, needs);
        needForm.reset();
        renderNeeds();
    }

    // Wire events
    if (sellForm) sellForm.addEventListener('submit', handleSellSubmit);
    if (sellImageInput) sellImageInput.addEventListener('change', updateImagePreviewFromFile);
    if (sellImageUrl) sellImageUrl.addEventListener('input', updateImagePreviewFromUrl);
    if (sellTypeInput) sellTypeInput.addEventListener('input', () => {
        updateImagePreviewFromUrl();
        updateSellLivePriceHint();
    });
    if (useLivePriceBtn) useLivePriceBtn.addEventListener('click', () => {
        const t = sellTypeInput ? sellTypeInput.value.trim() : '';
        const live = getLivePriceForType(t);
        if (live && document.getElementById('sell-price')) {
            document.getElementById('sell-price').value = Number(live).toFixed(2);
        }
        updateSellLivePriceHint();
    });

    if (priceGrid) {
        priceGrid.addEventListener('click', (e) => {
            const item = e.target.closest('.price-item');
            if (!item || !item.dataset.type) return;
            if (filterType) filterType.value = item.dataset.type;
            if (filterCategory) {
                const key = item.dataset.type;
                const cat = ['cattle','goats','sheep','pigs','poultry'].includes(key) ? 'livestock' : (['fertilizer','pesticides'].includes(key) ? 'inputs' : 'crops');
                filterCategory.value = cat;
            }
            renderListings();
            const section = document.querySelector('.marketplace');
            if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
    if (needForm) needForm.addEventListener('submit', handleNeedSubmit);
    if (filterCategory) filterCategory.addEventListener('change', renderListings);
    if (filterType) filterType.addEventListener('change', renderListings);
    if (searchInput) searchInput.addEventListener('input', renderListings);

    // Init
    seedDemoData();
    renderListings();
    renderTrending();
    renderNeeds();
    updateSellLivePriceHint();
});
