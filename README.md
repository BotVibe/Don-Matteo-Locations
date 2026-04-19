# Interaktive Karte: Drehorte von Don Matteo

Dieses Projekt bietet eine interaktive Web-Karte, die die wichtigsten Drehorte der beliebten italienischen Fernsehserie **"Don Matteo"** zeigt. Die Serie wurde in den ersten Staffeln in Gubbio gedreht und wechselte später nach Spoleto.

## Funktionen

*   **Interaktive Karte:** Nutzt [Leaflet.js](https://leafletjs.com/) mit OpenStreetMap-Kacheln, um die Drehorte geografisch darzustellen.
*   **Staffel-Zeitstrahl:** Filtere die Drehorte nach Staffeln (1 bis 14). Ein Klick auf eine Staffel zoomt die Karte automatisch auf die relevanten Drehorte in Gubbio (Staffel 1-8) oder Spoleto (Staffel 9-14).
*   **Detailansicht:** Ein Klick auf einen Marker in der Karte öffnet eine Detailansicht mit weiteren Informationen zum Drehort, seiner Bedeutung in der Serie und einem hochauflösenden Bild von Wikimedia Commons.
*   **Ansprechendes Design:** Das Farbschema ist von den warmen Erdtönen der umbrischen Landschaft und den Farben der Carabinieri (Blau und Rot) inspiriert.

## Projektstruktur

*   `index.html`: Die Haupt-HTML-Datei, die das Layout und die Struktur der Anwendung definiert.
*   `style.css`: Das Stylesheet, das für das ansprechende, an Umbrien angelehnte Design sorgt.
*   `script.js`: Die JavaScript-Logik zur Initialisierung der Karte, zum Laden der Daten und zur Steuerung der Interaktionen.
*   `data.json`: Eine JSON-Datei, die alle Informationen zu den Drehorten enthält (Koordinaten, Beschreibung, Hintergrund und Bild-URLs).

## Lokale Ausführung

Das Projekt besteht aus statischen Dateien. Um Probleme mit CORS (Cross-Origin Resource Sharing) beim Laden der lokalen `data.json`-Datei zu vermeiden, sollte das Projekt idealerweise über einen lokalen Webserver gestartet werden.

### Möglichkeit 1: Python (empfohlen)
Wenn Python installiert ist, öffne ein Terminal im Projektverzeichnis und führe folgenden Befehl aus:

```bash
# Python 3
python -m http.server 8000
```
Öffne anschließend einen Webbrowser und navigiere zu: `http://localhost:8000`

### Möglichkeit 2: VS Code Live Server
Wenn du Visual Studio Code verwendest, kannst du die Erweiterung "Live Server" installieren. Öffne einfach die `index.html` und klicke auf "Go Live" unten rechts im Editor.

## Datenquellen

Die Bilder, die in der Detailansicht verwendet werden, stammen aus der [Wikimedia Commons](https://commons.wikimedia.org/) und sind frei verwendbar. Die Geodaten und Beschreibungen basieren auf den bekannten Drehorten der Serie.
