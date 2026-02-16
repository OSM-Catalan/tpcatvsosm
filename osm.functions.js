// OSM functions
function searchPlaces(query) {
    const resultsDiv = document.getElementById('search-results');
    if (!query.trim()) {
        resultsDiv.innerHTML = '';
        return;
    }
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=10`)
    .then(response => response.json())
    .then(data => {
        displaySearchResults(data);
    })
    .catch(error => {
        console.error('Error searching places:', error);
        resultsDiv.innerHTML = '<p>Error searching</p>';
    });
}

function displaySearchResults(results) {
    const resultsDiv = document.getElementById('search-results');
    if (results.length === 0) {
        resultsDiv.innerHTML = '<p>No results</p>';
        return;
    }
    let html = '<ul>';
    results.forEach(result => {
        html += `<li onclick="zoomToPlace(${result.lat}, ${result.lon}, '${result.display_name.replace(/'/g, "\\'")}')">${result.display_name}</li>`;
    });
    html += '</ul>';
    resultsDiv.innerHTML = html;
}

function zoomToPlace(lat, lon, name) {
    window.parent.postMessage({type: 'setView', data: {lat: parseFloat(lat), lon: parseFloat(lon), zoom: 15}}, '*');
    // Optionally add marker
    window.parent.postMessage({type: 'addMarker', data: {lat: parseFloat(lat), lon: parseFloat(lon), popup: name}}, '*');
}

function fetchTransportInView() {
    if (!window.parent.map || typeof window.parent.map.getBounds !== 'function') {
        alert('Map not ready');
        return;
    }
    const type = document.getElementById('transport-type').value;
    const bounds = window.parent.map.getBounds();
    const south = bounds.getSouth();
    const west = bounds.getWest();
    const north = bounds.getNorth();
    const east = bounds.getEast();

    const transportQueries = {
        bus_stop: 'node[highway=bus_stop]',
        tram_stop: 'node[railway=tram_stop]',
        subway_entrance: 'node[railway=subway_entrance]',
        railway_station: 'node[railway=station]',
        ferry_terminal: 'node[amenity=ferry_terminal]',
        platform: 'node[public_transport=platform]',
        stop_position: 'node[public_transport=stop_position]',
        halt: 'node[railway=halt]',
        monorail_stop: 'node[railway=monorail_stop]',
        light_rail_stop: 'node[railway=light_rail_stop]',
        funicular_stop: 'node[railway=funicular_station]',
        all: '(node[highway=bus_stop];node[railway=tram_stop];node[railway=subway_entrance];node[railway=station];node[amenity=ferry_terminal];node[public_transport=platform];node[public_transport=stop_position];node[railway=halt];node[railway=monorail_stop];node[railway=light_rail_stop];node[railway=funicular_station])'
    };

    const query = `[out:json];${transportQueries[type]}(${south},${west},${north},${east});out;`;

    const server = document.getElementById('overpass-server').value;
    const timeout = parseInt(document.getElementById('query-timeout').value);

    fetch(server, {
        method: 'POST',
        body: query,
        signal: AbortSignal.timeout(timeout * 1000)
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return response.json();
    })
    .then(data => {
        displayTransportData(data, type);
    })
    .catch(error => {
        console.error('Error fetching transport data:', error);
        alert('Error fetching transport data: ' + error.message);
    });
}

function fetchRoutes() {
    if (!window.parent.map || typeof window.parent.map.getBounds !== 'function') {
        alert('Map not ready');
        return;
    }
    const type = document.getElementById('route-type').value;
    const bounds = window.parent.map.getBounds();
    const south = bounds.getSouth();
    const west = bounds.getWest();
    const north = bounds.getNorth();
    const east = bounds.getEast();

    const server = document.getElementById('overpass-server').value;
    const timeout = parseInt(document.getElementById('query-timeout').value);

    const query = `[out:json][timeout:${timeout}];relation["route"="${type}"]( ${south},${west},${north},${east} );out body;>;out body;`;

    fetch(server, {
        method: 'POST',
        body: query,
        signal: AbortSignal.timeout(timeout * 1000)
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return response.json();
    })
    .then(data => {
        window.routeData = data;
        displayRoutes(data, type);
    })
    .catch(error => {
        console.error('Error fetching routes:', error);
        alert('Error fetching routes: ' + error.message);
    });
}

