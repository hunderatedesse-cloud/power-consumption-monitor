const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendWeeklyReport(userEmail, userName, data) {
    const html = `
        <div style="font-family: Arial; max-width: 600px;">
            <h2 style="color: #667eea;">⚡ Weekly Energy Report</h2>
            <p>Dear ${userName},</p>
            
            <div style="background: #f0f2f5; padding: 15px; border-radius: 10px;">
                <h3>📊 Your Summary</h3>
                <p>Total Usage: <strong>${data.totalKwh} kWh</strong></p>
                <p>Estimated Cost: <strong>$${data.cost}</strong></p>
                <p>Carbon Saved: <strong>${data.carbonSaved} kg CO2</strong></p>
            </div>
            
            <div style="margin-top: 20px;">
                <h3>💡 Energy Tips</h3>
                <ul>
                    <li>Unplug devices when not in use</li>
                    <li>Use LED bulbs for lighting</li>
                    <li>Run appliances during off-peak hours</li>
                </ul>
            </div>
            
            <a href="http://localhost:5000" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Dashboard</a>
        </div>
    `;

    await transporter.sendMail({
        to: userEmail,
        subject: `📊 Your Weekly Energy Report`,
        html: html
    });
}