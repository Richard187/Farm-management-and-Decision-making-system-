// Crop Planning Page JavaScript - African Small-Scale Farming
document.addEventListener('DOMContentLoaded', function() {
    const cropSelector = document.getElementById('cropSelector');
    if (cropSelector) {
        // Preselect any saved crop choice
        try {
            const saved = localStorage.getItem('selectedCrop');
            if (saved && [...cropSelector.options].some(o => o.value === saved)) {
                cropSelector.value = saved;
                displayCropDetails(saved);
                // Visual cue on details container
                const details = document.getElementById('cropDetails');
                if (details) {
                    details.style.display = 'block';
                    details.classList.remove('highlight-updated');
                    void details.offsetWidth; // reflow to restart animation
                    details.classList.add('highlight-updated');
                }
            }
        } catch (_) {}
        cropSelector.addEventListener('change', function() {
            const selectedCrop = this.value;
            // Persist choice for cross-page linking
            try {
                if (selectedCrop) {
                    localStorage.setItem('selectedCrop', selectedCrop);
                } else {
                    localStorage.removeItem('selectedCrop');
                }
            } catch (_) {}
            if (selectedCrop) {
                displayCropDetails(selectedCrop);
                const details = document.getElementById('cropDetails');
                if (details) {
                    details.style.display = 'block';
                    details.classList.remove('highlight-updated');
                    void details.offsetWidth;
                    details.classList.add('highlight-updated');
                }
            } else {
                const details = document.getElementById('cropDetails');
                if (details) details.style.display = 'none';
            }
        });
        // Get current weather for advice on crop-planning page only
        getWeatherData();
    }

    // Initialize planting calendar page if present
    const cropTypeEl = document.getElementById('cropType');
    const plantingDatesEl = document.getElementById('plantingDates');
    if (cropTypeEl && plantingDatesEl) {
        initPlantingCalendar();
    }
});

// Planting Calendar Initialization
function initPlantingCalendar() {
    const cropTypeEl = document.getElementById('cropType');
    const locationEl = document.getElementById('location');
    if (!cropTypeEl) return;

    // Replace existing options with those from cropData
    cropTypeEl.innerHTML = '';
    const fragment = document.createDocumentFragment();
    Object.keys(cropData).forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = cropData[key].name || key;
        fragment.appendChild(opt);
    });
    cropTypeEl.appendChild(fragment);

    // Default selection to first crop
    if (cropTypeEl.options.length > 0) {
        cropTypeEl.selectedIndex = 0;
    }

    // Calculate when pressing button or changing selection
    const calculateBtn = document.querySelector('button.btn.btn-primary[onclick="calculatePlantingDate()"]');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', calculatePlantingDate);
    }
    cropTypeEl.addEventListener('change', (e) => {
        // Persist choice so rotation plan and other pages can use it
        try { localStorage.setItem('selectedCrop', e.target.value); } catch (_) {}
        calculatePlantingDate();
    });
    if (locationEl) locationEl.addEventListener('change', calculatePlantingDate);
}

// Helper: Expand month range and parse months from plantingPeriod string
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function expandMonthRange(start, end) {
    const sIdx = MONTHS.indexOf(start);
    const eIdx = MONTHS.indexOf(end);
    if (sIdx === -1 || eIdx === -1) return [];
    const months = [];
    if (sIdx <= eIdx) {
        for (let i = sIdx; i <= eIdx; i++) months.push(MONTHS[i]);
    } else {
        // Range wraps year end
        for (let i = sIdx; i < MONTHS.length; i++) months.push(MONTHS[i]);
        for (let i = 0; i <= eIdx; i++) months.push(MONTHS[i]);
    }
    return months;
}

function parsePlantingMonths(periodStr) {
    if (!periodStr || typeof periodStr !== 'string') return [];
    const normalized = periodStr.replace(/\(|\)|\bor\b/gi, ' ').replace(/\s+/g, ' ').trim();
    const tokens = normalized.split(/[,;]+/).map(t => t.trim());
    const months = [];
    const rangeRegex = new RegExp(`(${MONTHS.join('|')})\s*-\s*(${MONTHS.join('|')})`, 'gi');
    const singleRegex = new RegExp(MONTHS.join('|'), 'gi');
    // Find ranges
    let match;
    while ((match = rangeRegex.exec(normalized)) !== null) {
        months.push(...expandMonthRange(match[1], match[2]));
    }
    // Find singles (that aren’t already included)
    let singles;
    while ((singles = singleRegex.exec(normalized)) !== null) {
        const m = singles[0];
        if (!months.includes(m)) months.push(m);
    }
    // Dedupe and keep month order
    const ordered = MONTHS.filter(m => months.includes(m));
    return ordered;
}

