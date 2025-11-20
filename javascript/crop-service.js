// Crop Service Module - Backend-Ready API Interface
// This module works with local data immediately, but is structured to easily connect to a real backend
//
// TO ENABLE BACKEND CONNECTION:
// 1. Set CropService.useBackend = true
// 2. Set CropService.baseURL = 'https://your-api-url.com/api/crops'
// 3. Ensure your backend API matches the expected response format
// 4. The service will automatically fall back to local data if backend fails
//
// CURRENT MODE: Local data mode (works immediately without backend)

const CropService = {
    // API Base URL - will be replaced with actual backend URL
    baseURL: '/api/crops', // Update this when backend is connected
    
    // Backend connection flag - set to true when backend is connected
    // Currently: false (using local data from crop-planning.js)
    useBackend: false,
    
    // Current implementation uses localStorage, but structured for backend
    storage: {
        get: (key) => {
            try {
                const data = localStorage.getItem(key);
                return data ? JSON.parse(data) : null;
            } catch (e) {
                console.error('Storage get error:', e);
                return null;
            }
        },
        set: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('Storage set error:', e);
                return false;
            }
        },
        remove: (key) => {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.error('Storage remove error:', e);
                return false;
            }
        }
    },

    // Get crop data - tries multiple sources
    getCropData() {
        // First, try window.cropData (from crop-planning.js)
        if (window.cropData && Object.keys(window.cropData).length > 0) {
            return window.cropData;
        }
        
        // If not available, return empty object (will be handled by fallbacks)
        console.warn('Crop data not found in window.cropData');
        return {};
    },

    // Check if crop data is available
    isCropDataAvailable() {
        const cropData = this.getCropData();
        return Object.keys(cropData).length > 0;
    },

    // Get all available crops from the system
    async getAvailableCrops() {
        // If backend is connected, use it
        if (this.useBackend) {
            try {
                const response = await fetch(`${this.baseURL}/available`);
                if (response.ok) {
                    const result = await response.json();
                    return result;
                }
            } catch (error) {
                console.error('Backend fetch failed, falling back to local data:', error);
                // Fall through to local data
            }
        }
        
        // Use local crop data immediately (synchronous for local data)
        const cropData = this.getCropData();
        
        // If data is available, return immediately (no async delay)
        if (Object.keys(cropData).length > 0) {
            return this._formatCropsData(cropData);
        }
        
        // If not available, return error immediately
        // The wizard will handle retrying if needed
        console.warn('Crop data not available immediately. crop-planning.js may still be loading.');
        return {
            success: false,
            error: 'Crop data not available. Please ensure all scripts are loaded.',
            data: []
        };
    },

    // Format crops data for response
    _formatCropsData(cropData) {
        return {
            success: true,
            data: Object.keys(cropData).map(key => ({
                id: key,
                name: cropData[key].name,
                category: this.getCropCategory(key),
                description: this.getCropDescription(key),
                image: `images/${key}.jpg`, // Placeholder for crop images
                season: cropData[key].plantingPeriod,
                difficulty: this.getCropDifficulty(key),
                estimatedYield: cropData[key].expectedYield,
                daysToMaturity: cropData[key].daysToMaturity
            })),
            timestamp: new Date().toISOString(),
            source: 'local' // Indicate data source
        };
    },

    // Get detailed crop information
    async getCropDetails(cropId) {
        // If backend is connected, use it
        if (this.useBackend) {
            try {
                const response = await fetch(`${this.baseURL}/${cropId}`);
                if (response.ok) {
                    return await response.json();
                }
            } catch (error) {
                console.error('Backend fetch failed, falling back to local data:', error);
                // Fall through to local data
            }
        }
        
        // Use local crop data immediately
        const cropData = this.getCropData();
        const crop = cropData[cropId];
        if (!crop) {
            // Wait and retry once (in case data is still loading)
            await new Promise(resolve => setTimeout(resolve, 100));
            const retryData = this.getCropData();
            const retryCrop = retryData[cropId];
            if (!retryCrop) {
                return {
                    success: false,
                    error: 'Crop not found',
                    data: null
                };
            }
            return this._formatCropDetails(cropId, retryCrop);
        }

        return this._formatCropDetails(cropId, crop);
    },

    // Format crop details for response
    _formatCropDetails(cropId, crop) {
        return {
            success: true,
            data: {
                id: cropId,
                ...crop,
                recommendations: this.getCropRecommendations(cropId),
                suitability: this.checkCropSuitability(cropId)
            },
            timestamp: new Date().toISOString(),
            source: 'local'
        };
    },

    // Create a new crop plan
    async createCropPlan(planData) {
        // If backend is connected, use it
        if (this.useBackend) {
            try {
                const response = await fetch(`${this.baseURL}/plans`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(planData)
                });
                if (response.ok) {
                    const result = await response.json();
                    this.trackAction('crop_plan_created', {
                        planId: result.data?.id,
                        cropId: planData.cropId,
                        area: planData.area
                    });
                    return result;
                }
            } catch (error) {
                console.error('Backend create failed, using local storage:', error);
                // Fall through to local storage
            }
        }
        
        // Use local storage (no delay for local operations)
        const plan = {
            id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...planData,
            status: 'planned',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            progress: 0,
            steps: this.generateCropPlanSteps(planData.cropId)
        };

        // Store in localStorage
        const plans = this.storage.get('cropPlans') || [];
        plans.push(plan);
        this.storage.set('cropPlans', plans);

        // Track action
        this.trackAction('crop_plan_created', {
            planId: plan.id,
            cropId: planData.cropId,
            area: planData.area
        });

        return {
            success: true,
            data: plan,
            message: 'Crop plan created successfully',
            source: 'local'
        };
    },

    // Get user's crop plans
    async getUserCropPlans() {
        // If backend is connected, use it
        if (this.useBackend) {
            try {
                const response = await fetch(`${this.baseURL}/plans`);
                if (response.ok) {
                    return await response.json();
                }
            } catch (error) {
                console.error('Backend fetch failed, using local storage:', error);
                // Fall through to local storage
            }
        }
        
        // Use local storage (no delay for local operations)
        const plans = this.storage.get('cropPlans') || [];
        
        return {
            success: true,
            data: plans.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
            count: plans.length,
            source: 'local'
        };
    },

    // Update crop plan
    async updateCropPlan(planId, updates) {
        // If backend is connected, use it
        if (this.useBackend) {
            try {
                const response = await fetch(`${this.baseURL}/plans/${planId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updates)
                });
                if (response.ok) {
                    const result = await response.json();
                    this.trackAction('crop_plan_updated', { planId, updates });
                    return result;
                }
            } catch (error) {
                console.error('Backend update failed, using local storage:', error);
                // Fall through to local storage
            }
        }
        
        // Use local storage (no delay for local operations)
        const plans = this.storage.get('cropPlans') || [];
        const index = plans.findIndex(p => p.id === planId);
        
        if (index === -1) {
            return {
                success: false,
                error: 'Plan not found'
            };
        }

        plans[index] = {
            ...plans[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        this.storage.set('cropPlans', plans);

        this.trackAction('crop_plan_updated', { planId, updates });

        return {
            success: true,
            data: plans[index],
            message: 'Crop plan updated successfully',
            source: 'local'
        };
    },

    // Delete crop plan
    async deleteCropPlan(planId) {
        // If backend is connected, use it
        if (this.useBackend) {
            try {
                const response = await fetch(`${this.baseURL}/plans/${planId}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    const result = await response.json();
                    this.trackAction('crop_plan_deleted', { planId });
                    return result;
                }
            } catch (error) {
                console.error('Backend delete failed, using local storage:', error);
                // Fall through to local storage
            }
        }
        
        // Use local storage (no delay for local operations)
        const plans = this.storage.get('cropPlans') || [];
        const filtered = plans.filter(p => p.id !== planId);
        this.storage.set('cropPlans', filtered);

        this.trackAction('crop_plan_deleted', { planId });

        return {
            success: true,
            message: 'Crop plan deleted successfully',
            source: 'local'
        };
    },

    // Get crop recommendations based on user's farm data
    async getCropRecommendations(userFarmData) {
        // If backend is connected, use it
        if (this.useBackend) {
            try {
                const response = await fetch(`${this.baseURL}/recommendations`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userFarmData)
                });
                if (response.ok) {
                    return await response.json();
                }
            } catch (error) {
                console.error('Backend fetch failed, using local recommendations:', error);
                // Fall through to local recommendations
            }
        }
        
        // Use local data for recommendations (no delay)
        const cropsResponse = await this.getAvailableCrops();
        if (!cropsResponse.success) {
            return {
                success: false,
                error: 'Unable to get crops for recommendations',
                data: []
            };
        }
        
        const recommendations = cropsResponse.data
            .map(crop => ({
                ...crop,
                suitabilityScore: this.calculateSuitabilityScore(crop.id, userFarmData)
            }))
            .filter(crop => crop.suitabilityScore > 0)
            .sort((a, b) => b.suitabilityScore - a.suitabilityScore)
            .slice(0, 5);

        return {
            success: true,
            data: recommendations,
            timestamp: new Date().toISOString(),
            source: 'local'
        };
    },

    // Calculate suitability score for a crop based on farm data
    calculateSuitabilityScore(cropId, farmData) {
        // Basic scoring logic - can be enhanced
        const cropData = this.getCropData();
        const crop = cropData[cropId];
        if (!crop) return 0;

        let score = 50; // Base score

        // Add scoring based on location/climate match
        if (farmData.location) {
            // Simple location-based scoring
            score += 20;
        }

        // Add scoring based on soil type match
        if (farmData.soilType && crop.soilType) {
            if (farmData.soilType.toLowerCase().includes(crop.soilType.toLowerCase().split(' ')[0])) {
                score += 20;
            }
        }

        // Add scoring based on area
        if (farmData.area && farmData.area > 0) {
            score += 10;
        }

        return Math.min(100, score);
    },

    // Helper: Get crop category
    getCropCategory(cropId) {
        const categories = {
            maize: 'Cereal',
            wheat: 'Cereal',
            sorghum: 'Cereal',
            millet: 'Cereal',
            soybeans: 'Legume',
            groundnuts: 'Legume',
            cotton: 'Cash Crop',
            tobacco: 'Cash Crop',
            cabbage: 'Vegetable',
            sunflower: 'Oilseed'
        };
        return categories[cropId] || 'Other';
    },

    // Helper: Get crop description
    getCropDescription(cropId) {
        const descriptions = {
            maize: 'Staple food crop, high yield potential, requires good management',
            wheat: 'Winter cereal crop, good for bread making, requires irrigation',
            tobacco: 'High-value cash crop, requires careful management and curing',
            cotton: 'Fiber crop, good cash value, requires pest management',
            cabbage: 'High-value vegetable, good market demand, short growing season',
            sunflower: 'Oilseed crop, drought tolerant, good for oil extraction',
            soybeans: 'Protein-rich legume, fixes nitrogen, good for rotation',
            sorghum: 'Drought-tolerant cereal, good for dry areas, food security crop',
            millet: 'Very drought-tolerant, grows in poor soils, excellent for food security',
            groundnuts: 'Cash crop, fixes nitrogen, improves soil, good market value'
        };
        return descriptions[cropId] || 'Agricultural crop with good farming potential';
    },

    // Helper: Get crop difficulty level
    getCropDifficulty(cropId) {
        const difficulties = {
            maize: 'Medium',
            wheat: 'Medium',
            tobacco: 'High',
            cotton: 'Medium-High',
            cabbage: 'Low-Medium',
            sunflower: 'Low',
            soybeans: 'Low-Medium',
            sorghum: 'Low',
            millet: 'Low',
            groundnuts: 'Medium'
        };
        return difficulties[cropId] || 'Medium';
    },

    // Helper: Get crop recommendations (static recommendations for display)
    getCropRecommendations(cropId) {
        const cropData = this.getCropData();
        const crop = cropData[cropId];
        if (!crop) return [];

        return [
            `Best planting period: ${crop.plantingPeriod}`,
            `Expected yield: ${crop.expectedYield}`,
            `Growing season: ${crop.daysToMaturity}`,
            `Soil requirements: ${crop.soilType}`
        ];
    },

    // Helper: Check crop suitability
    checkCropSuitability(cropId) {
        // This would check against user's farm data, location, soil type, etc.
        // For now, return a basic suitability score
        return {
            score: 85,
            factors: [
                { factor: 'Climate', score: 90, note: 'Suitable for your region' },
                { factor: 'Soil Type', score: 85, note: 'Matches your soil conditions' },
                { factor: 'Water Availability', score: 80, note: 'Adequate irrigation needed' }
            ]
        };
    },

    // Helper: Check if crop is suitable for user's farm
    isCropSuitable(cropId, farmData) {
        // Basic suitability check - can be enhanced with more logic
        const cropData = this.getCropData();
        const crop = cropData[cropId];
        if (!crop) return false;

        // Calculate suitability score
        const score = this.calculateSuitabilityScore(cropId, farmData);
        return score > 30; // Minimum threshold for suitability
    },

    // Generate steps for crop plan
    generateCropPlanSteps(cropId) {
        const cropData = this.getCropData();
        const crop = cropData[cropId];
        if (!crop) return [];

        const steps = [
            {
                id: 'land_preparation',
                name: 'Land Preparation',
                description: 'Prepare the land for planting',
                status: 'pending',
                estimatedDays: 7,
                order: 1
            },
            {
                id: 'planting',
                name: 'Planting',
                description: `Plant ${crop.name} according to spacing requirements`,
                status: 'pending',
                estimatedDays: 3,
                order: 2
            },
            {
                id: 'fertilizer_basal',
                name: 'Basal Fertilizer Application',
                description: 'Apply basal fertilizer at planting',
                status: 'pending',
                estimatedDays: 2,
                order: 3
            },
            {
                id: 'irrigation_setup',
                name: 'Irrigation Setup',
                description: 'Set up irrigation system',
                status: 'pending',
                estimatedDays: 5,
                order: 4
            },
            {
                id: 'monitoring',
                name: 'Crop Monitoring',
                description: 'Monitor crop growth and health',
                status: 'pending',
                estimatedDays: crop.daysToMaturity ? parseInt(crop.daysToMaturity.split('-')[0]) : 90,
                order: 5
            },
            {
                id: 'harvest',
                name: 'Harvest',
                description: `Harvest ${crop.name}`,
                status: 'pending',
                estimatedDays: 7,
                order: 6
            }
        ];

        return steps;
    },

    // Track user actions (for analytics and backend logging)
    trackAction(action, data = {}) {
        const logEntry = {
            action,
            data,
            timestamp: new Date().toISOString(),
            userId: this.getCurrentUserId(),
            sessionId: this.getSessionId()
        };

        // Store logs (in real backend, this would be sent to logging service)
        const logs = this.storage.get('actionLogs') || [];
        logs.push(logEntry);
        
        // Keep only last 1000 logs
        if (logs.length > 1000) {
            logs.shift();
        }
        
        this.storage.set('actionLogs', logs);

        // In real backend, also send to logging API
        // fetch('/api/logs', { method: 'POST', body: JSON.stringify(logEntry) });
        
        console.log('Action tracked:', action, data);
    },

    // Get current user ID (from auth system)
    getCurrentUserId() {
        try {
            const user = JSON.parse(localStorage.getItem('agrismart_current_user') || 'null');
            return user?.id || 'anonymous';
        } catch {
            return 'anonymous';
        }
    },

    // Get session ID
    getSessionId() {
        let sessionId = sessionStorage.getItem('sessionId');
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('sessionId', sessionId);
        }
        return sessionId;
    },

    // Get action logs (for debugging and analytics)
    getActionLogs(limit = 100) {
        const logs = this.storage.get('actionLogs') || [];
        return logs.slice(-limit);
    },

    // Clear old logs
    clearOldLogs(daysToKeep = 30) {
        const logs = this.storage.get('actionLogs') || [];
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        
        const filtered = logs.filter(log => new Date(log.timestamp) > cutoffDate);
        this.storage.set('actionLogs', filtered);
        
        return {
            success: true,
            cleared: logs.length - filtered.length,
            remaining: filtered.length
        };
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CropService;
}

