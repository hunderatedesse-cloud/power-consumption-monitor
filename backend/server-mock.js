const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

console.log('Starting Power Consumption Monitor Server...');

// Mock data store
let devices = [
    { _id: '1', user: 'mock123', name: 'Living Room AC', category: 'AC', wattage: 1200, quantity: 1, avgDailyHours: 8, dailyKwh: 9.6 },
    { _id: '2', user: 'mock123', name: 'Refrigerator', category: 'Refrigerator', wattage: 150, quantity: 1, avgDailyHours: 24, dailyKwh: 3.6 },
    { _id: '3', user: 'mock123', name: 'LED Lights', category: 'Lighting', wattage: 60, quantity: 8, avgDailyHours: 6, dailyKwh: 2.88 },
    { _id: '4', user: 'mock123', name: 'Washing Machine', category: 'Kitchen', wattage: 500, quantity: 1, avgDailyHours: 1.5, dailyKwh: 0.75 }
];

// Helper function to get devices by user
function getDevicesByUser(userId) {
    return devices.filter(d => d.user === userId);
}

// Helper to calculate total daily Kwh
function getTotalDailyKwh(userId) {
    const userDevices = getDevicesByUser(userId);
    return userDevices.reduce((sum, d) => sum + d.dailyKwh, 0);
}

// ========== API ENDPOINTS ==========

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'Power Consumption API', 
        status: 'running',
        version: '1.0.0',
        mode: 'Mock Server (No Database)'
    });
});

// Get all devices for a user
app.get('/api/devices/user/:userId', (req, res) => {
    const userDevices = getDevicesByUser(req.params.userId);
    res.json({ 
        success: true, 
        count: userDevices.length, 
        data: userDevices 
    });
});

// Get single device
app.get('/api/devices/:id', (req, res) => {
    const device = devices.find(d => d._id === req.params.id);
    if (!device) {
        return res.status(404).json({ success: false, error: 'Device not found' });
    }
    res.json({ success: true, data: device });
});

// Add new device
app.post('/api/devices', (req, res) => {
    const newId = String(devices.length + 1);
    const dailyKwhValue = (req.body.wattage * (req.body.quantity || 1) * (req.body.avgDailyHours || 2)) / 1000;
    
    const newDevice = {
        _id: newId,
        user: req.body.user,
        name: req.body.name,
        category: req.body.category,
        wattage: req.body.wattage,
        quantity: req.body.quantity || 1,
        avgDailyHours: req.body.avgDailyHours || 2,
        dailyKwh: dailyKwhValue
    };
    
    devices.push(newDevice);
    console.log(`✅ Device added: ${newDevice.name} (ID: ${newId})`);
    res.status(201).json({ success: true, data: newDevice });
});

// Update device
app.put('/api/devices/:id', (req, res) => {
    const index = devices.findIndex(d => d._id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ success: false, error: 'Device not found' });
    }
    
    devices[index] = { ...devices[index], ...req.body };
    res.json({ success: true, data: devices[index] });
});

// Delete device
app.delete('/api/devices/:id', (req, res) => {
    const deviceExists = devices.some(d => d._id === req.params.id);
    if (!deviceExists) {
        return res.status(404).json({ success: false, error: 'Device not found' });
    }
    
    devices = devices.filter(d => d._id !== req.params.id);
    console.log(`🗑️ Device deleted: ID ${req.params.id}`);
    res.json({ success: true, message: 'Device removed successfully' });
});

// Get today's usage summary
app.get('/api/analytics/summary/:userId', (req, res) => {
    const totalKwh = getTotalDailyKwh(req.params.userId);
    const estimatedCost = totalKwh * 0.12;
    const carbonFootprint = totalKwh * 0.233;
    const peakUsage = totalKwh / 8;
    
    res.json({
        success: true,
        data: {
            todayUsage: totalKwh.toFixed(1),
            estimatedCost: `$${estimatedCost.toFixed(2)}`,
            carbonFootprint: carbonFootprint.toFixed(1),
            peakUsage: peakUsage.toFixed(1)
        }
    });
});