// Calculate planting dates for selected crop and location
function calculatePlantingDate() {
    const cropKey = document.getElementById('cropType')?.value;
    const location = document.getElementById('location')?.value || 'temperate';
    const earlyEl = document.getElementById('earlyDate');
    const optimalEl = document.getElementById('optimalDate');
    const lateEl = document.getElementById('lateDate');
    if (!cropKey || !cropData[cropKey] || !earlyEl || !optimalEl || !lateEl) return;

    const period = cropData[cropKey].plantingPeriod || '';
    let months = parsePlantingMonths(period);

    // Basic climate adjustment: shift by +/- 1 month for tropical/arid
    const shift = (mArr, delta) => {
        if (!mArr.length) return mArr;
        return mArr.map(m => MONTHS[(MONTHS.indexOf(m) + delta + 12) % 12]);
    };
    if (location === 'tropical') {
        months = shift(months, -1);
    } else if (location === 'arid') {
        months = shift(months, 1);
    } else if (location === 'mediterranean') {
        // Prefer cooler season months if present
        const cool = months.filter(m => ['October','November','December','January','February','March'].includes(m));
        if (cool.length) months = cool;
    }

    // Fallback: if no months parsed, provide generic guidance
    if (!months.length) {
        earlyEl.textContent = 'Based on local rains onset';
        optimalEl.textContent = 'First 2-4 weeks of rainy season';
        lateEl.textContent = 'Before mid-season dry spells';
        return;
    }

    const first = months[0];
    const midIdx = Math.floor(months.length / 2);
    const middle = months.length > 2 ? `${months[midIdx - 1] || months[midIdx]} - ${months[midIdx]}` : months[midIdx] || first;
    const last = months[months.length - 1];

    earlyEl.textContent = first;
    optimalEl.textContent = middle;
    lateEl.textContent = last;
}

