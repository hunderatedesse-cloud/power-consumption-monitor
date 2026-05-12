// ============================================
// POWER CONSUMPTION MONITOR - FRONTEND
// Group 6 Database Systems Project
// ============================================

// API Configuration
const API_URL = 'http://localhost:5000/api';

// User ID - Use 'mock123' for mock backend
let currentUserId = 'mock123';

// Global chart instances
let weeklyChart = null;
let categoryChart = null;
let dailyBreakdownChart = null;
let hourlyPatternChart = null;

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
    // Hide all views
    const views = document.querySelectorAll('.view');
    for (let i = 0; i < views.length; i++) {
        views[i].classList.remove('active');
    }
    // Show selected view
    document.getElementById(viewId).classList.add('active');

    // Update active nav button
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
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

async function loadTodayUsage() {
    try {
        const response = await fetch(`${API_URL}/analytics/summary/${currentUserId}`);
        const data = await response.json();

        if (data.success) {
            document.getElementById('todayUsage').innerText = data.data.todayUsage;
            document.getElementById('estimatedCost').innerText = data.data.estimatedCost;
            document.getElementById('carbonFootprint').innerText = data.data.carbonFootprint;
            document.getElementById('peakUsage').innerText = data.data.peakUsage;
        }
    } catch (error) {
        console.error('Error loading usage:', error);
        document.getElementById('todayUsage').innerText = '0.0';
        document.getElementById('estimatedCost').innerText = '$0.00';
        document.getElementById('carbonFootprint').innerText = '0.0';
        document.getElementById('peakUsage').innerText = '0.0';
    }
}

async function loadWeeklyChart() {
    try {
        const response = await fetch(`${API_URL}/analytics/weekly/${currentUserId}`);
        const data = await response.json();

        if (data.success) {
            const weeklyData = data.data;
            const ctx = document.getElementById('weeklyChart').getContext('2d');

            if (weeklyChart) {
                weeklyChart.destroy();
            }

            weeklyChart = new Chart(ctx, {
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
                        pointRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { position: 'top' }
                    },
                    scales: {
                        y: { title: { display: true, text: 'kWh' } }
                    }
                }
            });
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
            const ctx = document.getElementById('categoryChart').getContext('2d');

            if (categoryChart) {
                categoryChart.destroy();
            }

            const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#66BB6A'];

            categoryChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: categoryData.map(item => item.category),
                    datasets: [{
                        data: categoryData.map(item => parseFloat(item.consumption)),
                        backgroundColor: colors.slice(0, categoryData.length),
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { position: 'right' }
                    }
                }
            });
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

        if (data.success && data.data.length > 0) {
            alertsDiv.innerHTML = '';
            for (let i = 0; i < data.data.length; i++) {
                const alert = data.data[i];
                alertsDiv.innerHTML += `
                    <div class="alert-item ${alert.type}">
                        <span>${alert.type === 'success' ? '✅' : '⚠️'}</span>
                        <span>${alert.message}</span>
                    </div>
                `;
            }
        } else {
            alertsDiv.innerHTML = '<div class="alert-item success"><span>✅</span><span>All systems normal</span></div>';
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

        if (data.success && data.data.length > 0) {
            devicesDiv.innerHTML = '';
            for (let i = 0; i < data.data.length; i++) {
                const device = data.data[i];
                devicesDiv.innerHTML += `
                    <div class="device-card">
                        <div class="device-name">${device.name}</div>
                        <div class="device-consumption">${device.consumption} kWh</div>
                        <div class="device-details">${device.percentage}% of total usage</div>
                    </div>
                `;
            }
        } else {
            devicesDiv.innerHTML = '<div class="placeholder">No devices added yet</div>';
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
    devicesDiv.innerHTML = '<div class="loading">Loading devices...</div>';

    try {
        const response = await fetch(`${API_URL}/devices/user/${currentUserId}`);
        const data = await response.json();

        if (data.success && data.data.length > 0) {
            devicesDiv.innerHTML = '';
            for (let i = 0; i < data.data.length; i++) {
                const device = data.data[i];
                const dailyKwh = device.dailyKwh || (device.wattage * device.quantity * device.avgDailyHours) / 1000;

                devicesDiv.innerHTML += `
                    <div class="device-card">
                        <div class="device-name">${device.name}</div>
                        <div class="device-details">
                            Category: ${device.category} | ${device.wattage}W × ${device.quantity}
                        </div>
                        <div class="device-details">
                            Usage: ${device.avgDailyHours} hrs/day
                        </div>
                        <div class="device-consumption">
                            ${dailyKwh.toFixed(2)} kWh/day
                        </div>
                        <button class="btn-danger" onclick="deleteDevice('${device._id}')">Remove Device</button>
                    </div>
                `;
            }
        } else {
            devicesDiv.innerHTML = '<div class="placeholder">No devices added yet. Click "Add New Device" to get started!</div>';
        }
    } catch (error) {
        console.error('Error loading devices:', error);
        devicesDiv.innerHTML = '<div class="placeholder">Error loading devices. Make sure backend is running.</div>';
    }
}

function openDeviceModal() {
    document.getElementById('deviceModal').style.display = 'block';
}

function closeDeviceModal() {
    document.getElementById('deviceModal').style.display = 'none';
    document.getElementById('deviceForm').reset();
}

async function deleteDevice(deviceId) {
    if (confirm('Are you sure you want to remove this device?')) {
        try {
            const response = await fetch(`${API_URL}/devices/${deviceId}`, {
                method: 'DELETE'
            });
            const data = await response.json();

            if (data.success) {
                alert('Device removed successfully!');
                loadDevices();
                loadDashboardData();
            } else {
                alert('Error deleting device: ' + data.error);
            }
        } catch (error) {
            console.error('Error deleting device:', error);
            alert('Error deleting device.');
        }
    }
}

// Handle device form submission
document.addEventListener('DOMContentLoaded', function() {
    const deviceForm = document.getElementById('deviceForm');
    if (deviceForm) {
        deviceForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const deviceData = {
                user: currentUserId,
                name: document.getElementById('deviceName').value,
                category: document.getElementById('deviceCategory').value,
                wattage: parseInt(document.getElementById('deviceWattage').value),
                avgDailyHours: parseFloat(document.getElementById('deviceHours').value),
                quantity: parseInt(document.getElementById('deviceQuantity').value)
            };

            try {
                const response = await fetch(`${API_URL}/devices`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(deviceData)
                });
                const data = await response.json();

                if (data.success) {
                    alert('Device added successfully!');
                    closeDeviceModal();
                    loadDevices();
                    loadDashboardData();
                } else {
                    alert('Error adding device: ' + data.error);
                }
            } catch (error) {
                console.error('Error adding device:', error);
                alert('Error adding device. Make sure backend is running.');
            }
        });
    }
});

