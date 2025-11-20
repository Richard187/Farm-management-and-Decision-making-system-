// Common JavaScript for all pages

// Navigation active state
document.addEventListener('DOMContentLoaded', function() {
    // Set active navigation based on current page
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Initialize tooltips if any
    initializeTooltips();
    
    // Initialize dropdown menus
    initializeDropdowns();

    // Hero background slideshow (images containing 'farmer')
    try {
        const hero = document.querySelector('.hero');
        if (hero) {
            const images = [
                'images/farmer.jpg',
                'images/farmer.webp',
                'images/farmer 2.webp',
                'images/t farmer.jpg'
            ];

            // Create two layers for crossfade
            const layerA = document.createElement('div');
            layerA.className = 'hero-bg is-visible';
            const layerB = document.createElement('div');
            layerB.className = 'hero-bg';
            hero.prepend(layerB);
            hero.prepend(layerA);

            let index = 0;
            const withOverlay = (src) => `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url('${src}')`;
            layerA.style.backgroundImage = withOverlay(images[index]);

            // Preload
            images.forEach((src) => { const img = new Image(); img.src = src; });

            setInterval(() => {
                const next = (index + 1) % images.length;
                // Prepare B with next image
                layerB.style.backgroundImage = withOverlay(images[next]);
                // Crossfade
                layerB.classList.add('is-visible');
                layerA.classList.remove('is-visible');
                // Swap references after transition
                setTimeout(() => {
                    const tmp = layerA;
                    layerA = layerB;
                    layerB = tmp;
                }, 1100);
                index = next;
            }, 7000);
        }
    } catch (_) {}
});

// Dropdown menu functionality
function initializeDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown');
    
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        const menu = dropdown.querySelector('.dropdown-menu');
        
        // Handle click events for mobile/touch devices
        if (toggle && menu) {
            toggle.addEventListener('click', function(e) {
                // Only prevent default on mobile devices
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                    const isOpen = dropdown.classList.contains('dropdown-open');
                    
                    // Close all other dropdowns
                    dropdowns.forEach(d => {
                        if (d !== dropdown) {
                            d.classList.remove('dropdown-open');
                        }
                    });
                    
                    // Toggle current dropdown
                    dropdown.classList.toggle('dropdown-open');
                }
            });
        }
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown')) {
            dropdowns.forEach(dropdown => {
                dropdown.classList.remove('dropdown-open');
            });
        }
    });
}

function initializeTooltips() {
    // Add tooltip functionality to elements with data-tooltip attribute
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });
}

function showTooltip(event) {
    const tooltipText = event.target.getAttribute('data-tooltip');
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = tooltipText;
    tooltip.style.position = 'absolute';
    tooltip.style.background = 'rgba(0,0,0,0.8)';
    tooltip.style.color = 'white';
    tooltip.style.padding = '5px 10px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontSize = '0.8rem';
    tooltip.style.zIndex = '10000';
    
    document.body.appendChild(tooltip);
    
    const rect = event.target.getBoundingClientRect();
    tooltip.style.left = rect.left + 'px';
    tooltip.style.top = (rect.top - tooltip.offsetHeight - 5) + 'px';
    
    event.target.tooltipElement = tooltip;
}

function hideTooltip(event) {
    if (event.target.tooltipElement) {
        event.target.tooltipElement.remove();
        event.target.tooltipElement = null;
    }
}

// Common utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

// API simulation (for demo purposes)
async function simulateAPIcall(endpoint, data = {}) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    // Return mock data based on endpoint
    switch(endpoint) {
        case '/weather/current':
            return {
                temperature: 68 + Math.floor(Math.random() * 10),
                condition: 'Partly Cloudy',
                humidity: 65 + Math.floor(Math.random() * 15),
                windSpeed: 8 + Math.floor(Math.random() * 5)
            };
        case '/crops/yield':
            return {
                projectedYield: 1200 + Math.floor(Math.random() * 500),
                confidence: 0.85 + Math.random() * 0.1
            };
        default:
            return { success: true, data: {} };
    }
}