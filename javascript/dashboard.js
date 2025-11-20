// Dashboard Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    setupAIAssistant();
    startDataUpdates();
});

function initializeDashboard() {
    updateDashboardMetrics();
    setupFloatingIcons();
}

function updateDashboardMetrics() {
    // Simulate real-time data updates
    setInterval(() => {
        const metrics = document.querySelectorAll('.card-value');
        
        metrics.forEach(metric => {
            const currentValue = metric.textContent;
            
            if (currentValue.includes('$')) {
                // Revenue fluctuation
                const currentAmount = parseInt(currentValue.replace(/[$,]/g, ''));
                const fluctuation = Math.floor(Math.random() * 100 - 50); // -50 to +50
                const newAmount = Math.max(0, currentAmount + fluctuation);
                metric.textContent = '$' + newAmount.toLocaleString();
            }
            else if (currentValue.includes('°F')) {
                // Temperature fluctuation
                const currentTemp = parseInt(currentValue);
                const fluctuation = Math.floor(Math.random() * 3 - 1); // -1 to +1 degrees
                const newTemp = Math.max(32, Math.min(95, currentTemp + fluctuation));
                metric.textContent = newTemp + '°F';
            }
            else {
                // Count fluctuation for crops and livestock
                const currentCount = parseInt(currentValue);
                const fluctuation = Math.floor(Math.random() * 3 - 1); // -1 to +1
                const newCount = Math.max(0, currentCount + fluctuation);
                metric.textContent = newCount;
            }
        });
    }, 5000);
}

function setupFloatingIcons() {
    // Additional animation for floating icons
    const icons = document.querySelectorAll('.floating-icons i');
    
    icons.forEach((icon, index) => {
        // Randomize initial positions and animations
        const randomTop = Math.random() * 80 + 10; // 10% to 90%
        const randomLeft = Math.random() * 80 + 10; // 10% to 90%
        const randomDelay = Math.random() * 5; // 0 to 5 seconds
        
        icon.style.top = randomTop + '%';
        icon.style.left = randomLeft + '%';
        icon.style.animationDelay = randomDelay + 's';
    });
}

function setupAIAssistant() {
    const sendBtn = document.getElementById('sendButton');
    const userInput = document.getElementById('userInput');
    const chatContainer = document.getElementById('chatContainer');

    // Gracefully skip if legacy chat elements are not present
    if (!sendBtn || !userInput || !chatContainer) return;

    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

function sendMessage() {
    const userInput = document.getElementById('userInput');
    const chatContainer = document.getElementById('chatContainer');
    
    if (userInput.value.trim() === '') return;
    
    // Add user message
    const userMessage = document.createElement('div');
    userMessage.className = 'message user-message';
    userMessage.textContent = userInput.value;
    chatContainer.appendChild(userMessage);
    
    // Clear input
    const question = userInput.value;
    userInput.value = '';
    
    // Simulate AI response after a short delay
    setTimeout(() => {
        const aiMessage = document.createElement('div');
        aiMessage.className = 'message ai-message';
        aiMessage.textContent = getAIResponse(question);
        chatContainer.appendChild(aiMessage);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 1000);
    
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function getAIResponse(question) {
    const responses = {
        'weather': 'Based on current forecasts, expect mild conditions for the next 3 days with a 20% chance of rain on Thursday. Perfect for fieldwork. Consider planting drought-resistant cover crops if dry conditions persist.',
        'pest': 'For common pest issues, I recommend integrated pest management. Start with neem oil or insecticidal soap before moving to stronger solutions. Companion planting with marigolds can also help deter pests naturally.',
        'soil': 'Based on common soil issues, consider testing your soil pH. Most crops prefer 6.0-7.0. Add lime to raise pH or sulfur to lower it. Organic matter like compost improves soil structure and nutrient availability.',
        'plant': 'The best planting time depends on your crop and location. Most warm-season crops should be planted after the last frost date. Consider succession planting for continuous harvest throughout the season.',
        'harvest': 'Harvest timing is critical. Most vegetables are best harvested in the morning when temperatures are cooler. For optimal flavor and nutrition, harvest leafy greens before they bolt and fruits at peak ripeness.',
        'finance': 'For better financial management, track all expenses by category. Consider diversifying your income streams with value-added products. Government programs often provide subsidies for sustainable practices.',
        'livestock': 'Ensure proper nutrition, clean water, and adequate shelter for livestock. Regular health checks and vaccination schedules are essential. Rotational grazing improves pasture health and reduces parasite load.',
        'default': 'That\'s an excellent farming question! For detailed, personalized advice on this topic, I recommend checking our knowledge base or scheduling a consultation with one of our agricultural experts.'
    };
    
    question = question.toLowerCase();
    
    if (question.includes('weather') || question.includes('rain') || question.includes('storm')) return responses.weather;
    if (question.includes('pest') || question.includes('insect') || question.includes('bug')) return responses.pest;
    if (question.includes('soil') || question.includes('dirt') || question.includes('ground')) return responses.soil;
    if (question.includes('plant') || question.includes('grow') || question.includes('crop')) return responses.plant;
    if (question.includes('harvest') || question.includes('pick') || question.includes('ripe')) return responses.harvest;
    if (question.includes('money') || question.includes('finance') || question.includes('cost') || question.includes('price')) return responses.finance;
    if (question.includes('cow') || question.includes('chicken') || question.includes('animal') || question.includes('livestock')) return responses.livestock;
    
    return responses.default;
}

function startDataUpdates() {
    // Simulate periodic data refreshes
    setInterval(() => {
        // Update trend indicators
        const trends = document.querySelectorAll('.card-trend');
        
        trends.forEach(trend => {
            if (Math.random() < 0.3) { // 30% chance of trend change
                const isPositive = Math.random() < 0.7; // 70% chance of positive trend
                
                if (isPositive) {
                    trend.className = 'card-trend trend-up';
                    trend.innerHTML = '<i class="fas fa-arrow-up"></i> ' + 
                        (Math.floor(Math.random() * 5) + 1) + 
                        (trend.textContent.includes('%') ? '% from last month' : ' from last month');
                } else {
                    trend.className = 'card-trend trend-down';
                    trend.innerHTML = '<i class="fas fa-arrow-down"></i> ' + 
                        (Math.floor(Math.random() * 3) + 1) + 
                        (trend.textContent.includes('%') ? '% from last month' : ' from last month');
                }
            }
        });
    }, 10000);
}