// Crop database with comprehensive information
// Make it globally accessible for crop-service.js
window.cropData = {
    maize: {
        name: 'Maize (Corn)',
        expectedYield: '3-5 tons/hectare (1,200-2,000 kg/acre)',
        yieldNote: 'Good management can achieve 6-8 tons/hectare',
        plantingPeriod: 'October - December (Early season) or February - March (Late season)',
        daysToMaturity: '90-120 days',
        soilType: 'Well-drained loamy soil, pH 5.8-7.0',
        spacing: '75cm between rows, 25cm between plants (or 90cm x 30cm)',
        irrigation: {
            total: '500-800mm per season',
            stages: [
                { stage: 'Germination (0-10 days)', amount: 'Light watering daily - 5-10mm', frequency: 'Every 2-3 days' },
                { stage: 'Vegetative (10-45 days)', amount: '20-30mm per application', frequency: 'Every 5-7 days' },
                { stage: 'Flowering (45-75 days)', amount: '30-40mm per application - CRITICAL', frequency: 'Every 4-5 days' },
                { stage: 'Grain filling (75-110 days)', amount: '25-35mm per application', frequency: 'Every 5-7 days' },
                { stage: 'Maturity (110-120 days)', amount: 'Reduce to 10-15mm', frequency: 'Stop 2 weeks before harvest' }
            ],
            method: 'Drip irrigation or furrow irrigation. Avoid overhead during flowering.'
        },
        fertilizer: [
            { stage: 'Basal (At planting)', type: 'Compound D (N:P:K 8:14:7) or NPK 10:20:10', amount: '300-400kg/hectare (120-160kg/acre)', timing: 'Mix with soil before planting' },
            { stage: 'Top dressing 1 (3-4 weeks after planting)', type: 'Urea or Ammonium Nitrate', amount: '100-150kg/hectare (40-60kg/acre)', timing: 'When plants are knee-high' },
            { stage: 'Top dressing 2 (6-8 weeks after planting)', type: 'Urea or Ammonium Nitrate', amount: '100-150kg/hectare (40-60kg/acre)', timing: 'Before tasseling starts' }
        ],
        chemicals: [
            { type: 'Pre-emergence herbicide', name: 'Atrazine or Metolachlor', timing: 'Immediately after planting', purpose: 'Control weeds before crop emerges' },
            { type: 'Post-emergence herbicide', name: '2,4-D or Glyphosate (spot treatment)', timing: 'When weeds are 5-10cm tall', purpose: 'Control escaped weeds' },
            { type: 'Insecticide', name: 'Cypermethrin or Deltamethrin', timing: 'When pests appear (fall armyworm, stem borers)', purpose: 'Control stem borers and fall armyworm' },
            { type: 'Fungicide', name: 'Mancozeb or Chlorothalonil', timing: 'During rainy periods', purpose: 'Prevent leaf blights and rusts' }
        ],
        harvest: {
            time: '110-120 days after planting (when husks turn brown and dry)',
            method: 'Harvest when moisture content is 18-20%. Hand-pick cobs or use combine harvester. Dry to 13% moisture before storage.',
            storage: 'Store in well-ventilated cribs or silos. Protect from weevils with Actellic dust.',
            yield: 'Average 3-5 tons/hectare. Good management: 6-8 tons/hectare'
        },
        weatherAdvice: 'Maize needs consistent moisture during flowering. In dry spells, prioritize irrigation at tasseling and silking stage (45-65 days).'
        },
        wheat: {
        name: 'Wheat',
        expectedYield: '2-4 tons/hectare (800-1,600 kg/acre)',
        yieldNote: 'Irrigated wheat can yield 5-6 tons/hectare',
        plantingPeriod: 'May - June (Winter wheat)',
        daysToMaturity: '120-150 days',
        soilType: 'Well-drained clay loam, pH 6.0-7.5',
        spacing: '20-25cm between rows, 2-3cm between seeds',
        irrigation: {
            total: '400-600mm per season',
            stages: [
                { stage: 'Germination (0-7 days)', amount: '10-15mm', frequency: 'Every 3-4 days' },
                { stage: 'Tillering (20-40 days)', amount: '25-30mm', frequency: 'Every 7-10 days' },
                { stage: 'Stem elongation (40-70 days)', amount: '30-40mm', frequency: 'Every 7-10 days' },
                { stage: 'Heading/Flowering (70-90 days)', amount: '35-45mm - CRITICAL', frequency: 'Every 5-7 days' },
                { stage: 'Grain filling (90-120 days)', amount: '30-35mm', frequency: 'Every 7-10 days' },
                { stage: 'Ripening (120-150 days)', amount: 'Reduce irrigation', frequency: 'Stop 2-3 weeks before harvest' }
            ],
            method: 'Flood irrigation or sprinkler. Critical during flowering and grain filling.'
        },
        fertilizer: [
            { stage: 'Basal (At planting)', type: 'Compound D or NPK 10:20:10', amount: '200-300kg/hectare (80-120kg/acre)', timing: 'Broadcast and incorporate before planting' },
            { stage: 'Top dressing (6-8 weeks)', type: 'Urea', amount: '100-150kg/hectare (40-60kg/acre)', timing: 'At tillering stage' },
            { stage: 'Second top dressing (10-12 weeks)', type: 'Urea', amount: '50-100kg/hectare (20-40kg/acre)', timing: 'At stem elongation' }
        ],
        chemicals: [
            { type: 'Herbicide', name: '2,4-D or MCPA', timing: '4-6 weeks after planting', purpose: 'Control broadleaf weeds' },
            { type: 'Fungicide', name: 'Propiconazole or Tebuconazole', timing: 'At heading stage', purpose: 'Prevent rust and powdery mildew' },
            { type: 'Insecticide', name: 'Dimethoate or Malathion', timing: 'When aphids appear', purpose: 'Control aphids and other pests' }
        ],
        harvest: {
            time: '120-150 days after planting (when heads turn golden yellow)',
            method: 'Harvest when moisture is 14-16%. Use combine harvester or cut and thresh. Dry to 12% moisture.',
            storage: 'Store in dry, well-ventilated area. Treat with storage insecticides.',
            yield: '2-4 tons/hectare, up to 5-6 tons with good management'
        },
        weatherAdvice: 'Wheat is sensitive to water stress during flowering. Ensure adequate moisture at heading stage (70-90 days). Avoid waterlogging.'
    },
    tobacco: {
        name: 'Tobacco',
        expectedYield: '1,500-2,500 kg/hectare (600-1,000 kg/acre) of cured leaf',
        yieldNote: 'High-value crop requiring careful management',
        plantingPeriod: 'September - October (Transplant seedlings)',
        daysToMaturity: '90-120 days from transplanting',
        soilType: 'Well-drained sandy loam, pH 5.5-6.5',
        spacing: '90-100cm between rows, 50-60cm between plants',
        irrigation: {
            total: '600-800mm per season',
            stages: [
                { stage: 'Transplanting (Day 0)', amount: '10-15mm immediately', frequency: 'Daily for first week' },
                { stage: 'Establishment (1-3 weeks)', amount: '15-20mm', frequency: 'Every 2-3 days' },
                { stage: 'Vegetative (3-8 weeks)', amount: '25-35mm', frequency: 'Every 4-5 days' },
                { stage: 'Flowering (8-12 weeks)', amount: '30-40mm', frequency: 'Every 4-5 days' },
                { stage: 'Ripening (12-16 weeks)', amount: 'Reduce to 15-20mm', frequency: 'Every 7 days, stop before harvest' }
            ],
            method: 'Drip irrigation preferred. Avoid wetting leaves to prevent diseases.'
        },
        fertilizer: [
            { stage: 'Basal (At transplanting)', type: 'NPK 10:10:15 or compound fertilizer', amount: '300-400kg/hectare (120-160kg/acre)', timing: 'Apply in planting hole' },
            { stage: 'Top dressing 1 (3 weeks)', type: 'Urea or Ammonium Nitrate', amount: '50-75kg/hectare (20-30kg/acre)', timing: 'When plants are established' },
            { stage: 'Top dressing 2 (6 weeks)', type: 'Potassium Nitrate', amount: '100-150kg/hectare (40-60kg/acre)', timing: 'Before flowering' }
        ],
        chemicals: [
            { type: 'Herbicide', name: 'Pendimethalin (pre-emergence)', timing: 'After transplanting', purpose: 'Control weeds' },
            { type: 'Insecticide', name: 'Imidacloprid or Acetamiprid', timing: 'When aphids/thrips appear', purpose: 'Control aphids, thrips, and whiteflies' },
            { type: 'Fungicide', name: 'Mancozeb or Chlorothalonil', timing: 'Preventive, every 10-14 days', purpose: 'Prevent blue mold and other diseases' },
            { type: 'Sucker control', name: 'Maleic Hydrazide (MH)', timing: 'After topping', purpose: 'Control sucker growth' }
        ],
        harvest: {
            time: '90-120 days after transplanting (harvest leaves as they ripen)',
            method: 'Harvest leaves in stages (primings) as they ripen. Cure in barns: flue-curing for Virginia, air-curing for burley. Curing takes 5-7 days.',
            storage: 'Store cured leaves at 60-65% relative humidity. Grade and bale for market.',
            yield: '1,500-2,500 kg/hectare of cured leaf'
        },
        weatherAdvice: 'Tobacco needs consistent moisture but avoid waterlogging. High humidity increases disease risk - ensure good ventilation in curing barns.'
    },
    cotton: {
        name: 'Cotton',
        expectedYield: '800-1,500 kg/hectare (320-600 kg/acre) of seed cotton',
        yieldNote: 'Irrigated cotton can yield 2,000-2,500 kg/hectare',
        plantingPeriod: 'November - December (when soil temp is above 18°C)',
        daysToMaturity: '150-180 days',
        soilType: 'Deep, well-drained loamy soil, pH 6.0-7.5',
        spacing: '75-90cm between rows, 20-30cm between plants',
        irrigation: {
            total: '600-900mm per season',
            stages: [
                { stage: 'Germination (0-7 days)', amount: 'Light irrigation - 10mm', frequency: 'Every 3-4 days' },
                { stage: 'Vegetative (7-60 days)', amount: '30-40mm', frequency: 'Every 7-10 days' },
                { stage: 'Flowering (60-90 days)', amount: '40-50mm - CRITICAL', frequency: 'Every 5-7 days' },
                { stage: 'Boll development (90-120 days)', amount: '40-50mm - CRITICAL', frequency: 'Every 5-7 days' },
                { stage: 'Boll opening (120-150 days)', amount: 'Reduce to 20-30mm', frequency: 'Every 10 days, stop 3 weeks before harvest' }
            ],
            method: 'Furrow or drip irrigation. Critical during flowering and boll filling.'
        },
        fertilizer: [
            { stage: 'Basal (At planting)', type: 'NPK 10:20:10 or Compound D', amount: '200-300kg/hectare (80-120kg/acre)', timing: 'Apply in furrow before planting' },
            { stage: 'Top dressing 1 (6 weeks)', type: 'Urea', amount: '100-150kg/hectare (40-60kg/acre)', timing: 'At first square formation' },
            { stage: 'Top dressing 2 (10 weeks)', type: 'Urea', amount: '50-100kg/hectare (20-40kg/acre)', timing: 'At peak flowering' }
        ],
        chemicals: [
            { type: 'Herbicide', name: 'Pendimethalin (pre-emergence)', timing: 'Before or immediately after planting', purpose: 'Control weeds' },
            { type: 'Insecticide', name: 'Pyrethroids (Deltamethrin, Lambda-cyhalothrin)', timing: 'When bollworms appear (weekly monitoring)', purpose: 'Control bollworms, aphids, whiteflies' },
            { type: 'Growth regulator', name: 'Mepiquat chloride', timing: 'At first flowering', purpose: 'Control excessive vegetative growth' },
            { type: 'Defoliant', name: 'Thidiazuron + Diuron', timing: 'Before harvest (when 60% bolls open)', purpose: 'Aid harvest by removing leaves' }
        ],
        harvest: {
            time: '150-180 days after planting (harvest when 60-70% bolls are open)',
            method: 'Hand-pick open bolls. Make 2-3 pickings. Avoid picking wet cotton. Grade and store separately.',
            storage: 'Store seed cotton in dry, well-ventilated area. Moisture content should be below 12%.',
            yield: '800-1,500 kg/hectare seed cotton (yields 33-40% lint)'
        },
        weatherAdvice: 'Cotton is very sensitive to water stress during flowering and boll development (60-120 days). Ensure adequate irrigation. Avoid picking when it\'s raining.'
    },
    cabbage: {
        name: 'Cabbage',
        expectedYield: '25-40 tons/hectare (10-16 tons/acre)',
        yieldNote: 'High-value vegetable crop with good market demand',
        plantingPeriod: 'February - March or August - September',
        daysToMaturity: '70-100 days from transplanting',
        soilType: 'Well-drained loamy soil, rich in organic matter, pH 6.0-6.8',
        spacing: '60cm between rows, 40-50cm between plants',
        irrigation: {
            total: '400-500mm per season',
            stages: [
                { stage: 'Transplanting (Day 0)', amount: '10mm immediately', frequency: 'Daily for first week' },
                { stage: 'Establishment (1-3 weeks)', amount: '15-20mm', frequency: 'Every 2-3 days' },
                { stage: 'Vegetative growth (3-8 weeks)', amount: '20-30mm', frequency: 'Every 3-4 days' },
                { stage: 'Head formation (8-12 weeks)', amount: '25-35mm - CRITICAL', frequency: 'Every 3-4 days' },
                { stage: 'Maturity (12-14 weeks)', amount: 'Reduce to 15-20mm', frequency: 'Every 5 days' }
            ],
            method: 'Drip irrigation or overhead sprinklers. Consistent moisture is crucial for head formation.'
        },
        fertilizer: [
            { stage: 'Basal (At transplanting)', type: 'Well-rotted manure (10-15 tons/hectare) + NPK 10:20:10', amount: '200-300kg/hectare (80-120kg/acre)', timing: 'Mix with soil in planting hole' },
            { stage: 'Top dressing 1 (3 weeks)', type: 'Urea or CAN', amount: '100kg/hectare (40kg/acre)', timing: 'When plants are established' },
            { stage: 'Top dressing 2 (6 weeks)', type: 'Urea', amount: '100kg/hectare (40kg/acre)', timing: 'At head formation stage' }
        ],
        chemicals: [
            { type: 'Herbicide', name: 'Pendimethalin (pre-emergence)', timing: 'After transplanting', purpose: 'Control weeds' },
            { type: 'Insecticide', name: 'Deltamethrin or Lambda-cyhalothrin', timing: 'When pests appear', purpose: 'Control diamondback moth, aphids, cutworms' },
            { type: 'Fungicide', name: 'Mancozeb or Copper-based', timing: 'Preventive, every 10-14 days', purpose: 'Prevent black rot, downy mildew' }
        ],
        harvest: {
            time: '70-100 days after transplanting (when heads are firm and compact)',
            method: 'Cut heads with a sharp knife, leave 2-3 wrapper leaves. Harvest in cool morning hours. Grade by size and quality.',
            storage: 'Store at 0-2°C with 95-98% humidity. Can store for 3-6 months under proper conditions.',
            yield: '25-40 tons/hectare (10-16 tons/acre)'
        },
        weatherAdvice: 'Cabbage needs cool weather for good head formation. In hot weather, provide shade or plant in cooler season. Consistent moisture prevents head splitting.'
    },
    sunflower: {
        name: 'Sunflower',
        expectedYield: '1,500-2,500 kg/hectare (600-1,000 kg/acre) of seeds',
        yieldNote: 'Good oilseed crop with drought tolerance',
        plantingPeriod: 'November - January (when rains start)',
        daysToMaturity: '90-110 days',
        soilType: 'Well-drained soil, pH 6.0-7.5. Tolerates slightly acidic soils',
        spacing: '75cm between rows, 25-30cm between plants',
        irrigation: {
            total: '400-600mm per season (drought tolerant)',
            stages: [
                { stage: 'Germination (0-10 days)', amount: '10-15mm', frequency: 'Every 3-4 days' },
                { stage: 'Vegetative (10-50 days)', amount: '20-30mm', frequency: 'Every 7-10 days' },
                { stage: 'Flowering (50-70 days)', amount: '30-40mm - CRITICAL', frequency: 'Every 5-7 days' },
                { stage: 'Seed filling (70-90 days)', amount: '25-35mm', frequency: 'Every 7 days' },
                { stage: 'Maturity (90-110 days)', amount: 'Reduce irrigation', frequency: 'Stop 2-3 weeks before harvest' }
            ],
            method: 'Furrow or drip irrigation. Critical during flowering and seed filling stages.'
        },
        fertilizer: [
            { stage: 'Basal (At planting)', type: 'NPK 10:20:10 or Compound D', amount: '200-300kg/hectare (80-120kg/acre)', timing: 'Apply in furrow before planting' },
            { stage: 'Top dressing (6-8 weeks)', type: 'Urea', amount: '100-150kg/hectare (40-60kg/acre)', timing: 'At bud formation stage' }
        ],
        chemicals: [
            { type: 'Herbicide', name: 'Pendimethalin or Metolachlor', timing: 'Pre-emergence or early post-emergence', purpose: 'Control weeds' },
            { type: 'Insecticide', name: 'Dimethoate or Cypermethrin', timing: 'When pests appear', purpose: 'Control head moth, stem weevil, aphids' },
            { type: 'Bird control', name: 'Scare devices or netting', timing: 'During seed filling', purpose: 'Protect heads from birds' }
        ],
        harvest: {
            time: '90-110 days after planting (when back of head turns brown and seeds are hard)',
            method: 'Harvest when moisture content is 12-15%. Cut heads and dry. Thresh manually or with combine. Dry seeds to 9% moisture.',
            storage: 'Store in dry, well-ventilated area. Moisture should be below 9% to prevent mold.',
            yield: '1,500-2,500 kg/hectare of seeds (oil content 35-45%)'
        },
        weatherAdvice: 'Sunflower is drought-tolerant but needs adequate moisture during flowering (50-70 days). Protect from birds during seed filling stage. Harvest before heavy rains.'
    },
    soybeans: {
        name: 'Soya Beans',
        expectedYield: '1,500-2,500 kg/hectare (600-1,000 kg/acre)',
        yieldNote: 'Good protein crop, can fix nitrogen in soil',
        plantingPeriod: 'November - December (early rains)',
        daysToMaturity: '90-120 days',
        soilType: 'Well-drained loamy soil, pH 6.0-7.0',
        spacing: '45-50cm between rows, 5-10cm between plants',
        irrigation: {
            total: '450-650mm per season',
            stages: [
                { stage: 'Germination (0-7 days)', amount: '10-15mm', frequency: 'Every 3-4 days' },
                { stage: 'Vegetative (7-40 days)', amount: '20-30mm', frequency: 'Every 7-10 days' },
                { stage: 'Flowering (40-60 days)', amount: '30-40mm - CRITICAL', frequency: 'Every 5-7 days' },
                { stage: 'Pod filling (60-90 days)', amount: '30-40mm - CRITICAL', frequency: 'Every 5-7 days' },
                { stage: 'Maturity (90-120 days)', amount: 'Reduce irrigation', frequency: 'Stop 2-3 weeks before harvest' }
            ],
            method: 'Furrow or drip irrigation. Critical during flowering and pod filling.'
        },
        fertilizer: [
            { stage: 'Basal (At planting)', type: 'Phosphate fertilizer (SSP or TSP)', amount: '100-150kg/hectare (40-60kg/acre) P2O5', timing: 'Soybeans fix nitrogen, focus on phosphorus' },
            { stage: 'Inoculation', type: 'Rhizobium inoculant', amount: 'As per package instructions', timing: 'Coat seeds before planting' },
            { stage: 'Top dressing (if needed)', type: 'Potassium (if soil is deficient)', amount: '50-100kg/hectare (20-40kg/acre) K2O', timing: 'At flowering if soil test shows deficiency' }
        ],
        chemicals: [
            { type: 'Herbicide', name: 'Pendimethalin (pre-emergence)', timing: 'Before or immediately after planting', purpose: 'Control weeds' },
            { type: 'Insecticide', name: 'Dimethoate or Cypermethrin', timing: 'When pests appear', purpose: 'Control bean fly, aphids, pod borers' },
            { type: 'Fungicide', name: 'Mancozeb or Propiconazole', timing: 'During rainy periods', purpose: 'Prevent rust and other fungal diseases' }
        ],
        harvest: {
            time: '90-120 days after planting (when pods are dry and yellow-brown)',
            method: 'Harvest when 95% of pods are brown and seeds rattle in pods. Moisture should be 13-15%. Use combine or cut and thresh. Dry to 12% moisture.',
            storage: 'Store in dry, well-ventilated area. Treat with storage insecticides. Moisture below 12%.',
            yield: '1,500-2,500 kg/hectare (protein content 35-40%)'
        },
        weatherAdvice: 'Soybeans need consistent moisture during flowering and pod filling (40-90 days). Water stress at these stages greatly reduces yield. Good for crop rotation as they fix nitrogen.'
    },
    sorghum: {
        name: 'Sorghum',
        expectedYield: '2-4 tons/hectare (800-1,600 kg/acre)',
        yieldNote: 'Very drought-tolerant cereal crop',
        plantingPeriod: 'October - November (with first rains)',
        daysToMaturity: '100-130 days',
        soilType: 'Well-drained soil, pH 5.5-7.5. Tolerates poor soils',
        spacing: '75cm between rows, 15-20cm between plants',
        irrigation: {
            total: '350-500mm per season (drought tolerant)',
            stages: [
                { stage: 'Germination (0-10 days)', amount: '10-15mm', frequency: 'Every 3-4 days' },
                { stage: 'Vegetative (10-50 days)', amount: '20-30mm', frequency: 'Every 10-14 days' },
                { stage: 'Flowering (50-70 days)', amount: '30-40mm - CRITICAL', frequency: 'Every 7-10 days' },
                { stage: 'Grain filling (70-100 days)', amount: '25-35mm', frequency: 'Every 10-14 days' },
                { stage: 'Maturity (100-130 days)', amount: 'Reduce irrigation', frequency: 'Stop 3 weeks before harvest' }
            ],
            method: 'Furrow irrigation. Sorghum is drought-tolerant but benefits from irrigation at critical stages.'
        },
        fertilizer: [
            { stage: 'Basal (At planting)', type: 'Compound D or NPK 10:20:10', amount: '200-300kg/hectare (80-120kg/acre)', timing: 'Apply in furrow before planting' },
            { stage: 'Top dressing (6-8 weeks)', type: 'Urea', amount: '100-150kg/hectare (40-60kg/acre)', timing: 'At boot stage (before heading)' }
        ],
        chemicals: [
            { type: 'Herbicide', name: 'Atrazine (pre-emergence)', timing: 'Before or immediately after planting', purpose: 'Control weeds (sorghum is tolerant)' },
            { type: 'Insecticide', name: 'Dimethoate or Malathion', timing: 'When pests appear', purpose: 'Control sorghum midge, stem borers, head bugs' },
            { type: 'Bird control', name: 'Scare devices', timing: 'During grain filling', purpose: 'Protect heads from birds (major pest)' }
        ],
        harvest: {
            time: '100-130 days after planting (when grains are hard and moisture is 20-25%)',
            method: 'Harvest when heads are fully mature and grains are hard. Cut heads and thresh. Dry to 12-13% moisture for storage.',
            storage: 'Store in dry, well-ventilated area. Protect from weevils and birds. Moisture below 13%.',
            yield: '2-4 tons/hectare (can reach 5-6 tons with good management)'
        },
        weatherAdvice: 'Sorghum is very drought-tolerant but needs adequate moisture during flowering (50-70 days). It can survive dry spells better than maize. Good for areas with unreliable rainfall.'
    },
    millet: {
        name: 'Millet (Pearl Millet)',
        expectedYield: '1,500-2,500 kg/hectare (600-1,000 kg/acre)',
        yieldNote: 'Excellent drought tolerance, grows in poor soils',
        plantingPeriod: 'November - December (with first rains)',
        daysToMaturity: '80-100 days',
        soilType: 'Well-drained soil, pH 5.5-7.5. Grows in sandy and poor soils',
        spacing: '50-75cm between rows, 10-15cm between plants',
        irrigation: {
            total: '300-400mm per season (very drought tolerant)',
            stages: [
                { stage: 'Germination (0-7 days)', amount: '10mm', frequency: 'Every 3-4 days' },
                { stage: 'Vegetative (7-40 days)', amount: '15-25mm', frequency: 'Every 10-14 days' },
                { stage: 'Flowering (40-60 days)', amount: '25-35mm - CRITICAL', frequency: 'Every 7-10 days' },
                { stage: 'Grain filling (60-80 days)', amount: '20-30mm', frequency: 'Every 10-14 days' },
                { stage: 'Maturity (80-100 days)', amount: 'Reduce irrigation', frequency: 'Stop 2-3 weeks before harvest' }
            ],
            method: 'Light irrigation. Millet is very drought-tolerant and can survive with minimal water.'
        },
        fertilizer: [
            { stage: 'Basal (At planting)', type: 'Compound D or NPK 10:20:10', amount: '100-200kg/hectare (40-80kg/acre)', timing: 'Apply in furrow (millet needs less fertilizer)' },
            { stage: 'Top dressing (5-6 weeks)', type: 'Urea', amount: '50-100kg/hectare (20-40kg/acre)', timing: 'At boot stage' }
        ],
        chemicals: [
            { type: 'Herbicide', name: 'Atrazine (pre-emergence)', timing: 'Before or after planting', purpose: 'Control weeds' },
            { type: 'Insecticide', name: 'Dimethoate', timing: 'When pests appear', purpose: 'Control head miner, stem borers' },
            { type: 'Bird control', name: 'Scare devices or netting', timing: 'During grain filling', purpose: 'Protect from birds (major issue)' }
        ],
        harvest: {
            time: '80-100 days after planting (when heads are fully mature and dry)',
            method: 'Harvest when heads are brown and dry. Cut heads and thresh. Dry grains to 12% moisture.',
            storage: 'Store in dry area. Protect from birds and weevils. Millet stores well if kept dry.',
            yield: '1,500-2,500 kg/hectare (up to 3,000 kg with good management)'
        },
        weatherAdvice: 'Millet is extremely drought-tolerant and ideal for dry areas. It can produce grain with as little as 250mm of rain. Good for food security in semi-arid regions.'
    },
    groundnuts: {
        name: 'Groundnuts (Peanuts)',
        expectedYield: '1,500-2,500 kg/hectare (600-1,000 kg/acre) of unshelled pods',
        yieldNote: 'Good cash crop, fixes nitrogen, improves soil',
        plantingPeriod: 'November - December (when soil is warm, above 18°C)',
        daysToMaturity: '90-120 days',
        soilType: 'Well-drained sandy loam, pH 5.5-7.0. Avoid heavy clay soils',
        spacing: '75cm between rows, 10-15cm between plants',
        irrigation: {
            total: '500-700mm per season',
            stages: [
                { stage: 'Germination (0-7 days)', amount: '10-15mm', frequency: 'Every 2-3 days' },
                { stage: 'Vegetative (7-40 days)', amount: '20-30mm', frequency: 'Every 5-7 days' },
                { stage: 'Flowering (40-60 days)', amount: '30-40mm - CRITICAL', frequency: 'Every 4-5 days' },
                { stage: 'Pegging and pod development (60-100 days)', amount: '30-40mm - CRITICAL', frequency: 'Every 4-5 days' },
                { stage: 'Pod filling (100-120 days)', amount: '25-35mm', frequency: 'Every 5-7 days' },
                { stage: 'Maturity (last 2 weeks)', amount: 'Reduce irrigation', frequency: 'Stop irrigation 2 weeks before harvest' }
            ],
            method: 'Light, frequent irrigation. Avoid waterlogging. Critical during pegging (when pods enter soil).'
        },
        fertilizer: [
            { stage: 'Basal (At planting)', type: 'Phosphate (SSP or TSP) + Gypsum', amount: '100-150kg/hectare P2O5 + 200-300kg/hectare gypsum', timing: 'Apply in furrow. Gypsum provides calcium for pod development' },
            { stage: 'Inoculation', type: 'Rhizobium inoculant', amount: 'As per package', timing: 'Coat seeds before planting (fixes nitrogen)' },
            { stage: 'Top dressing (6 weeks)', type: 'Potassium (if deficient)', amount: '50kg/hectare K2O', timing: 'Only if soil test shows deficiency' }
        ],
        chemicals: [
            { type: 'Herbicide', name: 'Pendimethalin (pre-emergence)', timing: 'Before or immediately after planting', purpose: 'Control weeds (critical for groundnuts)' },
            { type: 'Insecticide', name: 'Cypermethrin or Deltamethrin', timing: 'When pests appear', purpose: 'Control aphids, thrips, leaf miners' },
            { type: 'Fungicide', name: 'Mancozeb or Chlorothalonil', timing: 'Preventive, every 10-14 days', purpose: 'Prevent leaf spot diseases (early and late leaf spot)' },
            { type: 'Fungicide (soil)', name: 'Metalaxyl', timing: 'At planting if history of soil diseases', purpose: 'Prevent pod rot and stem rot' }
        ],
        harvest: {
            time: '90-120 days after planting (when leaves turn yellow and pods are mature)',
            method: 'Dig plants when 70-80% of pods are mature. Lift plants carefully to avoid losing pods. Dry in windrows for 3-5 days, then stack for further drying. Shell when moisture is 8-10%.',
            storage: 'Store shelled nuts at 8% moisture in dry, well-ventilated area. Protect from aflatoxin (store properly dried nuts only).',
            yield: '1,500-2,500 kg/hectare unshelled (yields 65-70% shelled nuts). Oil content 45-50%.'
        },
        weatherAdvice: 'Groundnuts need consistent moisture during flowering and pegging (40-100 days). Water stress during pod development reduces yield. Ensure good drainage - waterlogging causes pod rot. Harvest before heavy rains to avoid aflatoxin.'
    }
};

