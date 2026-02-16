// Initialize GTFS map
function initGTFSMap() {
    map = L.map('map').setView([41.3851, 2.1734], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}
function toggleControlsPanel() {
    const panel = document.getElementById('controls-panel');
    panel.classList.toggle('minimized');
}

// Set default GTFS folder
// window.currentGtfsFolder = window.currentGtfsFolder || 'gtfs_amb_bus';

// List of GTFS folders - easy to add more
const gtfsFolders = [
    "gtfs_amb_bus",
    "gtfs_cat_interurba_bus", 
    "gtfs_cat_urba_bus",
    "gtfs_zaragoza"
];

// Initialize the GTFS folder dropdown
function initializeGtfsFolderDropdown() {
    console.log('Initializing GTFS folder dropdown...');
    const dropdown = document.getElementById('gtfs-folder-select');
    if (!dropdown) {
        console.error('GTFS folder dropdown not found');
        return;
    }

    console.log('GTFS folders to populate:', gtfsFolders);

    // Clear existing options except the first one
    dropdown.innerHTML = '<option value="">Select GTFS folder...</option>';

    // Manually add options
    const option1 = document.createElement('option');
    option1.value = "gtfs_amb_bus";
    option1.textContent = "AMB BUS";
    dropdown.appendChild(option1);

    const option2 = document.createElement('option');
    option2.value = "gtfs_cat_interurba_bus";
    option2.textContent = "CAT INTERURBA BUS";
    dropdown.appendChild(option2);

    const option3 = document.createElement('option');
    option3.value = "gtfs_cat_urba_bus";
    option3.textContent = "CAT URBA BUS";
    dropdown.appendChild(option3);

    const option4 = document.createElement('option');
    option4.value = "gtfs_zaragoza";
    option4.textContent = "ZARAGOZA";
    dropdown.appendChild(option4);
	
	

    // Set default folder
    // window.currentGtfsFolder = "gtfs_amb_bus";

    // Select the current GTFS folder in the dropdown
    dropdown.value = window.currentGtfsFolder || "";

    console.log('Dropdown populated with', dropdown.options.length - 1, 'folders');
    console.log('Default folder set to:', window.currentGtfsFolder);

    // Add event listener for folder selection change
    dropdown.addEventListener('change', (event) => {
        const selected = event.target.value;
        if (!selected) {
            window.currentGtfsFolder = "";
            document.getElementById('gtfs-summary').innerHTML = '';
            document.getElementById('lines-list').innerHTML = '';
            document.getElementById('search-options').innerHTML = '';
            return;
        }
        window.currentGtfsFolder = selected;
        console.log('GTFS folder selected:', window.currentGtfsFolder);
        // Show summary
        showGtfsSummary();
        // Reload GTFS data for the new folder
        showGtfsLines();
    });
}

// Get the path to a GTFS file
function getGtfsPath(filename) {
    if (!window.currentGtfsFolder) {
        throw new Error('No GTFS folder selected');
    }
    return `${window.currentGtfsFolder}/${filename}`;
}

// Load GTFS routes (placeholder for async validation)
function loadGtfsFolders() {
    // Placeholder - could validate folders exist
    console.log('GTFS folders loaded');
}

// Load GTFS routes for search
async function loadGtfsRoutesForSearch() {
    try {
        const response = await fetch(getGtfsPath('routes.txt'));
        const text = await response.text();
        const lines = text.split('\n');
        const headers = lines[0].split(',');
        const routes = [];
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;
            const values = lines[i].split(',');
            const route = {};
            headers.forEach((header, index) => {
                route[header] = values[index];
            });
            routes.push(route);
        }
        if (!window.searchData) window.searchData = {};
        window.searchData.routes = routes;
        console.log('Loaded GTFS routes for search:', routes.length);
    } catch (error) {
        console.error('Error loading GTFS routes for search:', error);
    }
}

// Load GTFS trips
async function loadGtfsTrips() {
    try {
        const response = await fetch(getGtfsPath('trips.txt'));
        const text = await response.text();
        const lines = text.split('\n');
        const headers = lines[0].split(',');
        const trips = [];
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;
            const values = lines[i].split(',');
            const trip = {};
            headers.forEach((header, index) => {
                trip[header] = values[index];
            });
            trips.push(trip);
        }
        if (!window.searchData) window.searchData = {};
        window.searchData.trips = trips;
        console.log('Loaded GTFS trips:', trips.length);
    } catch (error) {
        console.error('Error loading GTFS trips:', error);
    }
}