function displayTransportData(data, type) {
    const resultsDiv = document.getElementById('osm-results');
    const elements = data.elements ? data.elements.filter(e => e.type === 'node') : [];
    resultsDiv.innerHTML = `<p>Displaying ${elements.length} ${type.replace('_', ' ')}s</p>`;

    // Clear previous
    window.parent.postMessage({type: 'clearOSM'}, '*');

    if (elements.length > 0) {
        window.transportData = elements;
        window.currentTransportPage = 1;
        window.currentTransportPerPage = 25;
        document.getElementById('transport-controls').style.display = 'block';
        populateTransportSearchOptions();
        displayTransportPage(1, 25);

        // Colors for different types
        const colors = {
            bus_stop: 'blue',
            tram_stop: 'green',
            subway_entrance: 'red',
            railway_station: 'purple',
            ferry_terminal: 'orange',
            platform: 'cyan',
            stop_position: 'magenta',
            halt: 'brown',
            monorail_stop: 'yellow',
            light_rail_stop: 'lime',
            funicular_stop: 'teal',
            unknown: 'gray'
        };

        // Add markers for all
        elements.forEach(element => {
            if (element.lat && element.lon) {
                const tags = element.tags || {};
                const specificType = getTypeFromTags(tags);
                const color = colors[specificType] || 'gray';
                const icon = {
                    html: `<div style="background: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 1px solid black;"></div>`,
                    iconSize: [12, 12],
                    iconAnchor: [6, 6]
                };
                const info = tags.name || tags.ref || tags.operator || 'No info';
                const viewUrl = `https://www.openstreetmap.org/${element.type}/${element.id}`;
                const editIdUrl = `https://www.openstreetmap.org/edit?${element.type}=${element.id}`;
                const editJosmUrl = `http://127.0.0.1:8111/load_object?objects=${element.type}${element.id}`;
                const popup = `<strong>Type:</strong> ${element.type}<br><strong>ID:</strong> ${element.id}<br><strong>Name:</strong> ${info}<br><strong>Tags:</strong><br>${Object.entries(element.tags).map(([k,v]) => `${k}: ${v}`).join('<br>')}<br><br><strong>Links:</strong><br><a href="${viewUrl}" target="_blank">View in OSM</a><br><a href="${editIdUrl}" target="_blank">Edit in iD</a><br><a href="${editJosmUrl}" target="_blank">Edit in JOSM</a>`;
                window.parent.postMessage({type: 'addMarker', data: {lat: element.lat, lon: element.lon, popup, icon}}, '*');
            }
        });
    } else {
        document.getElementById('transport-controls').style.display = 'none';
        document.getElementById('transport-table').style.display = 'none';
    }
}

function displayRoutes(data, type) {
    const resultsDiv = document.getElementById('osm-results');
    const relations = data.elements.filter(el => el.type === 'relation' && el.tags && (el.tags.route === type || el.tags.route_master === type));
    resultsDiv.innerHTML = `<p>Displaying ${relations.length} ${type} routes</p>`;

    // Clear previous
    window.parent.postMessage({type: 'clearOSM'}, '*');

    if (relations.length === 0) return;

    // Build node and way maps
    const nodes = {};
    const ways = {};
    data.elements.forEach(el => {
        if (el.type === 'node') {
            nodes[el.id] = el;
        } else if (el.type === 'way') {
            ways[el.id] = el;
        }
    });

    // Populate routes list
    const listDiv = document.getElementById('routes-list');
    listDiv.innerHTML = relations.map(rel => `
<div>
<a href="#" onclick="showRouteDetails(${rel.id}, '${type}', this); return false;">${rel.tags.name || rel.tags.ref || 'Unnamed'}</a>
<div id="stops-${rel.id}" style="display:none;"></div>
</div>
`).join('');

    // Store routes by name for searcher
    window.routeMap = {};
    relations.forEach(rel => {
        const name = rel.tags.name || rel.tags.ref || 'Unnamed';
        if (!window.routeMap[name]) window.routeMap[name] = [];
        window.routeMap[name].push(rel);
    });

    // Populate route options datalist
    const datalist = document.getElementById('route-options');
    datalist.innerHTML = '';
    relations.forEach(rel => {
        const option = document.createElement('option');
        option.value = rel.tags.name || rel.tags.ref || 'Unnamed';
        datalist.appendChild(option);
    });

    // For each route relation, build coords
    relations.forEach(relation => {
        const coords = [];
        relation.members.forEach(member => {
            if (member.type === 'way' && member.role === '' && ways[member.ref]) {
                const way = ways[member.ref];
                way.nodes.forEach(nodeId => {
                    const node = nodes[nodeId];
                    if (node) {
                        coords.push([node.lon, node.lat]);
                    }
                });
            }
        });
        if (coords.length > 1) {
            const color = getRouteColor(type);
            window.parent.postMessage({type: 'addPolyline', data: {coords, color, source: 'osm'}}, '*');
        }
    });
}

