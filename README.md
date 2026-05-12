 ⚡ Ultimate Power Consumption Monitor - Ethiopian Energy Tracker

A full-stack web application to help Ethiopian households and businesses track electricity usage, identify high-consumption devices, and save money on bills. Built with AI predictions, real-time charts, and MongoDB.

 🇪🇹 Ethiopian-Specific Features
 
Ethiopian Holidays Enkutatash (New Year), Meskel, Genna (Christmas), Timkat (Epiphany), Fasika (Easter) 
Seasonal Tips Kiremt (Rainy Season), Bega (Dry Season), Belg (Small Rains) with energy-saving advice 
Local Appliances One-click add for Mitad (Injera maker), Water pump, Satellite TV, Electric Kettle, Jebena 
Multi-language Support English, Amharic (አማርኛ), and Oromo (Oromoo) 
Currency Ethiopian Birr (ETB) for budget tracking 

✨ Features

Core Features
- 🤖 **AI Energy Predictions** - Forecast future energy usage
- 📊 **Real-time Charts** - Weekly trends and category breakdown
- 🔐 **User Authentication** - Register, login, and password reset
- 🌙 **Dark Mode** - Toggle between light and dark themes
- 📥 **Export Reports** - Download CSV, PDF, and QR code reports

Device Management
- ➕ Add energy devices with wattage and usage hours
- 🗑️ Remove devices from your list
- ⚡ Automatic kWh and cost calculations
- 🏷️ Categorize devices (AC, Refrigerator, Lighting, Kitchen, Entertainment)

Analytics & Tracking
- 📈 Daily, weekly, and monthly energy tracking
- 💰 Monthly budget setting in ETB
- 📊 Compare your usage with average users
- 🎯 Daily goal progress with visual gauge
- 🌍 Carbon footprint calculation

  Ethiopian Additions
- 📅 Ethiopian holidays calendar
- 🌦️ Current season detection with energy tips
- 🔌 Quick-add buttons for common Ethiopian appliances
- 🗣️ Multi-language interface (English, Amharic, Oromo)

 🛠️ Tech Stack
 Layer With Technology
 
Backend  Node.js, Express.js 
Frontend HTML5, CSS3, JavaScript, Chart.js
Database MongoDB, Mongoose ODM
Authentication JWT, bcryptjs 
Email Nodemailer (Gmail SMTP)
Export  PDFKit, QRCode

 📁 Project Structure

power-consumption-monitor/
├── backend/
│ ├── server.js # Main backend logic
│ ├── models/ # MongoDB schemas
│ ├── routes/ # API endpoints
│ └── package.json
├── frontend/
│ ├── dashboard.html # Main dashboard (Ethiopian version)
│ ├── settings.html # Multi-language settings
│ ├── login.html # Login page
│ ├── forgot-password.html
│ ├── reset-password.html
│ └── css/ # Stylesheets
└── README.md
