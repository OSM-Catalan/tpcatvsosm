# GTFS Folder Management Instructions
## Instrucciones para Gestión de Carpetas GTFS
## Instruccions per a la Gestió de Carpetes GTFS

---

## English 🇬🇧

### How to Add a New GTFS Folder

1. **Create the folder**: Add your new GTFS folder to the project directory. The folder name must start with `gtfs_` (e.g., `gtfs_barcelona`, `gtfs_madrid`).

2. **Add GTFS files**: Place the required GTFS files inside the folder:
   - `stops.txt` - Bus stop information
   - `routes.txt` - Route information
   - `trips.txt` - Trip schedules
   - `shapes.txt` - Route shapes (optional)
   - `stop_times.txt` - Stop times (optional)

3. **Update the code**: Edit the `gtfs-folder-manager.js` file and add your folder name to the `knownGtfsFolders` array in both functions:
   ```javascript
   const knownGtfsFolders = [
       'gtfs_amb_bus',
       'gtfs_zaragoza',
       'gtfs_barcelona',  // Add your new folder here
       'gtfs_madrid',     // And here
   ];
   ```

4. **Use the selector**: 
   - Open the web application
   - Use the "GTFS Data Folder" dropdown in the controls panel
   - Select your new folder
   - The application will automatically load data from the selected folder

### Tips
- The folder name must start with `gtfs_`
- All GTFS files should be in standard GTFS format
- The application will validate folder accessibility automatically

---

## Español 🇪🇸

### Cómo Añadir una Nueva Carpeta GTFS

1. **Crear la carpeta**: Añade tu nueva carpeta GTFS al directorio del proyecto. El nombre de la carpeta debe empezar con `gtfs_` (ej: `gtfs_barcelona`, `gtfs_madrid`).

2. **Añadir archivos GTFS**: Coloca los archivos GTFS requeridos dentro de la carpeta:
   - `stops.txt` - Información de paradas de autobús
   - `routes.txt` - Información de rutas
   - `trips.txt` - Horarios de viajes
   - `shapes.txt` - Formas de rutas (opcional)
   - `stop_times.txt` - Tiempos de parada (opcional)

3. **Actualizar el código**: Edita el archivo `gtfs-folder-manager.js` y añade el nombre de tu carpeta al array `knownGtfsFolders` en ambas funciones:
   ```javascript
   const knownGtfsFolders = [
       'gtfs_amb_bus',
       'gtfs_zaragoza',
       'gtfs_barcelona',  // Añade tu nueva carpeta aquí
       'gtfs_madrid',     // Y aquí
   ];
   ```

4. **Usar el selector**:
   - Abre la aplicación web
   - Usa el desplegable "GTFS Data Folder" en el panel de controles
   - Selecciona tu nueva carpeta
   - La aplicación cargará automáticamente los datos de la carpeta seleccionada

### Consejos
- El nombre de la carpeta debe empezar con `gtfs_`
- Todos los archivos GTFS deben estar en formato GTFS estándar
- La aplicación validará la accesibilidad de la carpeta automáticamente

---

## Català 🇦🇩

### Com Afegir una Nova Carpeta GTFS

1. **Crear la carpeta**: Afegeix la teva nova carpeta GTFS al directori del projecte. El nom de la carpeta ha de començar amb `gtfs_` (ex: `gtfs_barcelona`, `gtfs_madrid`).

2. **Afegir arxius GTFS**: Col·loca els arxius GTFS requerits dins de la carpeta:
   - `stops.txt` - Informació de parades d'autobús
   - `routes.txt` - Informació de rutes
   - `trips.txt` - Horaris de viatges
   - `shapes.txt` - Formes de rutes (opcional)
   - `stop_times.txt` - Temps de parada (opcional)

3. **Actualitzar el codi**: Edita l'arxiu `gtfs-folder-manager.js` i afegeix el nom de la teva carpeta a l'array `knownGtfsFolders` en ambdues funcions:
   ```javascript
   const knownGtfsFolders = [
       'gtfs_amb_bus',
       'gtfs_zaragoza',
       'gtfs_barcelona',  // Afegeix la teva nova carpeta aquí
       'gtfs_madrid',     // I aquí
   ];
   ```

4. **Utilitzar el selector**:
   - Obre l'aplicació web
   - Usa el desplegable "GTFS Data Folder" al panell de controls
   - Selecciona la teva nova carpeta
   - L'aplicació carregarà automàticament les dades de la carpeta seleccionada

### Consells
- El nom de la carpeta ha de començar amb `gtfs_`
- Tots els arxius GTFS han d'estar en format GTFS estàndard
- L'aplicació validarà l'accessibilitat de la carpeta automàticament

---

## Technical Notes / Notas Técnicas / Notes Tècniques

### File Structure
```
analisitpcatosm/
├── gtfs_amb_bus/          # Existing folder
│   ├── stops.txt
│   ├── routes.txt
│   ├── trips.txt
│   └── shapes.txt
├── gtfs_zaragoza/         # Existing folder
│   ├── stops.txt
│   ├── routes.txt
│   ├── trips.txt
│   └── shapes.txt
├── gtfs_barcelona/        # Your new folder
│   ├── stops.txt
│   ├── routes.txt
│   ├── trips.txt
│   └── shapes.txt
└── gtfs-folder-manager.js # Configuration file
```

### Required Files
- **stops.txt**: Required for stop locations and names
- **routes.txt**: Required for route information
- **trips.txt**: Required for trip schedules
- **shapes.txt**: Optional but recommended for route visualization
- **stop_times.txt**: Optional but recommended for detailed scheduling

### Validation
The application will automatically:
- Check if folders exist and are accessible
- Validate required GTFS files
- Load data from the selected folder
- Display appropriate error messages if issues are found