// Load GTFS shapes
function parseCsvLine(line) {
    return line.split(',');
}

// HTML escape function
function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function loadGtfsShapes() {
    try {
        const response = await fetch(getGtfsPath('shapes.txt'));
        const csvText = await response.text();
        const lines = csvText.split('\n');
        
        if (!window.searchData) window.searchData = {};
        window.searchData.shapes = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const values = parseCsvLine(line);
                if (values.length >= 4) {
                    const shapeId = values[0];
                    const lat = parseFloat(values[1]);
                    const lon = parseFloat(values[2]);
                    if (!isNaN(lat) && !isNaN(lon)) {
                        const seq = parseInt(values[3]) || 0;
                        window.searchData.shapes.push({
                            shape_id: shapeId,
                            shape_pt_lat: lat,
                            shape_pt_lon: lon,
                            shape_pt_sequence: seq
                        });
                    }
                }
            }
        }
        console.log('Loaded GTFS shapes');
    } catch (error) {
        console.error('Error loading GTFS shapes:', error);
    }
}

// Load GTFS stop times
async function loadGtfsStopTimes() {
    try {
        const response = await fetch(getGtfsPath('stop_times.txt'));
        const text = await response.text();
        const lines = text.split('\n');
        const headers = lines[0].split(',');
        const stopTimes = [];
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;
            const values = lines[i].split(',');
            const stopTime = {};
            headers.forEach((header, index) => {
                stopTime[header] = values[index];
            });
            stopTimes.push(stopTime);
        }
        if (!window.searchData) window.searchData = {};
        window.searchData.stopTimes = stopTimes;
        console.log('Loaded GTFS stop times:', stopTimes.length);
    } catch (error) {
        console.error('Error loading GTFS stop times:', error);
    }
}

// Load GTFS stops data
async function loadGtfsStopsData() {
    try {
        const response = await fetch(getGtfsPath('stops.txt'));
        const text = await response.text();
        const lines = text.split('\n');
        const headers = lines[0].split(',');
        const stops = [];
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;
            const values = lines[i].split(',');
            const stop = {};
            headers.forEach((header, index) => {
                stop[header] = values[index];
            });
            stops.push(stop);
        }
        if (!window.searchData) window.searchData = {};
        window.searchData.stops = stops;
        console.log('Loaded GTFS stops:', stops.length);
    } catch (error) {
        console.error('Error loading GTFS stops:', error);
    }
}

