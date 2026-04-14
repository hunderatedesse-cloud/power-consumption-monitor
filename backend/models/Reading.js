const mongoose = require('mongoose');

const readingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    device: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device'
    },
    powerUsage: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    source: {
        type: String,
        enum: ['manual', 'sensor', 'calculated'],
        default: 'calculated'
    }
});

module.exports = mongoose.model('Reading', readingSchema);