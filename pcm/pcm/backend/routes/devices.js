const express = require('express');
const router = express.Router();
const Device = require('../models/Device');

// Get all devices for a user
router.get('/user/:userId', async (req, res) => {
    try {
        const devices = await Device.find({ user: req.params.userId, isActive: true });
        const devicesWithKwh = devices.map(d => d.toJSON());
        res.json({ success: true, count: devicesWithKwh.length, data: devicesWithKwh });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add new device
router.post('/', async (req, res) => {
    try {
        const device = new Device(req.body);
        await device.save();
        console.log(`✅ Device added: ${device.name}`);
        res.status(201).json({ success: true, data: device.toJSON() });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Delete device
router.delete('/:id', async (req, res) => {
    try {
        await Device.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ success: true, message: 'Device removed' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;