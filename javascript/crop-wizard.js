// Crop Planning Wizard - Step-by-step guide for planning new crops

const CropWizard = {
    currentStep: 1,
    totalSteps: 5,
    wizardData: {},
    wizardContainer: null,

    // Initialize wizard
    init(containerId) {
        this.wizardContainer = document.getElementById(containerId);
        if (!this.wizardContainer) {
            console.error('Wizard container not found');
            return;
        }

        this.resetWizard();
        this.renderStep(1);
        this.trackWizardStart();
    },

    // Reset wizard data
    resetWizard() {
        this.currentStep = 1;
        this.wizardData = {
            cropId: null,
            area: null,
            location: null,
            soilType: null,
            plantingDate: null,
            expectedHarvestDate: null,
            expectedYield: null,
            notes: ''
        };
    },

    // Render current step
    renderStep(stepNumber) {
        if (!this.wizardContainer) return;

        this.currentStep = stepNumber;
        
        const steps = [
            this.renderStep1Welcome,
            this.renderStep2CropSelection,
            this.renderStep3FarmDetails,
            this.renderStep4PlanDetails,
            this.renderStep5Review
        ];

        if (steps[stepNumber - 1]) {
            this.wizardContainer.innerHTML = steps[stepNumber - 1].call(this);
            this.updateProgressBar();
            this.attachStepEventListeners();
        }
    },

    // Render Step 1: Welcome
    renderStep1Welcome() {
        return `
            <div class="wizard-step wizard-step-1">
                <div class="wizard-step-header">
                    <div class="wizard-step-number">1</div>
                    <div class="wizard-step-title">
                        <h2>Welcome to Crop Planning</h2>
                        <p>Let's create a comprehensive plan for your new crop</p>
                    </div>
                </div>
                <div class="wizard-step-content">
                    <div class="wizard-welcome">
                        <div class="wizard-welcome-icon">
                            <i class="fas fa-seedling"></i>
                        </div>
                        <h3>Plan Your Crop Successfully</h3>
                        <p>Our step-by-step wizard will guide you through:</p>
                        <ul class="wizard-features-list">
                            <li><i class="fas fa-check-circle"></i> Selecting the right crop for your farm</li>
                            <li><i class="fas fa-check-circle"></i> Planning planting dates and schedule</li>
                            <li><i class="fas fa-check-circle"></i> Setting up irrigation and fertilization</li>
                            <li><i class="fas fa-check-circle"></i> Creating a complete growing timeline</li>
                            <li><i class="fas fa-check-circle"></i> Tracking progress throughout the season</li>
                        </ul>
                        <div class="wizard-info-box">
                            <i class="fas fa-info-circle"></i>
                            <p>This process takes about 5 minutes. You can save your progress at any time.</p>
                        </div>
                    </div>
                </div>
                <div class="wizard-step-actions">
                    <button class="btn btn-primary wizard-next-btn" onclick="CropWizard.nextStep()">
                        Get Started <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
    },

    // Render Step 2: Crop Selection
    renderStep2CropSelection() {
        return `
            <div class="wizard-step wizard-step-2">
                <div class="wizard-step-header">
                    <div class="wizard-step-number">2</div>
                    <div class="wizard-step-title">
                        <h2>Select Your Crop</h2>
                        <p>Choose a crop from our managed crop pool</p>
                    </div>
                </div>
                <div class="wizard-step-content">
                    <div class="wizard-crop-selection">
                        <div class="wizard-search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" id="cropSearch" placeholder="Search crops..." class="wizard-search-input">
                        </div>
                        <div class="wizard-crops-grid" id="cropsGrid">
                            <div class="wizard-loading">
                                <i class="fas fa-spinner fa-spin"></i>
                                <p>Loading available crops...</p>
                            </div>
                        </div>
                        <div class="wizard-selected-crop" id="selectedCropDisplay" style="display: none;">
                            <div class="selected-crop-card">
                                <div class="selected-crop-icon">
                                    <i class="fas fa-seedling"></i>
                                </div>
                                <div class="selected-crop-info">
                                    <h4 id="selectedCropName"></h4>
                                    <p id="selectedCropDescription"></p>
                                    <div class="selected-crop-details">
                                        <span class="crop-detail-badge"><i class="fas fa-calendar"></i> <span id="selectedCropSeason"></span></span>
                                        <span class="crop-detail-badge"><i class="fas fa-clock"></i> <span id="selectedCropMaturity"></span></span>
                                        <span class="crop-detail-badge"><i class="fas fa-chart-line"></i> <span id="selectedCropYield"></span></span>
                                    </div>
                                </div>
                                <button class="btn btn-outline btn-sm" onclick="CropWizard.clearCropSelection()">
                                    <i class="fas fa-times"></i> Change
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="wizard-step-actions">
                    <button class="btn btn-outline wizard-prev-btn" onclick="CropWizard.previousStep()">
                        <i class="fas fa-arrow-left"></i> Back
                    </button>
                    <button class="btn btn-primary wizard-next-btn" id="step2NextBtn" onclick="CropWizard.nextStep()" disabled>
                        Continue <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
    },

    // Render Step 3: Farm Details
    renderStep3FarmDetails() {
        return `
            <div class="wizard-step wizard-step-3">
                <div class="wizard-step-header">
                    <div class="wizard-step-number">3</div>
                    <div class="wizard-step-title">
                        <h2>Farm Details</h2>
                        <p>Tell us about your farming area</p>
                    </div>
                </div>
                <div class="wizard-step-content">
                    <div class="wizard-form">
                        <div class="form-group">
                            <label for="farmArea">
                                <i class="fas fa-ruler-combined"></i> Farming Area (acres)
                            </label>
                            <input type="number" id="farmArea" class="form-control" placeholder="Enter area in acres" min="0.1" step="0.1" required>
                            <small class="form-help">Enter the area you want to dedicate to this crop</small>
                        </div>
                        <div class="form-group">
                            <label for="farmLocation">
                                <i class="fas fa-map-marker-alt"></i> Location/Region
                            </label>
                            <select id="farmLocation" class="form-control" required>
                                <option value="">Select your region</option>
                                <option value="temperate">Temperate Climate</option>
                                <option value="tropical">Tropical Climate</option>
                                <option value="arid">Arid/Semi-Arid</option>
                                <option value="mediterranean">Mediterranean</option>
                            </select>
                            <small class="form-help">Select the climate type of your farming region</small>
                        </div>
                        <div class="form-group">
                            <label for="soilType">
                                <i class="fas fa-layer-group"></i> Soil Type
                            </label>
                            <select id="soilType" class="form-control">
                                <option value="">Select soil type (optional)</option>
                                <option value="loamy">Loamy Soil</option>
                                <option value="clay">Clay Soil</option>
                                <option value="sandy">Sandy Soil</option>
                                <option value="sandy_loam">Sandy Loam</option>
                                <option value="clay_loam">Clay Loam</option>
                            </select>
                            <small class="form-help">Knowing your soil type helps us provide better recommendations</small>
                        </div>
                    </div>
                </div>
                <div class="wizard-step-actions">
                    <button class="btn btn-outline wizard-prev-btn" onclick="CropWizard.previousStep()">
                        <i class="fas fa-arrow-left"></i> Back
                    </button>
                    <button class="btn btn-primary wizard-next-btn" onclick="CropWizard.nextStep()">
                        Continue <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
    },

    // Calculate expected yield based on area, soil type, and location
    calculateExpectedYield(cropId, area, soilType, location) {
        if (!cropId || !area || !location) {
            return null;
        }

        const cropData = CropService.getCropData();
        const crop = cropData[cropId];
        if (!crop) return null;

        // Extract base yield from crop data (format: "3-5 tons/hectare" or "1,200-2,000 kg/acre")
        let baseYieldPerHectare = this.extractBaseYield(crop.expectedYield);
        if (!baseYieldPerHectare) {
            // Default base yield if not specified (in tons/hectare)
            baseYieldPerHectare = 3.5; // Average for most crops
        }

        // Convert acres to hectares (1 acre = 0.404686 hectares)
        const hectares = area * 0.404686;

        // Soil type multipliers (affects yield potential)
        const soilMultipliers = {
            'loamy': 1.2,        // Best soil - 20% increase
            'clay_loam': 1.15,   // Good soil - 15% increase
            'sandy_loam': 1.1,   // Good soil - 10% increase
            'clay': 0.9,         // Heavy soil - 10% decrease
            'sandy': 0.85,       // Poor soil - 15% decrease
            '': 1.0              // Unknown soil - no change
        };

        // Location/Region multipliers (based on rainfall and climate)
        const locationMultipliers = {
            'temperate': 1.1,      // Moderate rainfall - 10% increase
            'tropical': 1.25,     // High rainfall - 25% increase
            'arid': 0.7,           // Low rainfall - 30% decrease
            'mediterranean': 1.0,  // Moderate - no change
            '': 1.0                // Unknown - no change
        };

        // Get multipliers
        const soilMultiplier = soilMultipliers[soilType] || 1.0;
        const locationMultiplier = locationMultipliers[location] || 1.0;

        // Calculate total yield
        const adjustedYieldPerHectare = baseYieldPerHectare * soilMultiplier * locationMultiplier;
        const totalYieldTons = adjustedYieldPerHectare * hectares;
        const totalYieldKg = totalYieldTons * 1000;

        // Format the result
        const yieldPerAcre = totalYieldTons / area;
        const yieldPerAcreKg = yieldPerAcre * 1000;

        return {
            totalTons: totalYieldTons.toFixed(2),
            totalKg: totalYieldKg.toFixed(0),
            perHectare: adjustedYieldPerHectare.toFixed(2),
            perAcre: yieldPerAcre.toFixed(2),
            perAcreKg: yieldPerAcreKg.toFixed(0),
            formatted: `${totalYieldTons.toFixed(2)} tons (${totalYieldKg.toFixed(0)} kg) total, ${yieldPerAcre.toFixed(2)} tons/acre (${yieldPerAcreKg.toFixed(0)} kg/acre)`
        };
    },

    // Extract base yield from crop data string
    extractBaseYield(yieldString) {
        if (!yieldString) return null;

        // Try to extract from formats like:
        // "3-5 tons/hectare"
        // "1,200-2,000 kg/acre"
        // "3-5 tons/hectare (1,200-2,000 kg/acre)"

        // First, try to find tons/hectare
        const tonsPerHectareMatch = yieldString.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*tons?\s*\/\s*hectare/i);
        if (tonsPerHectareMatch) {
            const min = parseFloat(tonsPerHectareMatch[1]);
            const max = parseFloat(tonsPerHectareMatch[2]);
            return (min + max) / 2; // Return average
        }

        // Try to find kg/acre and convert to tons/hectare
        const kgPerAcreMatch = yieldString.match(/(\d{1,3}(?:,\d{3})*)\s*-\s*(\d{1,3}(?:,\d{3})*)\s*kg\s*\/\s*acre/i);
        if (kgPerAcreMatch) {
            const min = parseFloat(kgPerAcreMatch[1].replace(/,/g, ''));
            const max = parseFloat(kgPerAcreMatch[2].replace(/,/g, ''));
            const avgKgPerAcre = (min + max) / 2;
            // Convert kg/acre to tons/hectare: (kg/acre) * (1 ton/1000 kg) * (1 acre/0.404686 hectares)
            const tonsPerHectare = (avgKgPerAcre / 1000) / 0.404686;
            return tonsPerHectare;
        }

        // Try single number format
        const singleNumberMatch = yieldString.match(/(\d+(?:\.\d+)?)\s*tons?\s*\/\s*hectare/i);
        if (singleNumberMatch) {
            return parseFloat(singleNumberMatch[1]);
        }

        return null;
    },

    // Render Step 4: Plan Details
    renderStep4PlanDetails() {
        const cropData = CropService.getCropData();
        const crop = cropData[this.wizardData.cropId];
        const plantingPeriod = crop?.plantingPeriod || 'Not specified';
        
        // Calculate expected yield based on collected data
        let yieldInfo = null;
        let yieldDisplay = 'Calculating...';
        let yieldHelpText = 'Enter farm details in previous step to calculate yield';

        if (this.wizardData.area && this.wizardData.location && this.wizardData.cropId) {
            yieldInfo = this.calculateExpectedYield(
                this.wizardData.cropId,
                this.wizardData.area,
                this.wizardData.soilType || '',
                this.wizardData.location
            );
            
            if (yieldInfo) {
                yieldDisplay = yieldInfo.formatted;
                yieldHelpText = `Calculated based on ${this.wizardData.area} acres, ${this.wizardData.location} climate, and ${this.wizardData.soilType || 'unknown'} soil`;
                this.wizardData.expectedYield = yieldInfo;
            }
        }
        
        return `
            <div class="wizard-step wizard-step-4">
                <div class="wizard-step-header">
                    <div class="wizard-step-number">4</div>
                    <div class="wizard-step-title">
                        <h2>Planning Details</h2>
                        <p>Set your planting schedule and expectations</p>
                    </div>
                </div>
                <div class="wizard-step-content">
                    <div class="wizard-form">
                        <div class="form-group">
                            <label for="plantingDate">
                                <i class="fas fa-calendar-check"></i> Planned Planting Date
                            </label>
                            <input type="date" id="plantingDate" class="form-control" required>
                            <small class="form-help">Recommended planting period: ${plantingPeriod}</small>
                        </div>
                        <div class="form-group">
                            <label for="expectedYield">
                                <i class="fas fa-chart-line"></i> Expected Yield (calculated)
                            </label>
                            <input type="text" id="expectedYield" class="form-control" value="${yieldDisplay}" readonly style="background-color: #f0f0f0; cursor: not-allowed;">
                            <small class="form-help">${yieldHelpText}</small>
                            ${yieldInfo ? `
                            <div class="yield-breakdown" style="margin-top: 10px; padding: 10px; background: #e8f5e9; border-radius: 5px; font-size: 0.9rem;">
                                <strong>Yield Breakdown:</strong><br>
                                • Total Expected: ${yieldInfo.totalTons} tons (${yieldInfo.totalKg} kg)<br>
                                • Per Hectare: ${yieldInfo.perHectare} tons<br>
                                • Per Acre: ${yieldInfo.perAcre} tons (${yieldInfo.perAcreKg} kg)
                            </div>
                            ` : ''}
                        </div>
                        <div class="form-group">
                            <label for="planNotes">
                                <i class="fas fa-sticky-note"></i> Additional Notes (optional)
                            </label>
                            <textarea id="planNotes" class="form-control" rows="4" placeholder="Add any special notes or requirements for this crop plan..."></textarea>
                        </div>
                        <div class="wizard-info-card">
                            <i class="fas fa-lightbulb"></i>
                            <div>
                                <h4>Smart Recommendations</h4>
                                <p>Based on your selected crop and farm details, we'll generate:</p>
                                <ul>
                                    <li>Optimal planting timeline</li>
                                    <li>Irrigation schedule</li>
                                    <li>Fertilization plan</li>
                                    <li>Pest management strategy</li>
                                    <li>Harvest planning</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="wizard-step-actions">
                    <button class="btn btn-outline wizard-prev-btn" onclick="CropWizard.previousStep()">
                        <i class="fas fa-arrow-left"></i> Back
                    </button>
                    <button class="btn btn-primary wizard-next-btn" onclick="CropWizard.nextStep()">
                        Continue <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
    },

    // Render Step 5: Review and Confirm
    renderStep5Review() {
        const cropData = CropService.getCropData();
        const crop = cropData[this.wizardData.cropId];
        const cropName = crop?.name || 'Selected Crop';
        
        return `
            <div class="wizard-step wizard-step-5">
                <div class="wizard-step-header">
                    <div class="wizard-step-number">5</div>
                    <div class="wizard-step-title">
                        <h2>Review Your Plan</h2>
                        <p>Review all details before creating your crop plan</p>
                    </div>
                </div>
                <div class="wizard-step-content">
                    <div class="wizard-review">
                        <div class="review-section">
                            <h3><i class="fas fa-seedling"></i> Crop Information</h3>
                            <div class="review-item">
                                <span class="review-label">Selected Crop:</span>
                                <span class="review-value">${cropName}</span>
                            </div>
                            <div class="review-item">
                                <span class="review-label">Category:</span>
                                <span class="review-value">${CropService.getCropCategory(this.wizardData.cropId)}</span>
                            </div>
                            <div class="review-item">
                                <span class="review-label">Days to Maturity:</span>
                                <span class="review-value">${crop?.daysToMaturity || 'N/A'}</span>
                            </div>
                            <div class="review-item">
                                <span class="review-label">Expected Yield:</span>
                                <span class="review-value">${this.wizardData.expectedYield ? this.wizardData.expectedYield.formatted : (crop?.expectedYield || 'N/A')}</span>
                            </div>
                        </div>
                        <div class="review-section">
                            <h3><i class="fas fa-tractor"></i> Farm Details</h3>
                            <div class="review-item">
                                <span class="review-label">Farming Area:</span>
                                <span class="review-value">${this.wizardData.area || 'N/A'} acres</span>
                            </div>
                            <div class="review-item">
                                <span class="review-label">Location/Region:</span>
                                <span class="review-value">${this.wizardData.location || 'N/A'}</span>
                            </div>
                            <div class="review-item">
                                <span class="review-label">Soil Type:</span>
                                <span class="review-value">${this.wizardData.soilType || 'Not specified'}</span>
                            </div>
                        </div>
                        <div class="review-section">
                            <h3><i class="fas fa-calendar-alt"></i> Planning Schedule</h3>
                            <div class="review-item">
                                <span class="review-label">Planned Planting Date:</span>
                                <span class="review-value">${this.wizardData.plantingDate ? new Date(this.wizardData.plantingDate).toLocaleDateString() : 'Not set'}</span>
                            </div>
                            <div class="review-item">
                                <span class="review-label">Expected Harvest:</span>
                                <span class="review-value">${this.wizardData.expectedHarvestDate ? new Date(this.wizardData.expectedHarvestDate).toLocaleDateString() : 'Calculating...'}</span>
                            </div>
                        </div>
                        ${this.wizardData.notes ? `
                        <div class="review-section">
                            <h3><i class="fas fa-sticky-note"></i> Notes</h3>
                            <p class="review-notes">${this.wizardData.notes}</p>
                        </div>
                        ` : ''}
                    </div>
                </div>
                <div class="wizard-step-actions">
                    <button class="btn btn-outline wizard-prev-btn" onclick="CropWizard.previousStep()">
                        <i class="fas fa-arrow-left"></i> Back
                    </button>
                    <button class="btn btn-success wizard-submit-btn" onclick="CropWizard.submitPlan()">
                        <i class="fas fa-check"></i> Create Crop Plan
                    </button>
                </div>
            </div>
        `;
    },

    // Load and display crops
    async loadCrops() {
        const cropsGrid = document.getElementById('cropsGrid');
        if (!cropsGrid) return;

        // Show loading state briefly (for better UX)
        cropsGrid.innerHTML = '<div class="wizard-loading"><i class="fas fa-spinner fa-spin"></i><p>Loading available crops...</p></div>';

        try {
            // Try to load crops immediately (no artificial delay for local data)
            let response = await CropService.getAvailableCrops();
            
            // If not available, wait briefly and retry (handles script loading order)
            if (!response.success || !response.data || response.data.length === 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
                response = await CropService.getAvailableCrops();
            }
            
            if (response.success && response.data && response.data.length > 0) {
                this.displayCrops(response.data);
            } else {
                cropsGrid.innerHTML = `
                    <div class="wizard-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Failed to load crops.</p>
                        <button class="btn btn-outline" onclick="CropWizard.loadCrops()" style="margin-top: 1rem;">
                            <i class="fas fa-redo"></i> Retry
                        </button>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading crops:', error);
            cropsGrid.innerHTML = `
                <div class="wizard-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error loading crops. Please refresh the page.</p>
                    <button class="btn btn-outline" onclick="location.reload()" style="margin-top: 1rem;">
                        <i class="fas fa-redo"></i> Refresh Page
                    </button>
                </div>
            `;
        }
    },

    // Display crops in grid
    displayCrops(crops) {
        const cropsGrid = document.getElementById('cropsGrid');
        if (!cropsGrid) return;

        if (crops.length === 0) {
            cropsGrid.innerHTML = '<div class="wizard-empty"><i class="fas fa-inbox"></i><p>No crops available</p></div>';
            return;
        }

        cropsGrid.innerHTML = crops.map(crop => `
            <div class="wizard-crop-card" data-crop-id="${crop.id}" onclick="CropWizard.selectCrop('${crop.id}')">
                <div class="crop-card-icon">
                    <i class="fas fa-seedling"></i>
                </div>
                <div class="crop-card-content">
                    <h4>${crop.name}</h4>
                    <p class="crop-card-description">${crop.description}</p>
                    <div class="crop-card-badges">
                        <span class="crop-badge"><i class="fas fa-tag"></i> ${crop.category}</span>
                        <span class="crop-badge"><i class="fas fa-signal"></i> ${crop.difficulty}</span>
                    </div>
                    <div class="crop-card-details">
                        <span><i class="fas fa-calendar"></i> ${crop.season}</span>
                        <span><i class="fas fa-clock"></i> ${crop.daysToMaturity}</span>
                    </div>
                </div>
                <div class="crop-card-action">
                    <i class="fas fa-chevron-right"></i>
                </div>
            </div>
        `).join('');

        // Add search functionality
        const searchInput = document.getElementById('cropSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterCrops(e.target.value, crops);
            });
        }
    },

    // Filter crops by search term
    filterCrops(searchTerm, allCrops) {
        const cropsGrid = document.getElementById('cropsGrid');
        if (!cropsGrid) return;

        const term = searchTerm.toLowerCase();
        const filtered = allCrops.filter(crop => 
            crop.name.toLowerCase().includes(term) ||
            crop.description.toLowerCase().includes(term) ||
            crop.category.toLowerCase().includes(term)
        );

        if (filtered.length === 0) {
            cropsGrid.innerHTML = '<div class="wizard-empty"><i class="fas fa-search"></i><p>No crops found matching your search</p></div>';
            return;
        }

        this.displayCrops(filtered);
    },

    // Select a crop
    selectCrop(cropId) {
        this.wizardData.cropId = cropId;
        
        // Get crop data from service (handles data availability)
        const cropData = CropService.getCropData();
        const crop = cropData[cropId];
        
        if (!crop) {
            console.error('Crop not found:', cropId);
            showNotification('Crop data not available. Please refresh the page.', 'error');
            return;
        }

        // Update UI
        const selectedDisplay = document.getElementById('selectedCropDisplay');
        const selectedName = document.getElementById('selectedCropName');
        const selectedDescription = document.getElementById('selectedCropDescription');
        const selectedSeason = document.getElementById('selectedCropSeason');
        const selectedMaturity = document.getElementById('selectedCropMaturity');
        const selectedYield = document.getElementById('selectedCropYield');
        const nextBtn = document.getElementById('step2NextBtn');

        if (selectedDisplay) {
            selectedDisplay.style.display = 'block';
            if (selectedName) selectedName.textContent = crop.name;
            if (selectedDescription) selectedDescription.textContent = CropService.getCropDescription(cropId);
            if (selectedSeason) selectedSeason.textContent = crop.plantingPeriod;
            if (selectedMaturity) selectedMaturity.textContent = crop.daysToMaturity;
            if (selectedYield) selectedYield.textContent = crop.expectedYield;
        }

        if (nextBtn) {
            nextBtn.disabled = false;
        }

        // Update crop cards UI
        document.querySelectorAll('.wizard-crop-card').forEach(card => {
            if (card.dataset.cropId === cropId) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });

        // Track action
        CropService.trackAction('crop_selected', { cropId, cropName: crop.name });
    },

    // Clear crop selection
    clearCropSelection() {
        this.wizardData.cropId = null;
        const selectedDisplay = document.getElementById('selectedCropDisplay');
        const nextBtn = document.getElementById('step2NextBtn');
        
        if (selectedDisplay) selectedDisplay.style.display = 'none';
        if (nextBtn) nextBtn.disabled = true;

        document.querySelectorAll('.wizard-crop-card').forEach(card => {
            card.classList.remove('selected');
        });
    },

    // Attach event listeners for current step
    attachStepEventListeners() {
        // Load crops when step 2 is rendered
        if (this.currentStep === 2) {
            this.loadCrops();
        }

        // Set minimum date for planting date input and recalculate yield if data changes
        if (this.currentStep === 4) {
            const plantingDateInput = document.getElementById('plantingDate');
            if (plantingDateInput) {
                const today = new Date();
                plantingDateInput.min = today.toISOString().split('T')[0];
                plantingDateInput.value = '';
            }

            // Recalculate yield when step 4 is shown (in case user went back and changed data)
            this.recalculateYield();
        }

        // Add listeners to step 3 inputs to update yield calculation in real-time
        if (this.currentStep === 3) {
            const farmAreaInput = document.getElementById('farmArea');
            const farmLocationInput = document.getElementById('farmLocation');
            const soilTypeInput = document.getElementById('soilType');

            const updateYieldPreview = () => {
                const area = farmAreaInput?.value;
                const location = farmLocationInput?.value;
                const soilType = soilTypeInput?.value || '';

                if (area && location && this.wizardData.cropId) {
                    const yieldInfo = this.calculateExpectedYield(
                        this.wizardData.cropId,
                        parseFloat(area),
                        soilType,
                        location
                    );
                    // Store for use in step 4
                    if (yieldInfo) {
                        this.wizardData.expectedYield = yieldInfo;
                    }
                }
            };

            if (farmAreaInput) {
                farmAreaInput.addEventListener('input', updateYieldPreview);
            }
            if (farmLocationInput) {
                farmLocationInput.addEventListener('change', updateYieldPreview);
            }
            if (soilTypeInput) {
                soilTypeInput.addEventListener('change', updateYieldPreview);
            }
        }
    },

    // Recalculate yield for step 4
    recalculateYield() {
        if (this.wizardData.area && this.wizardData.location && this.wizardData.cropId) {
            const yieldInfo = this.calculateExpectedYield(
                this.wizardData.cropId,
                this.wizardData.area,
                this.wizardData.soilType || '',
                this.wizardData.location
            );
            
            if (yieldInfo) {
                this.wizardData.expectedYield = yieldInfo;
                const yieldInput = document.getElementById('expectedYield');
                if (yieldInput) {
                    yieldInput.value = yieldInfo.formatted;
                }
            }
        }
    },

    // Collect data from current step
    collectStepData() {
        switch (this.currentStep) {
            case 3:
                const area = document.getElementById('farmArea')?.value;
                const location = document.getElementById('farmLocation')?.value;
                const soilType = document.getElementById('soilType')?.value;
                
                this.wizardData.area = area ? parseFloat(area) : null;
                this.wizardData.location = location || null;
                this.wizardData.soilType = soilType || null;
                break;
                
            case 4:
                const plantingDate = document.getElementById('plantingDate')?.value;
                const notes = document.getElementById('planNotes')?.value;
                
                this.wizardData.plantingDate = plantingDate || null;
                this.wizardData.notes = notes || '';
                
                // Calculate expected harvest date
                if (plantingDate && this.wizardData.cropId) {
                    const cropData = CropService.getCropData();
                    const crop = cropData[this.wizardData.cropId];
                    if (crop && crop.daysToMaturity) {
                        const days = parseInt(crop.daysToMaturity.split('-')[0]);
                        const planting = new Date(plantingDate);
                        planting.setDate(planting.getDate() + days);
                        this.wizardData.expectedHarvestDate = planting.toISOString().split('T')[0];
                    }
                }
                break;
        }
    },

    // Validate current step
    validateStep() {
        switch (this.currentStep) {
            case 2:
                if (!this.wizardData.cropId) {
                    showNotification('Please select a crop to continue', 'warning');
                    return false;
                }
                return true;
                
            case 3:
                const area = document.getElementById('farmArea')?.value;
                const location = document.getElementById('farmLocation')?.value;
                
                if (!area || parseFloat(area) <= 0) {
                    showNotification('Please enter a valid farming area', 'error');
                    return false;
                }
                if (!location) {
                    showNotification('Please select your location/region', 'error');
                    return false;
                }
                return true;
                
            case 4:
                const plantingDate = document.getElementById('plantingDate')?.value;
                if (!plantingDate) {
                    showNotification('Please select a planting date', 'error');
                    return false;
                }
                return true;
                
            default:
                return true;
        }
    },

    // Go to next step
    nextStep() {
        if (!this.validateStep()) {
            return;
        }

        this.collectStepData();

        if (this.currentStep < this.totalSteps) {
            this.renderStep(this.currentStep + 1);
            this.trackStepProgress(this.currentStep + 1);
        }
    },

    // Go to previous step
    previousStep() {
        if (this.currentStep > 1) {
            this.collectStepData();
            this.renderStep(this.currentStep - 1);
        }
    },

    // Submit crop plan
    async submitPlan() {
        this.collectStepData();

        // Final validation
        if (!this.wizardData.cropId || !this.wizardData.area || !this.wizardData.location || !this.wizardData.plantingDate) {
            showNotification('Please complete all required fields', 'error');
            return;
        }

        // Verify crop data is available
        if (!CropService.isCropDataAvailable()) {
            showNotification('Crop data is not available. Please refresh the page and try again.', 'error');
            return;
        }

        // Show loading state
        const submitBtn = document.querySelector('.wizard-submit-btn');
        const originalText = submitBtn?.innerHTML;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Plan...';
        }

        try {
            // Create crop plan via service (works with local storage immediately)
            const response = await CropService.createCropPlan({
                cropId: this.wizardData.cropId,
                area: this.wizardData.area,
                location: this.wizardData.location,
                soilType: this.wizardData.soilType,
                plantingDate: this.wizardData.plantingDate,
                expectedHarvestDate: this.wizardData.expectedHarvestDate,
                expectedYield: this.wizardData.expectedYield,
                notes: this.wizardData.notes
            });

            if (response.success) {
                showNotification('Crop plan created successfully!', 'success');
                this.trackWizardComplete(response.data.id);
                
                // Redirect to crop planning page or show success message
                setTimeout(() => {
                    window.location.href = 'crop-planning.html?plan=' + response.data.id;
                }, 1500);
            } else {
                showNotification(response.error || 'Failed to create crop plan', 'error');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            }
        } catch (error) {
            console.error('Error creating crop plan:', error);
            showNotification('An error occurred. Please try again.', 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    },

    // Update progress bar
    updateProgressBar() {
        const progress = (this.currentStep / this.totalSteps) * 100;
        const progressBar = document.querySelector('.wizard-progress-bar');
        if (progressBar) {
            progressBar.style.width = progress + '%';
        }

        const progressText = document.querySelector('.wizard-progress-text');
        if (progressText) {
            progressText.textContent = `Step ${this.currentStep} of ${this.totalSteps}`;
        }
    },

    // Track wizard start
    trackWizardStart() {
        CropService.trackAction('crop_wizard_started', {
            timestamp: new Date().toISOString()
        });
    },

    // Track step progress
    trackStepProgress(step) {
        CropService.trackAction('crop_wizard_step', {
            step,
            data: { ...this.wizardData }
        });
    },

    // Track wizard completion
    trackWizardComplete(planId) {
        CropService.trackAction('crop_wizard_completed', {
            planId,
            data: { ...this.wizardData },
            timestamp: new Date().toISOString()
        });
    }
};