function getRouteColor(type) {
    const colors = {
        bus: 'purple',
        tram: 'orange',
        train: 'cyan',
        subway: 'magenta',
        light_rail: 'yellow',
        monorail: 'lime',
        ferry: 'pink'
    };
    return colors[type] || 'gray';
}

function getTypeFromTags(tags) {
    if (tags.highway === 'bus_stop') return 'bus_stop';
    if (tags.bus === 'yes') return 'bus_stop';
    if (tags.railway === 'tram_stop') return 'tram_stop';
    if (tags.tram === 'yes') return 'tram_stop';
    if (tags.railway === 'subway_entrance') return 'subway_entrance';
    if (tags.subway === 'yes') return 'subway_entrance';
    if (tags.railway === 'station') return 'railway_station';
    if (tags.railway === 'halt') return 'halt';
    if (tags.railway === 'monorail_stop') return 'monorail_stop';
    if (tags.railway === 'light_rail_stop') return 'light_rail_stop';
    if (tags.railway === 'funicular_station') return 'funicular_stop';
    if (tags.amenity === 'ferry_terminal') return 'ferry_terminal';
    if (tags.public_transport === 'platform') return 'platform';
    if (tags.public_transport === 'stop_position') return 'stop_position';
    return 'unknown';
}

function displayTransportPage(page, perPage) {
    window.currentTransportPage = page;
    window.currentTransportPerPage = perPage;
    const elements = window.filteredTransportData || window.transportData;
    let start, end;
    if (perPage === 'all') {
        start = 0;
        end = elements.length;
    } else {
        start = (page - 1) * perPage;
        end = start + perPage;
    }
    const pageElements = elements.slice(start, end);
    const tbody = document.getElementById('transport-tbody');
    tbody.innerHTML = '';
    pageElements.forEach(element => {
        const tags = element.tags || {};
        const name = tags.name || '';
        const ref = tags.ref || '';
        const order = tags.local_ref || tags.sequence || '';
        const viewUrl = `https://www.openstreetmap.org/${element.type}/${element.id}`;
        const editIdUrl = `https://www.openstreetmap.org/edit?${element.type}=${element.id}`.replace(/&/g, '&amp;');
        const editJosmUrl = `http://127.0.0.1:8111/load_object?objects=${element.type}${element.id}`;
        const tagsList = Object.entries(tags).map(([k, v]) => `${k}: ${v}`).join('<br>');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="border: 1px solid #ddd; padding: 8px; cursor: pointer; text-decoration: underline;" onclick="showTransportDetails('${element.type}', ${element.id}, ${element.lat}, ${element.lon})">${name}<br><small>Type: ${element.type}<br>ID: ${element.id}<br>Tags:<br>${tagsList}<br>Links: <a href="${viewUrl}" target="_blank">OSM</a> | <a href="${editIdUrl}" target="_blank">iD</a> | <a href="${editJosmUrl}" target="_blank">JOSM</a></small></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${ref}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${order}</td>
        `;
        tbody.appendChild(row);
    });
    document.getElementById('transport-table').style.display = 'table';
    updateTransportPagination();
}

function updateTransportPagination() {
    const perPage = window.currentTransportPerPage;
    const page = window.currentTransportPage;
    const totalElements = (window.filteredTransportData || window.transportData).length;
    let totalPages;
    if (perPage === 'all') {
        totalPages = 1;
    } else {
        totalPages = Math.ceil(totalElements / perPage);
    }
    let html = '';
    if (totalPages > 1) {
        if (page > 1) html += `<button onclick="displayTransportPage(${page - 1}, ${perPage === 'all' ? "'all'" : perPage})">Previous</button> `;
        const startPage = Math.max(1, page - 2);
        const endPage = Math.min(totalPages, page + 2);
        for (let i = startPage; i <= endPage; i++) {
            html += `<button onclick="displayTransportPage(${i}, ${perPage === 'all' ? "'all'" : perPage})" ${i === page ? 'disabled style="font-weight: bold;"' : ''}>${i}</button> `;
        }
        if (page < totalPages) html += `<button onclick="displayTransportPage(${page + 1}, ${perPage === 'all' ? "'all'" : perPage})">Next</button>`;
    }
    document.getElementById('transport-pagination').innerHTML = html;
}

function changeTransportPerPage() {
    const val = document.getElementById('transport-per-page').value;
    const perPage = val === 'all' ? 'all' : parseInt(val);
    displayTransportPage(1, perPage);
}

function zoomToStop(lat, lon) {
    window.parent.postMessage({type: 'setView', data: {lat: parseFloat(lat), lon: parseFloat(lon), zoom: 18}}, '*');
}

function zoomToWay(id) {
    const way = window.routeData.elements.find(el => el.id === id && el.type === 'way');
    if (!way) return;

    const nodes = {};
    window.routeData.elements.forEach(el => {
        if (el.type === 'node') nodes[el.id] = el;
    });

    const lats = way.nodes.map(nid => nodes[nid]?.lat).filter(Boolean);
    const lons = way.nodes.map(nid => nodes[nid]?.lon).filter(Boolean);
    if (lats.length === 0 || lons.length === 0) return;

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    window.parent.postMessage({type: 'fitBounds', data: {bounds: `${minLon},${minLat},${maxLon},${maxLat}`}});

}

function showTransportDetails(type, id, lat, lon) {
    const element = window.transportData.find(e => e.id == id && e.type == type);
    const tags = element ? element.tags || {} : {};
    const viewUrl = `https://www.openstreetmap.org/${type}/${id}`;
    const editIdUrl = `https://www.openstreetmap.org/edit?${type}=${id}`.replace(/&/g, '&amp;');
    const editJosmUrl = `http://127.0.0.1:8111/load_object?objects=${type}${id}`;
    const links = `
        <a href="${viewUrl}" target="_blank">View in OSM</a> |
        <a href="${editIdUrl}" target="_blank">Edit in iD</a> |
        <a href="${editJosmUrl}" target="_blank">Edit in JOSM</a>
    `;
    const tagsList = Object.entries(tags).map(([k, v]) => `${k}: ${v}`).join('\n');
    const details = `Type: ${type}
ID: ${id}
Tags:
${tagsList}

Links:
View in OSM: ${viewUrl}
Edit in iD: ${editIdUrl}
Edit in JOSM: ${editJosmUrl}`;
    document.getElementById('transport-details').textContent = details;
    document.getElementById('transport-details').style.display = 'block';
    // Zoom to the location
    window.parent.postMessage({type: 'setView', data: {lat: parseFloat(lat), lon: parseFloat(lon), zoom: 18}}, '*');
}
function runOSMQuery() {
    const query = document.getElementById('osm-query').value.trim();
    if (!query) {
        alert('Please enter a query');
        return;
    }
    const server = document.getElementById('overpass-server').value;
    const timeout = parseInt(document.getElementById('query-timeout').value);
    fetch(server, {
        method: 'POST',
        body: query,
        signal: AbortSignal.timeout(timeout * 1000)
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return response.json();
    })
    .then(data => {
        displayOSMData(data);
    })
    .catch(error => {
        console.error('Error running OSM query:', error);
        alert('Error running OSM query: ' + error.message);
    });
}

function displayOSMData(data) {
    const resultsDiv = document.getElementById('osm-results');
    resultsDiv.innerHTML = '<p>Displaying OSM data...</p>';

    // Clear previous data
    window.parent.postMessage({type: 'clearOSM'}, '*');

    // Process nodes
    if (data.elements) {
        data.elements.forEach(element => {
            if (element.type === 'node' && element.lat && element.lon) {
                const popup = `OSM Node: ${element.id}<br>Tags: ${JSON.stringify(element.tags || {})}`;
                window.parent.postMessage({type: 'addMarker', data: {lat: element.lat, lon: element.lon, popup}}, '*');
            } else if (element.type === 'way' && element.nodes) {
                // For ways, get coordinates from nodes
                const coords = element.nodes.map(nodeId => {
                    const node = data.elements.find(e => e.id === nodeId && e.type === 'node');
                    return node ? [node.lat, node.lon] : null;
                }).filter(coord => coord);
                if (coords.length > 1) {
                    const popup = `OSM Way: ${element.id}<br>Tags: ${JSON.stringify(element.tags || {})}`;
                    window.parent.postMessage({type: 'addPolyline', data: {coords, color: 'blue'}}, '*');
                }
            }
        });
    }

    resultsDiv.innerHTML = `<p>Displayed ${data.elements ? data.elements.length : 0} elements</p>`;
}

function clearOSM() {
    window.parent.postMessage({type: 'clearOSM'}, '*');
    document.getElementById('osm-results').innerHTML = '';
    document.getElementById('transport-controls').style.display = 'none';
    document.getElementById('transport-table').style.display = 'none';
    document.getElementById('transport-details').style.display = 'none';
    window.filteredTransportData = null;
    document.getElementById('routes-list').innerHTML = '';
}

function hideStops() {
    const routesList = document.getElementById('routes-list');
    const stopsDivs = routesList.querySelectorAll('div[id^="stops-"]');
    stopsDivs.forEach(div => div.style.display = 'none');
}

function populateTransportSearchOptions() {
    const options = new Set();
    window.transportData.forEach(element => {
        const tags = element.tags || {};
        if (tags.name) options.add(tags.name);
        if (tags.ref) options.add(tags.ref);
        Object.values(tags).forEach(v => {
            if (typeof v === 'string') options.add(v);
        });
    });
    const datalist = document.getElementById('transport-options');
    datalist.innerHTML = '';
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        datalist.appendChild(option);
    });
}

