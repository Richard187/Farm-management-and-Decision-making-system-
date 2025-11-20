// Crop Plan Details Management - Input Tracking, CSA Recommendations, and Weather Integration

const CropPlanDetails = {
    currentPlan: null,
    availableInputs: {},
    weatherForecast: null,

    // Initialize plan details page
    async init(planId) {
        if (!planId) {
            console.error('Plan ID is required');
            const container = document.getElementById('planDetailsContainer');
            if (container) {
                container.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-circle"></i><p>Plan ID is required. Please go back and create a crop plan first.</p></div>';
            }
            return;
        }

        // Wait for CropService to be available
        let retries = 0;
        while (typeof CropService === 'undefined' && retries < 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }

        if (typeof CropService === 'undefined') {
            console.error('CropService not available');
            const container = document.getElementById('planDetailsContainer');
            if (container) {
                container.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-circle"></i><p>Service not available. Please refresh the page.</p></div>';
            }
            return;
        }

        // Load plan data
        const plansResponse = await CropService.getUserCropPlans();
        if (!plansResponse.success) {
            const container = document.getElementById('planDetailsContainer');
            if (container) {
                container.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-circle"></i><p>Failed to load crop plans. Please try again.</p></div>';
            }
            if (typeof showNotification !== 'undefined') {
                showNotification('Failed to load crop plans', 'error');
            }
            return;
        }

        this.currentPlan = plansResponse.data.find(p => p.id === planId);
        if (!this.currentPlan) {
            const container = document.getElementById('planDetailsContainer');
            if (container) {
                container.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-circle"></i><p>Crop plan not found. The plan may have been deleted or the ID is incorrect.</p><a href="crop-planning.html" class="btn btn-primary" style="margin-top: 20px; display: inline-block;">Create New Plan</a></div>';
            }
            if (typeof showNotification !== 'undefined') {
                showNotification('Crop plan not found', 'error');
            }
            return;
        }

        // Load saved available inputs
        this.availableInputs = this.currentPlan.availableInputs || {};

        console.log('Plan loaded:', this.currentPlan);
        console.log('Available inputs:', this.availableInputs);

        // Render plan details
        this.renderPlanDetails();

        // Load weather forecast
        await this.loadWeatherForecast();

        // Calculate and display recommendations
        this.updateRecommendations();

        // Load region-specific advice
        this.loadRegionAdvice();
        
        console.log('Plan details initialization complete');
    },

    // Calculate input requirements based on plan
    calculateInputRequirements(plan) {
        const cropData = CropService.getCropData();
        const crop = cropData[plan.cropId];
        if (!crop) return null;

        const area = plan.area; // in acres
        const hectares = area * 0.404686;

        // Base requirements per hectare (will be adjusted by crop type)
        const baseRequirements = {
            labor: {
                planting: 2, // person-days per hectare
                maintenance: 0.5, // person-days per hectare per week
                harvesting: 3 // person-days per hectare
            },
            rainfall: {
                minimum: 500, // mm per season
                optimal: 800, // mm per season
                maximum: 1200 // mm per season
            },
            fertilizers: {
                nitrogen: 100, // kg per hectare
                phosphorus: 50, // kg per hectare
                potassium: 60, // kg per hectare
                organic: 2000 // kg per hectare (compost/manure)
            },
            seeds: {
                quantity: 20, // kg per hectare
                cost: 5 // USD per kg
            },
            pesticides: {
                quantity: 2, // liters per hectare
                cost: 15 // USD per liter
            },
            irrigation: {
                water: 5000, // liters per hectare per season
                frequency: 'weekly' // irrigation frequency
            },
            equipment: {
                tractor: area > 5 ? 1 : 0, // days needed
                handTools: Math.ceil(area * 2) // number of sets
            }
        };

        // Crop-specific adjustments
        const cropAdjustments = this.getCropSpecificRequirements(crop, plan);
        
        // Calculate totals
        const requirements = {
            labor: {
                planting: Math.ceil(baseRequirements.labor.planting * hectares),
                maintenance: Math.ceil(baseRequirements.labor.maintenance * hectares * 12), // 12 weeks
                harvesting: Math.ceil(baseRequirements.labor.harvesting * hectares),
                total: 0
            },
            rainfall: {
                minimum: baseRequirements.rainfall.minimum,
                optimal: baseRequirements.rainfall.optimal,
                maximum: baseRequirements.rainfall.maximum,
                unit: 'mm per season'
            },
            fertilizers: {
                nitrogen: Math.ceil(baseRequirements.fertilizers.nitrogen * hectares * (cropAdjustments.fertilizerMultiplier || 1)),
                phosphorus: Math.ceil(baseRequirements.fertilizers.phosphorus * hectares * (cropAdjustments.fertilizerMultiplier || 1)),
                potassium: Math.ceil(baseRequirements.fertilizers.potassium * hectares * (cropAdjustments.fertilizerMultiplier || 1)),
                organic: Math.ceil(baseRequirements.fertilizers.organic * hectares),
                unit: 'kg'
            },
            seeds: {
                quantity: Math.ceil(baseRequirements.seeds.quantity * hectares * (cropAdjustments.seedMultiplier || 1)),
                cost: 0,
                unit: 'kg'
            },
            pesticides: {
                quantity: Math.ceil(baseRequirements.pesticides.quantity * hectares * (cropAdjustments.pesticideMultiplier || 1)),
                cost: 0,
                unit: 'liters'
            },
            irrigation: {
                water: Math.ceil(baseRequirements.irrigation.water * hectares),
                frequency: baseRequirements.irrigation.frequency,
                unit: 'liters per season'
            },
            equipment: {
                tractor: baseRequirements.equipment.tractor,
                handTools: baseRequirements.equipment.handTools,
                unit: 'days/sets'
            }
        };

        // Calculate totals
        requirements.labor.total = requirements.labor.planting + requirements.labor.maintenance + requirements.labor.harvesting;
        requirements.seeds.cost = requirements.seeds.quantity * baseRequirements.seeds.cost;
        requirements.pesticides.cost = requirements.pesticides.quantity * baseRequirements.pesticides.cost;

        return requirements;
    },

    // Get crop-specific requirement adjustments
    getCropSpecificRequirements(crop, plan) {
        const adjustments = {
            fertilizerMultiplier: 1,
            seedMultiplier: 1,
            pesticideMultiplier: 1
        };

        // Adjust based on crop type
        const cropId = plan.cropId.toLowerCase();
        if (cropId.includes('maize') || cropId.includes('corn')) {
            adjustments.fertilizerMultiplier = 1.2;
            adjustments.seedMultiplier = 1.0;
        } else if (cropId.includes('wheat')) {
            adjustments.fertilizerMultiplier = 1.1;
            adjustments.seedMultiplier = 0.8;
        } else if (cropId.includes('tobacco')) {
            adjustments.fertilizerMultiplier = 1.5;
            adjustments.pesticideMultiplier = 1.3;
        } else if (cropId.includes('legume') || cropId.includes('bean') || cropId.includes('groundnut')) {
            adjustments.fertilizerMultiplier = 0.7; // Legumes fix nitrogen
            adjustments.seedMultiplier = 1.2;
        }

        // Adjust based on soil type
        if (plan.soilType === 'sandy') {
            adjustments.fertilizerMultiplier *= 1.2; // Need more fertilizer
        } else if (plan.soilType === 'loamy') {
            adjustments.fertilizerMultiplier *= 0.9; // Need less fertilizer
        }

        return adjustments;
    },

    // Render plan details page
    renderPlanDetails() {
        if (!this.currentPlan) {
            console.error('No current plan to render');
            return;
        }

        const container = document.getElementById('planDetailsContainer');
        if (!container) {
            console.error('planDetailsContainer element not found');
            // Try to find the parent view
            const view = document.getElementById('planDetailsView');
            if (view) {
                view.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-circle"></i><p>Container element not found. Please refresh the page.</p></div>';
            }
            return;
        }
        
        console.log('Rendering plan details for:', this.currentPlan.cropId);

        const cropData = CropService.getCropData();
        if (!cropData || Object.keys(cropData).length === 0) {
            console.error('Crop data not available');
            container.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-circle"></i><p>Crop data not loaded. Please refresh the page.</p></div>';
            return;
        }
        
        const crop = cropData[this.currentPlan.cropId];
        if (!crop) {
            console.error('Crop not found:', this.currentPlan.cropId);
            container.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-circle"></i><p>Crop data not found for this plan. Please refresh the page.</p></div>';
            return;
        }
        
        const requirements = this.calculateInputRequirements(this.currentPlan);
        if (!requirements) {
            console.error('Failed to calculate requirements');
            container.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-circle"></i><p>Failed to calculate input requirements. Please refresh the page.</p></div>';
            return;
        }
        
        console.log('All data loaded, rendering HTML...');

        container.innerHTML = `
            <div class="plan-details-page">
                <!-- Plan Header -->
                <div class="plan-header">
                    <div class="plan-header-content">
                        <h1><i class="fas fa-seedling"></i> ${crop?.name || 'Crop Plan'}</h1>
                        <p class="plan-subtitle">Plan created on ${new Date(this.currentPlan.createdAt).toLocaleDateString()}</p>
                        <div class="plan-status-badge status-${this.currentPlan.status}">
                            ${this.currentPlan.status.charAt(0).toUpperCase() + this.currentPlan.status.slice(1)}
                        </div>
                    </div>
                </div>

                <!-- Plan Overview -->
                <div class="plan-overview-grid">
                    <div class="overview-card">
                        <i class="fas fa-ruler-combined"></i>
                        <h3>Area</h3>
                        <p class="overview-value">${this.currentPlan.area} acres</p>
                    </div>
                    <div class="overview-card">
                        <i class="fas fa-map-marker-alt"></i>
                        <h3>Location</h3>
                        <p class="overview-value">${this.currentPlan.location || 'Not specified'}</p>
                    </div>
                    <div class="overview-card">
                        <i class="fas fa-calendar-check"></i>
                        <h3>Planting Date</h3>
                        <p class="overview-value">${this.currentPlan.plantingDate ? new Date(this.currentPlan.plantingDate).toLocaleDateString() : 'Not set'}</p>
                    </div>
                    <div class="overview-card">
                        <i class="fas fa-chart-line"></i>
                        <h3>Expected Yield</h3>
                        <p class="overview-value">${this.currentPlan.expectedYield ? this.currentPlan.expectedYield.formatted : 'Calculating...'}</p>
                    </div>
                </div>

                <!-- Input Requirements Section -->
                <div class="plan-section">
                    <h2><i class="fas fa-clipboard-list"></i> Input Requirements</h2>
                    <p class="section-description">Review the required inputs for your crop plan. Check off what you have available.</p>
                    
                    ${this.renderInputRequirements(requirements)}

                    <div class="input-actions" style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
                        <button id="submitInputSelection" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Submit Selected Inputs</button>
                        <span style="color:#6c757d;">Click submit to get a suggested farming style based on your selections.</span>
                    </div>
                    
                    <div id="farmingStyleResult" class="plan-section" style="margin-top:18px;padding:16px;border:1px solid #e6ebe9;border-radius:12px;display:none;">
                        <!-- Suggested farming style will appear here -->
                    </div>
                </div>

                <!-- Weather Forecast Section -->
                <div class="plan-section" id="weatherForecastSection">
                    <h2><i class="fas fa-satellite"></i> Satellite Weather Forecast</h2>
                    <div id="weatherForecastContent">
                        <div class="loading-spinner">
                            <i class="fas fa-spinner fa-spin"></i> Loading weather forecast...
                        </div>
                    </div>
                </div>

                <!-- CSA Recommendations Section -->
                <div class="plan-section" id="csaRecommendationsSection">
                    <h2><i class="fas fa-lightbulb"></i> Climate-Smart Agriculture Recommendations</h2>
                    <div id="csaRecommendationsContent">
                        <!-- Will be populated by updateRecommendations() -->
                    </div>
                </div>

                <!-- Region-Specific Advice Section -->
                <div class="plan-section" id="regionAdviceSection">
                    <h2><i class="fas fa-map"></i> Region-Specific Advice</h2>
                    <div id="regionAdviceContent">
                        <!-- Will be populated by loadRegionAdvice() -->
                    </div>
                </div>
            </div>
        `;

        console.log('Plan details HTML rendered, attaching listeners...');
        
        // Force a reflow to ensure DOM is updated
        void container.offsetHeight;
        
        // Attach event listeners for input checkboxes after a short delay to ensure DOM is ready
        setTimeout(() => {
            this.attachInputListeners();
            // Submit button for farming style suggestion
            const submitBtn = document.getElementById('submitInputSelection');
            if (submitBtn) {
                submitBtn.addEventListener('click', () => {
                    this.showFarmingStyleSuggestion();
                });
            }
            console.log('Event listeners attached');
        }, 200);
    },

    // Render input requirements with checkboxes
    renderInputRequirements(requirements) {
        if (!requirements) return '<p>Unable to calculate requirements.</p>';

        return `
            <div class="input-requirements-grid">
                <!-- Labor Requirements -->
                <div class="input-category-card">
                    <div class="input-category-header">
                        <h3><i class="fas fa-users"></i> Labor</h3>
                        <label class="input-checkbox">
                            <input type="checkbox" data-input-type="labor" ${this.availableInputs.labor ? 'checked' : ''}>
                            <span>I have labor available</span>
                        </label>
                    </div>
                    <div class="input-details">
                        <div class="input-item">
                            <span class="input-label">Planting:</span>
                            <span class="input-value">${requirements.labor.planting} person-days</span>
                        </div>
                        <div class="input-item">
                            <span class="input-label">Maintenance:</span>
                            <span class="input-value">${requirements.labor.maintenance} person-days</span>
                        </div>
                        <div class="input-item">
                            <span class="input-label">Harvesting:</span>
                            <span class="input-value">${requirements.labor.harvesting} person-days</span>
                        </div>
                        <div class="input-item total">
                            <span class="input-label"><strong>Total:</strong></span>
                            <span class="input-value"><strong>${requirements.labor.total} person-days</strong></span>
                        </div>
                    </div>
                </div>

                <!-- Rainfall Requirements -->
                <div class="input-category-card">
                    <div class="input-category-header">
                        <h3><i class="fas fa-cloud-rain"></i> Rainfall</h3>
                        <label class="input-checkbox">
                            <input type="checkbox" data-input-type="rainfall" ${this.availableInputs.rainfall ? 'checked' : ''}>
                            <span>I have irrigation/rainfall</span>
                        </label>
                    </div>
                    <div class="input-details">
                        <div class="input-item">
                            <span class="input-label">Minimum:</span>
                            <span class="input-value">${requirements.rainfall.minimum} mm</span>
                        </div>
                        <div class="input-item">
                            <span class="input-label">Optimal:</span>
                            <span class="input-value">${requirements.rainfall.optimal} mm</span>
                        </div>
                        <div class="input-item">
                            <span class="input-label">Maximum:</span>
                            <span class="input-value">${requirements.rainfall.maximum} mm</span>
                        </div>
                    </div>
                </div>

                <!-- Fertilizer Requirements -->
                <div class="input-category-card">
                    <div class="input-category-header">
                        <h3><i class="fas fa-flask"></i> Fertilizers</h3>
                        <label class="input-checkbox">
                            <input type="checkbox" data-input-type="fertilizers" ${this.availableInputs.fertilizers ? 'checked' : ''}>
                            <span>I have fertilizers</span>
                        </label>
                    </div>
                    <div class="input-details">
                        <div class="input-item">
                            <span class="input-label">Nitrogen (N):</span>
                            <span class="input-value">${requirements.fertilizers.nitrogen} ${requirements.fertilizers.unit}</span>
                        </div>
                        <div class="input-item">
                            <span class="input-label">Phosphorus (P):</span>
                            <span class="input-value">${requirements.fertilizers.phosphorus} ${requirements.fertilizers.unit}</span>
                        </div>
                        <div class="input-item">
                            <span class="input-label">Potassium (K):</span>
                            <span class="input-value">${requirements.fertilizers.potassium} ${requirements.fertilizers.unit}</span>
                        </div>
                        <div class="input-item">
                            <span class="input-label">Organic (Compost/Manure):</span>
                            <span class="input-value">${requirements.fertilizers.organic} ${requirements.fertilizers.unit}</span>
                        </div>
                    </div>
                </div>

                <!-- Seeds Requirements -->
                <div class="input-category-card">
                    <div class="input-category-header">
                        <h3><i class="fas fa-seedling"></i> Seeds</h3>
                        <label class="input-checkbox">
                            <input type="checkbox" data-input-type="seeds" ${this.availableInputs.seeds ? 'checked' : ''}>
                            <span>I have seeds</span>
                        </label>
                    </div>
                    <div class="input-details">
                        <div class="input-item">
                            <span class="input-label">Quantity:</span>
                            <span class="input-value">${requirements.seeds.quantity} ${requirements.seeds.unit}</span>
                        </div>
                        <div class="input-item">
                            <span class="input-label">Estimated Cost:</span>
                            <span class="input-value">$${requirements.seeds.cost.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <!-- Pesticides Requirements -->
                <div class="input-category-card">
                    <div class="input-category-header">
                        <h3><i class="fas fa-spray-can"></i> Pesticides</h3>
                        <label class="input-checkbox">
                            <input type="checkbox" data-input-type="pesticides" ${this.availableInputs.pesticides ? 'checked' : ''}>
                            <span>I have pesticides</span>
                        </label>
                    </div>
                    <div class="input-details">
                        <div class="input-item">
                            <span class="input-label">Quantity:</span>
                            <span class="input-value">${requirements.pesticides.quantity} ${requirements.pesticides.unit}</span>
                        </div>
                        <div class="input-item">
                            <span class="input-label">Estimated Cost:</span>
                            <span class="input-value">$${requirements.pesticides.cost.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <!-- Irrigation Requirements -->
                <div class="input-category-card">
                    <div class="input-category-header">
                        <h3><i class="fas fa-tint"></i> Irrigation</h3>
                        <label class="input-checkbox">
                            <input type="checkbox" data-input-type="irrigation" ${this.availableInputs.irrigation ? 'checked' : ''}>
                            <span>I have irrigation system</span>
                        </label>
                    </div>
                    <div class="input-details">
                        <div class="input-item">
                            <span class="input-label">Water Needed:</span>
                            <span class="input-value">${requirements.irrigation.water.toLocaleString()} ${requirements.irrigation.unit}</span>
                        </div>
                        <div class="input-item">
                            <span class="input-label">Frequency:</span>
                            <span class="input-value">${requirements.irrigation.frequency}</span>
                        </div>
                    </div>
                </div>

                <!-- Equipment Requirements -->
                <div class="input-category-card">
                    <div class="input-category-header">
                        <h3><i class="fas fa-tools"></i> Equipment</h3>
                        <label class="input-checkbox">
                            <input type="checkbox" data-input-type="equipment" ${this.availableInputs.equipment ? 'checked' : ''}>
                            <span>I have equipment</span>
                        </label>
                    </div>
                    <div class="input-details">
                        <div class="input-item">
                            <span class="input-label">Tractor Days:</span>
                            <span class="input-value">${requirements.equipment.tractor} ${requirements.equipment.unit}</span>
                        </div>
                        <div class="input-item">
                            <span class="input-label">Hand Tools:</span>
                            <span class="input-value">${requirements.equipment.handTools} sets</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Attach event listeners for input checkboxes
    attachInputListeners() {
        const checkboxes = document.querySelectorAll('input[data-input-type]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const inputType = e.target.dataset.inputType;
                this.availableInputs[inputType] = e.target.checked;
                this.saveAvailableInputs();
                this.updateRecommendations();
            });
        });
    },

    // Determine and display suggested farming style based on selected inputs
    showFarmingStyleSuggestion() {
        const resultEl = document.getElementById('farmingStyleResult');
        if (!resultEl) return;

        const suggestion = this.generateFarmingStyleSuggestion();
        resultEl.style.display = 'block';
        resultEl.innerHTML = `
            <div class="recommendation-card priority-${suggestion.priority}">
                <div class="recommendation-header">
                    <i class="fas ${suggestion.icon}"></i>
                    <h3>Suggested Farming Style: ${suggestion.style}</h3>
                    <span class="priority-badge priority-${suggestion.priority}">${suggestion.priority}</span>
                </div>
                <div class="recommendation-content">
                    <p>${suggestion.reason}</p>
                    ${suggestion.practices && suggestion.practices.length ? `
                        <div class="recommendation-actions">
                            <strong>Recommended Practices:</strong>
                            <ul>
                                ${suggestion.practices.map(p => `<li>${p}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    ${suggestion.expectedImpact ? `
                        <div class="recommendation-impact">
                            <strong>Expected Impact:</strong> ${suggestion.expectedImpact}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },

    // Core logic to compute suggested farming style
    generateFarmingStyleSuggestion() {
        const ai = this.availableInputs || {};
        const countTrue = Object.values(ai).filter(Boolean).length;
        const hasWater = !!(ai.irrigation || ai.rainfall);
        const hasChemicals = !!(ai.fertilizers || ai.pesticides);
        const hasMechanization = !!ai.equipment;
        const hasLabor = !!ai.labor;

        // Rule set for styles
        // 1) Organic/Low-Input: no chemical inputs selected
        if (!ai.fertilizers && !ai.pesticides) {
            return {
                style: 'Organic / Low-Input Farming',
                icon: 'fa-leaf',
                priority: 'medium',
                reason: 'You did not select fertilizers or pesticides. A low-input, organic approach fits your resource profile.',
                practices: [
                    'Build soil with compost and manure',
                    'Use legume rotations for natural nitrogen',
                    'Adopt mulching and cover crops',
                    'Use natural pest controls (IPM, neem, traps)'
                ],
                expectedImpact: 'Reduce input costs by 30–40% while maintaining soil health.'
            };
        }

        // 2) Conservation Agriculture: water constraints or desire to save labor with sustainable practices
        if (!hasWater || (!hasLabor && !hasMechanization)) {
            return {
                style: 'Conservation Agriculture',
                icon: 'fa-hand-holding-water',
                priority: 'high',
                reason: 'Limited water or labor/mechanization detected. Conservation practices help maintain yields under constraints.',
                practices: [
                    'Minimum/no-till to conserve moisture',
                    'Permanent soil cover (mulch, residues)',
                    'Diversified rotations with drought-tolerant crops',
                    'Precise fertilizer micro-dosing'
                ],
                expectedImpact: 'Improve resilience and water-use efficiency under dry or resource-limited conditions.'
            };
        }

        // 3) Labor-Efficient Smallholder: low labor but some inputs available
        if (!hasLabor && (hasChemicals || hasMechanization)) {
            return {
                style: 'Labor-Efficient Smallholder',
                icon: 'fa-users-slash',
                priority: 'medium',
                reason: 'Labor is limited but other inputs are available. Focus on practices that reduce manual work.',
                practices: [
                    'Direct seeding and simplified weeding',
                    'Targeted fertilizer application',
                    'Schedule operations around forecasted weather',
                    'Use mechanical aids where possible'
                ],
                expectedImpact: 'Cut labor needs by 20–30% while sustaining productivity.'
            };
        }

        // 4) Precision / High-Input Conventional: most inputs available
        if (countTrue >= 5 && hasWater && hasChemicals && hasMechanization && hasLabor) {
            return {
                style: 'Precision / High-Input Conventional',
                icon: 'fa-chart-line',
                priority: 'low',
                reason: 'You selected most inputs. Optimize for yield with precise scheduling and input management.',
                practices: [
                    'Follow soil-test-based fertilizer plans',
                    'Use irrigation scheduling by weather data',
                    'Regular scouting and timely interventions',
                    'Plan harvest to maximize quality and reduce losses'
                ],
                expectedImpact: 'Reach 90–100% of potential yield with careful management.'
            };
        }

        // 5) Balanced Integrated Management: default recommendation
        return {
            style: 'Balanced Integrated Management (ISFM + IPM)',
            icon: 'fa-seedling',
            priority: 'medium',
            reason: 'Mixed resource availability. Combine soil fertility management with integrated pest and water strategies.',
            practices: [
                'Blend organic matter with targeted fertilizers',
                'Use mulching and rainwater harvesting',
                'Practice crop rotation and companion planting',
                'Monitor weather and adjust schedules'
            ],
            expectedImpact: 'Stable yields with moderate inputs and improved soil health.'
        };
    },

    // Save available inputs to plan
    async saveAvailableInputs() {
        if (!this.currentPlan) return;

        await CropService.updateCropPlan(this.currentPlan.id, {
            availableInputs: this.availableInputs
        });
    },

    // Load weather forecast from satellite data
    async loadWeatherForecast() {
        const forecastContent = document.getElementById('weatherForecastContent');
        if (!forecastContent) return;

        try {
            // In production, this would call a real satellite weather API
            // For now, we'll simulate with realistic data based on location
            const forecast = await this.getSatelliteWeatherForecast(this.currentPlan.location);
            
            this.weatherForecast = forecast;
            
            forecastContent.innerHTML = `
                <div class="weather-forecast-card">
                    <div class="forecast-header">
                        <h3><i class="fas fa-satellite"></i> 14-Day Forecast for ${this.currentPlan.location}</h3>
                        <span class="forecast-updated">Updated: ${new Date().toLocaleString()}</span>
                    </div>
                    <div class="forecast-summary">
                        <div class="forecast-summary-item">
                            <i class="fas fa-thermometer-half"></i>
                            <div>
                                <strong>Temperature</strong>
                                <p>${forecast.temperature.avg}°C (${forecast.temperature.min}°C - ${forecast.temperature.max}°C)</p>
                            </div>
                        </div>
                        <div class="forecast-summary-item">
                            <i class="fas fa-cloud-rain"></i>
                            <div>
                                <strong>Expected Rainfall</strong>
                                <p>${forecast.rainfall.total} mm over 14 days</p>
                            </div>
                        </div>
                        <div class="forecast-summary-item">
                            <i class="fas fa-wind"></i>
                            <div>
                                <strong>Wind Speed</strong>
                                <p>${forecast.wind.avg} km/h</p>
                            </div>
                        </div>
                    </div>
                    <div class="forecast-alerts">
                        ${forecast.alerts.length > 0 ? `
                            <h4><i class="fas fa-exclamation-triangle"></i> Weather Alerts</h4>
                            ${forecast.alerts.map(alert => `
                                <div class="alert alert-${alert.severity}">
                                    <strong>${alert.type}:</strong> ${alert.message}
                                </div>
                            `).join('')}
                        ` : '<p class="no-alerts">No weather alerts at this time.</p>'}
                    </div>
                    <div class="forecast-advice">
                        <h4><i class="fas fa-info-circle"></i> Farming Recommendations</h4>
                        <ul>
                            ${forecast.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;

            // Update recommendations based on weather
            this.updateRecommendations();
        } catch (error) {
            console.error('Error loading weather forecast:', error);
            forecastContent.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Unable to load weather forecast. Please check your connection.</p>
                </div>
            `;
        }
    },

    // Get satellite weather forecast (simulated - replace with real API)
    async getSatelliteWeatherForecast(location) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Generate realistic forecast based on location
        const locationForecasts = {
            'temperate': {
                temperature: { avg: 18, min: 12, max: 24 },
                rainfall: { total: 45, distribution: 'moderate' },
                wind: { avg: 15, max: 25 },
                alerts: []
            },
            'tropical': {
                temperature: { avg: 28, min: 24, max: 32 },
                rainfall: { total: 120, distribution: 'high' },
                wind: { avg: 12, max: 20 },
                alerts: []
            },
            'arid': {
                temperature: { avg: 32, min: 25, max: 38 },
                rainfall: { total: 5, distribution: 'low' },
                wind: { avg: 20, max: 30 },
                alerts: [
                    { type: 'Drought Warning', severity: 'warning', message: 'Low rainfall expected. Ensure irrigation is available.' }
                ]
            },
            'mediterranean': {
                temperature: { avg: 22, min: 16, max: 28 },
                rainfall: { total: 30, distribution: 'moderate' },
                wind: { avg: 18, max: 28 },
                alerts: []
            }
        };

        const baseForecast = locationForecasts[location] || locationForecasts['temperate'];
        
        // Add some variability
        const forecast = {
            ...baseForecast,
            alerts: [...baseForecast.alerts],
            recommendations: this.generateWeatherRecommendations(baseForecast, location)
        };

        return forecast;
    },

    // Generate weather-based recommendations
    generateWeatherRecommendations(forecast, location) {
        const recommendations = [];

        if (forecast.rainfall.total < 30) {
            recommendations.push('Low rainfall expected. Consider scheduling irrigation during critical growth stages.');
            recommendations.push('Apply mulch to conserve soil moisture.');
        } else if (forecast.rainfall.total > 100) {
            recommendations.push('Heavy rainfall expected. Ensure proper drainage to prevent waterlogging.');
            recommendations.push('Consider delaying planting if heavy rains are forecasted.');
        }

        if (forecast.temperature.avg > 30) {
            recommendations.push('High temperatures expected. Provide shade for young seedlings if possible.');
            recommendations.push('Water early morning or late evening to reduce evaporation.');
        }

        if (forecast.wind.max > 25) {
            recommendations.push('Strong winds expected. Secure any temporary structures and protect young plants.');
        }

        if (location === 'arid' || forecast.rainfall.total < 20) {
            recommendations.push('Drought conditions likely. Focus on drought-tolerant varieties and water conservation techniques.');
            recommendations.push('Consider intercropping with drought-resistant companion crops.');
        }

        return recommendations.length > 0 ? recommendations : ['Weather conditions are favorable for farming activities.'];
    },

    // Update CSA recommendations based on available inputs
    updateRecommendations() {
        const recommendationsContent = document.getElementById('csaRecommendationsContent');
        if (!recommendationsContent) return;

        const recommendations = this.generateCSARecommendations();
        
        recommendationsContent.innerHTML = `
            <div class="csa-recommendations">
                ${recommendations.map(rec => `
                    <div class="recommendation-card priority-${rec.priority}">
                        <div class="recommendation-header">
                            <i class="fas ${rec.icon}"></i>
                            <h3>${rec.title}</h3>
                            <span class="priority-badge priority-${rec.priority}">${rec.priority}</span>
                        </div>
                        <div class="recommendation-content">
                            <p>${rec.description}</p>
                            ${rec.actions && rec.actions.length > 0 ? `
                                <div class="recommendation-actions">
                                    <strong>Actions:</strong>
                                    <ul>
                                        ${rec.actions.map(action => `<li>${action}</li>`).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                            ${rec.expectedImpact ? `
                                <div class="recommendation-impact">
                                    <strong>Expected Impact:</strong> ${rec.expectedImpact}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // Generate CSA recommendations based on available inputs and plan
    generateCSARecommendations() {
        const recommendations = [];
        const hasAllInputs = Object.values(this.availableInputs).every(v => v === true);
        const hasMostInputs = Object.values(this.availableInputs).filter(v => v === true).length >= 4;

        // Check for missing critical inputs
        if (!this.availableInputs.fertilizers) {
            recommendations.push({
                priority: 'high',
                icon: 'fa-flask',
                title: 'Organic Fertilizer Alternative',
                description: 'You don\'t have chemical fertilizers available. Use organic alternatives like compost, manure, or green manure to maintain soil fertility.',
                actions: [
                    'Start composting kitchen and farm waste',
                    'Collect and apply animal manure',
                    'Plant legume cover crops for nitrogen fixation',
                    'Use crop residues as mulch'
                ],
                expectedImpact: 'Maintain soil fertility while reducing input costs by 30-40%'
            });
        }

        if (!this.availableInputs.irrigation && !this.availableInputs.rainfall) {
            recommendations.push({
                priority: 'high',
                icon: 'fa-tint',
                title: 'Water Conservation Strategies',
                description: 'Limited water availability detected. Implement water-saving techniques to maximize production with minimal water.',
                actions: [
                    'Use mulching to reduce evaporation',
                    'Implement drip irrigation if possible',
                    'Plant drought-tolerant crop varieties',
                    'Practice rainwater harvesting',
                    'Time planting to coincide with expected rainfall'
                ],
                expectedImpact: 'Reduce water usage by 40-50% while maintaining 70-80% of potential yield'
            });
        }

        if (!this.availableInputs.labor) {
            recommendations.push({
                priority: 'medium',
                icon: 'fa-users',
                title: 'Labor-Efficient Practices',
                description: 'Limited labor availability. Adopt practices that reduce labor requirements while maintaining productivity.',
                actions: [
                    'Use direct seeding to reduce planting labor',
                    'Implement minimum tillage practices',
                    'Use mechanical weeding tools where possible',
                    'Plan activities during optimal weather conditions',
                    'Consider intercropping to maximize land use efficiency'
                ],
                expectedImpact: 'Reduce labor requirements by 25-30%'
            });
        }

        if (!this.availableInputs.pesticides) {
            recommendations.push({
                priority: 'medium',
                icon: 'fa-spray-can',
                title: 'Integrated Pest Management (IPM)',
                description: 'No pesticides available. Use natural pest control methods to protect your crops.',
                actions: [
                    'Practice crop rotation to break pest cycles',
                    'Use companion planting (e.g., marigolds, basil)',
                    'Encourage beneficial insects and birds',
                    'Remove and destroy infected plants early',
                    'Use neem oil or other natural repellents'
                ],
                expectedImpact: 'Control pests effectively while maintaining ecosystem health'
            });
        }

        // Region-specific recommendations
        if (this.currentPlan.location === 'arid') {
            recommendations.push({
                priority: 'high',
                icon: 'fa-sun',
                title: 'Arid Climate Adaptation',
                description: 'Your region experiences arid conditions. Implement climate-smart practices to maximize production.',
                actions: [
                    'Use drought-tolerant crop varieties',
                    'Implement conservation agriculture (no-till, mulching)',
                    'Build soil organic matter to improve water retention',
                    'Use shade nets for sensitive crops',
                    'Practice crop diversification to spread risk'
                ],
                expectedImpact: 'Improve yield stability by 20-30% in dry conditions'
            });
        }

        if (this.currentPlan.location === 'tropical') {
            recommendations.push({
                priority: 'medium',
                icon: 'fa-cloud-rain',
                title: 'Tropical Climate Management',
                description: 'High rainfall in your region. Manage excess water and prevent soil erosion.',
                actions: [
                    'Implement contour farming on slopes',
                    'Build terraces to prevent erosion',
                    'Use cover crops to protect soil',
                    'Ensure proper drainage systems',
                    'Time planting to avoid peak rainfall periods'
                ],
                expectedImpact: 'Prevent soil loss and waterlogging issues'
            });
        }

        // Weather-based recommendations
        if (this.weatherForecast) {
            if (this.weatherForecast.rainfall.total < 30) {
                recommendations.push({
                    priority: 'high',
                    icon: 'fa-cloud-rain',
                    title: 'Low Rainfall Forecast',
                    description: `Satellite forecast shows only ${this.weatherForecast.rainfall.total}mm of rain expected. Adjust your farming strategy.`,
                    actions: [
                        'Delay planting until better rainfall is forecasted',
                        'Prepare irrigation backup systems',
                        'Focus on drought-resistant varieties',
                        'Apply mulch immediately after planting'
                    ],
                    expectedImpact: 'Prevent crop failure due to drought stress'
                });
            }
        }

        // Positive recommendations for those with resources
        if (hasMostInputs) {
            recommendations.push({
                priority: 'low',
                icon: 'fa-check-circle',
                title: 'Optimize Production',
                description: 'You have most inputs available. Focus on optimizing production and maximizing yield.',
                actions: [
                    'Follow recommended fertilizer application schedules',
                    'Implement precision agriculture techniques',
                    'Monitor crop health regularly',
                    'Plan for timely harvesting to maximize quality'
                ],
                expectedImpact: 'Achieve 90-100% of potential yield'
            });
        }

        // Sort by priority
        const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 };
        recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        return recommendations;
    },

    // Load region-specific advice
    async loadRegionAdvice() {
        const adviceContent = document.getElementById('regionAdviceContent');
        if (!adviceContent) return;

        const advice = this.getRegionSpecificAdvice(this.currentPlan.location, this.currentPlan.soilType);
        
        adviceContent.innerHTML = `
            <div class="region-advice-card">
                <h3><i class="fas fa-map-marked-alt"></i> Advice for ${this.currentPlan.location} Region</h3>
                <div class="advice-content">
                    ${advice.map(item => `
                        <div class="advice-item">
                            <h4><i class="fas ${item.icon}"></i> ${item.category}</h4>
                            <p>${item.advice}</p>
                            ${item.practices && item.practices.length > 0 ? `
                                <ul class="advice-practices">
                                    ${item.practices.map(practice => `<li>${practice}</li>`).join('')}
                                </ul>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    // Get region-specific advice
    getRegionSpecificAdvice(location, soilType) {
        const advice = [];

        // Location-based advice
        if (location === 'tropical') {
            advice.push({
                category: 'Rainfall Management',
                icon: 'fa-cloud-rain',
                advice: 'Tropical regions receive high rainfall. Focus on managing excess water and preventing soil erosion.',
                practices: [
                    'Use raised beds for better drainage',
                    'Implement contour farming on slopes',
                    'Plant cover crops during off-seasons',
                    'Build terraces to prevent soil erosion'
                ]
            });
        } else if (location === 'arid') {
            advice.push({
                category: 'Water Conservation',
                icon: 'fa-tint',
                advice: 'Arid regions have limited water. Maximize water use efficiency through conservation techniques.',
                practices: [
                    'Use drip irrigation systems',
                    'Apply mulch to reduce evaporation',
                    'Plant drought-tolerant varieties',
                    'Practice rainwater harvesting'
                ]
            });
        }

        // Soil type advice
        if (soilType === 'sandy') {
            advice.push({
                category: 'Sandy Soil Management',
                icon: 'fa-layer-group',
                advice: 'Sandy soils drain quickly and have low nutrient retention. Improve soil structure and fertility.',
                practices: [
                    'Add organic matter regularly (compost, manure)',
                    'Use cover crops to build soil organic matter',
                    'Apply fertilizers in smaller, frequent doses',
                    'Use mulching to reduce water loss'
                ]
            });
        } else if (soilType === 'clay') {
            advice.push({
                category: 'Clay Soil Management',
                icon: 'fa-layer-group',
                advice: 'Clay soils hold water well but can become compacted. Improve drainage and aeration.',
                practices: [
                    'Add organic matter to improve structure',
                    'Avoid working soil when wet',
                    'Use raised beds for better drainage',
                    'Practice minimum tillage to prevent compaction'
                ]
            });
        }

        // General CSA advice
        advice.push({
            category: 'Climate-Smart Agriculture',
            icon: 'fa-leaf',
            advice: 'Adopt climate-smart practices to build resilience and improve productivity.',
            practices: [
                'Practice crop rotation to maintain soil health',
                'Use conservation agriculture (no-till, mulching)',
                'Diversify crops to spread risk',
                'Build soil organic matter for better water retention',
                'Integrate trees and crops (agroforestry) where possible'
            ]
        });

        return advice;
    }
};

