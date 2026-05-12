const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Device = require('../models/Device');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

router.post('/send-alert', async (req, res) => {
    try {
        const { userId, consumption, threshold } = req.body;
        const user = await User.findById(userId);
        
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: '⚠️ High Energy Consumption Alert',
            html: `
                <div style="font-family: Arial; padding: 20px;">
                    <h2 style="color: #667eea;">⚠️ Energy Alert!</h2>
                    <p>Dear ${user.name},</p>
                    <p>Your energy consumption (${consumption} kWh) has exceeded your limit of ${threshold} kWh.</p>
                    <p>Please check your devices to reduce consumption.</p>
                    <hr>
                    <small>Power Monitor System</small>
                </div>
            `
        };
        
        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'Alert sent' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;