const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const User = require('../models/User');

// Get today's usage summary
router.get('/summary/:userId', async(req, res) => {
    try {
        const devices = await Device.find({ user: req.params.userId, isActive: true });
        const totalDailyKwh = devices.reduce((sum, d) => sum + d.dailyKwh, 0);
        const user = await User.findById(req.params.userId);
        const rate = user ? user.electricityRate : 0.12;

        res.json({
            success: true,
            data: {
                todayUsage: totalDailyKwh.toFixed(1),
                estimatedCost: `$${(totalDailyKwh * rate).toFixed(2)}`,
                carbonFootprint: (totalDailyKwh * 0.233).toFixed(1),
                peakUsage: (totalDailyKwh / 8).toFixed(1)
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get weekly consumption
router.get('/weekly/:userId', async(req, res) => {
    try {
        const devices = await Device.find({ user: req.params.userId, isActive: true });
        const dailyKwh = devices.reduce((sum, d) => sum + d.dailyKwh, 0);
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const weeklyData = days.map(day => ({
            day: day,
            consumption: (dailyKwh * (0.8 + Math.random() * 0.6)).toFixed(1)
        }));
        res.json({ success: true, data: weeklyData });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get category breakdown
router.get('/by-category/:userId', async(req, res) => {
    try {
        const devices = await Device.find({ user: req.params.userId, isActive: true });
        const categoryMap = new Map();
        devices.forEach(device => {
            const current = categoryMap.get(device.category) || 0;
            categoryMap.set(device.category, current + device.dailyKwh);
        });
        const categoryData = Array.from(categoryMap.entries()).map(function(item) {
            return {
                category: item[0],
                consumption: item[1].toFixed(1)
            };
        });
        res.json({ success: true, data: categoryData });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get top devices
router.get('/top-devices/:userId', async(req, res) => {
    try {
        const devices = await Device.find({ user: req.params.userId, isActive: true });
        const totalKwh = devices.reduce(function(sum, d) {
            return sum + d.dailyKwh;
        }, 0);

        const topDevices = devices.map(function(device) {
            return {
                name: device.name,
                consumption: device.dailyKwh.toFixed(1),
                percentage: totalKwh > 0 ? ((device.dailyKwh / totalKwh) * 100).toFixed(1) : 0
            };
        });
        res.json({ success: true, data: topDevices });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get alerts
router.get('/alerts/:userId', async(req, res) => {
    try {
        const devices = await Device.find({ user: req.params.userId, isActive: true });
        const user = await User.findById(req.params.userId);
        const totalKwh = devices.reduce(function(sum, d) {
            return sum + d.dailyKwh;
        }, 0);
        const threshold = user ? user.dailyThreshold : 30;

        const alerts = [];
        if (totalKwh > threshold) {
            alerts.push({
                type: 'warning',
                message: 'High consumption: ' + totalKwh.toFixed(1) + ' kWh exceeds ' + threshold + ' kWh limit'
            });
        } else {
            alerts.push({
                type: 'success',
                message: 'All systems normal! Good energy saving.'
            });
        }
        res.json({ success: true, data: alerts });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Update settings
router.put('/settings/:userId', async(req, res) => {
    try {
        const electricityRate = req.body.electricityRate;
        const dailyThreshold = req.body.dailyThreshold;
        const name = req.body.name;
        const email = req.body.email;

        const updateData = {};
        if (electricityRate !== undefined) updateData.electricityRate = electricityRate;
        if (dailyThreshold !== undefined) updateData.dailyThreshold = dailyThreshold;
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;

        const user = await User.findByIdAndUpdate(req.params.userId, updateData, { new: true });
        res.json({ success: true, data: user });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;