// Show stops for route
async function showStopsForRoute(routeId) {
    await loadGtfsTrips();
    await loadGtfsStopTimes();
    await loadGtfsStopsData();
    const trips = window.searchData.trips.filter(t => t.route_id === routeId);
    const tripIds = trips.map(t => t.trip_id);

    // Group trips by direction
    const directions = [...new Set(trips.map(t => t.direction_id || 0))];
    const stopsByDirection = {};
    const allPoints = [];

    directions.forEach(direction => {
        const tripsForDir = trips.filter(t => (t.direction_id || 0) === direction);
        const tripIdsForDir = tripsForDir.map(t => t.trip_id);
        const stopTimesForDir = window.searchData.stopTimes.filter(st => tripIdsForDir.includes(st.trip_id));
        const stopIdsForDir = [...new Set(stopTimesForDir.map(st => st.stop_id))];
        let stopsForDir = window.searchData.stops.filter(s => stopIdsForDir.includes(s.stop_id));

        // Sort stops by sequence for this direction
        const stopsWithSeq = stopsForDir.map(stop => {
            const stopTimesForStop = stopTimesForDir.filter(st => st.stop_id === stop.stop_id);
            const minSeq = stopTimesForStop.length > 0 ? Math.min(...stopTimesForStop.map(st => parseInt(st.stop_sequence) || 0)) : 0;
            return { ...stop, sequence: minSeq };
        });
        stopsWithSeq.sort((a, b) => a.sequence - b.sequence);

        stopsByDirection[direction] = stopsWithSeq;

        // Add markers via postMessage to parent
        const directionColors = ['blue', 'red', 'green', 'orange'];
        const color = directionColors[direction % directionColors.length];
        stopsWithSeq.forEach((stop, index) => {
            const lat = parseFloat(stop.stop_lat);
            const lon = parseFloat(stop.stop_lon);
            if (isNaN(lat) || isNaN(lon)) return; // Skip invalid coordinates

            const popup = `${index + 1}. ${stop.stop_name}`;
            const icon = {
                html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 1px solid black; display: flex; align-items: center; justify-content: center; font-size: 10px; color: white; font-weight: bold;">${index + 1}</div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            };
            window.parent.postMessage({type: 'addMarker', data: {lat, lon, popup, icon}}, '*');
            allPoints.push([lat, lon]);
        });
    });

    if (allPoints.length > 0) {
        // Calculate bounds manually
        const lats = allPoints.map(p => p[0]);
        const lngs = allPoints.map(p => p[1]);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        const bounds = `${minLng},${minLat},${maxLng},${maxLat}`;
        // Fit bounds via postMessage to parent
        window.parent.postMessage({type: 'fitBounds', data: {bounds}}, '*');
    }

    // Show the list of stops grouped by direction
    const safeId = routeId.replace(/[^a-zA-Z0-9-_]/g, '_');
    const stopsDiv = document.getElementById(`stops-${safeId}`);
    if (stopsDiv) {
        window.routeStops = window.routeStops || {};
        window.routeStops[routeId] = stopsByDirection;
        let html = '<h5>Stops by Direction:</h5>';
        directions.forEach(direction => {
            const stopsWithSeq = stopsByDirection[direction];
            const directionColors = ['blue', 'red', 'green', 'orange'];
            const color = directionColors[direction % directionColors.length];
            html += `<h6 style="color: ${color}">Direction ${direction}:</h6>`;
            const safeRouteId = routeId.replace(/[^a-zA-Z0-9-_]/g, '_');
            html += `<table id="stops-table-${safeRouteId}-${direction}" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">`;
            html += `<thead><tr><th style="border: 1px solid #ddd; padding: 8px; cursor: pointer;" onclick="sortRouteStops('${routeId.replace(/'/g, "\\'").replace(/"/g, '\\"')}', '${direction}', 0)">Order</th><th style="border: 1px solid #ddd; padding: 8px; cursor: pointer;" onclick="sortRouteStops('${routeId.replace(/'/g, "\\'").replace(/"/g, '\\"')}', '${direction}', 1)">Name</th><th style="border: 1px solid #ddd; padding: 8px; cursor: pointer;" onclick="sortRouteStops('${routeId.replace(/'/g, "\\'").replace(/"/g, '\\"')}', '${direction}', 2)">Ref</th></tr></thead>`;
            html += `<tbody>`;
            stopsWithSeq.forEach((stop, index) => {
                html += `<tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${index + 1}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; cursor: pointer; text-decoration: underline;" onclick="zoomToStop('${stop.stop_id.replace(/'/g, "\\'").replace(/"/g, '\\"')}')">${escapeHtml(stop.stop_name)}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${stop.stop_code || stop.stop_id}</td>
                </tr>`;
            });
            html += `</tbody></table>`;
        });
        stopsDiv.innerHTML = html;
        stopsDiv.style.display = 'block';
    }
}

// Show track for route
async function showTrackForRoute(routeId) {
    console.log('showTrackForRoute called for routeId:', routeId);
    await loadGtfsTrips();
    await loadGtfsShapes();
    const trips = window.searchData.trips.filter(t => t.route_id === routeId);
    console.log('Trips found:', trips.length);
    const shapeIds = [...new Set(trips.map(t => t.shape_id))];
    console.log('ShapeIds:', shapeIds);
    const shapes = window.searchData.shapes.filter(s => shapeIds.includes(s.shape_id));
    console.log('Filtered shapes:', shapes.length);
    const directionMap = {};
    const colors = ['blue', 'red', 'green', 'orange'];
    shapes.forEach(s => {
        const trip = trips.find(t => t.shape_id === s.shape_id);
        const direction = trip ? trip.direction_id || 0 : 0;
        if (!directionMap[direction]) directionMap[direction] = [];
        directionMap[direction].push({
            lat: parseFloat(s.shape_pt_lat),
            lng: parseFloat(s.shape_pt_lon),
            seq: parseInt(s.shape_pt_sequence)
        });
    });
    Object.keys(directionMap).forEach((direction, index) => {
        directionMap[direction].sort((a, b) => a.seq - b.seq);
        const coords = directionMap[direction].map(p => [p.lat, p.lng]);
        console.log('Direction', direction, 'coords length:', coords.length);
        const color = colors[index % colors.length];
        if (coords.length > 0) {
            console.log('Adding polyline for direction', direction, 'with', coords.length, 'points');
            // Add polyline via postMessage to parent
            window.parent.postMessage({type: 'addPolyline', data: {coords, color}}, '*');
        }
    });
    if (Object.keys(directionMap).length > 0) {
        const allCoords = Object.values(directionMap).flat().map(p => [p.lat, p.lng]);
        // Calculate bounds manually
        const lats = allCoords.map(p => p[0]);
        const lngs = allCoords.map(p => p[1]);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        const bounds = `${minLng},${minLat},${maxLng},${maxLat}`;
        // Fit bounds via postMessage to parent
        window.parent.postMessage({type: 'fitBounds', data: {bounds}}, '*');
    } else {
        console.log('No tracks found for route', routeId);
    }
}

// Show GTFS lines
function showGtfsLines() {
    console.log('showGtfsLines called');
    console.log('Loading GTFS routes from folder:', window.currentGtfsFolder);
    loadGtfsRoutesForSearch().then(async () => {
        console.log('GTFS routes loaded:', window.searchData?.routes?.length || 0);
        await loadGtfsStopsData();
        console.log('GTFS stops loaded:', window.searchData?.stops?.length || 0);
        document.getElementById('stops-table').style.display = 'none';
        document.getElementById('stops-controls').style.display = 'none';
        document.getElementById('lines-list').style.display = 'block';
        populateLinesList();
        populateSearchOptions();
    }).catch(error => console.error('Error showing GTFS lines:', error));
}

// Populate lines list
function populateLinesList() {
    const linesList = document.getElementById('lines-list');
    if (!linesList) {
        console.error('Lines list element not found.');
        return;
    }
    if (!window.searchData || !window.searchData.routes) {
        console.error('No route data available.');
        return;
    }
    const routes = window.searchData.routes;
    let html = '<ul>';
    routes.forEach(route => {
        const escapedRouteId = route.route_id.replace(/'/g, "\\'").replace(/"/g, '\\"');
        const safeId = route.route_id.replace(/[^a-zA-Z0-9-_]/g, '_');
        html += `<li id="route-${safeId}">${route.route_id}: ${escapeHtml(route.route_short_name || route.route_long_name || 'N/A')} - ${escapeHtml(route.route_long_name || '')}<br>
            <button onclick="showStopsForRoute('${escapedRouteId}')">Show Stops</button>
            <button onclick="showTrackForRoute('${escapedRouteId}')">Show Track</button>
            <div id="stops-${safeId}" style="display: none; margin-top: 10px;"></div>
        </li>`;
    });
    html += '</ul>';
    linesList.innerHTML = html;
}

// Zoom to a specific stop
function zoomToStop(stopId) {
    const stop = window.searchData.stops.find(s => s.stop_id === stopId);
    if (stop) {
        const lat = parseFloat(stop.stop_lat);
        const lon = parseFloat(stop.stop_lon);
        if (!isNaN(lat) && !isNaN(lon)) {
            window.parent.postMessage({type: 'setView', data: {lat, lon, zoom: 18}}, '*');
        }
    }
}

// Show all stops in a sortable table
async function showAllStops() {
    console.log('showAllStops called');
    await loadGtfsStopsData();
    await loadGtfsRoutesForSearch();
    await loadGtfsTrips();
    await loadGtfsStopTimes();
    const stops = window.searchData.stops;
    console.log('Loaded stops:', stops ? stops.length : 'undefined');
    if (stops && stops.length > 0) {
        // Create map of stop_id to routes
        const stopRoutes = {};
        if (window.searchData.stopTimes && window.searchData.trips) {
            window.searchData.stopTimes.forEach(st => {
                const trip = window.searchData.trips.find(t => t.trip_id === st.trip_id);
                if (trip) {
                    if (!stopRoutes[st.stop_id]) stopRoutes[st.stop_id] = new Set();
                    stopRoutes[st.stop_id].add(trip.route_id);
                }
            });
        }
        window.stopRoutes = stopRoutes;
        document.getElementById('lines-list').style.display = 'none';
        window.stopsData = stops;
        window.currentStopsPage = 1;
        window.currentStopsPerPage = 25;
        document.getElementById('stops-controls').style.display = 'block';
        displayStopsPage(1, 25);
        console.log('Stops table populated');

        // Add markers for all stops
        const allPoints = [];
        stops.forEach(stop => {
            const lat = parseFloat(stop.stop_lat);
            const lon = parseFloat(stop.stop_lon);
            if (!isNaN(lat) && !isNaN(lon)) {
                const stopCode = stop.stop_code || stop.stop_id;
                const popup = `${escapeHtml(stop.stop_name)} (${stopCode})`;
                const icon = {
                    html: `<div style="background-color: yellow; color: black; border: 2px solid black; border-radius: 0%; width: 36px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${stopCode}</div>`,
                    iconSize: [36, 18],
                    iconAnchor: [18, 9]
                };
                window.parent.postMessage({type: 'addMarker', data: {lat, lon, popup, icon}}, '*');
                allPoints.push([lat, lon]);
            }
        });

        // Fit bounds if points exist
        if (allPoints.length > 0) {
            const lats = allPoints.map(p => p[0]);
            const lngs = allPoints.map(p => p[1]);
            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);
            const minLng = Math.min(...lngs);
            const maxLng = Math.max(...lngs);
            const bounds = `${minLng},${minLat},${maxLng},${maxLat}`;
            window.parent.postMessage({type: 'fitBounds', data: {bounds}}, '*');
        }
    } else {
        document.getElementById('lines-list').style.display = 'none';
        window.stopsData = [];
        window.currentStopsPage = 1;
        window.currentStopsPerPage = 25;
        document.getElementById('stops-controls').style.display = 'block';
        const tbody = document.getElementById('stops-tbody');
        tbody.innerHTML = '<tr><td colspan="3">No stops data available for this GTFS folder.</td></tr>';
        document.getElementById('stops-table').style.display = 'table';
        console.log('No stops to display');
    }
}

