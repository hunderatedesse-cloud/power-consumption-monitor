const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Device = require('../models/Device');
const Admin = require('../models/Admin');

// Admin login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        const token = jwt.sign(
            { adminId: admin._id, email: admin.email, role: admin.role },
            process.env.JWT_SECRET || 'my_secret_key',
            { expiresIn: '30d' }
        );
        res.json({ success: true, token, admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all users
router.get('/users', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader ? authHeader.split(' ')[1] : null;
        if (!token) return res.status(401).json({ success: false, message: 'No token' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'my_secret_key');
        const admin = await Admin.findById(decoded.adminId);
        if (!admin) return res.status(401).json({ success: false, message: 'Not authorized' });
        
        const users = await User.find().select('-password');
        const usersWithDevices = [];
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            const devices = await Device.find({ user: user._id.toString(), isActive: true });
            let totalKwh = 0;
            for (let j = 0; j < devices.length; j++) {
                totalKwh = totalKwh + parseFloat(devices[j].dailyKwh);
            }
            usersWithDevices.push({
                _id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
                deviceCount: devices.length,
                totalConsumption: totalKwh.toFixed(1)
            });
        }
        res.json({ success: true, users: usersWithDevices });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete user
router.delete('/users/:userId', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader ? authHeader.split(' ')[1] : null;
        if (!token) return res.status(401).json({ success: false, message: 'No token' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'my_secret_key');
        const admin = await Admin.findById(decoded.adminId);
        if (!admin) return res.status(401).json({ success: false, message: 'Not authorized' });
        
        await Device.deleteMany({ user: req.params.userId });
        await User.findByIdAndDelete(req.params.userId);
        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Platform analytics
router.get('/analytics', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader ? authHeader.split(' ')[1] : null;
        if (!token) return res.status(401).json({ success: false, message: 'No token' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'my_secret_key');
        const admin = await Admin.findById(decoded.adminId);
        if (!admin) return res.status(401).json({ success: false, message: 'Not authorized' });
        
        const totalUsers = await User.countDocuments();
        const totalDevices = await Device.countDocuments({ isActive: true });
        const devices = await Device.find({ isActive: true });
        let totalConsumption = 0;
        for (let i = 0; i < devices.length; i++) {
            totalConsumption = totalConsumption + parseFloat(devices[i].dailyKwh);
        }
        const categoryStats = {};
        for (let i = 0; i < devices.length; i++) {
            const cat = devices[i].category;
            if (!categoryStats[cat]) categoryStats[cat] = 0;
            categoryStats[cat]++;
        }
        const categoryArray = [];
        for (let cat in categoryStats) {
            categoryArray.push({ category: cat, count: categoryStats[cat] });
        }
        res.json({ success: true, data: { totalUsers, totalDevices, totalConsumption: totalConsumption.toFixed(1), categoryStats: categoryArray } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create default admin
router.post('/setup', async (req, res) => {
    try {
        const existingAdmin = await Admin.findOne({ email: 'admin@powermonitor.com' });
        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const admin = new Admin({
                name: 'Super Admin',
                email: 'admin@powermonitor.com',
                password: hashedPassword,
                role: 'superadmin'
            });
            await admin.save();
            res.json({ success: true, message: 'Admin created! Email: admin@powermonitor.com, Password: admin123' });
        } else {
            res.json({ success: false, message: 'Admin already exists' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
// Backup database
router.get('/backup', verifyAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        const devices = await Device.find();
        const readings = await Reading.find();
        
        const backup = {
            timestamp: new Date(),
            version: '1.0',
            data: { users, devices, readings }
        };
        
        res.json({ success: true, backup });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Restore from backup
router.post('/restore', verifyAdmin, async (req, res) => {
    try {
        const { users, devices, readings } = req.body.data;
        
        await User.deleteMany({});
        await Device.deleteMany({});
        await Reading.deleteMany({});
        
        await User.insertMany(users);
        await Device.insertMany(devices);
        await Reading.insertMany(readings);
        
        res.json({ success: true, message: 'Database restored successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});