function filterTransportStops(query) {
    if (!query.trim()) {
        window.filteredTransportData = null;
        displayTransportPage(1, window.currentTransportPerPage);
        return;
    }
    const filtered = window.transportData.filter(element => {
        const tags = element.tags || {};
        const name = (tags.name || '').toLowerCase();
        const ref = (tags.ref || '').toLowerCase();
        const queryLower = query.toLowerCase();
        if (name.includes(queryLower) || ref.includes(queryLower)) return true;
        return Object.values(tags).some(v => typeof v === 'string' && v.toLowerCase().includes(queryLower));
    });
    window.filteredTransportData = filtered;
    displayTransportPage(1, window.currentTransportPerPage);
}

function filterRoutes(query) {
    const routesDiv = document.getElementById('routes-list');
    const routeDivs = routesDiv.querySelectorAll('div');
    routeDivs.forEach(div => {
        const a = div.querySelector('a');
        if (a) {
            const name = a.textContent.toLowerCase();
            div.style.display = name.includes(query.toLowerCase()) ? 'block' : 'none';
        }
    });
}

function showRouteByName(id, type, name) {
    // Find the element in routes-list with that name
    const routesList = document.getElementById('routes-list');
    const divs = routesList.querySelectorAll('div');
    for (let div of divs) {
        const a = div.querySelector('a');
        if (a && a.textContent === name) {
            showRouteDetails(id, type, a);
            break;
        }
    }
}

