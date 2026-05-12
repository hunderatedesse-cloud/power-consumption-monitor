const mongoose = require('mongoose');

const readingSchema = new mongoose.Schema({
    user: { type: String, required: true },
    device: { type: String },
    powerUsage: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reading', readingSchema);