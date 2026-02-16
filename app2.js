// Initialize map centered on Catalonia
const map = L.map('map', {
    zoomControl: false  // Disable default zoom control
}).setView([41.3851, 2.1734], 10);

window.map = map;

// Toggle functions for panels
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('minimized');
}

function toggleControlsPanel() {
    const controlsPanel = document.getElementById('controls-panel');
    controlsPanel.classList.toggle('minimized');
}

function toggleIconSidebar() {
    const iconSidebar = document.getElementById('icon-sidebar');
    iconSidebar.classList.toggle('minimized');
}

// Resize functionality for controls panel - removed, controlsPanel deleted

// Initialize resize when DOM is loaded - removed, no panels to resize

// Add zoom control explicitly
L.control.zoom({
    position: 'bottomleft'
}).addTo(map);

// Define base layers
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
});

const icgcLayer = L.tileLayer('https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wmts/orto/MON3857NW/{z}/{x}/{y}.png', {
    attribution: '© Institut Cartogràfic i Geològic de Catalunya'
});

// Default to OSM
osmLayer.addTo(map);

// Layer control
const baseLayers = {
    "OpenStreetMap": osmLayer,
    "ICGC Ortoimage": icgcLayer
};

// Stop markers layers
let osmStopsLayer = L.layerGroup();
let gtfsStopsLayer = L.layerGroup();

// Route layer
let routeLayer = L.layerGroup();

// Store stops data for comparison
let osmStopsData = [];
let gtfsStopsData = [];
let routesData = [];
let tripsData = [];
let currentRoute = null;

// Controls
const loadStopsBtn = document.getElementById('load-stops-btn');
const cleanMapBtn = document.getElementById('clean-map-btn');
const geolocateBtn = document.getElementById('geolocate-btn');

// Handle layer change - removed, layerSelect deleted

// Handle stops change - no automatic loading
// Just set the selection

// Handle load stops button - removed, stopsSelect deleted

// Handle clean map button
function cleanMap() {
    map.eachLayer(function(layer) {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
            map.removeLayer(layer);
        }
    });
}

cleanMapBtn.addEventListener('click', function() {
    // Add active state visual feedback
    this.classList.add('active');
    setTimeout(() => this.classList.remove('active'), 300);
    
    cleanMap();
});

// Geolocate
geolocateBtn.addEventListener('click', function() {
    // Add active state visual feedback
    this.classList.add('active');
    setTimeout(() => this.classList.remove('active'), 300);
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            map.setView([lat, lon], 15);
            L.marker([lat, lon]).addTo(map).bindPopup('You are here').openPopup();
        }, function(error) {
            alert('Geolocation error: ' + error.message);
        });
    } else {
        alert('Geolocation is not supported by this browser.');
    }
});

// Show GTFS sidebar
function showGTFSSidebar() {
    document.getElementById('gtfs-sidebar').style.display = 'block';
}

// Hide GTFS sidebar
function hideGTFSSidebar() {
    document.getElementById('gtfs-sidebar').style.display = 'none';
}

// Show OSM sidebar
function showOSMSidebar() {
    document.getElementById('osm-sidebar').style.display = 'block';
}

// Hide OSM sidebar
function hideOSMSidebar() {
    document.getElementById('osm-sidebar').style.display = 'none';
}

// Search functionality - removed, searchInput deleted

// Close search results when clicking outside - removed

// Nominatim search functionality - removed

// Initialize search data on page load - removed, not needed
document.addEventListener('DOMContentLoaded', function() {
    // loadSearchData removed
    // initializeGtfsFolderDropdown removed, gtfsFolderSelect deleted
    // loadGtfsFolders removed
    // initSidebarResize removed, sidebar deleted
});

function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Handle messages from iframe
window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    const {type, data} = event.data;
    if (type === 'addMarker') {
        const {lat, lon, popup, icon, label} = data;
        const marker = L.marker([lat, lon]).addTo(map).bindPopup(popup);
        if (label) {
            const customIcon = L.divIcon({
                html: `<div style="background: blue; color: white; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">${label}</div>`,
                className: 'custom-number-icon',
                iconSize: [20, 20]
            });
            marker.setIcon(customIcon);
        } else if (icon) {
            marker.setIcon(L.divIcon(icon));
        }
    } else if (type === 'addPolyline') {
        const {coords, color, source} = data;
        const options = {color, weight: 3};
        if (source === 'osm') options.dashArray = '5,5';
        L.polyline(coords, options).addTo(map);
    } else if (type === 'fitBounds') {
        const {bounds} = data;
        const bbox = bounds.split(',').map(Number);
        map.fitBounds([[bbox[1], bbox[0]], [bbox[3], bbox[2]]]);
    } else if (type === 'setView') {
        const {lat, lon, zoom} = data;
        map.setView([lat, lon], zoom);
    }
});
