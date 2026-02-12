// SIMPLE GTFS FOLDER MANAGER
// This file helps you switch between different GTFS data folders

// Current selected GTFS folder (change this to switch folders)
window.currentGtfsFolder = 'gtfs_amb_bus';

// List of available GTFS folders (add your folders here)
const GTFS_FOLDERS = [
    'gtfs_amb_bus',
'gtfs_cat_bus',	// Barcelona bus data
    'gtfs_zaragoza',     // Zaragoza transport data
    // Add more folders like this:
    // 'gtfs_madrid',
    // 'gtfs_valencia',
];

// Simple function to set up the folder dropdown
function setupGtfsFolders() {
    const dropdown = document.getElementById('gtfs-folder-select');

    if (!dropdown) {
        console.log('GTFS dropdown not found, skipping setup');
        return;
    }

    // Clear existing options
    dropdown.innerHTML = '<option value="">Choose GTFS folder...</option>';

    // Add each folder as an option
    GTFS_FOLDERS.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder;
        option.textContent = folder;

        // Mark current folder as selected
        if (folder === window.currentGtfsFolder) {
            option.selected = true;
        }

        dropdown.appendChild(option);
    });

    console.log(`GTFS folders ready: ${GTFS_FOLDERS.join(', ')}`);
}

// Function to change GTFS folder
function changeGtfsFolder(folderName) {
    if (!GTFS_FOLDERS.includes(folderName)) {
        console.error(`Folder "${folderName}" not in the list. Add it to GTFS_FOLDERS first.`);
        return false;
    }

    window.currentGtfsFolder = folderName;
    console.log(`Switched to GTFS folder: ${folderName}`);
    return true;
}

// Function to add a new GTFS folder
function addGtfsFolder(folderName) {
    if (!folderName.startsWith('gtfs_')) {
        console.error('Folder name must start with "gtfs_"');
        return false;
    }

    if (GTFS_FOLDERS.includes(folderName)) {
        console.log(`Folder "${folderName}" already exists`);
        return false;
    }

    GTFS_FOLDERS.push(folderName);

    // Update dropdown if it exists
    const dropdown = document.getElementById('gtfs-folder-select');
    if (dropdown) {
        const option = document.createElement('option');
        option.value = folderName;
        option.textContent = folderName;
        dropdown.appendChild(option);
    }

    console.log(`Added new GTFS folder: ${folderName}`);
    return true;
}

// Get path to a GTFS file
function getGtfsPath(filename) {
    return `${window.currentGtfsFolder}/${filename}`;
}

// Handle dropdown changes
function onGtfsFolderChange(event) {
    const selectedFolder = event.target.value;
    if (selectedFolder) {
        changeGtfsFolder(selectedFolder);
        // You might want to reload GTFS data here
        console.log('Consider reloading GTFS data for the new folder');
    }
}

// Start everything when page loads
document.addEventListener('DOMContentLoaded', function() {
    setupGtfsFolders();

    // Listen for dropdown changes
    const dropdown = document.getElementById('gtfs-folder-select');
    if (dropdown) {
        dropdown.addEventListener('change', onGtfsFolderChange);
    }
});

// Make functions available globally
window.setupGtfsFolders = setupGtfsFolders;
window.changeGtfsFolder = changeGtfsFolder;
window.addGtfsFolder = addGtfsFolder;
window.getGtfsPath = getGtfsPath;
