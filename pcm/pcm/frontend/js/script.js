// ============================================
// ULTIMATE POWER CONSUMPTION MONITOR - FRONTEND
// Group 6 Database Systems Project
// ============================================

// API Configuration
const API_URL = 'http://localhost:5000/api';

// User ID - Get from localStorage or use default
let currentUserId = localStorage.getItem('userId') || 'user123';

// Global chart instances
let weeklyChart = null;
let categoryChart = null;
let dailyBreakdownChart = null;
let hourlyPatternChart = null;
let usageGaugeChart = null;
let efficiencyGaugeChart = null;

// Check if user is logged in (skip for login page)
if (!localStorage.getItem('userId') && !window.location.href.includes('login.html') && !window.location.href.includes('forgot-password.html') && !window.location.href.includes('reset-password.html')) {
    window.location.href = 'login.html';
}

// Display user name
if (document.getElementById('userNameSpan')) {
    document.getElementById('userNameSpan').innerHTML = '👤 ' + (localStorage.getItem('userName') || 'User');
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Show toast notification
function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = 'toast' + (isError ? ' error' : '');
    toast.innerHTML = `<i class="fas ${isError ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Animate number counter
function animateNumber(element, start, end, duration) {
    if (!element) return;
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            clearInterval(timer);
            element.innerHTML = end.toFixed(1);
        } else {
            element.innerHTML = current.toFixed(1);
        }
    }, 16);
}

// Confetti animation for achievements
function showConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    for (let i = 0; i < 150; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 8 + 4,
            speedY: Math.random() * 5 + 3,
            speedX: Math.random() * 2 - 1,
            color: `hsl(${Math.random() * 360}, 70%, 60%)`,
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 10 - 5
        });
    }
    
    function animateConfetti() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let active = false;
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.y += p.speedY;
            p.x += p.speedX;
            p.rotation += p.rotationSpeed;
            if (p.y < canvas.height) {
                active = true;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation * Math.PI / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
                ctx.restore();
            }
        }
        if (active) {
            requestAnimationFrame(animateConfetti);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
    animateConfetti();
    setTimeout(() => ctx.clearRect(0, 0, canvas.width, canvas.height), 3000);
}

// Typewriter effect
function typeWriterEffect(element, text, speed = 50) {
    if (!element) return;
    let i = 0;
    element.innerHTML = '';
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    type();
}

// Update progress ring
function updateProgressRing(percentage) {
    const circle = document.querySelector('.progress-ring-circle');
    if (circle) {
        const radius = 52;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percentage / 100) * circumference;
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        circle.style.strokeDashoffset = offset;
        const goalText = document.getElementById('goalPercentage');
        const goalProgress = document.getElementById('goalProgress');
        if (goalText) goalText.innerText = `${Math.round(percentage)}%`;
        if (goalProgress) goalProgress.value = percentage;
    }
}

// Update gauges
async function updateGauges(usage) {
    const maxUsage = 50;
    const percentage = Math.min((usage / maxUsage) * 100, 100);
    const efficiency = Math.max(100 - percentage, 0);
    
    const gaugePercentage = document.getElementById('gaugePercentage');
    const efficiencyValue = document.getElementById('efficiencyValue');
    if (gaugePercentage) gaugePercentage.innerHTML = `${Math.round(percentage)}%`;
    if (efficiencyValue) efficiencyValue.innerHTML = `${Math.round(efficiency)}%`;
    
    const gaugeCtx = document.getElementById('usageGauge');
    const efficiencyCtx = document.getElementById('efficiencyGauge');
    
    if (gaugeCtx && usageGaugeChart) usageGaugeChart.destroy();
    if (efficiencyCtx && efficiencyGaugeChart) efficiencyGaugeChart.destroy();
    
    if (gaugeCtx) {
        usageGaugeChart = new Chart(gaugeCtx.getContext('2d'), {
            type: 'doughnut',
            data: { datasets: [{ data: [percentage, 100 - percentage], backgroundColor: ['#667eea', '#e0e0e0'], borderWidth: 0, circumference: 180, rotation: 270 }] },
            options: { responsive: true, maintainAspectRatio: true, cutout: '70%' }
        });
    }
    
    if (efficiencyCtx) {
        efficiencyGaugeChart = new Chart(efficiencyCtx.getContext('2d'), {
            type: 'doughnut',
            data: { datasets: [{ data: [efficiency, 100 - efficiency], backgroundColor: ['#28a745', '#e0e0e0'], borderWidth: 0, circumference: 180, rotation: 270 }] },
            options: { responsive: true, maintainAspectRatio: true, cutout: '70%' }
        });
    }
}

// Get device icon
function getDeviceIcon(category) {
    const icons = { 'AC': '❄️', 'Heater': '🔥', 'Refrigerator': '🧊', 'Lighting': '💡', 'Entertainment': '📺', 'Kitchen': '🍳', 'Other': '🔌' };
    return icons[category] || '⚡';
}

// ============================================
// VIEW MANAGEMENT
// ============================================

function showDashboard() {
    setActiveView('dashboardView');
    loadDashboardData();
}

function showDevices() {
    setActiveView('devicesView');
    loadDevices();
}

function showAnalytics() {
    setActiveView('analyticsView');
    loadAnalytics();
}

function showSettings() {
    setActiveView('settingsView');
    loadSettings();
}

function setActiveView(viewId) {
    const views = document.querySelectorAll('.view');
    for (let i = 0; i < views.length; i++) {
        views[i].classList.remove('active');
    }
    const targetView = document.getElementById(viewId);
    if (targetView) targetView.classList.add('active');
    
    const navBtns = document.querySelectorAll('.nav-btn');
    for (let i = 0; i < navBtns.length; i++) {
        navBtns[i].classList.remove('active');
    }
}

// ============================================
// DASHBOARD FUNCTIONS
// ============================================

async function loadDashboardData() {
    try {
        await loadTodayUsage();
        await loadWeeklyChart();
        await loadCategoryChart();
        await loadAlerts();
        await loadTopDevices();
        await loadSavingsQuote();
        await loadWelcomeMessage();
        await loadComparison();
        await loadPrediction();
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

async function loadPrediction() {
    try {
        const response = await fetch(`${API_URL}/analytics/predict/${currentUserId}`);
        const data = await response.json();
        if (data.success) {
            const predElement = document.getElementById('predictionValue');
            const msgElement = document.getElementById('predictionMessage');
            if (predElement) predElement.innerHTML = data.data.predictedUsage + ' kWh';
            if (msgElement) msgElement.innerHTML = data.data.suggestion;
        }
    } catch (error) {
        console.error('Error loading prediction:', error);
    }
}

async function loadComparison() {
    try {
        const response = await fetch(`${API_URL}/analytics/compare/${currentUserId}`);
        const data = await response.json();
        if (data.success) {
            const yourUsage = document.getElementById('yourUsage');
            const avgUsage = document.getElementById('avgUsage');
            const percentile = document.getElementById('percentile');
            const message = document.getElementById('comparisonMessage');
            if (yourUsage) yourUsage.innerHTML = data.data.yourUsage;
            if (avgUsage) avgUsage.innerHTML = data.data.averageUsage;
            if (percentile) percentile.innerHTML = data.data.percentile + '%';
            if (message) message.innerHTML = data.data.message;
        }
    } catch (error) {
        console.error('Error loading comparison:', error);
    }
}

async function loadTodayUsage() {
    try {
        const response = await fetch(`${API_URL}/analytics/summary/${currentUserId}`);
        const data = await response.json();
        if (data.success) {
            const usage = parseFloat(data.data.todayUsage);
            const todayElement = document.getElementById('todayUsage');
            const costElement = document.getElementById('estimatedCost');
            const carbonElement = document.getElementById('carbonFootprint');
            const peakElement = document.getElementById('peakUsage');
            
            if (todayElement) animateNumber(todayElement, 0, usage, 1000);
            if (carbonElement) animateNumber(carbonElement, 0, parseFloat(data.data.carbonFootprint), 1000);
            if (peakElement) animateNumber(peakElement, 0, parseFloat(data.data.peakUsage), 1000);
            if (costElement) costElement.innerHTML = data.data.estimatedCost;
            
            await updateGauges(usage);
            
            const dailyGoal = 20;
            const percentage = Math.min((usage / dailyGoal) * 100, 100);
            updateProgressRing(percentage);
            const dailyTarget = document.getElementById('dailyTarget');
            if (dailyTarget) dailyTarget.innerHTML = `${dailyGoal} kWh`;
            
            if (usage < 10 && usage > 0) {
                showConfetti();
                showToast('🎉 Amazing! You\'re an Energy Saver! 🏆');
            }
        }
    } catch (error) {
        console.error('Error loading usage:', error);
    }
}

async function loadSavingsQuote() {
    try {
        const response = await fetch(`${API_URL}/analytics/summary/${currentUserId}`);
        const data = await response.json();
        if (data.success) {
            const usage = parseFloat(data.data.todayUsage);
            const quoteElement = document.getElementById('savingsQuote');
            const rankElement = document.getElementById('yourRank');
            if (quoteElement) {
                if (usage < 10) {
                    quoteElement.innerHTML = "🎉 Amazing! You're saving 30% more energy than average users!";
                    if (rankElement) rankElement.innerHTML = "🏆 Top Energy Saver";
                } else if (usage < 20) {
                    quoteElement.innerHTML = "👍 Good job! Keep monitoring your usage to save more!";
                    if (rankElement) rankElement.innerHTML = "⭐ Good Progress";
                } else {
                    quoteElement.innerHTML = "💡 Try reducing usage by unplugging unused devices";
                    if (rankElement) rankElement.innerHTML = "📈 Needs Improvement";
                }
            }
        }
    } catch (error) {}
}

async function loadWelcomeMessage() {
    const welcomeElement = document.getElementById('welcomeMessage');
    if (welcomeElement) {
        const userName = localStorage.getItem('userName') || 'User';
        typeWriterEffect(welcomeElement, `Welcome back, ${userName}! 👋`);
    }
}

async function loadWeeklyChart() {
    try {
        const response = await fetch(`${API_URL}/analytics/weekly/${currentUserId}`);
        const data = await response.json();
        if (data.success) {
            const weeklyData = data.data;
            const ctx = document.getElementById('weeklyChart');
            if (ctx) {
                if (weeklyChart) weeklyChart.destroy();
                weeklyChart = new Chart(ctx.getContext('2d'), {
                    type: 'line',
                    data: {
                        labels: weeklyData.map(item => item.day),
                        datasets: [{
                            label: 'Power Consumption (kWh)',
                            data: weeklyData.map(item => parseFloat(item.consumption)),
                            borderColor: '#667eea',
                            backgroundColor: 'rgba(102, 126, 234, 0.1)',
                            tension: 0.4,
                            fill: true,
                            pointBackgroundColor: '#667eea',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2,
                            pointRadius: 5,
                            pointHoverRadius: 8,
                            animation: { duration: 1500, easing: 'easeInOutQuart' }
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: true, animation: { duration: 1500 } }
                });
            }
        }
    } catch (error) {
        console.error('Error loading weekly chart:', error);
    }
}

async function loadCategoryChart() {
    try {
        const response = await fetch(`${API_URL}/analytics/by-category/${currentUserId}`);
        const data = await response.json();
        if (data.success) {
            const categoryData = data.data;
            const ctx = document.getElementById('categoryChart');
            if (ctx) {
                if (categoryChart) categoryChart.destroy();
                const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#66BB6A'];
                categoryChart = new Chart(ctx.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: categoryData.map(item => item.category),
                        datasets: [{
                            data: categoryData.map(item => parseFloat(item.consumption)),
                            backgroundColor: colors.slice(0, categoryData.length),
                            borderWidth: 0,
                            animation: { duration: 1200, easing: 'easeOutBounce' }
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } }, animation: { duration: 1200 } }
                });
            }
        }
    } catch (error) {
        console.error('Error loading category chart:', error);
    }
}

async function loadAlerts() {
    try {
        const response = await fetch(`${API_URL}/analytics/alerts/${currentUserId}`);
        const data = await response.json();
        const alertsDiv = document.getElementById('alertsList');
        if (alertsDiv) {
            if (data.success && data.data.length > 0) {
                alertsDiv.innerHTML = '';
                for (let i = 0; i < data.data.length; i++) {
                    const alert = data.data[i];
                    alertsDiv.innerHTML += `<div class="alert-item ${alert.type}"><span>${alert.type === 'success' ? '✅' : '⚠️'}</span><span>${alert.message}</span></div>`;
                }
            } else {
                alertsDiv.innerHTML = '<div class="alert-item success"><span>✅</span><span>All systems normal</span></div>';
            }
        }
    } catch (error) {
        console.error('Error loading alerts:', error);
    }
}

async function loadTopDevices() {
    try {
        const response = await fetch(`${API_URL}/analytics/top-devices/${currentUserId}`);
        const data = await response.json();
        const devicesDiv = document.getElementById('topDevicesList');
        if (devicesDiv) {
            if (data.success && data.data.length > 0) {
                devicesDiv.innerHTML = '';
                for (let i = 0; i < data.data.length; i++) {
                    const device = data.data[i];
                    devicesDiv.innerHTML += `
                        <div class="device-card" data-aos="fade-up" data-aos-delay="${i * 50}">
                            <div class="device-name">${device.name}</div>
                            <div class="device-consumption">${device.consumption} kWh</div>
                            <div class="device-details">${device.percentage}% of total usage</div>
                        </div>
                    `;
                }
            } else {
                devicesDiv.innerHTML = '<div class="placeholder">No devices added yet</div>';
            }
        }
    } catch (error) {
        console.error('Error loading top devices:', error);
    }
}

// ============================================
// DEVICES FUNCTIONS
// ============================================

async function loadDevices() {
    const devicesDiv = document.getElementById('devicesList');
    if (!devicesDiv) return;
    devicesDiv.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-pulse"></i> Loading devices...</div>';
    
    try {
        const response = await fetch(`${API_URL}/devices/user/${currentUserId}`);
        const data = await response.json();
        if (data.success && data.data.length > 0) {
            devicesDiv.innerHTML = '';
            for (let i = 0; i < data.data.length; i++) {
                const device = data.data[i];
                const dailyKwh = device.dailyKwh || (device.wattage * device.quantity * device.avgDailyHours) / 1000;
                devicesDiv.innerHTML += `
                    <div class="device-card" data-aos="fade-up" data-aos-delay="${i * 50}">
                        <div class="device-name">${getDeviceIcon(device.category)} ${device.name} <span class="badge badge-info">${device.category}</span></div>
                        <div class="device-details">Category: ${device.category} | ${device.wattage}W × ${device.quantity}</div>
                        <div class="device-details">Usage: ${device.avgDailyHours} hrs/day</div>
                        <div class="device-consumption">${dailyKwh.toFixed(2)} kWh/day</div>
                        <button class="btn-danger" onclick="deleteDevice('${device._id}')"><i class="fas fa-trash"></i> Remove Device</button>
                    </div>
                `;
            }
        } else {
            devicesDiv.innerHTML = '<div class="placeholder"><i class="fas fa-microchip"></i> 📭 No devices added yet. Click "Add New Device" to get started!</div>';
        }
    } catch (error) {
        console.error('Error loading devices:', error);
        devicesDiv.innerHTML = '<div class="placeholder"><i class="fas fa-exclamation-triangle"></i> Error loading devices. Make sure backend is running.</div>';
    }
}

function openDeviceModal() {
    const modal = document.getElementById('deviceModal');
    if (modal) modal.style.display = 'block';
}

function closeDeviceModal() {
    const modal = document.getElementById('deviceModal');
    if (modal) modal.style.display = 'none';
    const form = document.getElementById('deviceForm');
    if (form) form.reset();
}

async function deleteDevice(deviceId) {
    if (confirm('Are you sure you want to remove this device?')) {
        try {
            const response = await fetch(`${API_URL}/devices/${deviceId}`, { method: 'DELETE' });
            const data = await response.json();
            if (data.success) {
                showToast('🗑️ Device removed successfully!');
                loadDevices();
                loadDashboardData();
            } else {
                showToast('Error deleting device: ' + data.error, true);
            }
        } catch (error) {
            console.error('Error deleting device:', error);
            showToast('Error deleting device.', true);
        }
    }
}

// ADD DEVICE FUNCTION - FIXED
async function addDevice() {
    console.log("Add Device button clicked!");
    
    const name = document.getElementById('deviceName')?.value;
    const category = document.getElementById('deviceCategory')?.value;
    const wattage = parseInt(document.getElementById('deviceWattage')?.value);
    const hours = parseFloat(document.getElementById('deviceHours')?.value);
    const quantity = parseInt(document.getElementById('deviceQuantity')?.value);
    
    console.log("Device data:", { name, category, wattage, hours, quantity });
    
    if (!name || !wattage) {
        alert('Please fill device name and wattage');
        return;
    }
    
    if (hours > 24) {
        alert('Hours cannot exceed 24 per day!');
        return;
    }
    
    const deviceData = {
        user: currentUserId,
        name: name,
        category: category,
        wattage: wattage,
        avgDailyHours: hours,
        quantity: quantity || 1
    };
    
    try {
        console.log("Sending request to:", `${API_URL}/devices`);
        const response = await fetch(`${API_URL}/devices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(deviceData)
        });
        
        console.log("Response status:", response.status);
        const data = await response.json();
        console.log("Response data:", data);
        
        if (data.success) {
            showToast('✅ Device added successfully!');
            if (document.getElementById('deviceName')) document.getElementById('deviceName').value = '';
            if (document.getElementById('deviceWattage')) document.getElementById('deviceWattage').value = '';
            loadDevices();
            loadDashboardData();
            if (typeof loadAllData === 'function') loadAllData();
        } else {
            showToast('Error: ' + (data.error || data.message || 'Unknown error'), true);
        }
    } catch (error) {
        console.error('Error adding device:', error);
        showToast('Error adding device. Make sure backend is running on port 5000', true);
    }
}