// Sort the route stops table by column
function sortRouteStops(routeId, direction, columnIndex) {
    if (!window.routeStops[routeId] || !window.routeStops[routeId][direction]) return;
    const stops = window.routeStops[routeId][direction];
    const headers = ['sequence', 'stop_name', 'stop_code'];
    const key = headers[columnIndex];
    stops.sort((a, b) => {
        let valA, valB;
        if (key === 'sequence') {
            valA = a.sequence;
            valB = b.sequence;
        } else {
            valA = (a[key] || a.stop_id || '').toString();
            valB = (b[key] || b.stop_id || '').toString();
        }
        if (valA < valB) return -1;
        if (valA > valB) return 1;
        return 0;
    });
    const safeRouteId = routeId.replace(/[^a-zA-Z0-9-_]/g, '_');
    const tbody = document.querySelector(`#stops-table-${safeRouteId}-${direction} tbody`);
    tbody.innerHTML = '';
    stops.forEach((stop, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="border: 1px solid #ddd; padding: 8px;">${index + 1}</td>
            <td style="border: 1px solid #ddd; padding: 8px; cursor: pointer; text-decoration: underline;" onclick="zoomToStop('${stop.stop_id.replace(/'/g, "\\'")}')">${escapeHtml(stop.stop_name)}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${stop.stop_code || stop.stop_id}</td>
        `;
        tbody.appendChild(row);
    });
}

// Sort the stops table by column
function sortTable(columnIndex) {
    if (!window.stopsData) return;
    const headers = ['stop_id', 'stop_name', 'stop_code'];
    const key = headers[columnIndex];
    window.stopsData.sort((a, b) => {
        const valA = (a[key] || a.stop_id || '').toString();
        const valB = (b[key] || b.stop_id || '').toString();
        if (valA < valB) return -1;
        if (valA > valB) return 1;
        return 0;
    });
    displayStopsPage(window.currentStopsPage, window.currentStopsPerPage);
}

// Display a page of stops
function displayStopsPage(page, perPage) {
    window.currentStopsPage = page;
    window.currentStopsPerPage = perPage;
    const stops = window.stopsData;
    let start, end;
    if (perPage === 'all') {
        start = 0;
        end = stops.length;
    } else {
        start = (page - 1) * perPage;
        end = start + perPage;
    }
    const pageStops = stops.slice(start, end);
    const tbody = document.getElementById('stops-tbody');
    tbody.innerHTML = '';
    pageStops.forEach(stop => {
        const routes = window.stopRoutes[stop.stop_id] || new Set();
        const routeLinks = Array.from(routes).map(routeId => {
            const route = window.searchData.routes.find(r => r.route_id === routeId);
            const name = route ? escapeHtml(route.route_short_name || route.route_long_name || routeId) : routeId;
            return `<a href="#" onclick="event.preventDefault(); showTrackForRoute('${routeId.replace(/'/g, "\\'").replace(/"/g, '\\"')}')">${name}</a>`;
        }).join(', ');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="border: 1px solid #ddd; padding: 8px; cursor: pointer; text-decoration: underline;" onclick="zoomToStop('${stop.stop_id.replace(/'/g, "\\'").replace(/"/g, '\\"')}')">${stop.stop_id}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${escapeHtml(stop.stop_name)}${routeLinks ? '<br><small>' + routeLinks + '</small>' : ''}</td>
            <td style="border: 1px solid #ddd; padding: 8px; cursor: pointer; text-decoration: underline;" onclick="zoomToStop('${stop.stop_id.replace(/'/g, "\\'").replace(/"/g, '\\"')}')">${stop.stop_code || stop.stop_id}</td>
        `;
        tbody.appendChild(row);
    });
    document.getElementById('stops-table').style.display = 'table';
    updateStopsPagination();
}

