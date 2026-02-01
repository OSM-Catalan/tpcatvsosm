# TP CAT vs OSM - Transit Analysis Tool

[English](#english) | [Español](#español) | [Català](#català)

---

## English

TP CAT vs OSM is a comprehensive web-based tool for analyzing and comparing public transport data between Barcelona's GTFS (General Transit Feed Specification) data and OpenStreetMap (OSM) data. This tool provides detailed visualization and comparison capabilities for bus routes, stops, and transit infrastructure.

## 📊 Data Sources

### GTFS Data (TP CAT)
- **Source**: Autoritat del Transport Metropolità (ATM) - Barcelona Metropolitan Transport Authority
- **File**: `gtfs_amb_bus/` directory containing:
  - `routes.txt` - Bus route information
  - `trips.txt` - Trip schedules and routes
  - `stops.txt` - Bus stop locations and information
  - `stop_times.txt` - Stop timing information
  - `shapes.txt` - Route geometry and paths
  - `calendar.txt` - Service schedules
  - `calendar_dates.txt` - Exception dates
  - `agency.txt` - Transport agency information
- **Coverage**: Àrea Metropolitana de Barcelona (AMB)
- **Update Frequency**: Regular updates from ATM

### OpenStreetMap Data
- **Source**: OpenStreetMap contributors worldwide
- **API**: Overpass API for querying transit data
- **Data Types**:
  - Bus stops (`highway=bus_stop`)
  - Public transport platforms (`public_transport=platform`)
  - Route relations (`type=route`, `route=bus`)
  - Stop positions and metadata
- **Coverage**: Global, with focus on Barcelona area
- **Update Frequency**: Real-time community updates

## 🚀 Features

### Route Analysis
- **Load GTFS Routes**: Display official bus routes from GTFS data
- **Load OSM Routes**: Visualize routes from OpenStreetMap relations
- **Route Comparison**: Compare GTFS and OSM route geometries
- **Direction Support**: Separate visualization for IDA (outbound) and VUELTA (return) trips

### Stop Management
- **Load GTFS Stops**: Display official bus stops with sequence numbers
- **Load OSM Stops**: Show OSM bus stops from route relations
- **Stop Comparison**: Compare stop locations between GTFS and OSM
- **Interactive Lists**: Clickable stop lists with zoom functionality
- **Coordinate Analysis**: Calculate distances between matching stops

### Visualization Tools
- **Interactive Map**: Leaflet.js-based map with multiple base layers
- **Layer Control**: Switch between OpenStreetMap and ICGC ortoimagery
- **Color Coding**: Different colors for GTFS vs OSM data
- **Popup Information**: Detailed information for routes and stops
- **Zoom Controls**: Navigation to specific stops and routes

### Data Processing
- **GTFS Shapes Processing**: Visualize route shapes and geometries
- **GTFS Trips Analysis**: Display individual trip paths
- **Route Processing**: Comprehensive route analysis with direction detection
- **Batch Operations**: Load multiple routes simultaneously
- **Data Export**: Coordinate differences and analysis results

### Comparison Features
- **Stop Matching**: Exact coordinate matching
- **Nearby Detection**: Find stops within 50 meters
- **Difference Calculation**: Coordinate differences between datasets
- **Missing Data Analysis**: Identify OSM-only and GTFS-only stops
- **Visual Comparison**: Side-by-side visualization

### User Interface
- **Responsive Design**: Works on desktop and mobile devices
- **Collapsible Panels**: Sidebar and controls panel management
- **Icon Navigation**: Intuitive icon-based button layout
- **Tooltips**: Helpful hints and instructions
- **Status Feedback**: Loading indicators and error messages

## 🛠 Technical Stack

### Frontend
- **HTML5**: Semantic structure and accessibility
- **CSS3**: Modern styling with animations and transitions
- **JavaScript (ES6+)**: Modern JavaScript features
- **Leaflet.js**: Interactive mapping library
- **Font Awesome**: Icon library

### Mapping
- **Base Layers**: OpenStreetMap, ICGC Ortoimage
- **Overlays**: GTFS routes, OSM routes, stop markers
- **Projections**: WGS84 coordinate system
- **Zoom Levels**: Detailed zoom for stop-level analysis

### APIs
- **Overpass API**: OSM data querying
- **GTFS Files**: Local file processing
- **Geolocation**: Browser location services
- **External Links**: JOSM and iD editor integration

## 📁 Project Structure

```
analisitpcatosm/
├── index.html              # Main application interface
├── app.js                  # Application initialization and controls
├── functions.js            # Core functionality and data processing
├── gtfs_amb_bus/          # GTFS data directory
│   ├── routes.txt         # Route definitions
│   ├── trips.txt          # Trip schedules
│   ├── stops.txt          # Stop information
│   ├── stop_times.txt     # Stop timing
│   ├── shapes.txt         # Route geometries
│   ├── calendar.txt       # Service schedules
│   ├── calendar_dates.txt # Exception dates
│   └── agency.txt         # Agency information
├── test_query.txt         # Overpass query testing
└── README.md              # This documentation
```

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Local web server (for file:// protocol limitations)
- Internet connection for map tiles and API calls

### Installation
1. Clone or download the repository
2. Serve the files using a local web server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```
3. Open `http://localhost:8000` in your browser

### Usage
1. **Load Routes**: Click on bus lines in the sidebar to load routes
2. **Add Stops**: Use "Load OSM Stops" and "Load GTFS Stops" buttons
3. **Compare Data**: Click "Compare Stops" to analyze differences
4. **Process Data**: Use icon buttons for batch operations
5. **Navigate**: Click stops in lists to zoom to locations

## 🔧 Configuration

### Map Settings
- **Default Center**: Barcelona (41.3851, 2.1734)
- **Default Zoom**: Level 10
- **Max Zoom**: Level 18 for detailed analysis
- **Coordinate System**: WGS84

### Overpass API
- **Primary Server**: https://overpass-api.de/api/interpreter
- **Backup Servers**: Multiple fallback servers
- **Timeout**: 60 seconds
- **Bounding Box**: AMB area (41.27,1.92,41.5,2.27)

### GTFS Processing
- **Coordinate Precision**: 6 decimal places
- **Distance Threshold**: 50 meters for stop matching
- **Shape Smoothing**: Enabled for better visualization
- **Direction Detection**: Automatic IDA/VUELTA identification

## 📈 Analysis Capabilities

### Route Analysis
- Route geometry comparison
- Direction-based analysis
- Shape point validation
- Route completeness assessment

### Stop Analysis
- Coordinate accuracy verification
- Missing stop identification
- Duplicate detection
- Metadata comparison

### Statistical Reports
- Stop count comparison
- Distance measurements
- Coverage analysis
- Data quality metrics

## 🐛 Troubleshooting

### Common Issues
- **CORS Errors**: Use local web server instead of file:// protocol
- **Overpass Timeouts**: Try again or use different server
- **Missing Data**: Check GTFS file integrity
- **Map Loading**: Verify internet connection

### Debug Mode
Open browser console (F12) for detailed logging and error messages.

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Check the console for error messages
- Verify data source availability

---

## Español

TP CAT vs OSM es una herramienta integral basada en web para analizar y comparar datos de transporte público entre los datos GTFS (General Transit Feed Specification) de Barcelona y los datos de OpenStreetMap (OSM). Esta herramienta proporciona capacidades detalladas de visualización y comparación para rutas de autobús, paradas e infraestructura de transporte.

## 📊 Fuentes de Datos

### Datos GTFS (TP CAT)
- **Fuente**: Autoritat del Transport Metropolità (ATM) - Autoridad del Transporte Metropolitano de Barcelona
- **Archivo**: Directorio `gtfs_amb_bus/` que contiene:
  - `routes.txt` - Información de rutas de autobús
  - `trips.txt` - Horarios y rutas de viajes
  - `stops.txt` - Ubicaciones e información de paradas de autobús
  - `stop_times.txt` - Información de horarios de paradas
  - `shapes.txt` - Geometría y caminos de rutas
  - `calendar.txt` - Horarios de servicio
  - `calendar_dates.txt` - Fechas excepcionales
  - `agency.txt` - Información de agencias de transporte
- **Cobertura**: Àrea Metropolitana de Barcelona (AMB)
- **Frecuencia de Actualización**: Actualizaciones regulares de ATM

### Datos OpenStreetMap
- **Fuente**: Contribuidores de OpenStreetMap de todo el mundo
- **API**: Overpass API para consultar datos de transporte
- **Tipos de Datos**:
  - Paradas de autobús (`highway=bus_stop`)
  - Plataformas de transporte público (`public_transport=platform`)
  - Relaciones de ruta (`type=route`, `route=bus`)
  - Posiciones de parada y metadatos
- **Cobertura**: Global, con enfoque en el área de Barcelona
- **Frecuencia de Actualización**: Actualizaciones en tiempo real de la comunidad

## 🚀 Características

### Análisis de Rutas
- **Cargar Rutas GTFS**: Mostrar rutas de autobús oficiales de datos GTFS
- **Cargar Rutas OSM**: Visualizar rutas de relaciones de OpenStreetMap
- **Comparación de Rutas**: Comparar geometrías de rutas GTFS y OSM
- **Soporte de Direcciones**: Visualización separada para viajes IDA (salida) y VUELTA (retorno)

### Gestión de Paradas
- **Cargar Paradas GTFS**: Mostrar paradas de autobús oficiales con números de secuencia
- **Cargar Paradas OSM**: Mostrar paradas de autobús OSM de relaciones de ruta
- **Comparación de Paradas**: Comparar ubicaciones de paradas entre GTFS y OSM
- **Listas Interactivas**: Listas de paradas clickeables con funcionalidad de zoom
- **Análisis de Coordenadas**: Calcular distancias entre paradas coincidentes

### Herramientas de Visualización
- **Mapa Interactivo**: Mapa basado en Leaflet.js con múltiples capas base
- **Control de Capas**: Cambiar entre OpenStreetMap y ortoimágenes ICGC
- **Codificación de Colores**: Diferentes colores para datos GTFS vs OSM
- **Información Emergente**: Información detallada para rutas y paradas
- **Controles de Zoom**: Navegación a paradas y rutas específicas

### Procesamiento de Datos
- **Procesamiento de Formas GTFS**: Visualizar geometrías y caminos de rutas
- **Análisis de Viajes GTFS**: Mostrar caminos de viajes individuales
- **Procesamiento de Rutas**: Análisis completo de rutas con detección de dirección
- **Operaciones por Lotes**: Cargar múltiples rutas simultáneamente
- **Exportación de Datos**: Diferencias de coordenadas y resultados de análisis

### Características de Comparación
- **Coincidencia de Paradas**: Coincidencia exacta de coordenadas
- **Detección Cercana**: Encontrar paradas dentro de 50 metros
- **Cálculo de Diferencias**: Diferencias de coordenadas entre conjuntos de datos
- **Análisis de Datos Faltantes**: Identificar paradas solo OSM y solo GTFS
- **Comparación Visual**: Visualización lado a lado

### Interfaz de Usuario
- **Diseño Responsivo**: Funciona en escritorio y dispositivos móviles
- **Paneles Colapsables**: Gestión de barra lateral y panel de controles
- **Navegación por Iconos**: Diseño de botones intuitivo basado en iconos
- **Informaciones sobre Herramientas**: Sugerencias e instrucciones útiles
- **Retroalimentación de Estado**: Indicadores de carga y mensajes de error

## � Gestión de Carpetas GTFS

### Añadir Nuevos Conjuntos de Datos GTFS

La aplicación soporta múltiples conjuntos de datos GTFS. Para añadir un nuevo conjunto de datos GTFS:

1. **Crear la carpeta**: Añade tu nueva carpeta GTFS al directorio del proyecto. El nombre de la carpeta debe empezar con `gtfs_` (ej: `gtfs_barcelona`, `gtfs_madrid`).

2. **Añadir archivos GTFS**: Coloca los archivos GTFS requeridos dentro de la carpeta:
   - `stops.txt` - Información de paradas de autobús
   - `routes.txt` - Información de rutas
   - `trips.txt` - Horarios de viajes
   - `shapes.txt` - Formas de rutas (opcional)
   - `stop_times.txt` - Tiempos de parada (opcional)

3. **Actualizar la configuración**: Edita el archivo `gtfs-folder-manager.js` y añade el nombre de tu carpeta al array `knownGtfsFolders`:
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

### Estructura de Archivos de Ejemplo
```
analisitpcatosm/
├── gtfs_amb_bus/          # Carpeta existente
│   ├── stops.txt
│   ├── routes.txt
│   ├── trips.txt
│   └── shapes.txt
├── gtfs_zaragoza/         # Carpeta existente
│   ├── stops.txt
│   ├── routes.txt
│   ├── trips.txt
│   └── shapes.txt
├── gtfs_barcelona/        # Tu nueva carpeta
│   ├── stops.txt
│   ├── routes.txt
│   ├── trips.txt
│   └── shapes.txt
└── gtfs-folder-manager.js # Archivo de configuración
```

### Consejos
- El nombre de la carpeta debe empezar con `gtfs_`
- Todos los archivos GTFS deben estar en formato GTFS estándar
- La aplicación validará la accesibilidad de la carpeta automáticamente
- Puedes cambiar entre conjuntos de datos usando el desplegable sin recargar la página

## � Stack Técnico

### Frontend
- **HTML5**: Estructura semántica y accesibilidad
- **CSS3**: Estilo moderno con animaciones y transiciones
- **JavaScript (ES6+)**: Características modernas de JavaScript
- **Leaflet.js**: Biblioteca de mapeo interactivo
- **Font Awesome**: Biblioteca de iconos

### Mapeo
- **Capas Base**: OpenStreetMap, Ortoimagen ICGC
- **Superposiciones**: Rutas GTFS, rutas OSM, marcadores de paradas
- **Proyecciones**: Sistema de coordenadas WGS84
- **Niveles de Zoom**: Zoom detallado para análisis a nivel de parada

### APIs
- **Overpass API**: Consulta de datos OSM
- **Archivos GTFS**: Procesamiento local de archivos
- **Geolocalización**: Servicios de ubicación del navegador
- **Enlaces Externos**: Integración con editores JOSM e iD

## 📁 Estructura del Proyecto

```
analisitpcatosm/
├── index.html              # Interfaz principal de la aplicación
├── app.js                  # Inicialización y controles de la aplicación
├── functions.js            # Funcionalidad principal y procesamiento de datos
├── gtfs_amb_bus/          # Directorio de datos GTFS
│   ├── routes.txt         # Definiciones de rutas
│   ├── trips.txt          # Horarios de viajes
│   ├── stops.txt          # Información de paradas
│   ├── stop_times.txt     # Horarios de paradas
│   ├── shapes.txt         # Geometrías de rutas
│   ├── calendar.txt       # Horarios de servicio
│   ├── calendar_dates.txt # Fechas excepcionales
│   └── agency.txt         # Información de agencias
├── test_query.txt         # Pruebas de consultas Overpass
└── README.md              # Esta documentación
```

## 🚀 Primeros Pasos

### Prerrequisitos
- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Servidor web local (por limitaciones del protocolo file://)
- Conexión a internet para teselas de mapa y llamadas API

### Instalación
1. Clonar o descargar el repositorio
2. Servir los archivos usando un servidor web local:
   ```bash
   # Usando Python
   python -m http.server 8000
   
   # Usando Node.js
   npx serve .
   
   # Usando PHP
   php -S localhost:8000
   ```
3. Abrir `http://localhost:8000` en el navegador

### Uso
1. **Cargar Rutas**: Hacer clic en líneas de autobús en la barra lateral para cargar rutas
2. **Agregar Paradas**: Usar botones "Cargar Paradas OSM" y "Cargar Paradas GTFS"
3. **Comparar Datos**: Hacer clic en "Comparar Paradas" para analizar diferencias
4. **Procesar Datos**: Usar botones de icono para operaciones por lotes
5. **Navegar**: Hacer clic en paradas en listas para hacer zoom a ubicaciones

## 🔧 Configuración

### Configuración del Mapa
- **Centro Predeterminado**: Barcelona (41.3851, 2.1734)
- **Zoom Predeterminado**: Nivel 10
- **Zoom Máximo**: Nivel 18 para análisis detallado
- **Sistema de Coordenadas**: WGS84

### API Overpass
- **Servidor Principal**: https://overpass-api.de/api/interpreter
- **Servidores de Respaldo**: Múltiples servidores de respaldo
- **Tiempo de Espera**: 60 segundos
- **Cuadro Delimitador**: Área AMB (41.27,1.92,41.5,2.27)

### Procesamiento GTFS
- **Precisión de Coordenadas**: 6 decimales
- **Umbral de Distancia**: 50 metros para coincidencia de paradas
- **Suavizado de Formas**: Habilitado para mejor visualización
- **Detección de Dirección**: Identificación automática IDA/VUELTA

## 📈 Capacidades de Análisis

### Análisis de Rutas
- Comparación de geometría de rutas
- Análisis basado en direcciones
- Validación de puntos de forma
- Evaluación de completitud de rutas

### Análisis de Paradas
- Verificación de precisión de coordenadas
- Identificación de paradas faltantes
- Detección de duplicados
- Comparación de metadatos

### Informes Estadísticos
- Comparación de conteo de paradas
- Mediciones de distancia
- Análisis de cobertura
- Métricas de calidad de datos

## 🐛 Solución de Problemas

### Problemas Comunes
- **Errores CORS**: Usar servidor web local en lugar de protocolo file://
- **Tiempos de Espera Overpass**: Intentar de nuevo o usar servidor diferente
- **Datos Faltantes**: Verificar integridad de archivos GTFS
- **Carga de Mapa**: Verificar conexión a internet

### Modo Depuración
Abrir consola del navegador (F12) para registro detallado y mensajes de error.

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor:
1. Hacer fork del repositorio
2. Crear rama de características
3. Realizar cambios
4. Probar exhaustivamente
5. Enviar pull request

## 📄 Licencia

Este proyecto es código abierto y está disponible bajo la Licencia MIT.

## 📞 Soporte

Para problemas y preguntas:
- Crear un issue en GitHub
- Verificar la consola para mensajes de error
- Verificar disponibilidad de fuentes de datos

---

## Català

TP CAT vs OSM és una eina integral basada en web per analitzar i comparar dades de transport públic entre les dades GTFS (General Transit Feed Specification) de Barcelona i les dades d'OpenStreetMap (OSM). Aquesta eina proporciona capacitats detallades de visualització i comparació per a rutes d'autobús, parades i infraestructura de transport.

## 📊 Fonts de Dades

### Dades GTFS (TP CAT)
- **Font**: Autoritat del Transport Metropolità (ATM) - Autoritat del Transport Metropolità de Barcelona
- **Arxiu**: Directori `gtfs_amb_bus/` que conté:
  - `routes.txt` - Informació de rutes d'autobús
  - `trips.txt` - Horaris i rutes de viatges
  - `stops.txt` - Ubicacions i informació de parades d'autobús
  - `stop_times.txt` - Informació d'horaris de parades
  - `shapes.txt` - Geometria i camins de rutes
  - `calendar.txt` - Horaris de servei
  - `calendar_dates.txt` - Dates excepcionals
  - `agency.txt` - Informació d'agències de transport
- **Cobertura**: Àrea Metropolitana de Barcelona (AMB)
- **Freqüència d'Actualització**: Actualitzacions regulars de l'ATM

### Dades OpenStreetMap
- **Font**: Col·laboradors d'OpenStreetMap de tot el món
- **API**: Overpass API per consultar dades de transport
- **Tipus de Dades**:
  - Parades d'autobús (`highway=bus_stop`)
  - Plataformes de transport públic (`public_transport=platform`)
  - Relacions de ruta (`type=route`, `route=bus`)
  - Posicions de parada i metadades
- **Cobertura**: Global, amb enfoc en l'àrea de Barcelona
- **Freqüència d'Actualització**: Actualitzacions en temps real de la comunitat

## 🚀 Característiques

### Anàlisi de Rutes
- **Carregar Rutes GTFS**: Mostrar rutes d'autobús oficials de dades GTFS
- **Carregar Rutes OSM**: Visualitzar rutes de relacions d'OpenStreetMap
- **Comparació de Rutes**: Comparar geometries de rutes GTFS i OSM
- **Suport de Direccions**: Visualització separada per a viatges IDA (sortida) i VUELTA (retorn)

### Gestió de Parades
- **Carregar Parades GTFS**: Mostrar parades d'autobús oficials amb números de seqüència
- **Carregar Parades OSM**: Mostrar parades d'autobús OSM de relacions de ruta
- **Comparació de Parades**: Comparar ubicacions de parades entre GTFS i OSM
- **Llistes Interactives**: Llistes de parades clicables amb funcionalitat de zoom
- **Anàlisi de Coordenades**: Calcular distàncies entre parades coincidents

### Eines de Visualització
- **Mapa Interactiu**: Mapa basat en Leaflet.js amb múltiples capes base
- **Control de Capes**: Canviar entre OpenStreetMap i ortoimatges ICGC
- **Codificació de Colors**: Diferents colors per a dades GTFS vs OSM
- **Informació Emergent**: Informació detallada per a rutes i parades
- **Controls de Zoom**: Navegació a parades i rutes específiques

### Processament de Dades
- **Processament de Formes GTFS**: Visualitzar geometries i camins de rutes
- **Anàlisi de Viatges GTFS**: Mostrar camins de viatges individuals
- **Processament de Rutes**: Anàlisi complet de rutes amb detecció de direcció
- **Operacions per Lots**: Carregar múltiples rutes simultàniament
- **Exportació de Dades**: Diferències de coordenades i resultats d'anàlisi

### Característiques de Comparació
- **Coincidència de Parades**: Coincidència exacta de coordenades
- **Detecció Propera**: Trobar parades dins de 50 metres
- **Càlcul de Diferències**: Diferències de coordenades entre conjunts de dades
- **Anàlisi de Dades Faltants**: Identificar parades només OSM i només GTFS
- **Comparació Visual**: Visualització costat a costat

### Interfície d'Usuari
- **Disseny Responsiu**: Funciona a escriptori i dispositius mòbils
- **Panells Col·lapsables**: Gestió de barra lateral i panel de controls
- **Navegació per Icones**: Disseny de botons intuïtiu basat en icones
- **Informacions sobre Eines**: Suggeriments i instruccions útils
- **Retroalimentació d'Estat**: Indicadors de càrrega i missatges d'error

## 📁 Gestió de Carpetes GTFS

### Afegir Nous Conjunts de Dades GTFS

L'aplicació suporta múltiples conjunts de dades GTFS. Per afegir un nou conjunt de dades GTFS:

1. **Crear la carpeta**: Afegeix la teva nova carpeta GTFS al directori del projecte. El nom de la carpeta ha de començar amb `gtfs_` (ex: `gtfs_barcelona`, `gtfs_madrid`).

2. **Afegir arxius GTFS**: Col·loca els arxius GTFS requerits dins de la carpeta:
   - `stops.txt` - Informació de parades d'autobús
   - `routes.txt` - Informació de rutes
   - `trips.txt` - Horaris de viatges
   - `shapes.txt` - Formes de rutes (opcional)
   - `stop_times.txt` - Temps de parada (opcional)

3. **Actualitzar la configuració**: Edita l'arxiu `gtfs-folder-manager.js` i afegeix el nom de la teva carpeta a l'array `knownGtfsFolders`:
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

### Estructura d'Arxius d'Exemple
```
analisitpcatosm/
├── gtfs_amb_bus/          # Carpeta existent
│   ├── stops.txt
│   ├── routes.txt
│   ├── trips.txt
│   └── shapes.txt
├── gtfs_zaragoza/         # Carpeta existent
│   ├── stops.txt
│   ├── routes.txt
│   ├── trips.txt
│   └── shapes.txt
├── gtfs_barcelona/        # La teva nova carpeta
│   ├── stops.txt
│   ├── routes.txt
│   ├── trips.txt
│   └── shapes.txt
└── gtfs-folder-manager.js # Arxiu de configuració
```

### Consells
- El nom de la carpeta ha de començar amb `gtfs_`
- Tots els arxius GTFS han d'estar en format GTFS estàndard
- L'aplicació validarà l'accessibilitat de la carpeta automàticament
- Pots canviar entre conjunts de dades usant el desplegable sense recarregar la pàgina

## 🛠 Stack Tècnic

### Frontend
- **HTML5**: Estructura semàntica i accessibilitat
- **CSS3**: Estil modern amb animacions i transicions
- **JavaScript (ES6+)**: Característiques modernes de JavaScript
- **Leaflet.js**: Biblioteca de mapatge interactiu
- **Font Awesome**: Biblioteca d'icones

### Mapatge
- **Capes Base**: OpenStreetMap, Ortoimatge ICGC
- **Superposicions**: Rutes GTFS, rutes OSM, marcadors de parades
- **Projeccions**: Sistema de coordenades WGS84
- **Nivells de Zoom**: Zoom detallat per a anàlisi a nivell de parada

### APIs
- **Overpass API**: Consulta de dades OSM
- **Arxius GTFS**: Processament local d'arxius
- **Geolocalització**: Serveis d'ubicació del navegador
- **Enllaços Externs**: Integració amb editors JOSM i iD

## 📁 Estructura del Projecte

```
analisitpcatosm/
├── index.html              # Interfície principal de l'aplicació
├── app.js                  # Inicialització i controls de l'aplicació
├── functions.js            # Funcionalitat principal i processament de dades
├── gtfs_amb_bus/          # Directori de dades GTFS
│   ├── routes.txt         # Definicions de rutes
│   ├── trips.txt          # Horaris de viatges
│   ├── stops.txt          # Informació de parades
│   ├── stop_times.txt     # Horaris de parades
│   ├── shapes.txt         # Geometries de rutes
│   ├── calendar.txt       # Horaris de servei
│   ├── calendar_dates.txt # Dates excepcionals
│   └── agency.txt         # Informació d'agències
├── test_query.txt         # Proves de consultes Overpass
└── README.md              # Aquesta documentació
```

## 🚀 Primers Passos

### Prerequisits
- Navegador web modern (Chrome, Firefox, Safari, Edge)
- Servidor web local (per limitacions del protocol file://)
- Connexió a internet per a teselas de mapa i trucades API

### Instal·lació
1. Clonar o descarregar el repositori
2. Servir els arxius usant un servidor web local:
   ```bash
   # Usant Python
   python -m http.server 8000
   
   # Usant Node.js
   npx serve .
   
   # Usant PHP
   php -S localhost:8000
   ```
3. Obrir `http://localhost:8000` al navegador

### Ús
1. **Carregar Rutes**: Fer clic a línies d'autobús a la barra lateral per carregar rutes
2. **Afegir Parades**: Usar botons "Carregar Parades OSM" i "Carregar Parades GTFS"
3. **Comparar Dades**: Fer clic a "Comparar Parades" per analitzar diferències
4. **Processar Dades**: Usar botons d'icona per a operacions per lots
5. **Navegar**: Fer clic a parades a llistes per fer zoom a ubicacions

## 🔧 Configuració

### Configuració del Mapa
- **Centre Predeterminat**: Barcelona (41.3851, 2.1734)
- **Zoom Predeterminat**: Nivell 10
- **Zoom Màxim**: Nivell 18 per a anàlisi detallat
- **Sistema de Coordenades**: WGS84

### API Overpass
- **Servidor Principal**: https://overpass-api.de/api/interpreter
- **Servidors de Respaldo**: Múltiples servidors de respaldo
- **Temps d'Espera**: 60 segons
- **Caixa Delimitadora**: Àrea AMB (41.27,1.92,41.5,2.27)

### Processament GTFS
- **Precisió de Coordenades**: 6 decimals
- **Llindar de Distància**: 50 metres per a coincidència de parades
- **Suavitzat de Formes**: Habilitat per a millor visualització
- **Detecció de Direcció**: Identificació automàtica IDA/VUELTA

## 📈 Capacitats d'Anàlisi

### Anàlisi de Rutes
- Comparació de geometria de rutes
- Anàlisi basat en direccions
- Validació de punts de forma
- Avaluació de completitud de rutes

### Anàlisi de Parades
- Verificació de precisió de coordenades
- Identificació de parades faltants
- Detecció de duplicats
- Comparació de metadades

### Informes Estadístics
- Comparació de recompte de parades
- Mesures de distància
- Anàlisi de cobertura
- Mètriques de qualitat de dades

## 🐛 Solució de Problemes

### Problemes Comuns
- **Errors CORS**: Usar servidor web local en lloc de protocol file://
- **Temps d'Espera Overpass**: Intentar de nou o usar servidor diferent
- **Dades Faltants**: Verificar integritat d'arxius GTFS
- **Càrrega de Mapa**: Verificar connexió a internet

### Mode Depuració
Obrir consola del navegador (F12) per a registre detallat i missatges d'error.

## 🤝 Contribuir

Les contribucions són benvingudes! Si us plau:
1. Fer fork del repositori
2. Crear branca de característiques
3. Realitzar canvis
4. Provar exhaustivament
5. Enviar pull request

## 📄 Llicència

Aquest projecte és codi obert i està disponible sota la Llicència MIT.

## 📞 Suport

Per a problemes i preguntes:
- Crear un issue a GitHub
- Verificar la consola per a missatges d'error
- Verificar disponibilitat de fonts de dades