// Get weather data for advice
function getWeatherData() {
    // Simulate weather data - in real app, fetch from weather API
    const currentMonth = new Date().getMonth();
    const seasons = {
        0: { name: 'January', season: 'Summer', temp: '25-30°C', rain: 'High rainfall' },
        1: { name: 'February', season: 'Summer', temp: '25-30°C', rain: 'High rainfall' },
        2: { name: 'March', season: 'Autumn', temp: '20-25°C', rain: 'Moderate rainfall' },
        3: { name: 'April', season: 'Autumn', temp: '18-23°C', rain: 'Low rainfall' },
        4: { name: 'May', season: 'Winter', temp: '15-20°C', rain: 'Very low rainfall' },
        5: { name: 'June', season: 'Winter', temp: '12-18°C', rain: 'Very low rainfall' },
        6: { name: 'July', season: 'Winter', temp: '12-18°C', rain: 'Very low rainfall' },
        7: { name: 'August', season: 'Winter', temp: '15-20°C', rain: 'Low rainfall' },
        8: { name: 'September', season: 'Spring', temp: '18-23°C', rain: 'Low rainfall' },
        9: { name: 'October', season: 'Spring', temp: '20-25°C', rain: 'Moderate rainfall' },
        10: { name: 'November', season: 'Summer', temp: '23-28°C', rain: 'High rainfall' },
        11: { name: 'December', season: 'Summer', temp: '25-30°C', rain: 'High rainfall' }
    };
    
    return seasons[currentMonth];
}