// Update pagination controls
function updateStopsPagination() {
    const perPage = window.currentStopsPerPage;
    const page = window.currentStopsPage;
    const totalStops = window.stopsData.length;
    let totalPages;
    if (perPage === 'all') {
        totalPages = 1;
    } else {
        totalPages = Math.ceil(totalStops / perPage);
    }
    let html = '';
    if (totalPages > 1) {
        if (page > 1) html += `<button onclick="displayStopsPage(${page - 1}, ${perPage === 'all' ? "'all'" : perPage})">Previous</button> `;
        const startPage = Math.max(1, page - 2);
        const endPage = Math.min(totalPages, page + 2);
        for (let i = startPage; i <= endPage; i++) {
            html += `<button onclick="displayStopsPage(${i}, ${perPage === 'all' ? "'all'" : perPage})" ${i === page ? 'disabled style="font-weight: bold;"' : ''}>${i}</button> `;
        }
        if (page < totalPages) html += `<button onclick="displayStopsPage(${page + 1}, ${perPage === 'all' ? "'all'" : perPage})">Next</button>`;
    }
    document.getElementById('stops-pagination').innerHTML = html;
}

// Handle change in entries per page
function changeStopsPerPage() {
    const val = document.getElementById('stops-per-page').value;
    const perPage = val === 'all' ? 'all' : parseInt(val);
    displayStopsPage(1, perPage);
}