function showRouteDetails(id, type, element) {
    const relation = window.routeData.elements.find(el => el.id === id && el.type === 'relation' && el.tags && (el.tags.route === type || el.tags.route_master === type));
    if (!relation) return;

    // Build nodes and ways maps
    const nodes = {};
    const ways = {};
    window.routeData.elements.forEach(el => {
        if (el.type === 'node') nodes[el.id] = el;
        if (el.type === 'way') ways[el.id] = el;
    });

    // Get stop orders
    const stopOrders = {};
    relation.members.forEach((m, index) => {
        if ((m.type === 'node' || m.type === 'way') && (m.role === '' || m.role.startsWith('stop'))) {
            stopOrders[`${m.type}:${m.ref}`] = index + 1;
        }
    });

    // Get stops
    let stops = [];
    if (relation.tags.route_master) {
        // For route_master, get stops from member route relations
        const memberRelations = relation.members.filter(m => m.type === 'relation').map(m => window.routeData.elements.find(el => el.id === m.ref && el.type === 'relation')).filter(Boolean);
        memberRelations.forEach(rel => {
            rel.members.filter(m => m.type === 'node' && (m.role === '' || m.role.startsWith('stop'))).forEach(m => {
                const stop = nodes[m.ref];
                if (stop) stops.push(stop);
            });
        });
    } else {
        stops = relation.members.filter(m => (m.type === 'node' || m.type === 'way') && (m.role === '' || m.role.startsWith('stop'))).map(m => {
            if (m.type === 'node') return nodes[m.ref];
            if (m.type === 'way') return ways[m.ref];
        }).filter(Boolean);
    }

    // Get ways
    let routeWays = [];
    if (relation.tags.route_master) {
        // For route_master, get member route relations, then their ways
        const memberRelations = relation.members.filter(m => m.type === 'relation').map(m => window.routeData.elements.find(el => el.id === m.ref && el.type === 'relation')).filter(Boolean);
        memberRelations.forEach(rel => {
            rel.members.filter(m => m.type === 'way').forEach(m => {
                const way = ways[m.ref];
                if (way) routeWays.push(way);
            });
        });
    } else {
        routeWays = relation.members.filter(m => m.type === 'way').map(m => ways[m.ref]).filter(Boolean);
    }

    // Display stops below the route
    const stopsDiv = element.nextElementSibling;
    if (stops.length === 0) {
        stopsDiv.innerHTML = 'No stops available';
    } else {
        stopsDiv.innerHTML = '<ul>' + stops.map(stop => {
            const order = stopOrders[`${stop.type}:${stop.id}`];
            const name = stop.tags ? (stop.tags.name || 'Unnamed') : 'Unnamed';
            const ref = stop.tags ? (stop.tags.ref || '') : '';
            const refPart = ref ? ` (${ref})` : '';
            const onclick = stop.type === 'node' ? `onclick="zoomToStop(${stop.lat}, ${stop.lon})"` : (stop.type === 'way' ? `onclick="zoomToWay(${stop.id})"` : '');
            return `<li ${onclick}>${order}. ${name}${refPart} [${stop.type}:${stop.id}]</li>`;
        }).join('') + '</ul>';
    }
    stopsDiv.style.display = 'block';

    // Add markers for stops
    stops.forEach(stop => {
        const order = stopOrders[`${stop.type}:${stop.id}`];
        if (stop.type === 'node' && stop.lat && stop.lon) {
            window.parent.postMessage({type: 'addMarker', data: {lat: stop.lat, lon: stop.lon, popup: `${order}. ${stop.tags ? (stop.tags.name || stop.tags.ref || 'Stop') : 'Stop'}`, label: order.toString()}}, '*');
        }
    });

    // Build and add track
    if (routeWays.length === 0) {
        alert('No track available');
        return;
    }
    const coords = [];
    routeWays.forEach(way => {
        way.nodes.forEach(nodeId => {
            const node = nodes[nodeId];
            if (node) coords.push([node.lat, node.lon]);
        });
    });
    window.parent.postMessage({type: 'addPolyline', data: {coords, color: getRouteColor(type), source: 'osm'}}, '*');
}

document.addEventListener('DOMContentLoaded', function() {
    const routeSearch = document.getElementById('route-search');
    if (routeSearch) {
        routeSearch.addEventListener('change', function() {
            const query = this.value.trim();
            if (query && window.routeMap && window.routeMap[query]) {
                const rel = window.routeMap[query][0];
                const type = rel.tags.route || rel.tags.route_master;
                showRouteByName(rel.id, type, query);
            }
        });
        routeSearch.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                const query = this.value.trim();
                if (query && window.routeMap && window.routeMap[query]) {
                    const rel = window.routeMap[query][0];
                    const type = rel.tags.route || rel.tags.route_master;
                    showRouteByName(rel.id, type, query);
                }
            }
        });
    }
});
