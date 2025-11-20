// Weather Page JavaScript (Live Zambia weather in °C via Open-Meteo)
let forecastData = [];

document.addEventListener('DOMContentLoaded', function() {
    wireWeatherSettings();
    refreshWeather();
});

function wireWeatherSettings() {
    const toggle = document.getElementById('weather-settings-toggle');
    const panel = document.getElementById('weather-settings');
    const input = document.getElementById('weather-location');
    const save = document.getElementById('save-weather-settings');
    const saved = getWeatherConfig();
    if (input) input.value = saved.name || 'Lusaka, Zambia';
    if (toggle && panel) toggle.addEventListener('click', () => {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });
    if (save) save.addEventListener('click', async () => {
        const name = (input.value || 'Lusaka, Zambia').trim();
        const geo = await geocode(name);
        if (geo) {
            setWeatherConfig({ name, latitude: geo.latitude, longitude: geo.longitude });
            document.getElementById('locationName').textContent = name;
            await refreshWeather();
            if (panel) panel.style.display = 'none';
        } else {
            alert('Could not find that location. Try "Lusaka, Zambia"');
        }
    });
}

const WEATHER_CFG_KEY = 'fm_weather_cfg';
function getWeatherConfig() {
    try { return JSON.parse(localStorage.getItem(WEATHER_CFG_KEY)) || {}; } catch { return {}; }
}
function setWeatherConfig(cfg) {
    localStorage.setItem(WEATHER_CFG_KEY, JSON.stringify(cfg));
}

async function geocode(name) {
    try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        if (data && data.results && data.results.length) {
            const r = data.results[0];
            return { latitude: r.latitude, longitude: r.longitude, name: r.name };
        }
        return null;
    } catch (_) { return null; }
}

async function refreshWeather() {
    let cfg = getWeatherConfig();
    if (!cfg.latitude || !cfg.longitude) {
        // Default to Lusaka, Zambia
        const geo = await geocode('Lusaka, Zambia');
        if (geo) {
            cfg = { name: 'Lusaka, Zambia', latitude: geo.latitude, longitude: geo.longitude };
            setWeatherConfig(cfg);
        }
    }
    if (!cfg.latitude || !cfg.longitude) return;
    const locNameEl = document.getElementById('locationName');
    if (locNameEl && cfg.name) locNameEl.textContent = cfg.name;
    await Promise.all([
        fetchCurrentAndForecast(cfg.latitude, cfg.longitude),
    ]);
}

function weatherIconFromCode(code) {
    // Open-Meteo WMO weather codes
    if ([0].includes(code)) return '<i class="fas fa-sun"></i>';
    if ([1,2].includes(code)) return '<i class="fas fa-cloud-sun"></i>';
    if ([3].includes(code)) return '<i class="fas fa-cloud"></i>';
    if ([45,48].includes(code)) return '<i class="fas fa-smog"></i>';
    if ([51,53,55,56,57].includes(code)) return '<i class="fas fa-cloud-rain"></i>';
    if ([61,63,65,66,67,80,81,82].includes(code)) return '<i class="fas fa-cloud-showers-heavy"></i>';
    if ([71,73,75,77,85,86].includes(code)) return '<i class="fas fa-snowflake"></i>';
    if ([95,96,99].includes(code)) return '<i class="fas fa-bolt"></i>';
    return '<i class="fas fa-sun"></i>';
}

function formatConditionFromCode(code) {
    const map = {
        0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Depositing rime fog',
        51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle', 56: 'Freezing drizzle', 57: 'Dense freezing drizzle',
        61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Heavy freezing rain',
        71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow', 77: 'Snow grains', 80: 'Rain showers', 81: 'Heavy rain showers', 82: 'Violent rain showers',
        85: 'Slight snow showers', 86: 'Heavy snow showers', 95: 'Thunderstorm', 96: 'Thunderstorm w/ hail', 99: 'Severe thunderstorm w/ hail'
    };
    return map[code] || '—';
}

