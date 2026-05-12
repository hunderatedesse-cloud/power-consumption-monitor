const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const socketIo = require('socket.io');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const crypto = require('crypto');
require('dotenv').config();

const app = express();

// ============================================
// SECURITY MIDDLEWARE
// ============================================

app.use(helmet());
app.use(mongoSanitize());
app.use(xss());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

app.use((req, res, next) => {
    req.setTimeout(30000);
    next();
});

// ============================================
// RATE LIMITING
// ============================================

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many requests. Please try again later.' }
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
    message: { success: false, message: 'Too many login attempts. Please try again later.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

console.log('🚀 Starting Ultimate Power Consumption Monitor...');

// ============================================
// EMAIL CONFIGURATION
// ============================================

let transporter = null;
let emailConfigured = false;

async function setupEmailTransporter() {
    try {
        const emailUser = process.env.EMAIL_USER;
        const emailPass = process.env.EMAIL_PASS;
        
        if (!emailUser || !emailPass || emailUser === '' || emailPass === '') {
            console.log('⚠️ Email credentials missing. Please add to .env file:');
            console.log('   EMAIL_USER=your_email@gmail.com');
            console.log('   EMAIL_PASS=your_app_password');
            return false;
        }
        
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: emailUser,
                pass: emailPass.replace(/\s/g, '')
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        
        await transporter.verify();
        emailConfigured = true;
        console.log('✅ Gmail configured! Auto-email ready.');
        console.log(`📧 Sending from: ${emailUser}`);
        return true;
        
    } catch (error) {
        console.error('❌ Email configuration error:', error.message);
        console.log('📧 Auto-email disabled. Passwords will show in console.');
        emailConfigured = false;
        transporter = null;
        return false;
    }
}

async function sendEmail(to, subject, html) {
    if (!emailConfigured || !transporter) {
        console.log(`📧 Email NOT sent to ${to} (email not configured)`);
        return false;
    }
    
    try {
        await transporter.sendMail({
            from: `"Power Monitor" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: html
        });
        console.log(`✅ Email sent to: ${to}`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to send email to ${to}:`, error.message);
        return false;
    }
}

// Function to generate random password
function generateRandomPassword() {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%';
    const allChars = uppercase + lowercase + numbers + special;
    
    let password = '';
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += special.charAt(Math.floor(Math.random() * special.length));
    
    for (let i = 4; i < 10; i++) {
        password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

// ============================================
// MONGODB SCHEMAS
// ============================================

const deviceSchema = new mongoose.Schema({
    user: { type: String, required: true, index: true },
    name: { type: String, required: [true, 'Device name is required'], trim: true },
    category: { type: String, required: true, index: true },
    wattage: { type: Number, required: [true, 'Wattage is required'], min: 1, max: 10000 },
    quantity: { type: Number, default: 1, min: 1, max: 100 },
    avgDailyHours: { type: Number, default: 2, min: 0, max: 24 },
    isActive: { type: Boolean, default: true, index: true },
    addedAt: { type: Date, default: Date.now }
});

deviceSchema.virtual('dailyKwh').get(function() {
    return ((this.wattage * this.quantity * this.avgDailyHours) / 1000).toFixed(2);
});

deviceSchema.set('toJSON', { virtuals: true });
deviceSchema.set('toObject', { virtuals: true });

const readingSchema = new mongoose.Schema({
    user: { type: String, required: true, index: true },
    device: { type: String },
    powerUsage: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now, index: true }
});

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true },
    password: { type: String, required: true, select: false, minlength: 6 },
    electricityRate: { type: Number, default: 0.12 },
    dailyThreshold: { type: Number, default: 30 },
    monthlyBudget: { type: Number, default: 500 },
    weeklyReport: { type: Boolean, default: true },
    language: { type: String, default: 'en' },
    avatar: { type: String, default: '⚡' },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.comparePassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const Device = mongoose.model('Device', deviceSchema);
const Reading = mongoose.model('Reading', readingSchema);
const User = mongoose.model('User', userSchema);

const adminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['superadmin', 'admin'], default: 'admin' },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

const Admin = mongoose.model('Admin', adminSchema);

// ============================================
// DATABASE INDEXES
// ============================================

console.log('📊 Creating database indexes...');
Device.collection.createIndex({ user: 1, isActive: 1 });
Device.collection.createIndex({ category: 1, wattage: -1 });
Reading.collection.createIndex({ user: 1, timestamp: -1 });
console.log('✅ Database indexes created');

// ============================================
// DATABASE CONNECTION
// ============================================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/power_consumption';

mongoose.connect(MONGODB_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB!');
        await setupEmailTransporter();
        initializeDatabase();
        createDefaultAdmin();
    })
    .catch(err => console.error('❌ MongoDB error:', err.message));

