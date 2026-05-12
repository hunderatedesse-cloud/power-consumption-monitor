const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const User = require('../models/User');

// Get summary
router.get('/summary/:userId', async (req, res) => {
    try {
        const devices = await Device.find({ user: req.params.userId, isActive: true });
        let totalKwh = 0;
        for (let i = 0; i < devices.length; i++) {
            totalKwh = totalKwh + parseFloat(devices[i].dailyKwh);
        }
        const user = await User.findById(req.params.userId);
        const rate = user ? user.electricityRate : 0.12;
        res.json({
            success: true,
            data: {
                todayUsage: totalKwh.toFixed(1),
                estimatedCost: '$' + (totalKwh * rate).toFixed(2),
                carbonFootprint: (totalKwh * 0.233).toFixed(1),
                peakUsage: (totalKwh / 8).toFixed(1)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get weekly data
router.get('/weekly/:userId', async (req, res) => {
    try {
        const devices = await Device.find({ user: req.params.userId, isActive: true });
        let dailyKwh = 0;
        for (let i = 0; i < devices.length; i++) {
            dailyKwh = dailyKwh + parseFloat(devices[i].dailyKwh);
        }
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const weeklyData = [];
        for (let i = 0; i < days.length; i++) {
            weeklyData.push({
                day: days[i],
                consumption: (dailyKwh * (0.7 + (i * 0.05))).toFixed(1)
            });
        }
        res.json({ success: true, data: weeklyData });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get category breakdown
router.get('/by-category/:userId', async (req, res) => {
    try {
        const devices = await Device.find({ user: req.params.userId, isActive: true });
        const categoryMap = {};
        for (let i = 0; i < devices.length; i++) {
            const device = devices[i];
            const current = categoryMap[device.category] || 0;
            categoryMap[device.category] = current + parseFloat(device.dailyKwh);
        }
        const categoryData = [];
        for (let cat in categoryMap) {
            categoryData.push({ category: cat, consumption: categoryMap[cat].toFixed(1) });
        }
        res.json({ success: true, data: categoryData });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get top devices
router.get('/top-devices/:userId', async (req, res) => {
    try {
        const devices = await Device.find({ user: req.params.userId, isActive: true });
        let totalKwh = 0;
        for (let i = 0; i < devices.length; i++) {
            totalKwh = totalKwh + parseFloat(devices[i].dailyKwh);
        }
        const topDevices = [];
        for (let i = 0; i < devices.length; i++) {
            const device = devices[i];
            let percentage = 0;
            if (totalKwh > 0) {
                percentage = (parseFloat(device.dailyKwh) / totalKwh) * 100;
            }
            topDevices.push({
                name: device.name,
                consumption: device.dailyKwh,
                percentage: percentage.toFixed(1)
            });
        }
        topDevices.sort((a, b) => parseFloat(b.consumption) - parseFloat(a.consumption));
        res.json({ success: true, data: topDevices });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// AI Predictions
router.get('/predict/:userId', async (req, res) => {
    try {
        const devices = await Device.find({ user: req.params.userId, isActive: true });
        let dailyKwh = 0;
        for (let i = 0; i < devices.length; i++) {
            dailyKwh = dailyKwh + parseFloat(devices[i].dailyKwh);
        }
        const predicted = dailyKwh * 30;
        let suggestion = "";
        if (predicted > 500) suggestion = "High usage predicted. Consider energy-saving measures.";
        else if (predicted > 300) suggestion = "Average usage predicted. You're doing well!";
        else suggestion = "Excellent! You're very energy efficient!";
        res.json({ success: true, data: { predictedUsage: predicted.toFixed(1), confidence: "85%", suggestion } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Compare with others
router.get('/compare/:userId', async (req, res) => {
    try {
        const userDevices = await Device.find({ user: req.params.userId, isActive: true });
        let userTotal = 0;
        for (let i = 0; i < userDevices.length; i++) {
            userTotal = userTotal + parseFloat(userDevices[i].dailyKwh);
        }
        const allDevices = await Device.find({ isActive: true });
        const userGroups = {};
        for (let i = 0; i < allDevices.length; i++) {
            const d = allDevices[i];
            if (!userGroups[d.user]) userGroups[d.user] = 0;
            userGroups[d.user] = userGroups[d.user] + parseFloat(d.dailyKwh);
        }
        const allTotals = Object.values(userGroups);
        let avgOtherUsers = 0;
        for (let i = 0; i < allTotals.length; i++) {
            avgOtherUsers = avgOtherUsers + allTotals[i];
        }
        avgOtherUsers = avgOtherUsers / allTotals.length;
        const percentile = (userTotal / avgOtherUsers) * 100;
        let message = "";
        if (percentile < 80) message = "🎉 Excellent! You use less than average!";
        else if (percentile < 120) message = "📊 You're at average consumption.";
        else message = "⚠️ Your usage is above average.";
        res.json({ success: true, data: { yourUsage: userTotal.toFixed(1), averageUsage: avgOtherUsers.toFixed(1), percentile: percentile.toFixed(0), message } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get alerts
router.get('/alerts/:userId', async (req, res) => {
    try {
        const devices = await Device.find({ user: req.params.userId, isActive: true });
        let totalKwh = 0;
        for (let i = 0; i < devices.length; i++) {
            totalKwh = totalKwh + parseFloat(devices[i].dailyKwh);
        }
        const user = await User.findById(req.params.userId);
        const threshold = user ? user.dailyThreshold : 30;
        const alerts = [];
        if (totalKwh > threshold) {
            alerts.push({ type: 'warning', message: `⚠️ High consumption! ${totalKwh.toFixed(1)} kWh > ${threshold} kWh` });
        } else {
            alerts.push({ type: 'success', message: `✅ Great! ${totalKwh.toFixed(1)} kWh within limit` });
        }
        res.json({ success: true, data: alerts });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update settings
router.put('/settings/:userId', async (req, res) => {
    try {
        const { electricityRate, dailyThreshold } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { electricityRate, dailyThreshold },
            { new: true }
        );
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Export CSV
router.get('/export/csv/:userId', async (req, res) => {
    try {
        const devices = await Device.find({ user: req.params.userId, isActive: true });
        let csv = "Name,Category,Wattage,Quantity,Hours,Daily kWh\n";
        for (let i = 0; i < devices.length; i++) {
            const d = devices[i];
            const kwh = (d.wattage * d.quantity * d.avgDailyHours / 1000).toFixed(2);
            csv += `"${d.name}",${d.category},${d.wattage},${d.quantity},${d.avgDailyHours},${kwh}\n`;
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=energy_report.csv');
        res.send(csv);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
// Advanced aggregation: Monthly consumption trend
app.get('/api/analytics/monthly-trend/:userId', async (req, res) => {
    try {
        const trend = await Reading.aggregate([
            { $match: { user: req.params.userId } },
            {
                $group: {
                    _id: {
                        year: { $year: "$timestamp" },
                        month: { $month: "$timestamp" }
                    },
                    totalUsage: { $sum: "$powerUsage" },
                    avgUsage: { $avg: "$powerUsage" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);
        res.json({ success: true, data: trend });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Top 10 users by consumption
app.get('/api/analytics/top-users', async (req, res) => {
    try {
        const topUsers = await Device.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: "$user",
                    totalConsumption: { $sum: { $toDouble: "$dailyKwh" } },
                    deviceCount: { $sum: 1 }
                }
            },
            { $sort: { totalConsumption: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "userInfo"
                }
            }
        ]);
        res.json({ success: true, data: topUsers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});