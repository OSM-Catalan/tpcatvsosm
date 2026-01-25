// Functions for the webapp

// Simple CSV line parser
function parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current); // Add the last field
    return result;
}

// Update sidebar with stops list
function updateSidebar(stops, type) {
    const stopsList = document.getElementById('stops-list');
    stopsList.innerHTML = ''; // Clear existing list

    stops.forEach((stop, index) => {
        const stopItem = document.createElement('div');
        stopItem.className = 'stop-item';

        let name = '';
        if (type === 'osm') {
            name = stop.tags ? (stop.tags.name || `OSM Stop ${index + 1}`) : `OSM Stop ${index + 1}`;
        } else if (type === 'gtfs') {
            name = stop.name || `GTFS Stop ${index + 1}`;
        }

        stopItem.textContent = name;
        stopItem.addEventListener('click', () => {
            const currentZoom = map.getZoom();
            map.setView([stop.lat, stop.lon], currentZoom);
        });

        stopsList.appendChild(stopItem);
    });
}

// Load OSM stops via Overpass
async function loadOsmStops() {
    const bounds = map.getBounds();
    const south = bounds.getSouth();
    const west = bounds.getWest();
    const north = bounds.getNorth();
    const east = bounds.getEast();
    const bboxCoords = `${south},${west},${north},${east}`;
    const query = `
        [out:json][timeout:45][maxsize:1048576];
        (
            node["highway"="bus_stop"](${bboxCoords});
            way["highway"="bus_stop"](${bboxCoords});
            relation["highway"="bus_stop"](${bboxCoords});
            node["public_transport"="platform"]["bus"="yes"](${bboxCoords});
            way["public_transport"="platform"]["bus"="yes"](${bboxCoords});
            relation["public_transport"="platform"]["bus"="yes"](${bboxCoords});
            node["public_transport"="platform"]["route"="bus"](${bboxCoords});
            way["public_transport"="platform"]["route"="bus"](${bboxCoords});
            relation["public_transport"="platform"]["route"="bus"](${bboxCoords});
        );
        out;
    `;

    try {
        // Try multiple Overpass servers in order of preference
        const servers = [
            'https://z.overpass-api.de/api/interpreter',
            'https://overpass.kumi.systems/api/interpreter',
            'https://overpass-api.de/api/interpreter'
        ];

        let response;
        for (const server of servers) {
            try {
                response = await fetch(server, {
                    method: 'POST',
                    body: query
                });
                if (response.ok) break;
            } catch (e) {
                console.warn(`Server ${server} failed, trying next...`);
            }
        }

        if (!response || !response.ok) {
            throw new Error('All Overpass servers failed');
        }

        const data = await response.json();
        osmStopsLayer = L.layerGroup();
        data.elements.forEach(element => {
            // Create popup content with all tags and editing links
            const elementType = element.type; // 'node', 'way', or 'relation'
            let popupContent = `<b>OSM Stop (${elementType})</b><br>`;
            popupContent += `OSM ID: ${element.id}<br>`;
            popupContent += `<a href="https://www.openstreetmap.org/edit?editor=id&${elementType}=${element.id}" target="_blank">Edit in iD</a><br>`;
            popupContent += `<a href="http://127.0.0.1:8111/load_and_zoom?left=${element.lon-0.001}&right=${element.lon+0.001}&top=${element.lat+0.001}&bottom=${element.lat-0.001}&select=${elementType}${element.id}" target="_blank">Edit in JOSM</a><br><br>`;

            if (element.tags) {
                popupContent += '<b>Tags:</b><br>';
                for (const [key, value] of Object.entries(element.tags)) {
                    popupContent += `${key}: ${value}<br>`;
                }
            } else {
                popupContent += 'No tags available';
            }
            const marker = L.circleMarker([element.lat, element.lon], {
                color: 'blue',
                fillColor: 'blue',
                fillOpacity: 0.5,
                radius: 25
            }).bindPopup(popupContent);
            osmStopsLayer.addLayer(marker);
        });
        map.addLayer(osmStopsLayer);
        // Store OSM stops data for comparison
        osmStopsData = data.elements;
        // Update sidebar with OSM stops
        updateSidebar(data.elements, 'osm');
    } catch (error) {
        console.error('Error loading OSM stops:', error);
    }
}