async function fetchCurrentAndForecast(lat, lon) {
    try {
        const params = new URLSearchParams({
            latitude: lat,
            longitude: lon,
            current: ['temperature_2m','relative_humidity_2m','pressure_msl','wind_speed_10m','wind_direction_10m','visibility','weather_code'].join(','),
            daily: ['temperature_2m_max','temperature_2m_min','weather_code'].join(','),
            forecast_days: '7',
            timezone: 'auto'
        });
        const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Weather fetch failed');
        const data = await res.json();
        renderCurrent(data);
        renderForecast(data);
        updateWeatherAnimationFromCode(data.current.weather_code);
    } catch (e) {
        // Fall back quietly; we could keep previous values
    }
}

function renderCurrent(data) {
    const c = data.current;
    document.getElementById('currentTemp').textContent = `${Math.round(c.temperature_2m)}°C`;
    document.getElementById('weatherCondition').textContent = formatConditionFromCode(c.weather_code);
    document.getElementById('windSpeed').textContent = `${Math.round(c.wind_speed_10m)} km/h`;
    document.getElementById('humidity').textContent = `${Math.round(c.relative_humidity_2m)}%`;
    document.getElementById('pressure').textContent = `${Math.round(c.pressure_msl)} hPa`;
    const visKm = c.visibility != null ? (c.visibility/1000).toFixed(1) : '—';
    document.getElementById('visibility').textContent = `${visKm} km`;
    const icon = weatherIconFromCode(c.weather_code);
    document.getElementById('weatherIcon').innerHTML = icon;
}

function renderForecast(data) {
    const grid = document.getElementById('forecastGrid');
    grid.innerHTML = '';
    const days = data.daily.time;
    const highs = data.daily.temperature_2m_max;
    const lows = data.daily.temperature_2m_min;
    const codes = data.daily.weather_code;
    days.forEach((dateStr, i) => {
        const date = new Date(dateStr);
        const label = i === 0 ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'short' });
        const card = document.createElement('div');
        card.className = `forecast-day ${i === 0 ? 'active' : ''}`;
        card.innerHTML = `
            <div class="day-name">${label}</div>
            <div class="weather-icon">${weatherIconFromCode(codes[i])}</div>
            <div class="temp-high">${Math.round(highs[i])}°C</div>
            <div class="temp-low">${Math.round(lows[i])}°C</div>
        `;
        card.addEventListener('click', () => {
            document.querySelectorAll('.forecast-day').forEach(d => d.classList.remove('active'));
            card.classList.add('active');
            alert(`${label} Forecast\nHigh: ${Math.round(highs[i])}°C\nLow: ${Math.round(lows[i])}°C\nConditions: ${formatConditionFromCode(codes[i])}`);
        });
        grid.appendChild(card);
    });
}

function formatCondition(condition) {
    const conditions = {
        sunny: 'Mostly Sunny',
        cloudy: 'Partly Cloudy',
        rainy: 'Light Rain',
        stormy: 'Thunderstorms',
        snowy: 'Snow Showers'
    };
    return conditions[condition] || condition;
}

function getWeatherIcon(condition) {
    const icons = {
        sunny: '<i class="fas fa-sun"></i>',
        cloudy: '<i class="fas fa-cloud-sun"></i>',
        rainy: '<i class="fas fa-cloud-rain"></i>',
        stormy: '<i class="fas fa-bolt"></i>',
        snowy: '<i class="fas fa-snowflake"></i>'
    };
    return icons[condition] || '<i class="fas fa-sun"></i>';
}

