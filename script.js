let map;
let markers = [];
window.appData = null;

// Initialisiere die Karte
function initMap() {
    // Zentrum auf Umbrien (zwischen Gubbio und Spoleto)
    map = L.map('map').setView([43.0, 12.6], 9);

    // Füge OpenStreetMap Tiles hinzu
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    loadData();
}

// Lade die JSON Daten
async function loadData() {
    try {
        const response = await fetch('data.json');
        window.appData = await response.json();

        createTimeline();
        showAllLocations();
    } catch (error) {
        console.error("Fehler beim Laden der Daten:", error);
    }
}

// Hilfsfunktion zum Setzen des aktiven Buttons
function setActiveButton(button) {
    document.querySelectorAll('.season-btn').forEach(b => b.classList.remove('active'));
    button.classList.add('active');
}

// Erstelle den Zeitstrahl
function createTimeline() {
    const timeline = document.getElementById('timeline');

    window.appData.seasons.forEach(season => {
        const btn = document.createElement('button');
        btn.className = 'season-btn';
        btn.textContent = season.name;
        btn.dataset.seasonId = season.id;

        btn.addEventListener('click', () => {
            setActiveButton(btn);
            showSeasonLocations(season.id);
        });

        timeline.appendChild(btn);
    });

    // Event Listener für "Alle" Button
    document.querySelector('[data-season="all"]').addEventListener('click', (e) => {
        setActiveButton(e.target);
        showAllLocations();
    });
}

// Zeige alle Orte
function showAllLocations() {
    clearMarkers();

    const bounds = L.latLngBounds();

    window.appData.locations.forEach(loc => {
        addMarker(loc);
        bounds.extend([loc.lat, loc.lng]);
    });

    if (window.appData.locations.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// Zeige Orte einer bestimmten Staffel
function showSeasonLocations(seasonId) {
    clearMarkers();

    const season = window.appData.seasons.find(s => s.id === seasonId);
    if (!season) return;

    const bounds = L.latLngBounds();
    let locationsShown = 0;
    const seasonLocationIds = new Set(season.location_ids);

    window.appData.locations.forEach(loc => {
        if (season.location_ids.includes(loc.id)) {
            addMarker(loc);
            bounds.extend([loc.lat, loc.lng]);
            locationsShown++;
        }
    });

    if (locationsShown > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
}

// Füge einen Marker hinzu
function addMarker(location) {
    // Custom Icon im Carabinieri Look (optional, hier Standard mit Farbe)
    const marker = L.marker([location.lat, location.lng]).addTo(map);

    const container = document.createElement('div');
    container.style.textAlign = 'center';

    const title = document.createElement('h3');
    title.textContent = location.name;
    container.appendChild(title);

    const button = document.createElement('button');
    button.className = 'popup-btn';
    button.textContent = 'Details ansehen';
    button.addEventListener('click', () => {
        showDetails(location.id);
    });
    container.appendChild(button);

    marker.bindPopup(container);
    markers.push(marker);
}

// Entferne alle Marker
function clearMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
}

// Zeige Details zu einem Ort
window.showDetails = function(locationId) {
    const loc = window.appData.locations.find(l => l.id === locationId);
    if (!loc) return;

    document.getElementById('details-name').textContent = loc.name;
    document.getElementById('details-image').src = loc.image || 'https://via.placeholder.com/800x600?text=Kein+Bild+verfügbar';
    document.getElementById('details-description').textContent = loc.description;
    document.getElementById('details-background').textContent = loc.background;
    document.getElementById('details-source').textContent = loc.source;
    document.getElementById('details-source-reliability').textContent = `Zuverlässigkeit: ${loc.reliability}`;

    const detailsContainer = document.getElementById('details-container');
    detailsContainer.classList.remove('hidden');

    // Scroll to details
    detailsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

// Event Listener für Schließen-Button
document.getElementById('close-details').addEventListener('click', () => {
    document.getElementById('details-container').classList.add('hidden');
});

// Starte die Anwendung
document.addEventListener('DOMContentLoaded', initMap);
