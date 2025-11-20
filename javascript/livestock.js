// Livestock Management JavaScript - African Small-Scale Farming
document.addEventListener('DOMContentLoaded', function() {
    initializeWeather();
    loadSavedLivestock();
    updateSummary();
    generateHealthTips();
    
    // Auto-update on input change
    document.querySelectorAll('.animal-input').forEach(input => {
        input.addEventListener('input', function() {
            const animal = this.closest('.livestock-input-card').dataset.animal;
            updateLivestockInfo(animal);
        });
    });
});

// Livestock data
const livestockData = {
    goats: {
        name: 'Goats',
        icon: 'fa-paw',
        optimalTemp: { min: 15, max: 25 },
        feedPerAnimal: 2.5, // kg per day
        feedCost: 3.5, // ZMW per kg
        slaughterAge: 8, // months
        slaughterWeight: 25, // kg
        feedingSchedule: {
            morning: '6:00 AM - 2.5kg mixed feed (grass, hay, concentrates)',
            afternoon: '12:00 PM - Fresh water and salt lick',
            evening: '5:00 PM - 1kg hay or browse'
        },
        tempAdvice: {
            hot: 'Provide shade and cool water. Increase water intake. Avoid handling during peak heat (11 AM - 3 PM).',
            optimal: 'Temperature is optimal. Ensure adequate water and grazing areas.',
            cold: 'Provide shelter and warm bedding. Increase feed energy content. Protect from drafts.'
        }
    },
    sheep: {
        name: 'Sheep',
        icon: 'fa-sheep',
        optimalTemp: { min: 10, max: 22 },
        feedPerAnimal: 3.0, // kg per day
        feedCost: 3.0, // ZMW per kg
        slaughterAge: 10, // months
        slaughterWeight: 35, // kg
        feedingSchedule: {
            morning: '6:00 AM - 3kg fresh grass or hay',
            afternoon: '12:00 PM - Water and mineral supplement',
            evening: '5:00 PM - 1.5kg hay or silage'
        },
        tempAdvice: {
            hot: 'Provide shade and cool water. Shear if not done recently. Reduce activity during hot hours.',
            optimal: 'Temperature is optimal. Ensure good grazing management.',
            cold: 'Provide shelter and dry bedding. Increase feed. Protect from rain and wind.'
        }
    },
    chickens: {
        name: 'Chickens',
        icon: 'fa-egg',
        optimalTemp: { min: 18, max: 24 },
        feedPerAnimal: 0.12, // kg per day (layers)
        feedCost: 8.0, // ZMW per kg
        slaughterAge: { layers: null, broilers: 6, dual: 18 }, // weeks
        slaughterWeight: { layers: null, broilers: 2, dual: 2.5 }, // kg
        feedingSchedule: {
            layers: {
                morning: '6:00 AM - Layer feed (120g per bird)',
                afternoon: '12:00 PM - Fresh water and grit',
                evening: '5:00 PM - Layer feed (80g per bird)'
            },
            broilers: {
                morning: '6:00 AM - Broiler starter/grower feed (ad libitum)',
                afternoon: '12:00 PM - Fresh water',
                evening: '5:00 PM - Broiler feed (ad libitum)'
            },
            dual: {
                morning: '6:00 AM - Mixed feed (100g per bird)',
                afternoon: '12:00 PM - Fresh water and greens',
                evening: '5:00 PM - Mixed feed (80g per bird)'
            }
        },
        tempAdvice: {
            hot: 'Provide shade and cool water. Increase ventilation. Reduce stocking density. Add electrolytes to water.',
            optimal: 'Temperature is optimal. Maintain good ventilation and clean water.',
            cold: 'Provide heat source for young chicks. Insulate housing. Increase feed energy. Prevent drafts.'
        }
    },
    cattle: {
        name: 'Beef Cattle',
        icon: 'fa-cow',
        optimalTemp: { min: 5, max: 25 },
        feedPerAnimal: 12, // kg per day (dry matter)
        feedCost: 2.5, // ZMW per kg
        slaughterAge: 18, // months
        slaughterWeight: 350, // kg
        feedingSchedule: {
            morning: '6:00 AM - 6kg hay or grass + 2kg concentrates',
            afternoon: '12:00 PM - Fresh water and salt lick',
            evening: '5:00 PM - 4kg hay or grass + 1kg concentrates'
        },
        tempAdvice: {
            hot: 'Provide shade and cool water. Increase water availability. Reduce activity during peak heat. Consider sprinklers.',
            optimal: 'Temperature is optimal. Ensure adequate grazing or feed.',
            cold: 'Provide shelter and dry bedding. Increase feed energy. Protect from wind and rain.'
        }
    }
};

