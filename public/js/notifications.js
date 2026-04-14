// Request permission
async function requestNotificationPermission() {
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Notifications enabled');
        }
    }
}

// Send notification
function sendNotification(title, body, icon = '⚡') {
    if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '⚡' });
    }
}

// Check consumption and notify
async function checkAndNotify() {
    const response = await fetch(`${API_URL}/analytics/summary/${userId}`);
    const data = await response.json();

    if (data.success && parseFloat(data.data.todayUsage) > 30) {
        sendNotification(
            '⚠️ High Energy Usage!',
            `You've used ${data.data.todayUsage} kWh today. Consider reducing consumption.`
        );
    }
}

// Check every hour
setInterval(checkAndNotify, 3600000);