async function initializeDatabase() {
    try {
        const deviceCount = await Device.countDocuments();
        if (deviceCount === 0) {
            console.log('📝 Adding sample devices...');
            await Device.insertMany([
                { user: 'user123', name: 'Living Room AC', category: 'AC', wattage: 1200, quantity: 1, avgDailyHours: 8 },
                { user: 'user123', name: 'Refrigerator', category: 'Refrigerator', wattage: 150, quantity: 1, avgDailyHours: 24 },
                { user: 'user123', name: 'LED Lights', category: 'Lighting', wattage: 60, quantity: 8, avgDailyHours: 6 }
            ]);
            console.log('✅ Sample devices added!');
        }
        console.log(`📊 Database: ${await Device.countDocuments()} devices, ${await User.countDocuments()} users`);
    } catch (error) {
        console.error('Error:', error);
    }
}

async function createDefaultAdmin() {
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
            console.log('✅ Default admin created: admin@powermonitor.com / admin123');
        }
    } catch (error) {
        console.error('Admin creation error:', error);
    }
}

// ============================================
// AUTH ROUTES
// ============================================

const validateRegister = [
    body('name').notEmpty().trim(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 })
];

app.post('/api/auth/register', validateRegister, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }
        const user = new User({ name, email, password });
        await user.save();
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET || 'my_secret_key',
            { expiresIn: '30d' }
        );
        res.status(201).json({
            success: true,
            token,
            user: { id: user._id, name: user.name, email: user.email }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        if (!user.isActive) {
            return res.status(401).json({ success: false, message: 'Account is deactivated. Contact admin.' });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        user.lastLogin = new Date();
        await user.save();
        
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET || 'my_secret_key',
            { expiresIn: '30d' }
        );
        res.json({
            success: true,
            token,
            user: { id: user._id, name: user.name, email: user.email, language: user.language, avatar: user.avatar }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// FORGOT PASSWORD - SENDS NEW PASSWORD DIRECTLY TO EMAIL
// ============================================

app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        console.log(`🔐 Password reset requested for: ${email}`);
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'No user found with this email' });
        }
        
        // Generate a random temporary password
        const temporaryPassword = generateRandomPassword();
        
        // Update user's password with the temporary one
        user.password = temporaryPassword;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();
        
        console.log(`✅ Temporary password generated for: ${user.email}`);
        console.log(`📧 Temporary password: ${temporaryPassword}`);
        
        // Create HTML email with the password
        const htmlEmail = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; }
                    .container { max-width: 550px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; text-align: center; border-radius: 15px 15px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 15px 15px; }
                    .password-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 12px; margin: 20px 0; }
                    .password { font-size: 32px; font-weight: bold; letter-spacing: 3px; color: #fff; font-family: monospace; }
                    .warning { background: #fff3cd; color: #856404; padding: 15px; border-radius: 10px; margin: 20px 0; font-size: 13px; border-left: 4px solid #ffc107; }
                    .button { display: inline-block; padding: 12px 28px; background: #28a745; color: white; text-decoration: none; border-radius: 8px; margin: 10px 0; font-weight: bold; }
                    .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #999; }
                    .info { background: #e8f4fd; padding: 12px; border-radius: 8px; margin: 15px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>🔐 Password Reset</h2>
                    </div>
                    <div class="content">
                        <p>Hello <strong>${user.name}</strong>,</p>
                        <p>You requested to reset your password for your Power Consumption Monitor account.</p>
                        
                        <div class="password-box">
                            <div class="password">${temporaryPassword}</div>
                        </div>
                        
                        <div class="warning">
                            <strong>⚠️ IMPORTANT SECURITY NOTICE:</strong>
                            <ul style="margin-top: 10px; margin-left: 20px;">
                                <li>This password is temporary</li>
                                <li><strong>Please change this password immediately after logging in</strong></li>
                                <li>Go to Settings → Change Password to set your own password</li>
                                <li>Do not share this password with anyone</li>
                            </ul>
                        </div>
                        
                        <div class="info">
                            <p><strong>📋 How to login:</strong></p>
                            <ol style="margin-left: 20px; margin-top: 8px;">
                                <li>Click the button below to go to login page</li>
                                <li>Enter your email: <strong>${user.email}</strong></li>
                                <li>Enter the temporary password above</li>
                                <li>After login, go to Settings and change your password</li>
                            </ol>
                        </div>
                        
                        <div style="text-align: center;">
                            <a href="http://localhost:5500/pcm/pcm/frontend/login.html" class="button">🔐 Go to Login Page</a>
                        </div>
                        
                        <hr style="margin: 20px 0;">
                        <p style="font-size: 12px;">If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
                        <p>Best regards,<br><strong>Power Monitor Team</strong></p>
                    </div>
                    <div class="footer">
                        <p>© 2024 Power Consumption Monitor. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        // Send email with the password
        const emailSent = await sendEmail(user.email, '🔐 Your New Password - Power Monitor', htmlEmail);
        
        if (emailSent) {
            console.log(`✅ Password sent via email to: ${user.email}`);
            res.json({ 
                success: true, 
                message: 'A new temporary password has been sent to your email address. Please check your inbox (and spam folder). After logging in, please change your password immediately.'
            });
        } else {
            // Fallback: show password in console if email fails
            console.log(`⚠️ Email failed. Temporary password for ${user.email}: ${temporaryPassword}`);
            res.json({ 
                success: true, 
                message: `Unable to send email. Your temporary password is: ${temporaryPassword}. Please change it after logging in.`,
                temporaryPassword: temporaryPassword 
            });
        }
        
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// CHANGE PASSWORD - FROM DASHBOARD
// ============================================

app.post('/api/auth/change-password', async (req, res) => {
    try {
        const { userId, currentPassword, newPassword } = req.body;
        
        console.log('═══════════════════════════════════════════');
        console.log(`🔐 Change password requested for user ID: ${userId}`);
        
        if (!userId || !currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }
        
        const user = await User.findById(userId).select('+password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            console.log('❌ Current password is incorrect');
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
        }
        
        if (currentPassword === newPassword) {
            return res.status(400).json({ success: false, message: 'New password must be different from current password' });
        }
        
        user.password = newPassword;
        await user.save();
        
        console.log(`✅ Password changed for: ${user.email}`);
        
        // Send confirmation email
        const confirmHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; }
                    .container { max-width: 500px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>✅ Password Changed Successfully</h2>
                    </div>
                    <div class="content">
                        <p>Hello <strong>${user.name}</strong>,</p>
                        <p>Your password has been successfully changed.</p>
                        <p><strong>📅 Date & Time:</strong> ${new Date().toLocaleString()}</p>
                        <p>If you did not make this change, please contact support immediately.</p>
                        <hr>
                        <p>Best regards,<br>Power Monitor Team</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        await sendEmail(user.email, '✅ Password Changed Successfully', confirmHtml);
        
        console.log('🎉 Password change completed successfully!');
        console.log('═══════════════════════════════════════════');
        
        res.json({ 
            success: true, 
            message: 'Password changed successfully! Please login with your new password.' 
        });
        
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// DEVICE ROUTES
// ============================================

app.get('/api/devices/user/:userId', async (req, res) => {
    try {
        const devices = await Device.find({ user: req.params.userId, isActive: true });
        const devicesWithKwh = devices.map(d => d.toJSON());
        res.json({ success: true, count: devicesWithKwh.length, data: devicesWithKwh });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/devices', async (req, res) => {
    try {
        const device = new Device(req.body);
        await device.save();
        await Reading.create({
            user: req.body.user,
            device: device._id,
            powerUsage: device.dailyKwh,
            timestamp: new Date()
        });
        console.log(`✅ Device added: ${device.name}`);
        res.status(201).json({ success: true, data: device.toJSON() });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.delete('/api/devices/:id', async (req, res) => {
    try {
        await Device.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ success: true, message: 'Device removed' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// ANALYTICS ROUTES
// ============================================

app.get('/api/analytics/summary/:userId', async (req, res) => {
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

app.get('/api/analytics/weekly/:userId', async (req, res) => {
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

app.get('/api/analytics/by-category/:userId', async (req, res) => {
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

app.get('/api/analytics/top-devices/:userId', async (req, res) => {
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

app.get('/api/analytics/predict/:userId', async (req, res) => {
    try {
        const devices = await Device.find({ user: req.params.userId, isActive: true });
        let dailyKwh = 0;
        for (let i = 0; i < devices.length; i++) {
            dailyKwh = dailyKwh + parseFloat(devices[i].dailyKwh);
        }
        const predicted = dailyKwh * 30;
        let suggestion = "";
        if (predicted > 500) suggestion = "⚠️ High usage predicted. Consider energy-saving measures.";
        else if (predicted > 300) suggestion = "📊 Average usage predicted. You're doing well!";
        else suggestion = "🎉 Excellent! You're very energy efficient!";
        res.json({ success: true, data: { predictedUsage: predicted.toFixed(1), confidence: "85%", suggestion } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/analytics/compare/:userId', async (req, res) => {
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
        else message = "⚠️ Your usage is above average. Check energy-saving tips!";
        res.json({ success: true, data: { yourUsage: userTotal.toFixed(1), averageUsage: avgOtherUsers.toFixed(1), percentile: percentile.toFixed(0), message } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/analytics/alerts/:userId', async (req, res) => {
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

app.put('/api/analytics/settings/:userId', async (req, res) => {
    try {
        const { electricityRate, dailyThreshold, monthlyBudget, language, avatar } = req.body;
        const updateData = {};
        if (electricityRate !== undefined) updateData.electricityRate = electricityRate;
        if (dailyThreshold !== undefined) updateData.dailyThreshold = dailyThreshold;
        if (monthlyBudget !== undefined) updateData.monthlyBudget = monthlyBudget;
        if (language !== undefined) updateData.language = language;
        if (avatar !== undefined) updateData.avatar = avatar;
        const user = await User.findByIdAndUpdate(req.params.userId, updateData, { new: true });
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/analytics/history/:userId', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const readings = await Reading.find({ user: req.params.userId, timestamp: { $gte: startDate } });
        const history = [];
        for (let i = 0; i < readings.length; i++) {
            history.push({ date: readings[i].timestamp, usage: readings[i].powerUsage });
        }
        res.json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// EXPORT ROUTES
// ============================================

app.get('/api/export/csv/:userId', async (req, res) => {
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

app.get('/api/export/pdf/:userId', async (req, res) => {
    try {
        const devices = await Device.find({ user: req.params.userId, isActive: true });
        const user = await User.findById(req.params.userId);
        let totalKwh = 0;
        for (let i = 0; i < devices.length; i++) {
            totalKwh = totalKwh + parseFloat(devices[i].dailyKwh);
        }
        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=energy_report.pdf');
        doc.pipe(res);
        doc.fontSize(25).text('Energy Consumption Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text(`User: ${user ? user.name : 'User'}`);
        doc.text(`Email: ${user ? user.email : 'N/A'}`);
        doc.text(`Date: ${new Date().toLocaleDateString()}`);
        doc.moveDown();
        doc.fontSize(18).text('Summary', { underline: true });
        doc.fontSize(14).text(`Total Daily Consumption: ${totalKwh.toFixed(2)} kWh`);
        doc.text(`Estimated Monthly Cost: $${(totalKwh * 30 * 0.12).toFixed(2)}`);
        doc.text(`Carbon Footprint: ${(totalKwh * 0.233).toFixed(2)} kg CO2/day`);
        doc.moveDown();
        doc.fontSize(18).text('Devices', { underline: true });
        for (let i = 0; i < devices.length; i++) {
            const device = devices[i];
            const kwh = (device.wattage * device.quantity * device.avgDailyHours / 1000).toFixed(2);
            doc.fontSize(12).text(`• ${device.name}: ${device.wattage}W x ${device.quantity} = ${kwh} kWh/day`);
        }
        doc.end();
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/export/qr/:userId', async (req, res) => {
    try {
        const devices = await Device.find({ user: req.params.userId, isActive: true });
        let totalKwh = 0;
        for (let i = 0; i < devices.length; i++) {
            totalKwh = totalKwh + parseFloat(devices[i].dailyKwh);
        }
        const user = await User.findById(req.params.userId);
        const reportData = JSON.stringify({
            user: user.name,
            usage: totalKwh,
            date: new Date().toISOString(),
            devices: devices.map(d => ({ name: d.name, kwh: d.dailyKwh }))
        });
        const qrCode = await QRCode.toDataURL(reportData);
        res.json({ success: true, qrCode });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// ADMIN ROUTES
// ============================================

const verifyAdmin = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.split(' ')[1] : null;
    if (!token) {
        return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'my_secret_key');
        const admin = await Admin.findById(decoded.adminId);
        if (!admin || !admin.isActive) {
            return res.status(401).json({ success: false, message: 'Not authorized.' });
        }
        req.admin = admin;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token.' });
    }
};

app.post('/api/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email });
        if (!admin || !admin.isActive) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        admin.lastLogin = new Date();
        await admin.save();
        
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

app.get('/api/admin/users', verifyAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
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
                lastLogin: user.lastLogin,
                isActive: user.isActive,
                deviceCount: devices.length,
                totalConsumption: totalKwh.toFixed(1)
            });
        }
        res.json({ success: true, users: usersWithDevices });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/admin/users/:userId', verifyAdmin, async (req, res) => {
    try {
        if (req.params.userId === req.admin._id.toString()) {
            return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
        }
        await Device.deleteMany({ user: req.params.userId });
        await User.findByIdAndDelete(req.params.userId);
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/admin/analytics', verifyAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
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
        res.json({
            success: true,
            data: {
                totalUsers,
                activeUsers,
                totalDevices,
                totalConsumption: totalConsumption.toFixed(1),
                categoryStats: categoryArray
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/admin/setup', async (req, res) => {
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

// ============================================
// ROOT ENDPOINT
// ============================================

app.get('/', (req, res) => {
    res.json({
        message: 'Ultimate Power Consumption API',
        status: 'running',
        database: 'MongoDB',
        version: '5.0.0'
    });
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ success: false, message: 'Something went wrong!' });
});

app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🚀 ULTIMATE POWER CONSUMPTION MONITOR - READY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📡 Server: http://localhost:${PORT}`);
    console.log(`🗄️  Database: MongoDB`);
    console.log(`✅ Status: Ready`);
    console.log('');
    console.log('Press Ctrl+C to stop the server');
    console.log('═══════════════════════════════════════════════════════════');
});

const io = socketIo(server, { cors: { origin: "*" } });
io.on('connection', (socket) => {
    console.log('🔌 Client connected');
    socket.on('device-updated', (data) => {
        io.emit('device-changed', data);
    });
    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected');
    });
});