// ============================================
// ANALYTICS FUNCTIONS
// ============================================

async function loadAnalytics() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const defaultMonth = year + '-' + month;
    const monthInput = document.getElementById('analyticsMonth');
    if (monthInput) {
        monthInput.value = defaultMonth;
    }
    await loadMonthlyAnalytics();
}

async function loadMonthlyAnalytics() {
    try {
        const summaryResponse = await fetch(`${API_URL}/analytics/summary/${currentUserId}`);
        const summaryData = await summaryResponse.json();

        const weeklyResponse = await fetch(`${API_URL}/analytics/weekly/${currentUserId}`);
        const weeklyData = await weeklyResponse.json();

        if (weeklyData.success) {
            const ctx1 = document.getElementById('dailyBreakdownChart').getContext('2d');
            if (dailyBreakdownChart) dailyBreakdownChart.destroy();

            dailyBreakdownChart = new Chart(ctx1, {
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

        const hourlyLabels = ['12AM', '2AM', '4AM', '6AM', '8AM', '10AM', '12PM', '2PM', '4PM', '6PM', '8PM', '10PM'];
        const hourlyValues = [2, 1.5, 1, 1.5, 3, 4.5, 5, 5.5, 4, 6, 5, 3];

        const ctx2 = document.getElementById('hourlyPatternChart').getContext('2d');
        if (hourlyPatternChart) hourlyPatternChart.destroy();

        hourlyPatternChart = new Chart(ctx2, {
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
    alert(`Electricity rate updated to $${rate}/kWh`);
    loadDashboardData();
}

async function updateThreshold() {
    const limit = parseFloat(document.getElementById('dailyLimit').value);
    localStorage.setItem('dailyLimit', limit);
    alert(`Daily alert threshold set to ${limit} kWh`);
}

async function updateProfile() {
    const name = document.getElementById('userName').value;
    const email = document.getElementById('userEmail').value;
    localStorage.setItem('userName', name);
    localStorage.setItem('userEmail', email);
    alert('Profile updated successfully!');
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Power Consumption Monitor Started');
    console.log('Backend API URL:', API_URL);
    console.log('Current User ID:', currentUserId);
    showDashboard();
});

window.onclick = function(event) {
    const modal = document.getElementById('deviceModal');
    if (event.target === modal) {
        closeDeviceModal();
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