// Show all tracks (shapes) in the GTFS
async function showAllTracks() {
    console.log('showAllTracks called');
    await loadGtfsShapes();
    if (!window.searchData.shapes || window.searchData.shapes.length === 0) {
        console.log('No shapes to display');
        return;
    }
    const shapes = window.searchData.shapes;
    const shapeMap = {};
    shapes.forEach(s => {
        if (!shapeMap[s.shape_id]) shapeMap[s.shape_id] = [];
        shapeMap[s.shape_id].push({
            lat: parseFloat(s.shape_pt_lat),
            lng: parseFloat(s.shape_pt_lon),
            seq: parseInt(s.shape_pt_sequence)
        });
    });
    const colors = ['blue', 'red', 'green', 'orange', 'purple', 'pink', 'brown', 'gray', 'black', 'yellow'];
    let colorIndex = 0;
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    Object.keys(shapeMap).forEach(shapeId => {
        const points = shapeMap[shapeId];
        points.sort((a, b) => a.seq - b.seq);
        const coords = points.map(p => [p.lat, p.lng]);
        const color = colors[colorIndex % colors.length];
        colorIndex++;
        if (coords.length > 1) {
            console.log('Adding polyline for shape', shapeId, 'with', coords.length, 'points');
            window.parent.postMessage({type: 'addPolyline', data: {coords, color}}, '*');
            // Update bounds
            coords.forEach(([lat, lng]) => {
                minLat = Math.min(minLat, lat);
                maxLat = Math.max(maxLat, lat);
                minLng = Math.min(minLng, lng);
                maxLng = Math.max(maxLng, lng);
            });
        }
    });
    if (minLat !== Infinity) {
        const bounds = `${minLng},${minLat},${maxLng},${maxLat}`;
        window.parent.postMessage({type: 'fitBounds', data: {bounds}}, '*');
    }
    console.log('All tracks displayed');
}

