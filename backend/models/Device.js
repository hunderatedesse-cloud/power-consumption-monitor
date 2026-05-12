const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['AC', 'Heater', 'Refrigerator', 'Lighting', 'Entertainment', 'Kitchen', 'Other'],
        required: true
    },
    wattage: {
        type: Number,
        required: true,
        min: 1
    },
    quantity: {
        type: Number,
        default: 1
    },
    avgDailyHours: {
        type: Number,
        default: 2,
        min: 0,
        max: 24
    },
    isActive: {
        type: Boolean,
        default: true
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
});

// Virtual for daily consumption
deviceSchema.virtual('dailyKwh').get(function() {
    return (this.wattage * this.quantity * this.avgDailyHours) / 1000;
});

deviceSchema.set('toJSON', { virtuals: true });
deviceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Device', deviceSchema);