// Load GTFS stops
async function loadGtfsStops() {
    try {
        const response = await fetch('gtfs_amb_bus/stops.txt');
        const csvText = await response.text();
        const lines = csvText.split('\n');
        gtfsStopsLayer = L.layerGroup();
        const gtfsStops = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                // Simple CSV parser that handles quoted fields
                const values = parseCsvLine(line);
                if (values.length >= 6) {
                    const lat = parseFloat(values[4]);
                    const lon = parseFloat(values[5]);
                    const name = values[2].replace(/^"(.*)"$/, '$1'); // Remove quotes from name
                    if (!isNaN(lat) && !isNaN(lon)) {
                        const stop = {
                            lat: lat,
                            lon: lon,
                            name: name,
                            type: 'gtfs'
                        };
                        gtfsStops.push(stop);
                        const marker = L.circleMarker([lat, lon], {
                            color: 'yellow',
                            fillColor: 'yellow',
                            fillOpacity: 0.5,
                            radius: 25
                        }).bindPopup(`GTFS Stop: ${name}`);
                        gtfsStopsLayer.addLayer(marker);
                    }
                }
            }
        }
        map.addLayer(gtfsStopsLayer);
        // Store GTFS stops data for comparison
        gtfsStopsData = gtfsStops;
        // Update sidebar with GTFS stops
        updateSidebar(gtfsStops, 'gtfs');
    } catch (error) {
        console.error('Error loading GTFS stops:', error);
    }
}

// Calculate coordinate differences between GTFS and OSM stops
function calculateCoordinateDifferences() {
    if (osmStopsData.length === 0) {
        alert('Please load OSM stops (from Overpass) first. No reference data available for differences calculation.');
        return;
    }
    if (gtfsStopsData.length === 0) {
        alert('Please load GTFS stops first to calculate differences.');
        return;
    }

    let differences = [];
    let totalLatDiff = 0;
    let totalLonDiff = 0;
    let count = 0;

    osmStopsData.forEach(osmStop => {
        let closestGtfs = null;
        let minDistance = Infinity;

        gtfsStopsData.forEach(gtfsStop => {
            const distance = Math.sqrt(
                Math.pow(osmStop.lat - gtfsStop.lat, 2) +
                Math.pow(osmStop.lon - gtfsStop.lon, 2)
            );
            if (distance < minDistance) {
                minDistance = distance;
                closestGtfs = gtfsStop;
            }
        });

        if (closestGtfs) {
            const latDiff = osmStop.lat - closestGtfs.lat;
            const lonDiff = osmStop.lon - closestGtfs.lon;

            differences.push({
                osmStop: osmStop,
                gtfsStop: closestGtfs,
                osmName: osmStop.tags ? osmStop.tags.name || 'Unnamed' : 'Unnamed',
                gtfsName: closestGtfs.name,
                osmLat: osmStop.lat,
                osmLon: osmStop.lon,
                gtfsLat: closestGtfs.lat,
                gtfsLon: closestGtfs.lon,
                latDiff: latDiff,
                lonDiff: lonDiff,
                distance: minDistance
            });

            totalLatDiff += Math.abs(latDiff);
            totalLonDiff += Math.abs(lonDiff);
            count++;
        }
    });

    // Store differences globally for display
    window.coordinateDifferences = differences;

    // Display results in console and alert
    console.log('Coordinate Differences:', differences);

    const avgLatDiff = totalLatDiff / count;
    const avgLonDiff = totalLonDiff / count;

    alert(`Coordinate Differences Calculated:
Total comparisons: ${count}
Average latitude difference: ${avgLatDiff.toFixed(6)} degrees
Average longitude difference: ${avgLonDiff.toFixed(6)} degrees

Individual differences shown in sidebar.`);

    // Update markers for minor differences (show in green)
    updateMarkersForMinorDifferences(differences);

    // Update sidebar to show differences
    updateSidebarWithDifferences(differences);
}