// Populate search options
function populateSearchOptions() {
    const datalist = document.getElementById('search-options');
    datalist.innerHTML = '';
    const options = new Set();
    if (window.searchData.routes) {
        window.searchData.routes.forEach(route => {
            if (route.route_id) options.add(route.route_id);
            if (route.route_short_name) options.add(route.route_short_name);
            if (route.route_long_name) options.add(route.route_long_name);
        });
    }
    if (window.searchData.stops) {
        window.searchData.stops.forEach(stop => {
            if (stop.stop_id) options.add(stop.stop_id);
            if (stop.stop_code) options.add(stop.stop_code);
            if (stop.stop_name) options.add(stop.stop_name);
        });
    }
    options.forEach(val => {
        const option = document.createElement('option');
        option.value = val;
        datalist.appendChild(option);
    });
    console.log('Search options populated with', options.size, 'items');
}

// Handle search
function handleSearch(value) {
    value = value.trim();
    if (!value) return;
    if (!window.searchData.routes) {
        console.log('Routes not loaded');
        return;
    }
    if (!window.searchData.stops) {
        console.log('Stops not loaded');
        return;
    }
    let route = window.searchData.routes.find(r => r.route_id === value || r.route_short_name === value || r.route_long_name === value);
    if (route) {
        showTrackForRoute(route.route_id);
        const safeId = route.route_id.replace(/[^a-zA-Z0-9-_]/g, '_');
        document.getElementById(`route-${safeId}`).scrollIntoView({behavior: 'smooth'});
        return;
    }
    let stop = window.searchData.stops.find(s => s.stop_id === value || s.stop_code === value || s.stop_name === value);
    if (stop) {
        zoomToStop(stop.stop_id);
        return;
    }
    console.log('No match found for:', value);
}

// Show GTFS summary
async function showGtfsSummary() {
    const summaryDiv = document.getElementById('gtfs-summary');
    summaryDiv.innerHTML = 'Loading summary...';
    const files = ['agency.txt', 'stops.txt', 'routes.txt', 'trips.txt', 'shapes.txt', 'calendar.txt', 'calendar_dates.txt', 'stop_times.txt'];
    const fileLabels = {
        'agency.txt': 'agencies',
        'stops.txt': 'stops',
        'routes.txt': 'routes',
        'trips.txt': 'trips',
        'shapes.txt': 'shape points',
        'calendar.txt': 'calendars',
        'calendar_dates.txt': 'calendar dates',
        'stop_times.txt': 'stop times'
    };
    const summary = [];
    for (const file of files) {
        try {
            const response = await fetch(getGtfsPath(file));
            if (!response.ok) continue;
            const text = await response.text();
            const lines = text.split('\n').length;
            const records = lines > 0 ? lines - 1 : 0;
            summary.push(`${file}: ${lines} lines, ${records} ${fileLabels[file]}`);
        } catch (error) {
            // Skip if file not found or error
        }
    }
    summaryDiv.innerHTML = summary.join('<br>');
}
