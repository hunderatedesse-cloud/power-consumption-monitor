const express = require('express');
const router = express.Router();
const Device = require('../models/Device');

// Get all devices for a user
router.get('/user/:userId', async(req, res) => {
    try {
        const devices = await Device.find({
            user: req.params.userId,
            isActive: true
        }).sort({ addedAt: -1 });

        res.json({
            success: true,
            count: devices.length,
            data: devices
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get single device
router.get('/:id', async(req, res) => {
    try {
        const device = await Device.findById(req.params.id);
        if (!device) {
            return res.status(404).json({ success: false, error: 'Device not found' });
        }
        res.json({ success: true, data: device });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Add new device
router.post('/', async(req, res) => {
    try {
        const device = await Device.create(req.body);
        res.status(201).json({ success: true, data: device });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// Update device
router.put('/:id', async(req, res) => {
    try {
        const device = await Device.findByIdAndUpdate(
            req.params.id,
            req.body, { new: true, runValidators: true }
        );
        if (!device) {
            return res.status(404).json({ success: false, error: 'Device not found' });
        }
        res.json({ success: true, data: device });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// Delete device (soft delete)
router.delete('/:id', async(req, res) => {
    try {
        const device = await Device.findByIdAndUpdate(
            req.params.id, { isActive: false }, { new: true }
        );
        if (!device) {
            return res.status(404).json({ success: false, error: 'Device not found' });
        }
        res.json({ success: true, message: 'Device removed successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;