// Update markers to green for stops with minor coordinate differences
function updateMarkersForMinorDifferences(differences) {
    const minorThreshold = 0.001; // About 100 meters

    differences.forEach(diff => {
        if (diff.distance < minorThreshold) {
            // Find and update OSM marker
            osmStopsLayer.eachLayer(layer => {
                if (layer.getLatLng().lat === diff.osmStop.lat &&
                    layer.getLatLng().lng === diff.osmStop.lon) {
                    // Remove old marker and add green one
                    osmStopsLayer.removeLayer(layer);
                    const elementType = diff.osmStop.type;
                    let greenPopupContent = `<b>OSM Stop (${elementType}) - Minor diff</b><br>`;
                    greenPopupContent += `OSM ID: ${diff.osmStop.id}<br>`;
                    greenPopupContent += `<a href="https://www.openstreetmap.org/edit?editor=id&${elementType}=${diff.osmStop.id}" target="_blank">Edit in iD</a><br>`;
                    greenPopupContent += `<a href="http://127.0.0.1:8111/load_and_zoom?left=${diff.osmStop.lon-0.001}&right=${diff.osmStop.lon+0.001}&top=${diff.osmStop.lat+0.001}&bottom=${diff.osmStop.lat-0.001}&select=${elementType}${diff.osmStop.id}" target="_blank">Edit in JOSM</a><br><br>`;
                    greenPopupContent += diff.osmName;

                    const greenMarker = L.circleMarker([diff.osmStop.lat, diff.osmStop.lon], {
                        color: 'green',
                        fillColor: 'green',
                        fillOpacity: 0.5,
                        radius: 25
                    }).bindPopup(greenPopupContent);
                    osmStopsLayer.addLayer(greenMarker);
                }
            });

            // Find and update GTFS marker
            gtfsStopsLayer.eachLayer(layer => {
                if (layer.getLatLng().lat === diff.gtfsStop.lat &&
                    layer.getLatLng().lng === diff.gtfsStop.lon) {
                    // Remove old marker and add green one
                    gtfsStopsLayer.removeLayer(layer);
                    const greenMarker = L.circleMarker([diff.gtfsStop.lat, diff.gtfsStop.lon], {
                        color: 'green',
                        fillColor: 'green',
                        fillOpacity: 0.5,
                        radius: 25
                    }).bindPopup(`<b>GTFS Stop (Minor diff)</b><br>${diff.gtfsName}`);
                    gtfsStopsLayer.addLayer(greenMarker);
                }
            });
        }
    });
}

// Global variables for pagination and sorting
let currentPage = 1;
let itemsPerPage = 25;
let currentSortColumn = null;
let currentSortDirection = 'asc';