// Make addDevice globally available
window.addDevice = addDevice;

// ============================================
// ANALYTICS FUNCTIONS
// ============================================

async function loadAnalytics() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const defaultMonth = year + '-' + month;
    const monthInput = document.getElementById('analyticsMonth');
    if (monthInput) monthInput.value = defaultMonth;
    await loadMonthlyAnalytics();
}

async function loadMonthlyAnalytics() {
    try {
        const summaryResponse = await fetch(`${API_URL}/analytics/summary/${currentUserId}`);
        const summaryData = await summaryResponse.json();
        const weeklyResponse = await fetch(`${API_URL}/analytics/weekly/${currentUserId}`);
        const weeklyData = await weeklyResponse.json();
        if (weeklyData.success) {
            const ctx1 = document.getElementById('dailyBreakdownChart');
            if (ctx1) {
                if (dailyBreakdownChart) dailyBreakdownChart.destroy();
                dailyBreakdownChart = new Chart(ctx1.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: weeklyData.data.map(item => item.day),
                        datasets: [{
                            label: 'Daily Consumption (kWh)',
                            data: weeklyData.data.map(item => parseFloat(item.consumption)),
                            backgroundColor: '#667eea',
                            borderRadius: 5
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: true }
                });
            }
        }
        const hourlyLabels = ['12AM', '2AM', '4AM', '6AM', '8AM', '10AM', '12PM', '2PM', '4PM', '6PM', '8PM', '10PM'];
        const hourlyValues = [2, 1.5, 1, 1.5, 3, 4.5, 5, 5.5, 4, 6, 5, 3];
        const ctx2 = document.getElementById('hourlyPatternChart');
        if (ctx2) {
            if (hourlyPatternChart) hourlyPatternChart.destroy();
            hourlyPatternChart = new Chart(ctx2.getContext('2d'), {
                type: 'line',
                data: {
                    labels: hourlyLabels,
                    datasets: [{
                        label: 'Average Hourly Usage (kWh)',
                        data: hourlyValues,
                        borderColor: '#FF6384',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: { responsive: true, maintainAspectRatio: true }
            });
        }
        if (summaryData.success) {
            const totalKwh = parseFloat(summaryData.data.todayUsage) * 30;
            const rate = 0.12;
            const totalCost = totalKwh * rate;
            const costBreakdown = document.getElementById('costBreakdown');
            if (costBreakdown) {
                costBreakdown.innerHTML = `
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center;">
                        <div><h4>Total Consumption</h4><p style="font-size: 28px; color: #667eea;">${totalKwh.toFixed(1)} kWh</p></div>
                        <div><h4>Electricity Rate</h4><p style="font-size: 28px; color: #667eea;">$${rate}/kWh</p></div>
                        <div><h4>Estimated Cost</h4><p style="font-size: 28px; color: #667eea;">$${totalCost.toFixed(2)}</p></div>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Error loading monthly analytics:', error);
    }
}

// ============================================
// SETTINGS FUNCTIONS
// ============================================

function loadSettings() {
    const savedRate = localStorage.getItem('electricityRate');
    const savedLimit = localStorage.getItem('dailyLimit');
    const savedName = localStorage.getItem('userName');
    const savedEmail = localStorage.getItem('userEmail');
    const rateInput = document.getElementById('electricityRate');
    const limitInput = document.getElementById('dailyLimit');
    const nameInput = document.getElementById('userName');
    const emailInput = document.getElementById('userEmail');
    if (rateInput && savedRate) rateInput.value = savedRate;
    if (limitInput && savedLimit) limitInput.value = savedLimit;
    if (nameInput && savedName) nameInput.value = savedName;
    if (emailInput && savedEmail) emailInput.value = savedEmail;
}

async function updateRate() {
    const rate = parseFloat(document.getElementById('electricityRate').value);
    localStorage.setItem('electricityRate', rate);
    showToast(`Electricity rate updated to $${rate}/kWh`);
    loadDashboardData();
}

async function updateThreshold() {
    const limit = parseFloat(document.getElementById('dailyLimit').value);
    localStorage.setItem('dailyLimit', limit);
    showToast(`Daily alert threshold set to ${limit} kWh`);
}

async function updateProfile() {
    const name = document.getElementById('userName').value;
    const email = document.getElementById('userEmail').value;
    localStorage.setItem('userName', name);
    localStorage.setItem('userEmail', email);
    showToast('Profile updated successfully!');
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

async function exportCSV() {
    window.open(`${API_URL}/export/csv/${currentUserId}`, '_blank');
    showToast('📥 CSV Download started!');
}

async function exportPDF() {
    window.open(`${API_URL}/export/pdf/${currentUserId}`, '_blank');
    showToast('📄 PDF Download started!');
}

async function shareReport() {
    try {
        const res = await fetch(`${API_URL}/analytics/summary/${currentUserId}`);
        const data = await res.json();
        if (navigator.share) {
            navigator.share({ title: 'My Energy Report', text: `I used ${data.data.todayUsage} kWh today! ⚡`, url: window.location.href });
        } else {
            showToast('📤 Copy link to share', false);
            navigator.clipboard.writeText(window.location.href);
        }
    } catch (error) {
        showToast('Error sharing report', true);
    }
}

async function showQR() {
    try {
        const res = await fetch(`${API_URL}/export/qr/${currentUserId}`);
        const data = await res.json();
        if (data.success) {
            const qrImage = document.getElementById('qrImage');
            const qrModal = document.getElementById('qrModal');
            if (qrImage) qrImage.src = data.qrCode;
            if (qrModal) qrModal.style.display = 'flex';
        }
    } catch (e) {
        showToast('Error generating QR', true);
    }
}

function closeQR() {
    const qrModal = document.getElementById('qrModal');
    if (qrModal) qrModal.style.display = 'none';
}

// ============================================
// BUDGET FUNCTIONS
// ============================================

async function setBudget() {
    let budget = document.getElementById('budgetAmount')?.value;
    if (!budget) {
        showToast('Please enter a budget amount', true);
        return;
    }
    localStorage.setItem('monthlyBudget', budget);
    let currentCost = parseFloat(document.getElementById('estimatedCost')?.innerText?.replace('$', '') || '0') * 30;
    let percentage = (currentCost / budget) * 100;
    const budgetStatus = document.getElementById('budgetStatus');
    if (budgetStatus) {
        budgetStatus.innerHTML = `<div class="tip-card"><i class="fas fa-chart-line"></i> Budget: ${budget} ETB | Spent: ${currentCost.toFixed(2)} ETB | ${percentage.toFixed(0)}% used</div><progress value="${percentage}" max="100" style="width:100%; height:8px; border-radius:4px; margin-top:10px;"></progress>`;
    }
    if (percentage > 80) showToast('⚠️ You have used 80% of your budget!', true);
    showToast(`Budget set to ${budget} ETB`);
}

async function loadBudgetStatus() {
    let budget = localStorage.getItem('monthlyBudget');
    if (budget) {
        let currentCost = parseFloat(document.getElementById('estimatedCost')?.innerText?.replace('$', '') || '0') * 30;
        let percentage = (currentCost / budget) * 100;
        const budgetStatus = document.getElementById('budgetStatus');
        if (budgetStatus) {
            budgetStatus.innerHTML = `<div class="tip-card"><i class="fas fa-chart-line"></i> Budget: ${budget} ETB | Spent: ${currentCost.toFixed(2)} ETB | ${percentage.toFixed(0)}% used</div><progress value="${percentage}" max="100" style="width:100%; height:8px; border-radius:4px; margin-top:10px;"></progress>`;
        }
        if (percentage > 80) showToast('⚠️ You have used 80% of your budget!', true);
    }
}

// ============================================
// UI FUNCTIONS
// ============================================

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    showToast(document.body.classList.contains('dark-mode') ? '🌙 Dark mode enabled' : '☀️ Light mode enabled');
}

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

function animateChart() {
    if (weeklyChart) {
        weeklyChart.update();
        showToast('📊 Chart animated!');
    }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Ultimate Power Consumption Monitor Started');
    console.log('📡 Backend API URL:', API_URL);
    console.log('👤 Current User ID:', currentUserId);
    
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }
    
    // Scroll reveal observer
    const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('aos-animate');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    document.querySelectorAll('[data-aos]').forEach(el => observer.observe(el));
    
    // Load dashboard data if on dashboard page
    if (document.getElementById('dashboardView')) {
        showDashboard();
    } else if (document.getElementById('devicesView')) {
        showDevices();
    } else if (document.getElementById('analyticsView')) {
        showAnalytics();
    } else if (document.getElementById('settingsView')) {
        showSettings();
    }
});

window.onclick = function(event) {
    const modal = document.getElementById('deviceModal');
    if (event.target === modal) {
        closeDeviceModal();
    }
    const qrModal = document.getElementById('qrModal');
    if (event.target === qrModal) {
        closeQR();
    }
};

// Make functions global
window.showDashboard = showDashboard;
window.showDevices = showDevices;
window.showAnalytics = showAnalytics;
window.showSettings = showSettings;
window.openDeviceModal = openDeviceModal;
window.closeDeviceModal = closeDeviceModal;
window.deleteDevice = deleteDevice;
window.updateRate = updateRate;
window.updateThreshold = updateThreshold;
window.updateProfile = updateProfile;
window.toggleDarkMode = toggleDarkMode;
window.logout = logout;
window.exportCSV = exportCSV;
window.exportPDF = exportPDF;
window.shareReport = shareReport;
window.showQR = showQR;
window.closeQR = closeQR;
window.setBudget = setBudget;
window.animateChart = animateChart;
window.addDevice = addDevice;