// Initialize weather
function initializeWeather() {
    const weather = getCurrentWeather();
    document.getElementById('currentTemp').textContent = `${weather.temp}°C`;
    document.getElementById('weatherCondition').textContent = weather.condition;
    
    // Update weather banner color based on temperature
    const banner = document.getElementById('weatherBanner');
    if (weather.temp > 30) {
        banner.style.background = 'linear-gradient(135deg, #ff6b6b, #ff8e53)';
    } else if (weather.temp < 15) {
        banner.style.background = 'linear-gradient(135deg, #4facfe, #00f2fe)';
    } else {
        banner.style.background = 'linear-gradient(135deg, #43e97b, #38f9d7)';
    }
}

// Get current weather (simulated - in real app, fetch from API)
function getCurrentWeather() {
    const currentMonth = new Date().getMonth();
    const hour = new Date().getHours();
    
    // Simulate temperature based on month and time of day
    const baseTemp = {
        0: 28, 1: 29, 2: 27, 3: 24, 4: 20, 5: 17,
        6: 16, 7: 18, 8: 22, 9: 25, 10: 27, 11: 28
    }[currentMonth] || 22;
    
    // Adjust for time of day (cooler at night, warmer during day)
    const timeAdjustment = hour >= 6 && hour <= 18 ? (hour - 12) * 0.5 : -5;
    const temp = Math.round(baseTemp + timeAdjustment + (Math.random() * 4 - 2));
    
    const conditions = temp > 28 ? 'Hot and Sunny' : 
                      temp > 22 ? 'Warm and Clear' : 
                      temp > 15 ? 'Mild and Pleasant' : 
                      'Cool and Cloudy';
    
    return { temp, condition: conditions };
}

