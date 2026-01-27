// Initialize map centered on Catalonia
const map = L.map('map', {
    zoomControl: false  // Disable default zoom control
}).setView([41.3851, 2.1734], 10);

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
const layerSelect = document.getElementById('layer-select');
const stopsSelect = document.getElementById('stops-select');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const nominatimSearch = document.getElementById('nominatim-search');
const nominatimResults = document.getElementById('nominatim-results');
const gtfsFolderSelect = document.getElementById('gtfs-folder-select');
const loadStopsBtn = document.getElementById('load-stops-btn');
const calculateDifferencesBtn = document.getElementById('calculate-differences-btn');
const cleanMapBtn = document.getElementById('clean-map-btn');
const resetSelectionBtn = document.getElementById('reset-selection-btn');
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
    // Add active state visual feedback
    this.classList.add('active');
    setTimeout(() => this.classList.remove('active'), 300);
    
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
    // Add active state visual feedback
    this.classList.add('active');
    setTimeout(() => this.classList.remove('active'), 300);
    
    calculateCoordinateDifferences();
});

// Handle clean map button
cleanMapBtn.addEventListener('click', function() {
    // Add active state visual feedback
    this.classList.add('active');
    setTimeout(() => this.classList.remove('active'), 300);
    
    cleanMap();
});

// Handle reset selection button
resetSelectionBtn.addEventListener('click', function() {
    // Add active state visual feedback
    this.classList.add('active');
    setTimeout(() => this.classList.remove('active'), 300);
    
    resetSelection();
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

// Process GTFS Shapes button
const processShapesBtn = document.getElementById('process-shapes-btn');
processShapesBtn.addEventListener('click', async function() {
    // Add active state visual feedback
    this.classList.add('active');
    setTimeout(() => this.classList.remove('active'), 300);
    
    try {
        // First load the shapes data
        await loadGtfsShapes();
        
        // Then display all shapes on the map
        displayAllGtfsShapes();
        
    } catch (error) {
        console.error('Error processing GTFS shapes:', error);
        alert('Error processing GTFS shapes. Please try again.');
    }
});

// Search functionality
let searchTimeout;
searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    const query = this.value.trim();
    
    if (query.length < 2) {
        searchResults.style.display = 'none';
        return;
    }
    
    // Debounce search
    searchTimeout = setTimeout(() => {
        performSearch(query);
    }, 300);
});

// Close search results when clicking outside
document.addEventListener('click', function(e) {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.style.display = 'none';
    }
    if (!nominatimSearch.contains(e.target) && !nominatimResults.contains(e.target)) {
        nominatimResults.style.display = 'none';
    }
});

// Nominatim search functionality
let nominatimTimeout;
nominatimSearch.addEventListener('input', function() {
    clearTimeout(nominatimTimeout);
    const query = this.value.trim();
    
    if (query.length < 2) {
        nominatimResults.style.display = 'none';
        return;
    }
    
    // Debounce search
    nominatimTimeout = setTimeout(() => {
        performNominatimSearch(query);
    }, 300);
});

// Initialize search data on page load
document.addEventListener('DOMContentLoaded', function() {
    loadSearchData();
    initializeGtfsFolderDropdown(); // Immediate initialization
    loadGtfsFolders(); // Async validation
});

// Handle GTFS folder selection
gtfsFolderSelect.addEventListener('change', function() {
    const selectedFolder = this.value;
    if (selectedFolder) {
        console.log('Selected GTFS folder:', selectedFolder);
        // Update global GTFS folder variable
        window.currentGtfsFolder = selectedFolder;
        
        // Clear all existing data
        searchData.routes = [];
        searchData.stops = [];
        routesData = [];
        tripsData = [];
        osmStopsData = [];
        gtfsStopsData = [];
        
        // Clear map layers
        if (osmStopsLayer) {
            map.removeLayer(osmStopsLayer);
        }
        if (gtfsStopsLayer) {
            map.removeLayer(gtfsStopsLayer);
        }
        if (routeLayer) {
            map.removeLayer(routeLayer);
        }
        
        // Reload all data from new folder
        loadSearchData().then(() => {
            return loadGtfsDataAndPopulateLines();
        }).then(() => {
            console.log('GTFS data reloaded from folder:', selectedFolder);
            console.log('Loaded routes:', routesData.length);
            console.log('Loaded search routes:', searchData.routes.length);
        }).catch(error => {
            console.error('Error reloading GTFS data:', error);
            alert('Error loading data from selected folder. Please try again.');
        });
    }
});