// Get weekly consumption
app.get('/api/analytics/weekly/:userId', (req, res) => {
    const dailyKwh = getTotalDailyKwh(req.params.userId);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weeklyData = days.map(day => ({
        day: day,
        consumption: (dailyKwh * (0.8 + Math.random() * 0.6)).toFixed(1)
    }));
    res.json({ success: true, data: weeklyData });
});

// Get monthly consumption
app.get('/api/analytics/monthly/:userId', (req, res) => {
    const dailyKwh = getTotalDailyKwh(req.params.userId);
    const monthlyKwh = dailyKwh * 30;
    res.json({
        success: true,
        data: {
            total: monthlyKwh.toFixed(1),
            average: dailyKwh.toFixed(1)
        }
    });
});

// Get category breakdown
app.get('/api/analytics/by-category/:userId', (req, res) => {
    const userDevices = getDevicesByUser(req.params.userId);
    const categoryMap = {};
    
    userDevices.forEach(device => {
        categoryMap[device.category] = (categoryMap[device.category] || 0) + device.dailyKwh;
    });
    
    const categoryData = Object.entries(categoryMap).map(([category, consumption]) => ({
        category: category,
        consumption: consumption.toFixed(1)
    }));
    
    res.json({ success: true, data: categoryData });
});

// Get top consuming devices
app.get('/api/analytics/top-devices/:userId', (req, res) => {
    const userDevices = getDevicesByUser(req.params.userId);
    const totalKwh = getTotalDailyKwh(req.params.userId);
    
    const topDevices = userDevices
        .map(device => ({
            name: device.name,
            consumption: device.dailyKwh.toFixed(1),
            percentage: totalKwh > 0 ? ((device.dailyKwh / totalKwh) * 100).toFixed(1) : 0
        }))
        .sort((a, b) => parseFloat(b.consumption) - parseFloat(a.consumption));
    
    res.json({ success: true, data: topDevices });
});

// Get alerts
app.get('/api/analytics/alerts/:userId', (req, res) => {
    const totalKwh = getTotalDailyKwh(req.params.userId);
    const alerts = [];
    
    if (totalKwh > 30) {
        alerts.push({ 
            type: 'warning', 
            message: `⚠️ High consumption! Today's usage: ${totalKwh.toFixed(1)} kWh exceeds 30 kWh limit` 
        });
    }
    
    // Check for high consumption devices
    const userDevices = getDevicesByUser(req.params.userId);
    const highDevices = userDevices.filter(d => d.dailyKwh > 5);
    if (highDevices.length > 0) {
        alerts.push({
            type: 'info',
            message: `💡 ${highDevices.length} device(s) consuming over 5 kWh/day: ${highDevices.map(d => d.name).join(', ')}`
        });
    }
    
    if (alerts.length === 0) {
        alerts.push({ 
            type: 'success', 
            message: `✅ Excellent! Your usage (${totalKwh.toFixed(1)} kWh) is within the recommended limit` 
        });
    }
    
    res.json({ success: true, data: alerts });
});

// Update settings
app.put('/api/analytics/settings/:userId', (req, res) => {
    console.log('Settings updated:', req.body);
    res.json({ 
        success: true, 
        message: 'Settings updated successfully',
        data: req.body
    });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('🚀 POWER CONSUMPTION MONITOR - BACKEND RUNNING');
    console.log('═══════════════════════════════════════════════════');
    console.log(`📡 Server: http://localhost:${PORT}`);
    console.log(`📝 Mode: Mock Server (No Database Required)`);
    console.log(`✅ Status: Ready for connections`);
    console.log('');
    console.log('📊 Available Endpoints:');
    console.log(`   GET    /api/devices/user/:userId`);
    console.log(`   POST   /api/devices`);
    console.log(`   DELETE /api/devices/:id`);
    console.log(`   GET    /api/analytics/summary/:userId`);
    console.log(`   GET    /api/analytics/weekly/:userId`);
    console.log(`   GET    /api/analytics/by-category/:userId`);
    console.log(`   GET    /api/analytics/alerts/:userId`);
    console.log('');
    console.log('🎯 Test the API:');
    console.log(`   curl http://localhost:${PORT}/api/devices/user/mock123`);
    console.log('');
    console.log('Press Ctrl+C to stop the server');
    console.log('═══════════════════════════════════════════════════');
});