// Update livestock information
function updateLivestockInfo(animalType) {
    const count = parseInt(document.getElementById(`${animalType}Count`).value) || 0;
    const animal = livestockData[animalType];
    const detailsDiv = document.getElementById(`${animalType}Details`);
    
    if (count === 0) {
        detailsDiv.style.display = 'none';
        updateSummary();
        return;
    }
    
    detailsDiv.style.display = 'block';
    const weather = getCurrentWeather();
    
    // Temperature management
    const tempStatus = getTempStatus(weather.temp, animal.optimalTemp);
    const tempAdvice = animal.tempAdvice[tempStatus];
    document.getElementById(`${animalType}Temp`).innerHTML = `
        <strong>Current Temperature:</strong> ${weather.temp}°C<br>
        <strong>Optimal Range:</strong> ${animal.optimalTemp.min}°C - ${animal.optimalTemp.max}°C<br>
        <strong>Status:</strong> <span class="temp-status ${tempStatus}">${tempStatus.toUpperCase()}</span><br>
        <strong>Advice:</strong> ${tempAdvice}
    `;
    
    // Feeding schedule
    let feedingHTML = '';
    if (animalType === 'chickens') {
        const chickenType = document.getElementById('chickenType').value;
        const schedule = animal.feedingSchedule[chickenType];
        feedingHTML = `
            <p><strong>Type:</strong> ${chickenType.charAt(0).toUpperCase() + chickenType.slice(1)}</p>
            <p><strong>Total Feed per Day:</strong> ${(animal.feedPerAnimal * count).toFixed(1)} kg</p>
            <p><strong>Daily Cost:</strong> ZMW ${(animal.feedPerAnimal * count * animal.feedCost).toFixed(2)}</p>
            <ul>
                <li><strong>Morning (${schedule.morning.split(' - ')[0]}):</strong> ${schedule.morning.split(' - ')[1]}</li>
                <li><strong>Afternoon (${schedule.afternoon.split(' - ')[0]}):</strong> ${schedule.afternoon.split(' - ')[1]}</li>
                <li><strong>Evening (${schedule.evening.split(' - ')[0]}):</strong> ${schedule.evening.split(' - ')[1]}</li>
            </ul>
        `;
    } else {
        feedingHTML = `
            <p><strong>Total Feed per Day:</strong> ${(animal.feedPerAnimal * count).toFixed(1)} kg</p>
            <p><strong>Daily Cost:</strong> ZMW ${(animal.feedPerAnimal * count * animal.feedCost).toFixed(2)}</p>
            <ul>
                <li><strong>Morning (${animal.feedingSchedule.morning.split(' - ')[0]}):</strong> ${animal.feedingSchedule.morning.split(' - ')[1]}</li>
                <li><strong>Afternoon (${animal.feedingSchedule.afternoon.split(' - ')[0]}):</strong> ${animal.feedingSchedule.afternoon.split(' - ')[1]}</li>
                <li><strong>Evening (${animal.feedingSchedule.evening.split(' - ')[0]}):</strong> ${animal.feedingSchedule.evening.split(' - ')[1]}</li>
            </ul>
        `;
    }
    document.getElementById(`${animalType}Feeding`).innerHTML = feedingHTML;
    
    // Slaughter/Production readiness
    if (animalType === 'chickens') {
        const chickenType = document.getElementById('chickenType').value;
        if (chickenType === 'layers') {
            document.getElementById('chickensProduction').innerHTML = `
                <p><strong>Expected Egg Production:</strong> ${Math.round(count * 0.75)} eggs per day (75% laying rate)</p>
                <p><strong>Monthly Egg Production:</strong> ${Math.round(count * 0.75 * 30)} eggs</p>
                <p><strong>Estimated Monthly Income:</strong> ZMW ${Math.round(count * 0.75 * 30 * 2.5)} (at ZMW 2.50 per egg)</p>
                <p><strong>Peak Production:</strong> 6-18 months of age</p>
            `;
        } else {
            const slaughterAge = animal.slaughterAge[chickenType];
            const slaughterWeight = animal.slaughterWeight[chickenType];
            document.getElementById('chickensProduction').innerHTML = `
                <p><strong>Slaughter Age:</strong> ${slaughterAge} weeks (${(slaughterAge/4).toFixed(1)} months)</p>
                <p><strong>Target Weight:</strong> ${slaughterWeight} kg per bird</p>
                <p><strong>Total Meat Production:</strong> ${(count * slaughterWeight).toFixed(1)} kg (when ready)</p>
                <p><strong>Estimated Value:</strong> ZMW ${Math.round(count * slaughterWeight * 35)} (at ZMW 35/kg)</p>
            `;
        }
    } else if (animalType === 'cattle') {
        const weight = parseInt(document.getElementById('cattleWeight').value) || 200;
        const readyWeight = animal.slaughterWeight;
        const monthsToReady = Math.max(0, Math.ceil((readyWeight - weight) / 20)); // Assume 20kg gain per month
        document.getElementById('cattleSlaughter').innerHTML = `
            <p><strong>Current Average Weight:</strong> ${weight} kg</p>
            <p><strong>Target Slaughter Weight:</strong> ${readyWeight} kg</p>
            <p><strong>Estimated Time to Ready:</strong> ${monthsToReady} months</p>
            <p><strong>Total Meat Production:</strong> ${(count * readyWeight * 0.55).toFixed(1)} kg (55% dressing percentage)</p>
            <p><strong>Estimated Value:</strong> ZMW ${Math.round(count * readyWeight * 0.55 * 45)} (at ZMW 45/kg)</p>
            <div class="progress-bar-container">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${Math.min(100, (weight / readyWeight) * 100)}%"></div>
                </div>
                <span>${Math.round((weight / readyWeight) * 100)}% to target weight</span>
            </div>
        `;
    } else {
        document.getElementById(`${animalType}Slaughter`).innerHTML = `
            <p><strong>Slaughter Age:</strong> ${animal.slaughterAge} months</p>
            <p><strong>Target Weight:</strong> ${animal.slaughterWeight} kg per animal</p>
            <p><strong>Total Meat Production:</strong> ${(count * animal.slaughterWeight * 0.50).toFixed(1)} kg (50% dressing percentage)</p>
            <p><strong>Estimated Value:</strong> ZMW ${Math.round(count * animal.slaughterWeight * 0.50 * 40)} (at ZMW 40/kg)</p>
        `;
    }
    
    // Save to localStorage
    saveLivestock();
    updateSummary();
}

// Get temperature status
function getTempStatus(currentTemp, optimalTemp) {
    if (currentTemp > optimalTemp.max) return 'hot';
    if (currentTemp < optimalTemp.min) return 'cold';
    return 'optimal';
}

