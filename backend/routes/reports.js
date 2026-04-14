const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const Device = require('../models/Device');

router.get('/pdf/:userId', async(req, res) => {
    const devices = await Device.find({ user: req.params.userId, isActive: true });

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
    doc.pipe(res);

    doc.fontSize(20).text('Power Consumption Report', { align: 'center' });
    doc.moveDown();

    devices.forEach(device => {
        doc.fontSize(12).text(`${device.name}: ${device.wattage}W - ${device.avgDailyHours} hrs/day`);
    });

    doc.end();
});

module.exports = router;