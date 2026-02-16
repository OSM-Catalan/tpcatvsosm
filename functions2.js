// Functions for the webapp

// Global search data
let searchData = {
    routes: [],
    stops: []
};

// Global variable to store sidebar scroll position
let lastSidebarScrollPosition = 0;

// Global variable to store Nominatim bbox
let nominatimBbox = null;

// Perform Nominatim search to get location bbox
async function performNominatimSearch(query) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&extratags=1`);
        const results = await response.json();
        
        displayNominatimResults(results, query);
    } catch (error) {
        console.error('Error performing Nominatim search:', error);
        nominatimResults.innerHTML = '<div class="search-result-item">Search error. Please try again.</div>';
        nominatimResults.style.display = 'block';
    }
}

// Display Nominatim search results
function displayNominatimResults(results, query) {
    nominatimResults.innerHTML = '';
    
    if (results.length === 0) {
        nominatimResults.innerHTML = '<div class="search-result-item">No results found</div>';
        nominatimResults.style.display = 'block';
        return;
    }
    
    results.forEach(result => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        
        const displayName = result.display_name || result.name;
        const type = result.type || 'place';
        const importance = result.importance || 0;
        
        item.innerHTML = `
            <div class="search-result-type">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
            <div class="search-result-name">${highlightMatch(displayName, query)}</div>
            <div class="search-result-details">Importance: ${(importance * 100).toFixed(1)}%</div>
        `;
        
        item.addEventListener('click', () => {
            selectNominatimResult(result);
            nominatimResults.style.display = 'none';
            nominatimSearch.value = displayName;
        });
        
        nominatimResults.appendChild(item);
    });
    
    nominatimResults.style.display = 'block';
}

// Select a Nominatim result and set bbox
function selectNominatimResult(result) {
    // Store the bbox from Nominatim result
    if (result.boundingbox) {
        nominatimBbox = {
            south: parseFloat(result.boundingbox[0]),
            north: parseFloat(result.boundingbox[1]),
            west: parseFloat(result.boundingbox[2]),
            east: parseFloat(result.boundingbox[3])
        };
        
        // Center map on the selected area
        const centerLat = (nominatimBbox.south + nominatimBbox.north) / 2;
        const centerLon = (nominatimBbox.west + nominatimBbox.east) / 2;
        
        map.setView([centerLat, centerLon], 12);
        
        // Add visual feedback - draw rectangle for the selected area
        if (window.nominatimRectangle) {
            map.removeLayer(window.nominatimRectangle);
        }
        
        const bounds = [[nominatimBbox.south, nominatimBbox.west], [nominatimBbox.north, nominatimBbox.east]];
        window.nominatimRectangle = L.rectangle(bounds, {
            color: '#ff7800',
            weight: 2,
            fillOpacity: 0.1,
            fillColor: '#ff7800'
        }).addTo(map);
        
        // Add popup with area information
        const areaInfo = `
            <b>Selected Area</b><br>
            ${result.display_name}<br>
            Type: ${result.type}<br>
            BBox: ${nominatimBbox.south.toFixed(4)}, ${nominatimBbox.west.toFixed(4)} to ${nominatimBbox.north.toFixed(4)}, ${nominatimBbox.east.toFixed(4)}<br>
            <small>This area will be used for Overpass queries</small>
        `;
        window.nominatimRectangle.bindPopup(areaInfo).openPopup();
        
        console.log('Nominatim bbox set:', nominatimBbox);
    } else {
        // If no bbox, use lat/lon with a small buffer
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        const buffer = 0.01; // ~1km buffer
        
        nominatimBbox = {
            south: lat - buffer,
            north: lat + buffer,
            west: lon - buffer,
            east: lon + buffer
        };
        
        map.setView([lat, lon], 15);
        
        if (window.nominatimRectangle) {
            map.removeLayer(window.nominatimRectangle);
        }
        
        const bounds = [[nominatimBbox.south, nominatimBbox.west], [nominatimBbox.north, nominatimBbox.east]];
        window.nominatimRectangle = L.rectangle(bounds, {
            color: '#ff7800',
            weight: 2,
            fillOpacity: 0.1,
            fillColor: '#ff7800'
        }).addTo(map);
        
        console.log('Nominatim point bbox set:', nominatimBbox);
    }
}

async function loadSearchData() {
    try {
        // Load routes data
        await loadGtfsRoutesForSearch();
        
        // Load stops data
        await loadGtfsStopsForSearch();
        
        console.log(`Search data loaded: ${searchData.routes.length} routes, ${searchData.stops.length} stops`);
    } catch (error) {
        console.error('Error loading search data:', error);
    }
}

// Load GTFS routes for search
async function loadGtfsRoutesForSearch() {
    try {
        const response = await fetch(getGtfsPath('routes.txt'));
        const csvText = await response.text();
        const lines = csvText.split('\n');
        
        searchData.routes = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const values = parseCsvLine(line);
                if (values.length >= 4) {
                    const route = {
                        id: values[0],
                        shortName: values[2] ? values[2].replace(/^"(.*)"$/, '$1') : '',
                        longName: values[3] ? values[3].replace(/^"(.*)"$/, '$1') : '',
                        color: values[7] || '#ffaa00',
                        textColor: values[8] || '#000000'
                    };
                    searchData.routes.push(route);
                }
            }
        }
    } catch (error) {
        console.error('Error loading GTFS routes for search:', error);
    }
}

// Load GTFS stops for search
async function loadGtfsStopsForSearch() {
    try {
        const response = await fetch(getGtfsPath('stops.txt'));
        const csvText = await response.text();
        const lines = csvText.split('\n');
        
        searchData.stops = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const values = parseCsvLine(line);
                if (values.length >= 6) {
                    const lat = parseFloat(values[4]);
                    const lon = parseFloat(values[5]);
                    const name = values[2] ? values[2].replace(/^"(.*)"$/, '$1') : '';
                    
                    if (!isNaN(lat) && !isNaN(lon) && name) {
                        const stop = {
                            id: values[0],
                            name: name,
                            lat: lat,
                            lon: lon
                        };
                        searchData.stops.push(stop);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error loading GTFS stops for search:', error);
    }
}

// Perform search with predictive functionality
function performSearch(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();
    
    // Search routes
    searchData.routes.forEach(route => {
        let score = 0;
        let matchType = '';
        
        // Exact short name match (highest priority)
        if (route.shortName.toLowerCase() === lowerQuery) {
            score = 100;
            matchType = 'exact_short';
        }
        // Starts with short name
        else if (route.shortName.toLowerCase().startsWith(lowerQuery)) {
            score = 80;
            matchType = 'starts_with_short';
        }
        // Contains short name
        else if (route.shortName.toLowerCase().includes(lowerQuery)) {
            score = 60;
            matchType = 'contains_short';
        }
        // Long name match
        else if (route.longName.toLowerCase().includes(lowerQuery)) {
            score = 40;
            matchType = 'contains_long';
        }
        
        if (score > 0) {
            results.push({
                type: 'route',
                data: route,
                score: score,
                matchType: matchType
            });
        }
    });
    
    // Search stops
    searchData.stops.forEach(stop => {
        let score = 0;
        let matchType = '';
        const stopNameLower = stop.name.toLowerCase();
        
        // Exact name match (highest priority)
        if (stopNameLower === lowerQuery) {
            score = 90;
            matchType = 'exact_name';
        }
        // Starts with name
        else if (stopNameLower.startsWith(lowerQuery)) {
            score = 70;
            matchType = 'starts_with_name';
        }
        // Contains name
        else if (stopNameLower.includes(lowerQuery)) {
            score = 50;
            matchType = 'contains_name';
        }
        
        if (score > 0) {
            results.push({
                type: 'stop',
                data: stop,
                score: score,
                matchType: matchType
            });
        }
    });
    
    // Sort by score (descending) and then by type (routes first)
    results.sort((a, b) => {
        if (a.score !== b.score) {
            return b.score - a.score;
        }
        return a.type === 'route' ? -1 : 1;
    });
    
    // Limit results to top 10
    const limitedResults = results.slice(0, 10);
    
    displaySearchResults(limitedResults, query);
}

// Display search results
function displaySearchResults(results, query) {
    searchResults.innerHTML = '';
    
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item">No results found</div>';
        searchResults.style.display = 'block';
        return;
    }
    
    results.forEach(result => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        
        if (result.type === 'route') {
            const route = result.data;
            item.innerHTML = `
                <div class="search-result-type">Line ${route.shortName}</div>
                <div class="search-result-name">${highlightMatch(route.longName, query)}</div>
                <div class="search-result-details">Route ID: ${route.id}</div>
            `;
            
            item.addEventListener('click', () => {
                // Save current scroll position before navigating
                const stopsList = document.getElementById('stops-list');
                lastSidebarScrollPosition = stopsList.scrollTop;
                
                selectRoute(route);
                searchResults.style.display = 'none';
                searchInput.value = `${route.shortName} - ${route.longName}`;
            });
        } else if (result.type === 'stop') {
            const stop = result.data;
            item.innerHTML = `
                <div class="search-result-type">Stop</div>
                <div class="search-result-name">${highlightMatch(stop.name, query)}</div>
                <div class="search-result-details">ID: ${stop.id}</div>
            `;
            
            item.addEventListener('click', () => {
                selectStop(stop);
                searchResults.style.display = 'none';
                searchInput.value = stop.name;
            });
        }
        
        searchResults.appendChild(item);
    });
    
    searchResults.style.display = 'block';
}

// Highlight matching text in results
function highlightMatch(text, query) {
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<strong>$1</strong>');
}

// Escape regex special characters
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Select a route and display it on the map
async function selectRoute(route) {
    try {
        // Set current route
        currentRoute = route;
        
        // Load necessary data if not already loaded
        if (routesData.length === 0) {
            await loadGtfsDataAndPopulateLines();
        }
        
        // Find the full route data from routesData
        const fullRouteData = routesData.find(r => r.id === route.id);
        if (!fullRouteData) {
            // If not found, add the search route data to routesData
            routesData.push({
                ...route,
                agencyId: '73' // Default agency ID
            });
        }
        
        // Display the route with all buttons using the same function as the lines list
        // Don't auto-load route geometry and stops - just show the interface
        displayRouteWithButtons(route);
        
    } catch (error) {
        console.error('Error selecting route:', error);
        alert('Error loading route. Please try again.');
    }
}

// Display a single route with all buttons (same as in populateSidebarWithLines)
function displayRouteWithButtons(route) {
    const stopsList = document.getElementById('stops-list');
    stopsList.innerHTML = '';

    // Add back button at the top
    const backBtn = document.createElement('button');
    backBtn.textContent = '← Back to Lines';
    backBtn.style.marginBottom = '10px';
    backBtn.style.padding = '8px 12px';
    backBtn.style.backgroundColor = '#007bff';
    backBtn.style.color = 'white';
    backBtn.style.border = 'none';
    backBtn.style.borderRadius = '4px';
    backBtn.style.cursor = 'pointer';
    backBtn.style.fontSize = '12px';
    backBtn.addEventListener('click', () => {
        populateSidebarWithLines();
    });
    stopsList.appendChild(backBtn);

    const lineContainer = document.createElement('div');
    lineContainer.style.marginBottom = '15px';
    lineContainer.style.border = '1px solid #ddd';
    lineContainer.style.padding = '10px';
    lineContainer.style.borderRadius = '5px';

    const lineItem = document.createElement('div');
    lineItem.className = 'stop-item';
    lineItem.style.cursor = 'pointer';
    lineItem.style.fontWeight = 'bold';
    
    // Route title
    const titleSpan = document.createElement('span');
    titleSpan.textContent = `${route.agencyId || '73'}-${route.shortName}: ${route.longName}`;
    titleSpan.style.display = 'block';
    titleSpan.style.marginBottom = '8px';
    
    lineItem.appendChild(titleSpan);
    
    lineItem.addEventListener('click', () => {
        // Save current scroll position before navigating
        const stopsList = document.getElementById('stops-list');
        lastSidebarScrollPosition = stopsList.scrollTop;
        
        // Set current route
        currentRoute = route;
        
        // Don't auto-load - just set as current route
        // User can click specific buttons to load what they want
        console.log(`Route ${route.shortName} selected. Click buttons below to load data.`);
    });

    // Create buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.marginTop = '8px';
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.flexDirection = 'column';
    buttonsContainer.style.gap = '5px';

    // First row: OSM and GTFS track buttons
    const trackButtonsContainer = document.createElement('div');
    trackButtonsContainer.style.display = 'flex';
    trackButtonsContainer.style.gap = '5px';

    // OSM Overpass button
    const osmButton = document.createElement('button');
    osmButton.textContent = 'OSM Track';
    osmButton.style.fontSize = '11px';
    osmButton.style.padding = '4px 8px';
    osmButton.style.backgroundColor = '#007cba';
    osmButton.style.color = 'white';
    osmButton.style.border = 'none';
    osmButton.style.borderRadius = '3px';
    osmButton.style.cursor = 'pointer';
    osmButton.addEventListener('click', () => {
        currentRoute = route;
        openOsmTrackOverpass(route);
    });

    // GTFS file button
    const gtfsButton = document.createElement('button');
    gtfsButton.textContent = 'GTFS Track';
    gtfsButton.style.fontSize = '11px';
    gtfsButton.style.padding = '4px 8px';
    gtfsButton.style.backgroundColor = '#28a745';
    gtfsButton.style.color = 'white';
    gtfsButton.style.border = 'none';
    gtfsButton.style.borderRadius = '3px';
    gtfsButton.style.cursor = 'pointer';
    gtfsButton.addEventListener('click', () => {
        currentRoute = route;
        openGtfsTrack(route);
    });

    trackButtonsContainer.appendChild(osmButton);
    trackButtonsContainer.appendChild(gtfsButton);

    // Check if shapes exist for this route and add shapes button
    const routeTrips = tripsData.filter(trip => trip.routeId === route.id);
    const shapeIds = [...new Set(routeTrips.map(trip => trip.shapeId).filter(id => id))];
    
    if (shapeIds.length > 0) {
        // Check if shapes actually exist in shapesData
        let actualShapesCount = 0;
        shapeIds.forEach(shapeId => {
            if (window.shapesData && window.shapesData[shapeId] && window.shapesData[shapeId].length > 0) {
                actualShapesCount++;
            }
        });
        
        // Only show button if there are actual shape points
        if (actualShapesCount > 0) {
            // Third row: Shapes.txt button (only if shapes exist)
            const shapesButtonContainer = document.createElement('div');
            shapesButtonContainer.style.display = 'flex';
            shapesButtonContainer.style.gap = '5px';

            // Shapes.txt button
            const shapesButton = document.createElement('button');
            shapesButton.textContent = 'GTFS Shapes';
            shapesButton.style.fontSize = '11px';
            shapesButton.style.padding = '4px 8px';
            shapesButton.style.backgroundColor = '#6f42c1';
            shapesButton.style.color = 'white';
            shapesButton.style.border = 'none';
            shapesButton.style.borderRadius = '3px';
            shapesButton.style.cursor = 'pointer';
            shapesButton.style.flex = '1';
            shapesButton.addEventListener('click', () => {
                showShapesOnMap(route);
            });

            shapesButtonContainer.appendChild(shapesButton);
            buttonsContainer.appendChild(shapesButtonContainer);
        }
    }

    // Second row: Direction buttons
    const directionButtonsContainer = document.createElement('div');
    directionButtonsContainer.style.display = 'flex';
    directionButtonsContainer.style.gap = '5px';

    // IDA (Forward) button
    const idaButton = document.createElement('button');
    idaButton.textContent = 'Load OSM Stops';
    idaButton.style.fontSize = '11px';
    idaButton.style.padding = '4px 8px';
    idaButton.style.backgroundColor = '#28a745';
    idaButton.style.color = 'white';
    idaButton.style.border = 'none';
    idaButton.style.borderRadius = '3px';
    idaButton.style.cursor = 'pointer';
    idaButton.style.flex = '1';
    idaButton.addEventListener('click', () => {
        // Save current scroll position before navigating
        const stopsList = document.getElementById('stops-list');
        lastSidebarScrollPosition = stopsList.scrollTop;
        
        loadOsmStopsForIdaDirection(route);
    });

    // Load GTFS Stops button
    const loadGtfsStopsBtn = document.createElement('button');
    loadGtfsStopsBtn.textContent = 'Load GTFS Stops';
    loadGtfsStopsBtn.style.fontSize = '11px';
    loadGtfsStopsBtn.style.padding = '4px 8px';
    loadGtfsStopsBtn.style.backgroundColor = '#007bff';
    loadGtfsStopsBtn.style.color = 'white';
    loadGtfsStopsBtn.style.border = 'none';
    loadGtfsStopsBtn.style.borderRadius = '3px';
    loadGtfsStopsBtn.style.cursor = 'pointer';
    loadGtfsStopsBtn.style.flex = '1';
    loadGtfsStopsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Save current scroll position before navigating
        const stopsList = document.getElementById('stops-list');
        lastSidebarScrollPosition = stopsList.scrollTop;
        
        currentRoute = route;
        loadGtfsStopsForRoute(route.id);
    });

    directionButtonsContainer.appendChild(idaButton);
    directionButtonsContainer.appendChild(loadGtfsStopsBtn);

    // Compare Stops button
    const compareStopsBtn = document.createElement('button');
    compareStopsBtn.textContent = 'Compare Stops';
    compareStopsBtn.style.fontSize = '11px';
    compareStopsBtn.style.padding = '4px 8px';
    compareStopsBtn.style.backgroundColor = '#ffc107';
    compareStopsBtn.style.color = '#212529';
    compareStopsBtn.style.border = 'none';
    compareStopsBtn.style.borderRadius = '3px';
    compareStopsBtn.style.cursor = 'pointer';
    compareStopsBtn.style.flex = '1';
    compareStopsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        compareRouteStops(route);
    });

    directionButtonsContainer.appendChild(compareStopsBtn);

    buttonsContainer.appendChild(trackButtonsContainer);
    buttonsContainer.appendChild(directionButtonsContainer);

    lineContainer.appendChild(lineItem);
    lineContainer.appendChild(buttonsContainer);
    stopsList.appendChild(lineContainer);
}

// Select a stop and show it on the map
function selectStop(stop) {
    // Clear existing layers
    if (routeLayer) {
        map.removeLayer(routeLayer);
    }
    routeLayer = L.layerGroup();
    
    // Add stop marker
    const marker = L.circleMarker([stop.lat, stop.lon], {
        color: '#007bff',
        fillColor: '#007bff',
        fillOpacity: 0.7,
        radius: 30
    }).bindPopup(`<b>${stop.name}</b><br>
        Stop ID: ${stop.id}<br>
        <a href="http://127.0.0.1:8111/load_and_zoom?left=${stop.lon-0.001}&right=${stop.lon+0.001}&top=${stop.lat+0.001}&bottom=${stop.lat-0.001}" target="_blank">Open in JOSM</a><br>
        <a href="https://www.openstreetmap.org/edit?editor=id&map=${stop.lat}/${stop.lon}" target="_blank">Open in iD editor</a>`);
    
    routeLayer.addLayer(marker);
    map.addLayer(routeLayer);
    
    // Center map on stop
    map.setView([stop.lat, stop.lon], 16);
    
    // Update sidebar with stop information
    updateSidebarWithStopInfo(stop);
}

// Draw route shape on map
async function drawRouteShape(routeId, color) {
    try {
        await loadGtfsShapes();
        
        // Find trips for this route
        const routeTrips = tripsData.filter(trip => trip.routeId === routeId);
        if (routeTrips.length === 0) return;
        
        // Get unique shape IDs for this route
        const shapeIds = [...new Set(routeTrips.map(trip => trip.shapeId).filter(id => id))];
        
        // Draw each shape
        shapeIds.forEach(shapeId => {
            const shapePoints = window.shapesData[shapeId];
            if (shapePoints && shapePoints.length > 1) {
                const latLngs = shapePoints.map(point => [point.lat, point.lon]);
                const polyline = L.polyline(latLngs, {
                    color: color || '#ffaa00',
                    weight: 4,
                    opacity: 0.7
                }).bindPopup(`Route shape for route ${routeId}`);
                
                routeLayer.addLayer(polyline);
            }
        });
    } catch (error) {
        console.error('Error drawing route shape:', error);
    }
}

// Update sidebar with route information
function updateSidebarWithRouteInfo(route, stops) {
    const stopsList = document.getElementById('stops-list');
    stopsList.innerHTML = `
        <h4>Line ${route.shortName}</h4>
        <p><strong>${route.longName}</strong></p>
        <p>Route ID: ${route.id}</p>
        <p>Total stops: ${stops.length}</p>
        <hr>
        <h5>Stops:</h5>
    `;
    
    stops.forEach((stop, index) => {
        const stopItem = document.createElement('div');
        stopItem.className = 'stop-item';
        stopItem.innerHTML = `<strong>${index + 1}.</strong> ${stop.name}`;
        stopItem.addEventListener('click', () => {
            map.setView([stop.lat, stop.lon], 17);
        });
        stopsList.appendChild(stopItem);
    });
}

// Update sidebar with stop information
function updateSidebarWithStopInfo(stop) {
    const stopsList = document.getElementById('stops-list');
    stopsList.innerHTML = `
        <h4>Stop Information</h4>
        <p><strong>${stop.name}</strong></p>
        <p>Stop ID: ${stop.id}</p>
        <p>Coordinates: ${stop.lat.toFixed(6)}, ${stop.lon.toFixed(6)}</p>
    `;
    
    // Add back button
    const backBtn = document.createElement('button');
    backBtn.textContent = '← Back to Lines';
    backBtn.style.marginTop = '10px';
    backBtn.style.padding = '8px 12px';
    backBtn.style.backgroundColor = '#007bff';
    backBtn.style.color = 'white';
    backBtn.style.border = 'none';
    backBtn.style.borderRadius = '4px';
    backBtn.style.cursor = 'pointer';
    backBtn.style.fontSize = '12px';
    backBtn.addEventListener('click', () => {
        populateSidebarWithLines();
    });
    stopsList.appendChild(backBtn);
}

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

        // Add context menu for right-click
        stopItem.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showContextMenu(e, stop, type);
        });

        stopsList.appendChild(stopItem);
    });
}

// Show context menu for stops
function showContextMenu(event, stop, type) {
    // Remove any existing context menu
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }

    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.style.left = event.pageX + 'px';
    contextMenu.style.top = event.pageY + 'px';

    if (type === 'osm') {
        // OSM stops have editing capabilities
        const josmLink = document.createElement('a');
        josmLink.className = 'context-menu-item';
        josmLink.href = `http://127.0.0.1:8111/load_and_zoom?left=${stop.lon-0.001}&right=${stop.lon+0.001}&top=${stop.lat+0.001}&bottom=${stop.lat-0.001}&select=${stop.type}${stop.id}`;
        josmLink.target = '_blank';
        josmLink.textContent = 'Open in JOSM';
        contextMenu.appendChild(josmLink);

        const idLink = document.createElement('a');
        idLink.className = 'context-menu-item';
        idLink.href = `https://www.openstreetmap.org/edit?editor=id&${stop.type}=${stop.id}`;
        idLink.target = '_blank';
        idLink.textContent = 'Open in iD editor';
        contextMenu.appendChild(idLink);
    } else if (type === 'gtfs') {
        // GTFS stops - open in editors at the location
        const josmLink = document.createElement('a');
        josmLink.className = 'context-menu-item';
        josmLink.href = `http://127.0.0.1:8111/load_and_zoom?left=${stop.lon-0.001}&right=${stop.lon+0.001}&top=${stop.lat+0.001}&bottom=${stop.lat-0.001}`;
        josmLink.target = '_blank';
        josmLink.textContent = 'Open area in JOSM';
        contextMenu.appendChild(josmLink);

        const idLink = document.createElement('a');
        idLink.className = 'context-menu-item';
        idLink.href = `https://www.openstreetmap.org/edit?editor=id&map=${stop.lat}/${stop.lon}`;
        idLink.target = '_blank';
        idLink.textContent = 'Open area in iD editor';
        contextMenu.appendChild(idLink);
    }

    document.body.appendChild(contextMenu);

    // Close context menu when clicking elsewhere
    const closeMenu = (e) => {
        if (!contextMenu.contains(e.target)) {
            contextMenu.remove();
            document.removeEventListener('click', closeMenu);
        }
    };
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 100);
}

