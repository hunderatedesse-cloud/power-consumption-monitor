const translations = {
    en: {
        dashboard: 'Dashboard',
        todayUsage: 'Today\'s Usage',
        estimatedCost: 'Estimated Cost',
        carbonFootprint: 'Carbon Footprint',
        addDevice: 'Add Device',
        myDevices: 'My Devices'
    },
    am: {
        dashboard: 'ዳሽቦርድ',
        todayUsage: 'የዛሬ ፍጆታ',
        estimatedCost: 'የሚገመት ወጪ',
        carbonFootprint: 'የካርቦን አሻራ',
        addDevice: 'መሳሪያ ጨምር',
        myDevices: 'የእኔ መሳሪያዎች'
    }
};

function changeLanguage(lang) {
    localStorage.setItem('language', lang);
    location.reload();
}