// Display crop details
function displayCropDetails(cropKey) {
    const crop = cropData[cropKey];
    if (!crop) return;
    
    const detailsContainer = document.getElementById('cropDetails');
    detailsContainer.style.display = 'block';
    
    // Scroll to details
    detailsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Expected Yield
    document.getElementById('expectedYield').textContent = crop.expectedYield;
    document.getElementById('yieldNote').textContent = crop.yieldNote;
    
    // Planting Information
    document.getElementById('plantingPeriod').textContent = crop.plantingPeriod;
    document.getElementById('daysToMaturity').textContent = crop.daysToMaturity;
    document.getElementById('soilType').textContent = crop.soilType;
    document.getElementById('spacing').textContent = crop.spacing;
    
    // Irrigation
    let irrigationHTML = `<p><strong>Total Water Requirement:</strong> ${crop.irrigation.total}</p>`;
    irrigationHTML += `<p><strong>Irrigation Method:</strong> ${crop.irrigation.method}</p>`;
    irrigationHTML += '<div class="irrigation-stages"><h4>Irrigation Schedule by Growth Stage:</h4><ul>';
    crop.irrigation.stages.forEach(stage => {
        irrigationHTML += `<li><strong>${stage.stage}:</strong> ${stage.amount} - Frequency: ${stage.frequency}</li>`;
    });
    irrigationHTML += '</ul></div>';
    document.getElementById('irrigationDetails').innerHTML = irrigationHTML;
    
    // Weather Advice
    const weather = getWeatherData();
    document.getElementById('weatherAdvice').innerHTML = `
        <div class="weather-alert">
            <i class="fas fa-cloud-sun"></i>
            <strong>Current Weather (${weather.name}):</strong> ${weather.temp}, ${weather.rain}
            <br><strong>Crop-Specific Advice:</strong> ${crop.weatherAdvice}
        </div>
    `;
    
    // Fertilizer
    let fertilizerHTML = '<div class="fertilizer-stages"><ul>';
    crop.fertilizer.forEach(fert => {
        fertilizerHTML += `
            <li>
                <strong>${fert.stage}:</strong><br>
                Type: ${fert.type}<br>
                Amount: ${fert.amount}<br>
                Timing: ${fert.timing}
            </li>
        `;
    });
    fertilizerHTML += '</ul></div>';
    document.getElementById('fertilizerDetails').innerHTML = fertilizerHTML;
    
    // Chemicals
    let chemicalHTML = '<div class="chemical-stages"><ul>';
    crop.chemicals.forEach(chem => {
        chemicalHTML += `
            <li>
                <strong>${chem.type}:</strong> ${chem.name}<br>
                Timing: ${chem.timing}<br>
                Purpose: ${chem.purpose}
            </li>
        `;
    });
    chemicalHTML += '</ul></div>';
    document.getElementById('chemicalDetails').innerHTML = chemicalHTML;
    
    // Harvest
    document.getElementById('harvestDetails').innerHTML = `
        <p><strong>Harvest Time:</strong> ${crop.harvest.time}</p>
        <p><strong>Harvest Method:</strong> ${crop.harvest.method}</p>
        <p><strong>Storage:</strong> ${crop.harvest.storage}</p>
        <p><strong>Expected Yield:</strong> ${crop.harvest.yield}</p>
    `;
    
    // Timeline
    const days = parseInt(crop.daysToMaturity.split('-')[0]);
    const timelineHTML = generateTimeline(crop, days);
    document.getElementById('timeline').innerHTML = timelineHTML;
}