// Update sidebar to show coordinate differences
function updateSidebarWithDifferences(differences) {
    const stopsList = document.getElementById('stops-list');
    stopsList.innerHTML = '<h4>Coordinate Differences</h4>'; // Clear and add header

    // Create pagination controls
    const paginationControls = createPaginationControls(differences.length);
    stopsList.appendChild(paginationControls);

    // Sort differences if needed
    let sortedDifferences = [...differences];
    if (currentSortColumn) {
        sortedDifferences.sort((a, b) => {
            let aVal, bVal;
            switch (currentSortColumn) {
                case 'osmName':
                    aVal = a.osmName.toLowerCase();
                    bVal = b.osmName.toLowerCase();
                    break;
                case 'gtfsName':
                    aVal = a.gtfsName.toLowerCase();
                    bVal = b.gtfsName.toLowerCase();
                    break;
                case 'latDiff':
                    aVal = a.latDiff;
                    bVal = b.latDiff;
                    break;
                case 'lonDiff':
                    aVal = a.lonDiff;
                    bVal = b.lonDiff;
                    break;
                case 'distance':
                    aVal = a.distance;
                    bVal = b.distance;
                    break;
                default:
                    return 0;
            }

            if (aVal < bVal) return currentSortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return currentSortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // Paginate
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedDifferences = sortedDifferences.slice(startIndex, endIndex);

    // Create table
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '11px';

    // Table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = [
        { text: 'OSM Stop', key: 'osmName' },
        { text: 'GTFS Stop', key: 'gtfsName' },
        { text: 'Lat Diff (°)', key: 'latDiff' },
        { text: 'Lon Diff (°)', key: 'lonDiff' },
        { text: 'Distance (m)', key: 'distance' }
    ];

    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header.text;
        th.style.border = '1px solid #ddd';
        th.style.padding = '4px';
        th.style.backgroundColor = '#f2f2f2';
        th.style.textAlign = 'left';
        th.style.cursor = 'pointer';
        th.style.userSelect = 'none';

        // Add sort indicator
        if (currentSortColumn === header.key) {
            th.textContent += currentSortDirection === 'asc' ? ' ▲' : ' ▼';
        }

        // Click handler for sorting
        th.addEventListener('click', () => {
            if (currentSortColumn === header.key) {
                currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortColumn = header.key;
                currentSortDirection = 'asc';
            }
            updateSidebarWithDifferences(differences);
        });

        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Table body
    const tbody = document.createElement('tbody');
    paginatedDifferences.forEach((diff, index) => {
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.style.border = '1px solid #ddd';

        // Add hover effect
        row.addEventListener('mouseover', () => row.style.backgroundColor = '#f9f9f9');
        row.addEventListener('mouseout', () => row.style.backgroundColor = '');

        // Click to center map
        row.addEventListener('click', () => {
            const currentZoom = map.getZoom();
            map.setView([diff.gtfsStop.lat, diff.gtfsStop.lon], currentZoom);
        });

        const cells = [
            diff.osmName,
            diff.gtfsName,
            diff.latDiff.toFixed(6),
            diff.lonDiff.toFixed(6),
            (diff.distance * 111000).toFixed(1)
        ];

        cells.forEach(cellText => {
            const td = document.createElement('td');
            td.textContent = cellText;
            td.style.border = '1px solid #ddd';
            td.style.padding = '6px';
            td.style.minWidth = '100px';
            td.style.maxWidth = '150px';
            td.style.overflow = 'hidden';
            td.style.textOverflow = 'ellipsis';
            td.style.whiteSpace = 'nowrap';
            td.style.fontSize = '10px';
            row.appendChild(td);
        });

        tbody.appendChild(row);
    });
    table.appendChild(tbody);

    stopsList.appendChild(table);
}

// Create pagination controls
function createPaginationControls(totalItems) {
    const controls = document.createElement('div');
    controls.style.marginBottom = '10px';

    // Items per page selector
    const perPageLabel = document.createElement('label');
    perPageLabel.textContent = 'Items per page: ';
    perPageLabel.style.fontSize = '11px';

    const perPageSelect = document.createElement('select');
    perPageSelect.style.fontSize = '11px';
    perPageSelect.style.marginRight = '10px';
    [10, 25, 50, 100].forEach(num => {
        const option = document.createElement('option');
        option.value = num;
        option.textContent = num;
        if (num === itemsPerPage) option.selected = true;
        perPageSelect.appendChild(option);
    });

    perPageSelect.addEventListener('change', () => {
        itemsPerPage = parseInt(perPageSelect.value);
        currentPage = 1;
        // Re-render with current differences
        if (window.coordinateDifferences) {
            updateSidebarWithDifferences(window.coordinateDifferences);
        }
    });

    // Page navigation
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pageControls = document.createElement('span');
    pageControls.style.fontSize = '11px';

    if (totalPages > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '←';
        prevBtn.disabled = currentPage === 1;
        prevBtn.style.fontSize = '11px';
        prevBtn.style.margin = '0 2px';
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                updateSidebarWithDifferences(window.coordinateDifferences);
            }
        });
        pageControls.appendChild(prevBtn);

        const pageInfo = document.createElement('span');
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        pageInfo.style.margin = '0 5px';
        pageControls.appendChild(pageInfo);

        const nextBtn = document.createElement('button');
        nextBtn.textContent = '→';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.style.fontSize = '11px';
        nextBtn.style.margin = '0 2px';
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                updateSidebarWithDifferences(window.coordinateDifferences);
            }
        });
        pageControls.appendChild(nextBtn);
    }

    controls.appendChild(perPageLabel);
    controls.appendChild(perPageSelect);
    controls.appendChild(pageControls);

    return controls;
}

