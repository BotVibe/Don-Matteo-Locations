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

## Tests (End-to-End)

Das Projekt beinhaltet automatisierte Frontend-Tests mit **Python und Playwright**, um sicherzustellen, dass die Kernfunktionen fehlerfrei arbeiten.

### Tests lokal ausführen
Um die Tests auszuführen, stelle sicher, dass du Python und das Playwright-Paket installiert hast. Führe dann folgenden Befehl im Hauptverzeichnis aus:

```bash
python tests/test_show_details.py
```

*Hinweis: Während des Testlaufs wird ein lokaler Server auf Port 8000 gestartet. Die Tests sind so konfiguriert, dass sie externe Anfragen (wie Kacheln oder Schriftarten) blockieren, um Timeouts bei fehlender Internetverbindung zu vermeiden.*

## Deployment auf GitHub Pages

Dieses Projekt ist so konfiguriert, dass es automatisch und kostenlos über **GitHub Pages** veröffentlicht werden kann.

### Wie das Deployment funktioniert

Es wurde ein GitHub Actions Workflow (`.github/workflows/deploy.yml`) eingerichtet. Dieser Workflow sorgt dafür, dass die Website **automatisch aktualisiert wird, sobald du Änderungen in den Branch namens `master` pushst oder dorthin mergst**.

**Ablauf für Aktualisierungen:**
1. Du entwickelst neue Funktionen oder änderst Daten direkt auf deinem Haupt-Branch (`master`).
2. Sobald du deine Änderungen in den `master`-Branch pusht (oder einen Pull Request dorthin mergst), erkennt GitHub das Update und startet automatisch im Hintergrund die Veröffentlichung.
3. Nach 1-2 Minuten ist deine Website online aktualisiert.

### GitHub-Einstellungen vornehmen (Einmalig)

Damit das Deployment funktioniert, musst du dies einmalig in den Repository-Einstellungen aktivieren:
1. Gehe auf die GitHub-Seite deines Repositories.
2. Klicke oben auf **Settings** (Einstellungen).
3. Wähle im Menü auf der linken Seite **Pages**.
4. Unter dem Punkt **Build and deployment** > **Source** musst du im Dropdown-Menü **GitHub Actions** auswählen.

### Unter welcher Domain ist die Seite erreichbar?

#### 1. Die kostenlose GitHub-Domain
Standardmäßig erhält deine Website eine kostenlose Domain von GitHub, die sich aus deinem Benutzernamen (bzw. Organisationsnamen) und dem Repository-Namen zusammensetzt:
`https://<dein-github-benutzername>.github.io/<repository-name>/`
*(Beispiel: `https://maxmustermann.github.io/don-matteo-map/`)*

#### 2. Eine eigene Domain verwenden (Custom Domain)
Du kannst auch problemlos eine eigene, von dir gekaufte Domain (z.B. `www.meine-coole-karte.de`) verwenden.

**So richtest du eine eigene Domain ein:**
1. **Beim Domain-Anbieter (z.B. Strato, Ionos, etc.):** Du musst in den DNS-Einstellungen deiner Domain spezielle Einträge (A-Records für die Root-Domain und/oder einen CNAME-Record für Subdomains wie `www`) auf die Server von GitHub verweisen lassen. Die exakten IP-Adressen findest du in der [offiziellen GitHub-Dokumentation](https://docs.github.com/de/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
2. **In GitHub:** Gehe wieder zu **Settings** > **Pages**.
3. Trage unter **Custom domain** deinen Domainnamen ein und klicke auf "Save". GitHub führt daraufhin einen Check durch, ob die DNS-Einstellungen korrekt sind.
4. Es wird dringend empfohlen, danach das Häkchen bei **Enforce HTTPS** zu setzen, damit deine Seite eine sichere Verbindung bietet (GitHub erstellt das Zertifikat automatisch und kostenlos).