// Generate timeline
function generateTimeline(crop, totalDays) {
    const timeline = [];
    const week = 7;
    
    timeline.push({ week: 'Week 0', activity: 'Land preparation and planting', details: 'Apply basal fertilizer, plant seeds/transplants' });
    
    if (crop.fertilizer.length > 1) {
        const fert1Week = Math.floor((crop.fertilizer[1].timing.match(/\d+/)?.[0] || 3) / week);
        timeline.push({ week: `Week ${fert1Week}`, activity: 'First top dressing', details: crop.fertilizer[1].type });
    }
    
    if (crop.fertilizer.length > 2) {
        const fert2Week = Math.floor((crop.fertilizer[2].timing.match(/\d+/)?.[0] || 6) / week);
        timeline.push({ week: `Week ${fert2Week}`, activity: 'Second top dressing', details: crop.fertilizer[2].type });
    }
    
    const floweringWeek = Math.floor(totalDays * 0.4 / week);
    timeline.push({ week: `Week ${floweringWeek}`, activity: 'Flowering stage - Critical irrigation', details: 'Ensure adequate moisture' });
    
    const harvestWeek = Math.floor(totalDays / week);
    timeline.push({ week: `Week ${harvestWeek}`, activity: 'Harvest time', details: crop.harvest.time });
    
    let timelineHTML = '<div class="timeline">';
    timeline.forEach((item, index) => {
        timelineHTML += `
            <div class="timeline-item">
                <div class="timeline-marker">${index + 1}</div>
                <div class="timeline-content">
                    <h4>${item.week}: ${item.activity}</h4>
                    <p>${item.details}</p>
                </div>
            </div>
        `;
    });
    timelineHTML += '</div>';
    
    return timelineHTML;
}
