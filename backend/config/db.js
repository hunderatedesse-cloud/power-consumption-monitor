const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        // Don't exit process, just log the error
        console.log('⚠️ Running in offline mode - using mock data fallback');
    }
};

module.exports = connectDB;