// Load GTFS trips
async function loadGtfsTrips() {
    try {
        const response = await fetch('gtfs_amb_bus/trips.txt');
        const csvText = await response.text();
        const lines = csvText.split('\n');

        tripsData = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const values = parseCsvLine(line);
                if (values.length >= 4) {
                    const trip = {
                        routeId: values[0],
                        serviceId: values[1],
                        tripId: values[2],
                        shapeId: values[3]
                    };
                    tripsData.push(trip);
                }
            }
        }
    } catch (error) {
        console.error('Error loading GTFS trips:', error);
    }
}

// Load GTFS shapes
async function loadGtfsShapes() {
    try {
        const response = await fetch('gtfs_amb_bus/shapes.txt');
        const csvText = await response.text();
        const lines = csvText.split('\n');

        window.shapesData = {};
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const values = parseCsvLine(line);
                if (values.length >= 4) {
                    const shapeId = values[0];
                    const lat = parseFloat(values[1]);
                    const lon = parseFloat(values[2]);
                    const sequence = parseInt(values[3]);
                    if (!window.shapesData[shapeId]) {
                        window.shapesData[shapeId] = [];
                    }
                    window.shapesData[shapeId].push({
                        lat: lat,
                        lon: lon,
                        sequence: sequence
                    });
                }
            }
        }
        // Sort each shape by sequence
        for (const shapeId in window.shapesData) {
            window.shapesData[shapeId].sort((a, b) => a.sequence - b.sequence);
        }
    } catch (error) {
        console.error('Error loading GTFS shapes:', error);
    }
}

// Load GTFS stops data (without displaying)
async function loadGtfsStopsData() {
    try {
        const response = await fetch('gtfs_amb_bus/stops.txt');
        const csvText = await response.text();
        const lines = csvText.split('\n');

        window.stopsData = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const values = parseCsvLine(line);
                if (values.length >= 6) {
                    const lat = parseFloat(values[4]);
                    const lon = parseFloat(values[5]);
                    const name = values[2].replace(/^"(.*)"$/, '$1');
                    if (!isNaN(lat) && !isNaN(lon)) {
                        const stop = {
                            id: values[0],
                            name: name,
                            lat: lat,
                            lon: lon
                        };
                        window.stopsData.push(stop);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error loading GTFS stops data:', error);
    }
}

// Load GTFS stop times
async function loadGtfsStopTimes() {
    try {
        const response = await fetch('gtfs_amb_bus/stop_times.txt');
        const csvText = await response.text();
        const lines = csvText.split('\n');

        window.stopTimesData = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const values = parseCsvLine(line);
                if (values.length >= 5) {
                    const stopTime = {
                        tripId: values[0],
                        arrivalTime: values[1],
                        departureTime: values[2],
                        stopId: values[3],
                        stopSequence: parseInt(values[4])
                    };
                    window.stopTimesData.push(stopTime);
                }
            }
        }
    } catch (error) {
        console.error('Error loading GTFS stop times:', error);
    }
}

// Get stops for a specific route in sequence (unique stops)
function getStopsForRoute(routeId) {
    // Find trips for this route
    const routeTrips = tripsData.filter(trip => trip.routeId === routeId);
    if (routeTrips.length === 0) return [];

    // Get all stop times for all trips of this route
    const allStopTimes = [];
    routeTrips.forEach(trip => {
        const tripStopTimes = window.stopTimesData.filter(st => st.tripId === trip.tripId);
        allStopTimes.push(...tripStopTimes);
    });

    // Group by stopId and find the minimum sequence across all trips
    const stopSequences = {};
    allStopTimes.forEach(st => {
        if (!stopSequences[st.stopId] || st.stopSequence < stopSequences[st.stopId]) {
            stopSequences[st.stopId] = st.stopSequence;
        }
    });

    // Sort by sequence
    const sortedStopIds = Object.keys(stopSequences).sort((a, b) => stopSequences[a] - stopSequences[b]);

    // Load stops data if not loaded
    if (!window.stopsData) {
        return [];
    }

    // Get stop details
    const stops = sortedStopIds.map((stopId, index) => {
        const stop = window.stopsData.find(s => s.id === stopId);
        if (stop) {
            return {
                ...stop,
                sequence: index + 1  // Re-sequence from 1
            };
        }
        return null;
    }).filter(stop => stop !== null);

    return stops;
}

