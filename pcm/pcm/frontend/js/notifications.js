// ============================================
// BROWSER NOTIFICATIONS
// ============================================

// Request permission for notifications
async function requestNotificationPermission() {
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('✅ Notifications enabled');
            showNotification('🔔 Notifications Enabled', 'You will receive energy alerts!');
        } else {
            console.log('❌ Notifications blocked');
        }
    } else {
        console.log('⚠️ This browser does not support notifications');
    }
}

// Show a notification
function showNotification(title, body, icon = '⚡') {
    if (Notification.permission === 'granted') {
        new Notification(title, { body, icon, requireInteraction: false });
    }
}

// Check high consumption and send alert
async function checkHighConsumptionAlert(userId, apiUrl) {
    try {
        const response = await fetch(`${apiUrl}/analytics/alerts/${userId}`);
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            const alert = data.data[0];
            if (alert.type === 'warning') {
                showNotification(
                    '⚠️ High Energy Alert!',
                    alert.message,
                    '⚠️'
                );
            }
        }
    } catch (error) {
        console.error('Error checking alerts:', error);
    }
}

// Send daily summary notification
async function sendDailySummary(userId, apiUrl) {
    try {
        const response = await fetch(`${apiUrl}/analytics/summary/${userId}`);
        const data = await response.json();
        
        if (data.success) {
            const usage = data.data.todayUsage;
            const cost = data.data.estimatedCost;
            
            showNotification(
                '📊 Daily Energy Summary',
                `You used ${usage} kWh today. Estimated cost: ${cost}`,
                '⚡'
            );
        }
    } catch (error) {
        console.error('Error sending daily summary:', error);
    }
}

// Schedule daily notification (at 9 PM)
function scheduleDailyNotification(userId, apiUrl) {
    const now = new Date();
    const night = new Date();
    night.setHours(21, 0, 0, 0); // 9:00 PM
    
    let timeToNotification = night - now;
    if (timeToNotification < 0) {
        timeToNotification += 24 * 60 * 60 * 1000; // Next day
    }
    
    setTimeout(() => {
        sendDailySummary(userId, apiUrl);
        // Reschedule for next day
        setInterval(() => sendDailySummary(userId, apiUrl), 24 * 60 * 60 * 1000);
    }, timeToNotification);
}

// Start notification service
async function startNotificationService(userId, apiUrl) {
    // Request permission
    await requestNotificationPermission();
    
    // Check high consumption every 30 minutes
    setInterval(() => checkHighConsumptionAlert(userId, apiUrl), 30 * 60 * 1000);
    
    // Schedule daily summary
    scheduleDailyNotification(userId, apiUrl);
    
    console.log('🔔 Notification service started');
}

// Manual test notification
function testNotification() {
    showNotification(
        '🔔 Test Notification',
        'Your notifications are working correctly!',
        '✅'
    );
}

// Export functions for use in dashboard
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        requestNotificationPermission,
        showNotification,
        checkHighConsumptionAlert,
        sendDailySummary,
        startNotificationService,
        testNotification
    };
}