// Update summary dashboard
function updateSummary() {
    let totalAnimals = 0;
    let totalFeed = 0;
    let totalCost = 0;
    let readyForMarket = 0;
    
    ['goats', 'sheep', 'chickens', 'cattle'].forEach(animalType => {
        const count = parseInt(document.getElementById(`${animalType}Count`).value) || 0;
        if (count > 0) {
            totalAnimals += count;
            const animal = livestockData[animalType];
            
            if (animalType === 'chickens') {
                totalFeed += animal.feedPerAnimal * count;
                totalCost += animal.feedPerAnimal * count * animal.feedCost;
                const chickenType = document.getElementById('chickenType').value;
                if (chickenType !== 'layers') {
                    readyForMarket += count; // Assume all broilers/dual are being raised for market
                }
            } else {
                totalFeed += animal.feedPerAnimal * count;
                totalCost += animal.feedPerAnimal * count * animal.feedCost;
                // For simplicity, assume 20% of animals are ready for market
                readyForMarket += Math.floor(count * 0.2);
            }
        }
    });
    
    if (totalAnimals > 0) {
        document.getElementById('summaryDashboard').style.display = 'block';
        document.getElementById('totalAnimals').textContent = totalAnimals;
        document.getElementById('dailyFeed').textContent = totalFeed.toFixed(1) + ' kg';
        document.getElementById('monthlyCost').textContent = 'ZMW ' + (totalCost * 30).toFixed(2);
        document.getElementById('readyForMarket').textContent = readyForMarket;
    } else {
        document.getElementById('summaryDashboard').style.display = 'none';
    }
}

// Generate health tips
function generateHealthTips() {
    const tips = [
        {
            icon: 'fa-shield-alt',
            title: 'Vaccination Schedule',
            content: 'Follow recommended vaccination schedule. Goats and sheep need annual vaccinations. Chickens need regular vaccinations against Newcastle disease.'
        },
        {
            icon: 'fa-tint',
            title: 'Water Management',
            content: 'Ensure clean, fresh water is available at all times. Animals need 2-3 times more water in hot weather. Check water sources daily.'
        },
        {
            icon: 'fa-home',
            title: 'Shelter',
            content: 'Provide adequate shelter from sun, rain, and wind. Ensure good ventilation to prevent respiratory diseases. Keep housing clean and dry.'
        },
        {
            icon: 'fa-utensils',
            title: 'Feed Quality',
            content: 'Provide balanced nutrition. Avoid moldy or spoiled feed. Supplement with minerals and vitamins as needed. Rotate grazing areas.'
        },
        {
            icon: 'fa-heartbeat',
            title: 'Health Monitoring',
            content: 'Check animals daily for signs of illness: loss of appetite, lethargy, abnormal behavior. Isolate sick animals immediately. Consult a veterinarian when needed.'
        },
        {
            icon: 'fa-weight',
            title: 'Weight Monitoring',
            content: 'Monitor animal weight regularly. Weight loss can indicate health problems or inadequate nutrition. Adjust feed accordingly.'
        }
    ];
    
    const tipsGrid = document.getElementById('healthTips');
    tipsGrid.innerHTML = tips.map(tip => `
        <div class="tip-card">
            <i class="fas ${tip.icon}"></i>
            <h4>${tip.title}</h4>
            <p>${tip.content}</p>
        </div>
    `).join('');
}

// Save livestock data to localStorage
function saveLivestock() {
    const data = {
        goats: document.getElementById('goatsCount').value,
        sheep: document.getElementById('sheepCount').value,
        chickens: document.getElementById('chickensCount').value,
        cattle: document.getElementById('cattleCount').value,
        cattleWeight: document.getElementById('cattleWeight').value,
        chickenType: document.getElementById('chickenType').value
    };
    localStorage.setItem('livestockData', JSON.stringify(data));
}

// Load saved livestock data
function loadSavedLivestock() {
    const saved = localStorage.getItem('livestockData');
    if (saved) {
        const data = JSON.parse(saved);
        document.getElementById('goatsCount').value = data.goats || 0;
        document.getElementById('sheepCount').value = data.sheep || 0;
        document.getElementById('chickensCount').value = data.chickens || 0;
        document.getElementById('cattleCount').value = data.cattle || 0;
        document.getElementById('cattleWeight').value = data.cattleWeight || 200;
        document.getElementById('chickenType').value = data.chickenType || 'layers';
        
        // Update all information
        ['goats', 'sheep', 'chickens', 'cattle'].forEach(animal => {
            if (parseInt(document.getElementById(`${animal}Count`).value) > 0) {
                updateLivestockInfo(animal);
            }
        });
    }
}

// Refresh weather every 30 minutes
setInterval(initializeWeather, 1800000);

// Update all livestock info when chicken type changes
document.getElementById('chickenType').addEventListener('change', function() {
    const count = parseInt(document.getElementById('chickensCount').value) || 0;
    if (count > 0) {
        updateLivestockInfo('chickens');
    }
});