// Load GTFS stops for a specific route
function loadGtfsStopsForRoute(routeId) {
    const routeStops = getStopsForRoute(routeId);
    if (routeStops.length === 0) {
        alert('No stops found for this route.');
        return;
    }

    // Clear existing GTFS stops layer
    map.removeLayer(gtfsStopsLayer);
    gtfsStopsLayer = L.layerGroup();

    routeStops.forEach(stop => {
        // Create a divIcon with the sequence number
        const icon = L.divIcon({
            className: 'stop-number-icon',
            html: `<div class="stop-number">${stop.sequence}</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        const marker = L.marker([stop.lat, stop.lon], {
            icon: icon
        }).bindPopup(`GTFS Stop ${stop.sequence}: ${stop.name}`);
        gtfsStopsLayer.addLayer(marker);
    });

    map.addLayer(gtfsStopsLayer);
    // Store GTFS stops data for this route
    gtfsStopsData = routeStops;
    // Update sidebar with route stops in sequence
    updateSidebarWithRouteStops(routeStops);
}

// Update sidebar with route stops in sequence
function updateSidebarWithRouteStops(stops) {
    const stopsList = document.getElementById('stops-list');
    stopsList.innerHTML = '<h4>Route Stops (Sequence)</h4>';

    // Add back button
    const backBtn = document.createElement('button');
    backBtn.textContent = '← Back to Lines';
    backBtn.style.marginBottom = '10px';
    backBtn.addEventListener('click', () => {
        populateSidebarWithLines();
    });
    stopsList.appendChild(backBtn);

    stops.forEach(stop => {
        const stopItem = document.createElement('div');
        stopItem.className = 'stop-item';
        stopItem.textContent = `${stop.sequence}. ${stop.name}`;
        stopItem.addEventListener('click', () => {
            const currentZoom = map.getZoom();
            map.setView([stop.lat, stop.lon], currentZoom);
        });
        stopsList.appendChild(stopItem);
    });

    // Add button to load OSM stops for this route
    const loadOsmBtn = document.createElement('button');
    loadOsmBtn.textContent = 'Load OSM Stops for this Route';
    loadOsmBtn.style.marginTop = '10px';
    loadOsmBtn.addEventListener('click', () => {
        loadOsmStopsForRoute();
    });
    stopsList.appendChild(loadOsmBtn);
}

// Load OSM stops for the currently selected route
async function loadOsmStopsForRoute() {
    if (!currentRoute) {
        alert('Please select a bus line first.');
        return;
    }

    const route = currentRoute;

    const bounds = map.getBounds();
    const south = bounds.getSouth();
    const west = bounds.getWest();
    const north = bounds.getNorth();
    const east = bounds.getEast();
    const bboxCoords = `${south},${west},${north},${east}`;

    // Query for bus stops with the route ref
    const query = `
        [out:json][timeout:45][maxsize:1048576];
        (
            node["highway"="bus_stop"]["ref"="${route.shortName}"](${bboxCoords});
            way["highway"="bus_stop"]["ref"="${route.shortName}"](${bboxCoords});
            relation["highway"="bus_stop"]["ref"="${route.shortName}"](${bboxCoords});
            node["public_transport"="platform"]["bus"="yes"]["ref"="${route.shortName}"](${bboxCoords});
            way["public_transport"="platform"]["bus"="yes"]["ref"="${route.shortName}"](${bboxCoords});
            relation["public_transport"="platform"]["bus"="yes"]["ref"="${route.shortName}"](${bboxCoords});
            node["public_transport"="platform"]["route"="bus"]["ref"="${route.shortName}"](${bboxCoords});
            way["public_transport"="platform"]["route"="bus"]["ref"="${route.shortName}"](${bboxCoords});
            relation["public_transport"="platform"]["route"="bus"]["ref"="${route.shortName}"](${bboxCoords});
        );
        out;
    `;

    try {
        // Try multiple Overpass servers
        const servers = [
            'https://z.overpass-api.de/api/interpreter',
            'https://overpass.kumi.systems/api/interpreter',
            'https://overpass-api.de/api/interpreter'
        ];

        let response;
        for (const server of servers) {
            try {
                response = await fetch(server, {
                    method: 'POST',
                    body: query
                });
                if (response.ok) break;
            } catch (e) {
                console.warn(`Server ${server} failed, trying next...`);
            }
        }

        if (!response || !response.ok) {
            alert('No OSM stops found for this route in the current map area.');
            return;
        }

        const data = await response.json();

        // Clear existing OSM stops layer
        map.removeLayer(osmStopsLayer);
        osmStopsLayer = L.layerGroup();

        data.elements.forEach(element => {
            const elementType = element.type;
            let popupContent = `<b>OSM Stop (${elementType}) - Route ${route.shortName}</b><br>`;
            popupContent += `OSM ID: ${element.id}<br>`;
            popupContent += `<a href="https://www.openstreetmap.org/edit?editor=id&${elementType}=${element.id}" target="_blank">Edit in iD</a><br>`;
            popupContent += `<a href="http://127.0.0.1:8111/load_and_zoom?left=${element.lon-0.001}&right=${element.lon+0.001}&top=${element.lat+0.001}&bottom=${element.lat-0.001}&select=${elementType}${element.id}" target="_blank">Edit in JOSM</a><br><br>`;

            if (element.tags) {
                popupContent += '<b>Tags:</b><br>';
                for (const [key, value] of Object.entries(element.tags)) {
                    popupContent += `${key}: ${value}<br>`;
                }
            } else {
                popupContent += 'No tags available';
            }

            const marker = L.circleMarker([element.lat, element.lon], {
                color: 'blue',
                fillColor: 'blue',
                fillOpacity: 0.5,
                radius: 25
            }).bindPopup(popupContent);
            osmStopsLayer.addLayer(marker);
        });

        if (data.elements.length > 0) {
            map.addLayer(osmStopsLayer);
            osmStopsData = data.elements;
            // Update sidebar with OSM stops for route
            updateSidebar(data.elements, 'osm');
        } else {
            alert('No OSM stops found for this route in the current map area.');
        }

    } catch (error) {
        console.error('Error loading OSM stops for route:', error);
        alert('Error loading OSM stops for route.');
    }
}

// Load GTFS routes
async function loadGtfsRoutes() {
    try {
        const response = await fetch('gtfs_amb_bus/routes.txt');
        const csvText = await response.text();
        const lines = csvText.split('\n');

        routesData = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const values = parseCsvLine(line);
                if (values.length >= 4) {
                    const route = {
                        id: values[0],
                        agencyId: values[1],
                        shortName: values[2].replace(/^"(.*)"$/, '$1'),
                        longName: values[3].replace(/^"(.*)"$/, '$1')
                    };
                    routesData.push(route);
                }
            }
        }
    } catch (error) {
        console.error('Error loading GTFS routes:', error);
    }
}

// Load route geometry from GTFS shapes and OSM
async function loadRouteGeometry(routeId) {
    const route = routesData.find(r => r.id === routeId);
    if (!route) return;

    // Clear existing route layer
    map.removeLayer(routeLayer);
    routeLayer = L.layerGroup();

    // First, try to load GTFS shape
    const routeTrips = tripsData.filter(trip => trip.routeId === routeId);
    if (routeTrips.length > 0) {
        const shapeId = routeTrips[0].shapeId; // Take first trip's shape
        if (shapeId && window.shapesData[shapeId]) {
            const shapePoints = window.shapesData[shapeId];
            const latlngs = shapePoints.map(point => [point.lat, point.lon]);
            const polyline = L.polyline(latlngs, {
                color: 'red',
                weight: 4,
                opacity: 0.8
            }).bindPopup(`GTFS Route: ${route.shortName} - ${route.longName}`);
            routeLayer.addLayer(polyline);
        }
    }

    // Then, try OSM geometry
    const bounds = map.getBounds();
    const south = bounds.getSouth();
    const west = bounds.getWest();
    const north = bounds.getNorth();
    const east = bounds.getEast();
    const bboxCoords = `${south},${west},${north},${east}`;

    // Query for bus routes with matching ref
    const query = `
        [out:json][timeout:45][maxsize:1048576];
        (
            relation["route"="bus"]["ref"="${route.shortName}"](${bboxCoords});
            way["route"="bus"]["ref"="${route.shortName}"](${bboxCoords});
            relation["type"="route"]["route"="bus"]["ref"="${route.shortName}"](${bboxCoords});
        );
        out geom;
    `;

    try {
        // Try multiple Overpass servers
        const servers = [
            'https://z.overpass-api.de/api/interpreter',
            'https://overpass.kumi.systems/api/interpreter',
            'https://overpass-api.de/api/interpreter'
        ];

        let response;
        for (const server of servers) {
            try {
                response = await fetch(server, {
                    method: 'POST',
                    body: query
                });
                if (response.ok) break;
            } catch (e) {
                console.warn(`Server ${server} failed, trying next...`);
            }
        }

        if (response && response.ok) {
            const data = await response.json();
            console.log('OSM route query response:', data);

            data.elements.forEach(element => {
                if (element.type === 'relation' && element.members) {
                    console.log('Found relation with', element.members.length, 'members');
                    // For relations, draw ways that are members with geometry
                    element.members.forEach(member => {
                        if (member.type === 'way' && member.geometry) {
                            console.log('Drawing way with', member.geometry.length, 'points');
                            const latlngs = member.geometry.map(coord => [coord.lat, coord.lon]);
                            const polyline = L.polyline(latlngs, {
                                color: 'purple',
                                weight: 4,
                                opacity: 0.8
                            }).bindPopup(`OSM Route: ${route.shortName} - ${route.longName}`);
                            routeLayer.addLayer(polyline);
                        }
                    });
                } else if (element.type === 'way' && element.geometry) {
                    console.log('Found standalone way with', element.geometry.length, 'points');
                    // For standalone ways
                    const latlngs = element.geometry.map(coord => [coord.lat, coord.lon]);
                    const polyline = L.polyline(latlngs, {
                        color: 'purple',
                        weight: 4,
                        opacity: 0.8
                    }).bindPopup(`OSM Route: ${route.shortName} - ${route.longName}`);
                    routeLayer.addLayer(polyline);
                }
            });
        }

        if (routeLayer.getLayers().length > 0) {
            map.addLayer(routeLayer);
            // Fit map to route bounds
            const group = new L.featureGroup(routeLayer.getLayers());
            map.fitBounds(group.getBounds());
        } else {
            alert('No route geometry found in GTFS or OSM for this line.');
        }

    } catch (error) {
        console.error('Error loading route geometry:', error);
        alert('Error loading route geometry from OSM.');
    }
}

// Populate sidebar with lines list
function populateSidebarWithLines() {
    const stopsList = document.getElementById('stops-list');
    stopsList.innerHTML = '<h3>Bus Lines</h3>';

    routesData.forEach(route => {
        const lineItem = document.createElement('div');
        lineItem.className = 'stop-item';
        lineItem.textContent = `${route.agencyId}-${route.shortName}: ${route.longName}`;
        lineItem.style.cursor = 'pointer';
        lineItem.addEventListener('click', () => {
            // Set current route
            currentRoute = route;

            // Clear previous layers
            map.removeLayer(routeLayer);
            map.removeLayer(gtfsStopsLayer);
            map.removeLayer(osmStopsLayer);
            routeLayer = L.layerGroup();
            gtfsStopsLayer = L.layerGroup();
            osmStopsLayer = L.layerGroup();

            // Load route and stops
            loadRouteGeometry(route.id);
            loadGtfsStopsForRoute(route.id);
        });
        stopsList.appendChild(lineItem);
    });
}

// Initialize routes loading
document.addEventListener('DOMContentLoaded', async () => {
    await loadGtfsRoutes();
    await loadGtfsTrips();
    await loadGtfsShapes();
    await loadGtfsStopsData();
    await loadGtfsStopTimes();
    // Populate sidebar with lines
    populateSidebarWithLines();
});
