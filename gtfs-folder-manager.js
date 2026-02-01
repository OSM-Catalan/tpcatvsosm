// GTFS Folder Manager - Handles GTFS folder selection and management
// This file manages GTFS data folders and allows switching between different datasets

// Global variable to store current GTFS folder
window.currentGtfsFolder = 'gtfs_amb_bus'; // Default folder

// Load GTFS folders starting with 'gtfs'
async function loadGtfsFolders() {
    try {
        // Get the dropdown element
        const dropdown = document.getElementById('gtfs-folder-select');
        if (!dropdown) {
            console.error('GTFS folder dropdown not found');
            return;
        }
        
        // Since we can't directly scan directories in browser, we'll use a predefined list
        // In a real implementation, this would be provided by the server
        const knownGtfsFolders = [
            'gtfs_amb_bus',
            'gtfs_zaragoza',
            // Add more GTFS folders as needed
        ];
        
        // For now, just use all known folders since HEAD requests might fail due to CORS
        const availableFolders = [...knownGtfsFolders];
        
        // Try to detect if folders exist by attempting to fetch a common file (optional)
        for (let i = availableFolders.length - 1; i >= 0; i--) {
            try {
                const response = await fetch(`${availableFolders[i]}/stops.txt`, { method: 'HEAD' });
                if (!response.ok) {
                    console.log(`Folder ${availableFolders[i]} not accessible via HEAD, but keeping in list`);
                }
            } catch (e) {
                console.log(`Folder ${availableFolders[i]} HEAD request failed, but keeping in list`);
            }
        }
        
        // Populate the dropdown
        dropdown.innerHTML = '<option value="">Select GTFS folder...</option>';
        availableFolders.forEach(folder => {
            const option = document.createElement('option');
            option.value = folder;
            option.textContent = folder;
            if (folder === window.currentGtfsFolder) {
                option.selected = true;
            }
            dropdown.appendChild(option);
        });
        
        console.log('Available GTFS folders:', availableFolders);
    } catch (error) {
        console.error('Error loading GTFS folders:', error);
        
        // Fallback: at least populate with the default folder
        const dropdown = document.getElementById('gtfs-folder-select');
        if (dropdown) {
            dropdown.innerHTML = '<option value="">Select GTFS folder...</option>';
            const option = document.createElement('option');
            option.value = 'gtfs_amb_bus';
            option.textContent = 'gtfs_amb_bus';
            option.selected = true;
            dropdown.appendChild(option);
        }
    }
}

// Get current GTFS folder path
function getGtfsPath(filename) {
    return `${window.currentGtfsFolder}/${filename}`;
}

// Initialize GTFS folder dropdown immediately (synchronous version)
function initializeGtfsFolderDropdown() {
    const dropdown = document.getElementById('gtfs-folder-select');
    if (!dropdown) {
        console.error('GTFS folder dropdown not found during initialization');
        return;
    }
    
    // Populate with known folders immediately
    const knownGtfsFolders = [
        'gtfs_amb_bus',
        'gtfs_zaragoza',
        // Add more GTFS folders as needed
    ];
    
    dropdown.innerHTML = '<option value="">Select GTFS folder...</option>';
    knownGtfsFolders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder;
        option.textContent = folder;
        if (folder === window.currentGtfsFolder) {
            option.selected = true;
        }
        dropdown.appendChild(option);
    });
    
    console.log('GTFS folder dropdown initialized with:', knownGtfsFolders);
}

// Function to add a new GTFS folder to the list
function addGtfsFolder(folderName) {
    if (!folderName || !folderName.startsWith('gtfs_')) {
        console.error('Folder name must start with "gtfs_"');
        return false;
    }
    
    // Add to both initialization and loading functions
    const dropdown = document.getElementById('gtfs-folder-select');
    if (dropdown) {
        // Check if folder already exists
        const existingOptions = Array.from(dropdown.options).map(opt => opt.value);
        if (!existingOptions.includes(folderName)) {
            const option = document.createElement('option');
            option.value = folderName;
            option.textContent = folderName;
            dropdown.appendChild(option);
            console.log(`Added GTFS folder: ${folderName}`);
            return true;
        } else {
            console.log(`GTFS folder ${folderName} already exists`);
            return false;
        }
    }
    return false;
}

// Export functions for global access
window.loadGtfsFolders = loadGtfsFolders;
window.initializeGtfsFolderDropdown = initializeGtfsFolderDropdown;
window.getGtfsPath = getGtfsPath;
window.addGtfsFolder = addGtfsFolder;
