// Finance Page JavaScript
let expenseChart;

document.addEventListener('DOMContentLoaded', function() {
    initializeCharts();
    setupBudgetSliders();
    initializeDataFlow();
});

function initializeCharts() {
    const expenseCtx = document.getElementById('expenseChart').getContext('2d');
    
    expenseChart = new Chart(expenseCtx, {
        type: 'doughnut',
        data: {
            labels: ['Feed & Nutrition', 'Equipment & Maintenance', 'Labor', 'Seeds & Supplies', 'Utilities', 'Other'],
            datasets: [{
                data: [34, 25, 23, 18, 12, 8],
                backgroundColor: [
                    'rgba(46, 125, 50, 0.8)',
                    'rgba(139, 195, 74, 0.8)',
                    'rgba(76, 175, 80, 0.8)',
                    'rgba(255, 152, 0, 0.8)',
                    'rgba(33, 150, 243, 0.8)',
                    'rgba(158, 158, 158, 0.8)'
                ],
                borderColor: [
                    'rgba(46, 125, 50, 1)',
                    'rgba(139, 195, 74, 1)',
                    'rgba(76, 175, 80, 1)',
                    'rgba(255, 152, 0, 1)',
                    'rgba(33, 150, 243, 1)',
                    'rgba(158, 158, 158, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.raw + '%';
                        }
                    }
                }
            }
        }
    });
}

function setupBudgetSliders() {
    const sliders = document.querySelectorAll('.slider');
    
    sliders.forEach(slider => {
        const valueElement = document.getElementById(slider.id + 'Value');
        
        // Set initial value
        valueElement.textContent = formatCurrency(slider.value);
        
        // Update value on slider change
        slider.addEventListener('input', function() {
            valueElement.textContent = formatCurrency(this.value);
            updateTotalBudget();
        });
    });
    
    updateTotalBudget();
}

function updateTotalBudget() {
    const cropBudget = parseInt(document.getElementById('cropBudget').value);
    const livestockBudget = parseInt(document.getElementById('livestockBudget').value);
    const equipmentBudget = parseInt(document.getElementById('equipmentBudget').value);
    
    const totalBudget = cropBudget + livestockBudget + equipmentBudget;
    
    document.getElementById('totalBudgetValue').textContent = formatCurrency(totalBudget);
}

function formatCurrency(amount) {
    return 'ZMW ' + new Intl.NumberFormat('en-ZM', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function saveBudget() {
    const cropBudget = document.getElementById('cropBudget').value;
    const livestockBudget = document.getElementById('livestockBudget').value;
    const equipmentBudget = document.getElementById('equipmentBudget').value;
    
    // In a real application, this would save to a database
    alert(`Budget saved successfully!\n\nCrop Production: ${formatCurrency(cropBudget)}\nLivestock: ${formatCurrency(livestockBudget)}\nEquipment & Maintenance: ${formatCurrency(equipmentBudget)}\n\nTotal Budget: ${formatCurrency(parseInt(cropBudget) + parseInt(livestockBudget) + parseInt(equipmentBudget))}`);
}

function calculateROI() {
    const investmentType = document.getElementById('investmentType').value;
    const amount = parseInt(document.getElementById('investmentAmount').value);
    const lifespan = parseInt(document.getElementById('expectedLifespan').value);
    const annualSavings = parseInt(document.getElementById('annualSavings').value);
    
    // Calculate ROI metrics
    const paybackPeriod = (amount / annualSavings).toFixed(1);
    const totalReturn = annualSavings * lifespan;
    const netProfit = totalReturn - amount;
    const roiPercentage = ((netProfit / amount) * 100).toFixed(0);
    
    // Update results
    document.getElementById('paybackPeriod').textContent = paybackPeriod + ' years';
    document.getElementById('totalReturn').textContent = formatCurrency(totalReturn);
    document.getElementById('roiPercentage').textContent = roiPercentage + '%';
    document.getElementById('netProfit').textContent = formatCurrency(netProfit);
    
    // Show results
    document.getElementById('roiResult').style.display = 'block';
    
    // Add visual feedback based on ROI
    const roiElement = document.getElementById('roiPercentage');
    if (roiPercentage > 20) {
        roiElement.style.color = 'var(--primary)';
    } else if (roiPercentage > 10) {
        roiElement.style.color = 'var(--warning)';
    } else {
        roiElement.style.color = 'var(--danger)';
    }
}

function initializeDataFlow() {
    // Simulate real-time financial data updates
    setInterval(() => {
        updateFinancialData();
    }, 5000);
}

function updateFinancialData() {
    // Simulate small fluctuations in financial data
    const summaryItems = document.querySelectorAll('.summary-item .value');
    
    summaryItems.forEach(item => {
        if (item.textContent.includes('ZMW')) {
            const currentValue = parseInt(item.textContent.replace(/[ZMW,\s]/g, ''));
            const fluctuation = Math.random() * 200 - 100; // -100 to +100
            const newValue = Math.max(0, currentValue + fluctuation);
            
            if (!item.classList.contains('profit')) {
                item.textContent = formatCurrency(newValue);
            }
        } else if (item.textContent.includes('%')) {
            const currentValue = parseFloat(item.textContent);
            const fluctuation = Math.random() * 2 - 1; // -1% to +1%
            const newValue = Math.max(0, currentValue + fluctuation);
            item.textContent = newValue.toFixed(1) + '%';
        }
    });
    
    // Update expense chart with slight variations
    if (expenseChart) {
        expenseChart.data.datasets[0].data = expenseChart.data.datasets[0].data.map(value => {
            const fluctuation = Math.random() * 3 - 1.5; // -1.5% to +1.5%
            return Math.max(1, value + fluctuation);
        });
        expenseChart.update();
    }
}