// Load OSM stops via Overpass
async function loadOsmStops() {
    let south, west, north, east;
    
    // Use Nominatim bbox if available, otherwise use current map bounds
    if (nominatimBbox) {
        south = nominatimBbox.south;
        west = nominatimBbox.west;
        north = nominatimBbox.north;
        east = nominatimBbox.east;
        console.log('Using Nominatim bbox for Overpass query:', nominatimBbox);
    } else {
        const bounds = map.getBounds();
        south = bounds.getSouth();
        west = bounds.getWest();
        north = bounds.getNorth();
        east = bounds.getEast();
        console.log('Using current map bounds for Overpass query');
    }
    
    const bboxCoords = `${south},${west},${north},${east}`;
    const transportMode = document.getElementById('transport-mode-select').value;
    
    // Define all public transport modes from OSM wiki
    const transportModes = {
        all: ['bus', 'tram', 'train', 'subway', 'light_rail', 'monorail', 'trolleybus', 'ferry', 'cable_car', 'gondola', 'funicular'],
        bus: ['bus'],
        tram: ['tram'],
        train: ['train'],
        subway: ['subway'],
        light_rail: ['light_rail'],
        monorail: ['monorail'],
        trolleybus: ['trolleybus'],
        ferry: ['ferry'],
        cable_car: ['cable_car'],
        gondola: ['gondola'],
        funicular: ['funicular']
    };
    
    const modesToQuery = transportModes[transportMode];
    
    // Build query for all relevant stop types
    let query = `
        [out:json][timeout:45][maxsize:1048576];
        (
            node["highway"="bus_stop"](${bboxCoords});
            way["highway"="bus_stop"](${bboxCoords});
            relation["highway"="bus_stop"](${bboxCoords});
            node["public_transport"="stop_position"](${bboxCoords});
            way["public_transport"="stop_position"](${bboxCoords});
            relation["public_transport"="stop_position"](${bboxCoords});
    `;
    
    // Add platform queries for each transport mode
    modesToQuery.forEach(mode => {
        query += `
            node["public_transport"="platform"]["${mode}"="yes"](${bboxCoords});
            way["public_transport"="platform"]["${mode}"="yes"](${bboxCoords});
            relation["public_transport"="platform"]["${mode}"="yes"](${bboxCoords});
            node["public_transport"="platform"]["route"="${mode}"](${bboxCoords});
            way["public_transport"="platform"]["route"="${mode}"](${bboxCoords});
            relation["public_transport"="platform"]["route"="${mode}"](${bboxCoords});
        `;
    });
    
    query += `
        );
        out;
    `;

    try {
        // Get selected servers
        const servers = getOverpassServers();

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

// Show GTFS sidebar
function showGTFSSidebar() {
    document.getElementById('gtfs-sidebar').style.display = 'block';
}

// Hide GTFS sidebar
function hideGTFSSidebar() {
    document.getElementById('gtfs-sidebar').style.display = 'none';
}

// Load GTFS stops
async function loadGtfsStops() {
    try {
        const response = await fetch(getGtfsPath('stops.txt'));
        const csvText = await response.text();
        const lines = csvText.split('\n');
        gtfsStopsLayer = L.layerGroup();
        const gtfsStops = [];

        // Parse header to find column indices
        const headerLine = lines[0].trim();
        const headers = parseCsvLine(headerLine);
        const stopIdIndex = headers.indexOf('stop_id');
        const stopCodeIndex = headers.indexOf('stop_code');
        const stopNameIndex = headers.indexOf('stop_name');
        const stopLatIndex = headers.indexOf('stop_lat');
        const stopLonIndex = headers.indexOf('stop_lon');

        if (stopIdIndex === -1 || stopNameIndex === -1 || stopLatIndex === -1 || stopLonIndex === -1) {
            console.error('Required columns not found in stops.txt');
            return;
        }

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                // Simple CSV parser that handles quoted fields
                const values = parseCsvLine(line);
                if (values.length > Math.max(stopIdIndex, stopNameIndex, stopLatIndex, stopLonIndex)) {
                    const stopId = values[stopIdIndex].replace(/^"(.*)"$/, '$1');
                    const stopCode = stopCodeIndex !== -1 ? values[stopCodeIndex].replace(/^"(.*)"$/, '$1') : stopId;
                    const name = values[stopNameIndex].replace(/^"(.*)"$/, '$1');
                    const lat = parseFloat(values[stopLatIndex]);
                    const lon = parseFloat(values[stopLonIndex]);
                    if (!isNaN(lat) && !isNaN(lon)) {
                        const stop = {
                            id: stopId,
                            stopCode: stopCode,
                            lat: lat,
                            lon: lon,
                            name: name,
                            type: 'gtfs'
                        };
                        gtfsStops.push(stop);
                        // Use divIcon to show stop reference
                        const icon = L.divIcon({
                            className: 'stop-ref-icon',
                            html: `<div class="stop-ref">${stopCode}</div>`,
                            iconSize: [30, 18],
                            iconAnchor: [15, 9]
                        });
                        const marker = L.marker([lat, lon], {
                            icon: icon
                        }).bindPopup(`<b>GTFS Stop</b><br>
                            Name: ${name}<br>
                            Stop Ref: ${stopCode}<br>
                            <a href="http://127.0.0.1:8111/load_and_zoom?left=${lon-0.001}&right=${lon+0.001}&top=${lat+0.001}&bottom=${lat-0.001}" target="_blank">Open area in JOSM</a><br>
                            <a href="https://www.openstreetmap.org/edit?editor=id&map=${lat}/${lon}" target="_blank">Open area in iD editor</a>`);
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
                    }).bindPopup(`<b>GTFS Stop (Minor diff)</b><br>
                        ${diff.gtfsName}<br>
                        <a href="http://127.0.0.1:8111/load_and_zoom?left=${diff.gtfsStop.lon-0.001}&right=${diff.gtfsStop.lon+0.001}&top=${diff.gtfsStop.lat+0.001}&bottom=${diff.gtfsStop.lat-0.001}" target="_blank">Open area in JOSM</a><br>
                        <a href="https://www.openstreetmap.org/edit?editor=id&map=${diff.gtfsStop.lat}/${diff.gtfsStop.lon}" target="_blank">Open area in iD editor</a>`);
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
        const response = await fetch(getGtfsPath('trips.txt'));
        const csvText = await response.text();
        const lines = csvText.split('\n');

        tripsData = [];
        window.tripsData = []; // Also store in window for global access
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const values = parseCsvLine(line);
                if (values.length >= 5) {
                    const trip = {
                        routeId: values[0],
                        serviceId: values[1],
                        tripId: values[2],
                        directionId: values[3] ? parseInt(values[3]) : null,
                        shapeId: values[4],
                        wheelchairAccessible: values[5] ? parseInt(values[5]) : null,
                        tripShortName: values[6] || '',
                        tripHeadsign: values[7] || ''
                    };
                    tripsData.push(trip);
                    window.tripsData.push(trip); // Also add to global array
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
        const response = await fetch(getGtfsPath('shapes.txt'));
        const csvText = await response.text();
        const lines = csvText.split('\n');

        window.shapesData = {};
        let totalShapePoints = 0;
        const shapeIds = new Set();

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const values = parseCsvLine(line);
                if (values.length >= 4) {
                    const shapeId = values[0];
                    const lat = parseFloat(values[1]);
                    const lon = parseFloat(values[2]);
                    const sequence = parseInt(values[3]);
                    
                    if (!isNaN(lat) && !isNaN(lon) && !isNaN(sequence)) {
                        if (!window.shapesData[shapeId]) {
                            window.shapesData[shapeId] = [];
                            shapeIds.add(shapeId);
                        }
                        window.shapesData[shapeId].push({
                            lat: lat,
                            lon: lon,
                            sequence: sequence
                        });
                        totalShapePoints++;
                    }
                }
            }
        }
        
        // Sort each shape by sequence
        for (const shapeId in window.shapesData) {
            window.shapesData[shapeId].sort((a, b) => a.sequence - b.sequence);
        }
        
        console.log(`GTFS Shapes loaded: ${shapeIds.size} shapes with ${totalShapePoints} total points`);
        
    } catch (error) {
        console.error('Error loading GTFS shapes:', error);
    }
}

// Load GTFS stops data (without displaying)
async function loadGtfsStopsData() {
    try {
        const response = await fetch(getGtfsPath('stops.txt'));
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
        const response = await fetch(getGtfsPath('stop_times.txt'));
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
function loadGtfsStopsForRoute(routeId) {
    console.log('Loading GTFS stops for route ID:', routeId);
    console.log('Current GTFS folder:', window.currentGtfsFolder);
    
    const routeStops = getStopsForRoute(routeId);
    if (routeStops.length === 0) {
        console.log('No GTFS stops found for route:', routeId);
        return;
    }

    console.log(`Found ${routeStops.length} GTFS stops for route ${routeId}`);

    // Don't clear existing GTFS stops layer - just add to it
    // This allows accumulating stops from multiple routes

    if (!gtfsStopsLayer) {
        gtfsStopsLayer = L.layerGroup();
        map.addLayer(gtfsStopsLayer);
    }

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
        }).bindPopup(`<b>GTFS Stop ${stop.sequence}</b><br>
            Name: ${stop.name}<br>
            Stop ID: ${stop.id}<br>
            <a href="http://127.0.0.1:8111/load_and_zoom?left=${stop.lon-0.001}&right=${stop.lon+0.001}&top=${stop.lat+0.001}&bottom=${stop.lat-0.001}" target="_blank">Open in JOSM</a><br>
            <a href="https://www.openstreetmap.org/edit?editor=id&map=${stop.lat}/${stop.lon}" target="_blank">Open in iD editor</a>`);
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
        
        // Add context menu for right-click
        stopItem.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showContextMenu(e, stop, 'gtfs');
        });
        
        stopsList.appendChild(stopItem);
    });

    // Add button to load OSM stops for this route
    const loadOsmBtn = document.createElement('button');
    loadOsmBtn.textContent = 'Load OSM Stops for this Route';
    loadOsmBtn.style.marginTop = '10px';
    loadOsmBtn.addEventListener('click', () => {
        loadOsmStopsForRoute(currentRoute);
    });
    stopsList.appendChild(loadOsmBtn);
}

