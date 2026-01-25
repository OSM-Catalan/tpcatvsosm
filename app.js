// Initialize map centered on Catalonia
const map = L.map('map', {
    zoomControl: false  // Disable default zoom control
}).setView([41.3851, 2.1734], 10);

// Add zoom control explicitly
L.control.zoom({
    position: 'bottomleft'
}).addTo(map);

// Define base layers
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
});

const icgcLayer = L.tileLayer('https://tilemaps.icgc.cat/mapfactory/wmts/orto/{z}/{x}/{y}.png', {
    attribution: '© Institut Cartogràfic de Catalunya'
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
const layerSelect = document.getElementById('layer-select');
const stopsSelect = document.getElementById('stops-select');
const loadStopsBtn = document.getElementById('load-stops-btn');
const calculateDifferencesBtn = document.getElementById('calculate-differences-btn');
const geolocateBtn = document.getElementById('geolocate-btn');

// Handle layer change
layerSelect.addEventListener('change', function() {
    if (this.value === 'osm') {
        map.removeLayer(icgcLayer);
        map.addLayer(osmLayer);
    } else {
        map.removeLayer(osmLayer);
        map.addLayer(icgcLayer);
    }
});

// Handle stops change - no automatic loading
// Just set the selection

// Handle load stops button
loadStopsBtn.addEventListener('click', function() {
    map.removeLayer(osmStopsLayer);
    map.removeLayer(gtfsStopsLayer);
    const selectedValue = stopsSelect.value;
    if (selectedValue === 'osm' || selectedValue === 'both') {
        loadOsmStops();
    }
    if (selectedValue === 'gtfs' || selectedValue === 'both') {
        loadGtfsStops();
    }
    // For 'none', layers are already removed
});

// Handle calculate differences button
calculateDifferencesBtn.addEventListener('click', function() {
    calculateCoordinateDifferences();
});



// Geolocate
geolocateBtn.addEventListener('click', function() {
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