function generateForecast() {
    const forecastGrid = document.getElementById('forecastGrid');
    forecastGrid.innerHTML = '';
    
    const days = ['Today', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const conditions = ['sunny', 'cloudy', 'rainy', 'stormy', 'sunny', 'cloudy', 'sunny'];
    
    forecastData = [];
    
    days.forEach((day, index) => {
        const highTemp = 65 + Math.floor(Math.random() * 15);
        const lowTemp = highTemp - 10 - Math.floor(Math.random() * 5);
        const condition = conditions[index];
        
        forecastData.push({
            day: day,
            highTemp: highTemp,
            lowTemp: lowTemp,
            condition: condition
        });
        
        const forecastDay = document.createElement('div');
        forecastDay.className = `forecast-day ${index === 0 ? 'active' : ''}`;
        forecastDay.innerHTML = `
            <div class="day-name">${day}</div>
            <div class="weather-icon">${getWeatherIcon(condition)}</div>
            <div class="temp-high">${highTemp}°</div>
            <div class="temp-low">${lowTemp}°</div>
        `;
        
        forecastDay.addEventListener('click', () => {
            document.querySelectorAll('.forecast-day').forEach(day => day.classList.remove('active'));
            forecastDay.classList.add('active');
            showDayDetails(forecastData[index]);
        });
        
        forecastGrid.appendChild(forecastDay);
    });
}

function showDayDetails(dayData) {
    // In a real application, this would show more detailed weather information
    alert(`${dayData.day} Forecast:\n\nHigh: ${dayData.highTemp}°F\nLow: ${dayData.lowTemp}°F\nConditions: ${formatCondition(dayData.condition)}\n\nRecommendations will adjust based on this forecast.`);
}

function updateWeatherAnimation(condition) {
    const rain = document.querySelector('.rain');
    const sun = document.querySelector('.sun');
    const clouds = document.querySelectorAll('.cloud');
    
    // Reset all animations
    rain.style.display = 'none';
    sun.style.display = 'block';
    clouds.forEach(cloud => cloud.style.display = 'block');
    
    switch(condition) {
        case 'sunny':
            sun.style.animation = 'sunGlow 4s ease-in-out infinite';
            break;
        case 'cloudy':
            sun.style.opacity = '0.5';
            clouds.forEach(cloud => cloud.style.opacity = '0.9');
            break;
        case 'rainy':
            rain.style.display = 'block';
            sun.style.display = 'none';
            break;
        case 'stormy':
            rain.style.display = 'block';
            sun.style.display = 'none';
            // Add lightning effect (simplified)
            document.body.style.animation = 'lightning 5s infinite';
            break;
    }
}

function updateWeatherAnimationFromCode(code) {
    // Map some codes to our simple animation states
    if (code === 0) return updateWeatherAnimation('sunny');
    if ([1,2,3,45,48].includes(code)) return updateWeatherAnimation('cloudy');
    if ([61,63,65,80,81,82,51,53,55].includes(code)) return updateWeatherAnimation('rainy');
    if ([95,96,99].includes(code)) return updateWeatherAnimation('stormy');
    updateWeatherAnimation('sunny');
}

function showWeatherChangeNotification(condition) {
    const messages = {
        sunny: 'Weather clearing up! Great conditions for fieldwork.',
        cloudy: 'Clouds moving in. Consider finishing outdoor tasks.',
        rainy: 'Rain approaching. Secure equipment and cover sensitive crops.',
        stormy: 'Storm warning! Take necessary precautions for livestock and equipment.'
    };
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = 'weather-alert';
    notification.style.position = 'fixed';
    notification.style.top = '100px';
    notification.style.right = '20px';
    notification.style.zIndex = '1000';
    notification.style.maxWidth = '300px';
    notification.innerHTML = `
        <div class="alert-icon">
            <i class="fas fa-info-circle"></i>
        </div>
        <div class="alert-content">
            <h3>Weather Update</h3>
            <p>${messages[condition]}</p>
        </div>
        <button class="btn btn-outline" onclick="this.parentElement.remove()">OK</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 10000);
}

function dismissAlert() {
    const alert = document.querySelector('.weather-alert');
    if (alert) {
        alert.style.display = 'none';
    }
}

// Add lightning animation for storms
const style = document.createElement('style');
style.textContent = `
    @keyframes lightning {
        0%, 90%, 100% { background-color: transparent; }
        95% { background-color: rgba(255, 255, 255, 0.3); }
    }
`;
document.head.appendChild(style);