// Load OSM stops for a specific route
async function loadOsmStopsForRoute(route) {
    if (!route) {
        alert('No route provided.');
        return;
    }

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
        // Get selected servers
        const servers = getOverpassServers();

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
        const response = await fetch(getGtfsPath('routes.txt'));
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
            
            // Calculate bounds from shape points
            const lats = shapePoints.map(p => p.lat);
            const lons = shapePoints.map(p => p.lon);
            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);
            const minLon = Math.min(...lons);
            const maxLon = Math.max(...lons);
            const centerLat = (minLat + maxLat) / 2;
            const centerLon = (minLon + maxLon) / 2;
            
            const polyline = L.polyline(latlngs, {
                color: 'red',
                weight: 4,
                opacity: 0.8
            }).bindPopup(`<b>GTFS Route: ${route.shortName} - ${route.longName}</b><br>
                <a href="http://127.0.0.1:8111/load_and_zoom?left=${minLon}&right=${maxLon}&top=${maxLat}&bottom=${minLat}" target="_blank">Open area in JOSM</a><br>
                <a href="https://www.openstreetmap.org/edit?editor=id&map=${centerLat}/${centerLon}" target="_blank">Open in iD editor</a>`);
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
        // Get selected servers
        const servers = getOverpassServers();

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
                            
                            // Calculate bounds from geometry
                            const lats = member.geometry.map(g => g.lat);
                            const lons = member.geometry.map(g => g.lon);
                            const minLat = Math.min(...lats);
                            const maxLat = Math.max(...lats);
                            const minLon = Math.min(...lons);
                            const maxLon = Math.max(...lons);
                            const centerLat = (minLat + maxLat) / 2;
                            const centerLon = (minLon + maxLon) / 2;
                            
                            const polyline = L.polyline(latlngs, {
                                color: 'purple',
                                weight: 4,
                                opacity: 0.8
                            }).bindPopup(`<b>OSM Route: ${route.shortName} - ${route.longName}</b><br>
                                <a href="http://127.0.0.1:8111/load_and_zoom?left=${minLon}&right=${maxLon}&top=${maxLat}&bottom=${minLat}" target="_blank">Open area in JOSM</a><br>
                                <a href="https://www.openstreetmap.org/edit?editor=id&map=${centerLat}/${centerLon}" target="_blank">Open in iD editor</a>`);
                            routeLayer.addLayer(polyline);
                        }
                    });
                } else if (element.type === 'way' && element.geometry) {
                    console.log('Found standalone way with', element.geometry.length, 'points');
                    // For standalone ways
                    const latlngs = element.geometry.map(coord => [coord.lat, coord.lon]);
                    
                    // Calculate bounds from geometry
                    const lats = element.geometry.map(g => g.lat);
                    const lons = element.geometry.map(g => g.lon);
                    const minLat = Math.min(...lats);
                    const maxLat = Math.max(...lats);
                    const minLon = Math.min(...lons);
                    const maxLon = Math.max(...lons);
                    const centerLat = (minLat + maxLat) / 2;
                    const centerLon = (minLon + maxLon) / 2;
                    
                    const polyline = L.polyline(latlngs, {
                        color: 'purple',
                        weight: 4,
                        opacity: 0.8
                    }).bindPopup(`<b>OSM Route: ${route.shortName} - ${route.longName}</b><br>
                        <a href="http://127.0.0.1:8111/load_and_zoom?left=${minLon}&right=${maxLon}&top=${maxLat}&bottom=${minLat}" target="_blank">Open area in JOSM</a><br>
                        <a href="https://www.openstreetmap.org/edit?editor=id&map=${centerLat}/${centerLon}" target="_blank">Open in iD editor</a>`);
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

// Open OSM track via Overpass query and display on map
function openOsmTrackOverpass(route) {
    const bounds = map.getBounds();
    const south = bounds.getSouth();
    const west = bounds.getWest();
    const north = bounds.getNorth();
    const east = bounds.getEast();
    const bboxCoords = `${south},${west},${north},${east}`;

    const query = `
        [out:json][timeout:45][maxsize:1048576];
        (
            relation["type"="route_master"]["ref"="${route.shortName}"](${bboxCoords});
            relation["type"="route"]["route"="bus"]["ref"="${route.shortName}"](${bboxCoords});
        );
        (._;>;);
        out geom;
    `;

    // Get selected servers
    const servers = getOverpassServers();

    async function loadOsmTrack() {
        try {
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
            
            // Clear existing OSM route layer
            map.removeLayer(routeLayer);
            routeLayer = L.layerGroup();

            // Separate route_master and route relations
            const routeMasters = data.elements.filter(el => el.type === 'relation' && el.tags?.type === 'route_master');
            const routes = data.elements.filter(el => el.type === 'relation' && el.tags?.type === 'route');

            let trackCount = 0;
            let idaCount = 0;
            let vueltaCount = 0;

            // If we have route_master, use it to organize routes
            if (routeMasters.length > 0) {
                routeMasters.forEach(master => {
                    const masterRoutes = routes.filter(route => 
                        master.members?.some(member => 
                            member.ref === route.id && member.type === 'relation'
                        )
                    );

                    // Separate routes by direction based on typical naming patterns
                    masterRoutes.forEach((routeRelation, index) => {
                        const isIda = determineOsmDirection(routeRelation, index, masterRoutes.length);
                        const directionColor = isIda ? '#28a745' : '#dc3545'; // Green for IDA, Red for VUELTA
                        const directionName = isIda ? 'IDA' : 'VUELTA';
                        
                        if (isIda) idaCount++;
                        else vueltaCount++;

                        // Draw the route geometry
                        if (routeRelation.members) {
                            routeRelation.members.forEach(member => {
                                if (member.type === 'way' && member.geometry) {
                                    const latlngs = member.geometry.map(coord => [coord.lat, coord.lon]);
                                    const polyline = L.polyline(latlngs, {
                                        color: directionColor,
                                        weight: 6,
                                        opacity: 0.8,
                                        dashArray: isIda ? '10, 5' : '15, 5'
                                    }).bindPopup(`<b>OSM ${directionName} Track - Route ${route.shortName}</b><br>
                                        Type: ${routeRelation.tags?.name || 'OSM Route'}<br>
                                        Direction: ${directionName}<br>
                                        From: ${routeRelation.tags?.from || 'Unknown'}<br>
                                        To: ${routeRelation.tags?.to || 'Unknown'}<br>
                                        <a href="http://127.0.0.1:8111/load_and_zoom?left=${Math.min(...member.geometry.map(g => g.lon))}&right=${Math.max(...member.geometry.map(g => g.lon))}&top=${Math.max(...member.geometry.map(g => g.lat))}&bottom=${Math.min(...member.geometry.map(g => g.lat))}" target="_blank">Open in JOSM</a><br>
                                        <a href="https://www.openstreetmap.org/edit?editor=id&map=${member.geometry[0].lat}/${member.geometry[0].lon}" target="_blank">Open in iD editor</a>`);
                                    
                                    routeLayer.addLayer(polyline);
                                    
                                    // Add direction arrow
                                    addDirectionArrow(member.geometry, directionColor, routeLayer);
                                    trackCount++;
                                }
                            });
                        }
                    });
                });
            } else {
                // Fallback: treat individual routes as separate directions
                routes.forEach((routeRelation, index) => {
                    const isIda = index % 2 === 0; // Alternate between IDA and VUELTA
                    const directionColor = isIda ? '#28a745' : '#dc3545';
                    const directionName = isIda ? 'IDA' : 'VUELTA';
                    
                    if (isIda) idaCount++;
                    else vueltaCount++;

                    if (routeRelation.members) {
                        routeRelation.members.forEach(member => {
                            if (member.type === 'way' && member.geometry) {
                                const latlngs = member.geometry.map(coord => [coord.lat, coord.lon]);
                                const polyline = L.polyline(latlngs, {
                                    color: directionColor,
                                    weight: 6,
                                    opacity: 0.8,
                                    dashArray: isIda ? '10, 5' : '15, 5'
                                }).bindPopup(`<b>OSM ${directionName} Track - Route ${route.shortName}</b><br>
                                    Type: ${routeRelation.tags?.name || 'OSM Route'}<br>
                                    Direction: ${directionName}<br>
                                    From: ${routeRelation.tags?.from || 'Unknown'}<br>
                                    To: ${routeRelation.tags?.to || 'Unknown'}<br>
                                    <a href="http://127.0.0.1:8111/load_and_zoom?left=${Math.min(...member.geometry.map(g => g.lon))}&right=${Math.max(...member.geometry.map(g => g.lon))}&top=${Math.max(...member.geometry.map(g => g.lat))}&bottom=${Math.min(...member.geometry.map(g => g.lat))}" target="_blank">Open in JOSM</a><br>
                                    <a href="https://www.openstreetmap.org/edit?editor=id&map=${member.geometry[0].lat}/${member.geometry[0].lon}" target="_blank">Open in iD editor</a>`);
                                
                                routeLayer.addLayer(polyline);
                                
                                // Add direction arrow
                                addDirectionArrow(member.geometry, directionColor, routeLayer);
                                trackCount++;
                            }
                        });
                    }
                });
            }

            map.addLayer(routeLayer);
            
            // Fit map to track bounds
            if (routeLayer.getLayers().length > 0) {
                const group = new L.featureGroup(routeLayer.getLayers());
                map.fitBounds(group.getBounds().pad(0.1));
            }

            // Show success message with direction breakdown
            alert(`OSM Tracks loaded for Route ${route.shortName}:\n` +
                   `• Total track segments: ${trackCount}\n` +
                   `• IDA tracks (Green): ${idaCount}\n` +
                   `• VUELTA tracks (Red): ${vueltaCount}\n` +
                   `• Route masters found: ${routeMasters.length}\n` +
                   `• Individual routes: ${routes.length}`);

        } catch (error) {
            console.error('Error loading OSM track:', error);
            alert('Error loading OSM track data. Please try again.');
        }
    }

    loadOsmTrack();
}

// Helper function to determine OSM route direction
function determineOsmDirection(routeRelation, index, totalRoutes) {
    const name = (routeRelation.tags?.name || '').toLowerCase();
    const from = (routeRelation.tags?.from || '').toLowerCase();
    const to = (routeRelation.tags?.to || '').toLowerCase();
    
    // Check for explicit direction indicators in names
    if (name.includes('ida') || name.includes('anada') || name.includes('ida') || 
        from.includes('ida') || to.includes('vuelta') || to.includes('tornada')) {
        return true; // IDA
    }
    
    if (name.includes('vuelta') || name.includes('tornada') || name.includes('return') || 
        from.includes('vuelta') || to.includes('ida') || from.includes('anada')) {
        return false; // VUELTA
    }
    
    // If only 2 routes, assume first is IDA, second is VUELTA
    if (totalRoutes === 2) {
        return index === 0;
    }
    
    // For more than 2 routes, try to determine by route naming patterns
    // This is a heuristic - in practice, you might need more sophisticated logic
    return index % 2 === 0;
}

// Helper function to add direction arrows to OSM tracks
function addDirectionArrow(geometry, color, layer) {
    if (!geometry || geometry.length < 2) return;
    
    const midIndex = Math.floor(geometry.length / 2);
    const midPoint = geometry[midIndex];
    const nextPoint = geometry[midIndex + 1] || geometry[midIndex];
    
    if (midPoint && nextPoint) {
        const angle = Math.atan2(nextPoint.lat - midPoint.lat, nextPoint.lon - midPoint.lon) * 180 / Math.PI;
        
        const arrowIcon = L.divIcon({
            className: 'direction-arrow',
            html: `<div style="transform: rotate(${angle}deg); font-size: 16px; color: ${color}; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">➤</div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        
        L.marker([midPoint.lat, midPoint.lon], { icon: arrowIcon }).addTo(layer);
    }
}

// Open GTFS track data and display on map
function openGtfsTrack(route) {
    // Find trips for this route
    const routeTrips = tripsData.filter(trip => trip.routeId === route.id);
    if (routeTrips.length === 0) {
        alert('No trips found for this route in GTFS data.');
        return;
    }

    // Separate trips by direction
    const idaTrips = routeTrips.filter(trip => trip.directionId === 0);
    const vueltaTrips = routeTrips.filter(trip => trip.directionId === 1);

    // Get unique shape IDs for each direction
    const idaShapeIds = [...new Set(idaTrips.map(trip => trip.shapeId).filter(id => id))];
    const vueltaShapeIds = [...new Set(vueltaTrips.map(trip => trip.shapeId).filter(id => id))];
    
    if (idaShapeIds.length === 0 && vueltaShapeIds.length === 0) {
        alert('No shape data found for this route in GTFS files.');
        return;
    }

    // Clear existing route layer
    map.removeLayer(routeLayer);
    map.removeLayer(gtfsStopsLayer);
    map.removeLayer(osmStopsLayer);
    routeLayer = L.layerGroup();
    gtfsStopsLayer = L.layerGroup();
    osmStopsLayer = L.layerGroup();

    let totalTracks = 0;
    const trackInfo = [];

    // Display IDA tracks (Direction 0 - Go/Forward)
    if (idaShapeIds.length > 0) {
        const idaHeadsign = idaTrips[0]?.tripHeadsign || 'Unknown';
        
        idaShapeIds.forEach(shapeId => {
            const shapePoints = window.shapesData[shapeId];
            if (shapePoints && shapePoints.length > 0) {
                const latlngs = shapePoints.map(point => [point.lat, point.lon]);
                
                // Create directional arrows pattern
                const polyline = L.polyline(latlngs, {
                    color: '#28a745', // Green for IDA
                    weight: 6,
                    opacity: 0.8,
                    dashArray: '10, 5'
                }).bindPopup(`<b>🚌 GTFS IDA Track - Route ${route.shortName}</b><br>
                    Direction: Go/Forward (0)<br>
                    Headsign: ${idaHeadsign}<br>
                    Shape ID: ${shapeId}<br>
                    Points: ${shapePoints.length}<br>
                    <a href="http://127.0.0.1:8111/load_and_zoom?left=${Math.min(...shapePoints.map(p => p.lon))}&right=${Math.max(...shapePoints.map(p => p.lon))}&top=${Math.max(...shapePoints.map(p => p.lat))}&bottom=${Math.min(...shapePoints.map(p => p.lat))}" target="_blank">Open in JOSM</a><br>
                    <a href="https://www.openstreetmap.org/edit?editor=id&map=${shapePoints[0].lat}/${shapePoints[0].lon}" target="_blank">Open in iD editor</a>`);
                
                routeLayer.addLayer(polyline);
                
                // Add direction arrow at midpoint
                const midIndex = Math.floor(shapePoints.length / 2);
                const midPoint = shapePoints[midIndex];
                const nextPoint = shapePoints[midIndex + 1] || shapePoints[midIndex];
                
                if (midPoint && nextPoint) {
                    const angle = Math.atan2(nextPoint.lat - midPoint.lat, nextPoint.lon - midPoint.lon) * 180 / Math.PI;
                    
                    const arrowIcon = L.divIcon({
                        className: 'direction-arrow',
                        html: `<div style="transform: rotate(${angle}deg); font-size: 16px; color: #28a745;">➤</div>`,
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    });
                    
                    L.marker([midPoint.lat, midPoint.lon], { icon: arrowIcon }).addTo(routeLayer);
                }
                
                totalTracks++;
                trackInfo.push(`IDA: ${shapeId} (${shapePoints.length} points)`);
            }
        });
    }

    // Display VUELTA tracks (Direction 1 - Return/Back)
    if (vueltaShapeIds.length > 0) {
        const vueltaHeadsign = vueltaTrips[0]?.tripHeadsign || 'Unknown';
        
        vueltaShapeIds.forEach(shapeId => {
            const shapePoints = window.shapesData[shapeId];
            if (shapePoints && shapePoints.length > 0) {
                const latlngs = shapePoints.map(point => [point.lat, point.lon]);
                
                // Create directional arrows pattern
                const polyline = L.polyline(latlngs, {
                    color: '#dc3545', // Red for VUELTA
                    weight: 6,
                    opacity: 0.8,
                    dashArray: '15, 5'
                }).bindPopup(`<b>🚌 GTFS VUELTA Track - Route ${route.shortName}</b><br>
                    Direction: Return/Back (1)<br>
                    Headsign: ${vueltaHeadsign}<br>
                    Shape ID: ${shapeId}<br>
                    Points: ${shapePoints.length}<br>
                    <a href="http://127.0.0.1:8111/load_and_zoom?left=${Math.min(...shapePoints.map(p => p.lon))}&right=${Math.max(...shapePoints.map(p => p.lon))}&top=${Math.max(...shapePoints.map(p => p.lat))}&bottom=${Math.min(...shapePoints.map(p => p.lat))}" target="_blank">Open in JOSM</a><br>
                    <a href="https://www.openstreetmap.org/edit?editor=id&map=${shapePoints[0].lat}/${shapePoints[0].lon}" target="_blank">Open in iD editor</a>`);
                
                routeLayer.addLayer(polyline);
                
                // Add direction arrow at midpoint
                const midIndex = Math.floor(shapePoints.length / 2);
                const midPoint = shapePoints[midIndex];
                const nextPoint = shapePoints[midIndex + 1] || shapePoints[midIndex];
                
                if (midPoint && nextPoint) {
                    const angle = Math.atan2(nextPoint.lat - midPoint.lat, nextPoint.lon - midPoint.lon) * 180 / Math.PI;
                    
                    const arrowIcon = L.divIcon({
                        className: 'direction-arrow',
                        html: `<div style="transform: rotate(${angle}deg); font-size: 16px; color: #dc3545;">➤</div>`,
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    });
                    
                    L.marker([midPoint.lat, midPoint.lon], { icon: arrowIcon }).addTo(routeLayer);
                }
                
                totalTracks++;
                trackInfo.push(`VUELTA: ${shapeId} (${shapePoints.length} points)`);
            }
        });
    }

    map.addLayer(routeLayer);
    
    // Fit map to track bounds
    if (routeLayer.getLayers().length > 0) {
        const group = new L.featureGroup(routeLayer.getLayers());
        map.fitBounds(group.getBounds().pad(0.1));
    }

    // Show success message with track summary
    const summary = `GTFS Tracks loaded for Route ${route.shortName}:\n` +
                   `• Total tracks: ${totalTracks}\n` +
                   `• IDA tracks (Green): ${idaShapeIds.length}\n` +
                   `• VUELTA tracks (Red): ${vueltaShapeIds.length}\n\n` +
                   `Track Details:\n${trackInfo.join('\n')}`;
    
    alert(summary);
}

// Open GTFS track data for specific direction and display on map
function openGtfsTrackDirection(route, direction) {
    // Find trips for this route
    const routeTrips = tripsData.filter(trip => trip.routeId === route.id);
    if (routeTrips.length === 0) {
        alert('No trips found for this route in GTFS data.');
        return;
    }

    // Filter trips by direction
    const directionTrips = direction === 'IDA' 
        ? routeTrips.filter(trip => trip.directionId === 0)
        : routeTrips.filter(trip => trip.directionId === 1);

    if (directionTrips.length === 0) {
        alert(`No ${direction} trips found for route ${route.shortName}.`);
        return;
    }

    // Get unique shape IDs for the selected direction
    const shapeIds = [...new Set(directionTrips.map(trip => trip.shapeId).filter(id => id))];
    
    if (shapeIds.length === 0) {
        alert(`No shape data found for ${direction} direction of route ${route.shortName}.`);
        return;
    }

    // Clear existing layers
    map.removeLayer(routeLayer);
    map.removeLayer(gtfsStopsLayer);
    map.removeLayer(osmStopsLayer);
    routeLayer = L.layerGroup();
    gtfsStopsLayer = L.layerGroup();
    osmStopsLayer = L.layerGroup();

    let totalTracks = 0;
    const trackInfo = [];
    const directionColor = direction === 'IDA' ? '#28a745' : '#dc3545'; // Green for IDA, Red for VUELTA
    const directionNum = direction === 'IDA' ? 0 : 1;
    const directionName = direction === 'IDA' ? 'Go/Forward' : 'Return/Back';

    // Display tracks for selected direction
    const headsign = directionTrips[0]?.tripHeadsign || 'Unknown';
    
    shapeIds.forEach(shapeId => {
        const shapePoints = window.shapesData[shapeId];
        if (shapePoints && shapePoints.length > 0) {
            const latlngs = shapePoints.map(point => [point.lat, point.lon]);
            
            // Create directional track
            const polyline = L.polyline(latlngs, {
                color: directionColor,
                weight: 8,
                opacity: 0.9,
                dashArray: direction === 'IDA' ? '10, 5' : '15, 5'
            }).bindPopup(`<b>🚌 GTFS ${direction} Track - Route ${route.shortName}</b><br>
                Direction: ${directionName} (${directionNum})<br>
                Headsign: ${headsign}<br>
                Shape ID: ${shapeId}<br>
                Points: ${shapePoints.length}<br>
                Trips: ${directionTrips.length}<br>
                <a href="http://127.0.0.1:8111/load_and_zoom?left=${Math.min(...shapePoints.map(p => p.lon))}&right=${Math.max(...shapePoints.map(p => p.lon))}&top=${Math.max(...shapePoints.map(p => p.lat))}&bottom=${Math.min(...shapePoints.map(p => p.lat))}" target="_blank">Open in JOSM</a><br>
                <a href="https://www.openstreetmap.org/edit?editor=id&map=${shapePoints[0].lat}/${shapePoints[0].lon}" target="_blank">Open in iD editor</a>`);
            
            routeLayer.addLayer(polyline);
            
            // Add multiple direction arrows along the track
            const arrowInterval = Math.floor(shapePoints.length / 4); // Add arrows at 1/4 intervals
            for (let i = arrowInterval; i < shapePoints.length - 1; i += arrowInterval) {
                const currentPoint = shapePoints[i];
                const nextPoint = shapePoints[i + 1];
                
                if (currentPoint && nextPoint) {
                    const angle = Math.atan2(nextPoint.lat - currentPoint.lat, nextPoint.lon - currentPoint.lon) * 180 / Math.PI;
                    
                    const arrowIcon = L.divIcon({
                        className: 'direction-arrow',
                        html: `<div style="transform: rotate(${angle}deg); font-size: 18px; color: ${directionColor}; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">➤</div>`,
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                    });
                    
                    L.marker([currentPoint.lat, currentPoint.lon], { icon: arrowIcon }).addTo(routeLayer);
                }
            }
            
            totalTracks++;
            trackInfo.push(`${direction}: ${shapeId} (${shapePoints.length} points)`);
        }
    });

    // Get ordered stops for this direction
    const orderedStops = getStopsForDirection(route.id, directionNum);
    
    // Display ordered stops on map
    orderedStops.forEach(stop => {
        // Create a divIcon with the sequence number
        const icon = L.divIcon({
            className: 'stop-number-icon',
            html: `<div class="stop-number">${stop.sequence}</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        const marker = L.marker([stop.lat, stop.lon], {
            icon: icon
        }).bindPopup(`<b>${direction} Stop ${stop.sequence}</b><br>
            Name: ${stop.name}<br>
            Stop ID: ${stop.id}<br>
            <a href="http://127.0.0.1:8111/load_and_zoom?left=${stop.lon-0.001}&right=${stop.lon+0.001}&top=${stop.lat+0.001}&bottom=${stop.lat-0.001}" target="_blank">Open in JOSM</a><br>
            <a href="https://www.openstreetmap.org/edit?editor=id&map=${stop.lat}/${stop.lon}" target="_blank">Open in iD editor</a>`);
        
        gtfsStopsLayer.addLayer(marker);
    });

    map.addLayer(routeLayer);
    map.addLayer(gtfsStopsLayer);
    
    // Also load OSM stops for comparison
    loadOsmStopsForRoute(route);
    
    // Fit map to track bounds
    if (routeLayer.getLayers().length > 0) {
        const group = new L.featureGroup(routeLayer.getLayers());
        map.fitBounds(group.getBounds().pad(0.15));
    }

    // Update sidebar with ordered stops
    updateSidebarWithOrderedStops(orderedStops, direction, route);

    // Show success message with track summary
    const summary = `${direction} Tracks loaded for Route ${route.shortName}:\n` +
                   `• Direction: ${directionName} (${directionNum})\n` +
                   `• Headsign: ${headsign}\n` +
                   `• Total tracks: ${totalTracks}\n` +
                   `• Total trips: ${directionTrips.length}\n` +
                   `• Ordered stops: ${orderedStops.length}\n\n` +
                   `Track Details:\n${trackInfo.join('\n')}`;
    
    alert(summary);
}

// Get stops for a specific direction
function getStopsForDirection(routeId, directionId) {
    // Find trips for this route and direction
    const directionTrips = tripsData.filter(trip => 
        trip.routeId === routeId && trip.directionId === directionId
    );
    
    if (directionTrips.length === 0) return [];

    // Get all stop times for these trips
    const allStopTimes = [];
    directionTrips.forEach(trip => {
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

// Update sidebar with OSM stops list
function updateSidebarWithOsmStops(stops, route) {
    const stopsList = document.getElementById('stops-list');
    stopsList.innerHTML = `<h3>OSM Stops - Route ${route.shortName}</h3>`;

    // Add back button
    const backBtn = document.createElement('button');
    backBtn.textContent = '← Back to Lines';
    backBtn.style.marginBottom = '10px';
    backBtn.addEventListener('click', () => {
        populateSidebarWithLines();
    });
    stopsList.appendChild(backBtn);

    // Add route info
    const routeInfo = document.createElement('div');
    routeInfo.style.marginBottom = '15px';
    routeInfo.style.padding = '10px';
    routeInfo.style.backgroundColor = '#f8f9fa';
    routeInfo.style.borderRadius = '5px';
    routeInfo.innerHTML = `
        <strong>Route:</strong> ${route.shortName}<br>
        <strong>Name:</strong> ${route.longName}<br>
        <strong>Total Stops:</strong> ${stops.length}
    `;
    stopsList.appendChild(routeInfo);

    // Add stops list
    stops.forEach((stop, index) => {
        const stopItem = document.createElement('div');
        stopItem.className = 'stop-item';
        stopItem.style.cursor = 'pointer';
        stopItem.style.padding = '8px';
        stopItem.style.marginBottom = '5px';
        stopItem.style.backgroundColor = '#fff';
        stopItem.style.border = '1px solid #ddd';
        stopItem.style.borderRadius = '3px';
        stopItem.style.transition = 'background-color 0.2s';
        
        // Stop name and index
        let stopName = `OSM Stop ${index + 1}`;
        if (stop.tags && stop.tags.name) {
            stopName = stop.tags.name;
        } else if (stop.tags && stop.tags.bus) {
            stopName = `Bus Stop (${stop.tags.bus})`;
        }
        
        stopItem.innerHTML = `
            <div style="font-weight: bold; color: #007bff;">${index + 1}. ${stopName}</div>
            <div style="font-size: 11px; color: #666;">
                ID: ${stop.id} | Lat: ${stop.lat.toFixed(6)} | Lon: ${stop.lon.toFixed(6)}
            </div>
        `;
        
        // Add hover effect
        stopItem.addEventListener('mouseenter', () => {
            stopItem.style.backgroundColor = '#f0f8ff';
        });
        stopItem.addEventListener('mouseleave', () => {
            stopItem.style.backgroundColor = '#fff';
        });
        
        // Click to zoom to stop
        stopItem.addEventListener('click', () => {
            map.setView([stop.lat, stop.lon], 16);
            
            // Highlight the stop briefly
            const highlightMarker = L.circleMarker([stop.lat, stop.lon], {
                color: '#ff0000',
                fillColor: '#ff0000',
                fillOpacity: 0.8,
                radius: 30,
                weight: 3
            }).addTo(map);
            
            // Remove highlight after 2 seconds
            setTimeout(() => {
                map.removeLayer(highlightMarker);
            }, 2000);
        });
        
        // Add context menu for right-click
        stopItem.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showContextMenu(e, stop, 'osm');
        });
        
        stopsList.appendChild(stopItem);
    });

    // Add summary info
    const summaryInfo = document.createElement('div');
    summaryInfo.style.marginTop = '15px';
    summaryInfo.style.padding = '10px';
    summaryInfo.style.backgroundColor = '#e9ecef';
    summaryInfo.style.borderRadius = '5px';
    summaryInfo.style.fontSize = '12px';
    summaryInfo.innerHTML = `
        <strong>Instructions:</strong><br>
        • Click on any stop to zoom to it<br>
        • Right-click for more options<br>
        • Red highlight shows selected stop
    `;
    stopsList.appendChild(summaryInfo);
}

// Update sidebar with ordered stops
function updateSidebarWithOrderedStops(stops, direction, route) {
    const stopsList = document.getElementById('stops-list');
    stopsList.innerHTML = `<h3>${direction} Stops - Route ${route.shortName}</h3>`;

    // Add back button
    const backBtn = document.createElement('button');
    backBtn.textContent = '← Back to Lines';
    backBtn.style.marginBottom = '10px';
    backBtn.addEventListener('click', () => {
        populateSidebarWithLines();
    });
    stopsList.appendChild(backBtn);

    // Add direction info
    const directionInfo = document.createElement('div');
    directionInfo.style.background = '#e9ecef';
    directionInfo.style.padding = '10px';
    directionInfo.style.borderRadius = '5px';
    directionInfo.style.marginBottom = '10px';
    directionInfo.style.fontSize = '12px';
    directionInfo.innerHTML = `<strong>Direction:</strong> ${direction}<br><strong>Total Stops:</strong> ${stops.length}`;
    stopsList.appendChild(directionInfo);

    stops.forEach(stop => {
        const stopItem = document.createElement('div');
        stopItem.className = 'stop-item';
        stopItem.style.display = 'flex';
        stopItem.style.alignItems = 'center';
        stopItem.style.padding = '8px';
        stopItem.style.borderBottom = '1px solid #eee';
        
        // Add sequence number icon
        const sequenceIcon = document.createElement('div');
        sequenceIcon.className = 'stop-number';
        sequenceIcon.style.marginRight = '10px';
        sequenceIcon.textContent = stop.sequence;
        
        // Add stop name
        const stopName = document.createElement('div');
        stopName.style.flex = '1';
        stopName.textContent = stop.name;
        
        stopItem.appendChild(sequenceIcon);
        stopItem.appendChild(stopName);
        
        // Add click handler to highlight stop on map
        stopItem.addEventListener('click', () => {
            const currentZoom = map.getZoom();
            map.setView([stop.lat, stop.lon], Math.max(currentZoom, 16));
            
            // Temporarily highlight the stop
            const highlightIcon = L.divIcon({
                className: 'stop-number-icon',
                html: `<div class="stop-number" style="background: #ff6b6b; color: white; transform: scale(1.5);">${stop.sequence}</div>`,
                iconSize: [45, 45],
                iconAnchor: [22.5, 22.5]
            });
            
            const highlightMarker = L.marker([stop.lat, stop.lon], { icon: highlightIcon })
                .bindPopup(`<b>Stop ${stop.sequence}</b><br>${stop.name}`)
                .addTo(map);
            
            // Remove highlight after 2 seconds
            setTimeout(() => {
                map.removeLayer(highlightMarker);
            }, 2000);
        });
        
        stopsList.appendChild(stopItem);
    });
}
