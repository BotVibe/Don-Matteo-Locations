# Projekt-Richtlinien für KI-Agenten

Diese Datei enthält wichtige Informationen und Richtlinien für KI-Agenten, die an diesem Projekt arbeiten. Bitte lies diese sorgfältig durch, bevor du Änderungen vornimmst.

## 1. Kommunikation und Dokumentation
*   **Sprache:** Die Projektdokumentation (wie README.md, Kommentare) muss in **Deutsch** verfasst werden.
*   **Planung:** Starte neue Aufgaben immer in einem "deep planning mode". Stelle klärende Fragen, erstelle einen Plan und führe ihn erst nach Genehmigung aus.

## 2. Technologie-Stack
*   **Frontend:** Vanilla HTML, CSS, JavaScript und Leaflet.js.
*   **Daten:** Die Daten werden aus einer lokalen `data.json`-Datei geladen.
*   **Kein npm/package.json:** Das Projekt enthält keine `package.json`-Datei. Führe keine Standard-npm-Befehle wie `npm test` oder `npm install` für die Kernausführung oder Tests aus. Node.js (v22.x) und npm (v11.x) sind jedoch für Benchmark-Skripte oder Build-Tools verfügbar.
*   **Syntax-Check:** Verwende `node -c <filename.js>`, um JavaScript-Dateien schnell auf Syntaxfehler zu prüfen.

## 3. Umgebungseinschränkungen
*   **Eingeschränkter Netzwerkzugriff:** Befehle wie `npm install` oder `pip install`, die versuchen, externe Registries (z. B. registry.npmjs.org) zu erreichen, schlagen wegen Timeouts fehl.

## 4. Frontend-Tests (Playwright)
*   **Tool:** Für Frontend-Tests wird Python mit `playwright.sync_api` verwendet.
*   **Timeouts verhindern:** Headless-Browser-Tests (Playwright) haben häufig Timeouts beim Warten auf externe Ressourcen (Schriftarten, Leaflet-Kacheln).
    *   Verwende `wait_until='commit'` bei `page.goto()`.
    *   Blockiere externe Anfragen mit `page.route` (z. B. Google Fonts, Leaflet-Tiles), um Timeouts zu vermeiden. Nur lokale Anfragen (localhost) sollten zugelassen werden.
*   **Zustandstests:** Die Anwendung stellt den internen Zustand über das globale Objekt `window.appData` bereit. Dies sollte in End-to-End-Tests genutzt werden, um auf das Laden von Daten zu warten und den Zustand via `page.evaluate` zu überprüfen.

## 5. Sicherheit und Best Practices
*   **XSS-Vermeidung:** Verwende stets sichere DOM-APIs wie `document.createElement`, `textContent` und `addEventListener`. Vermeide string-basierte HTML-Interpolation (z. B. `innerHTML` mit unsicheren Daten) oder Inline-`onclick`-Attribute.

## 6. Entwicklungsserver
*   **Lokaler Server:** Starte das Projekt lokal über einen statischen Dateiserver im Root-Verzeichnis, z. B. mit `python3 -m http.server 8000`.

## 7. Werkzeug-Einschränkungen
*   **Dateien lesen:** Die Ausgabe des Tools zum Lesen von Dateien (`read_file`) kann bei 1000 Zeichen abgeschnitten sein. Verwende für größere Dateien `run_in_bash_session` mit `cat` oder `sed`.

## 8. Deployment
*   **GitHub Pages:** Das Projekt wird automatisch via GitHub Actions (`.github/workflows/deploy.yml`) auf GitHub Pages bereitgestellt, sobald Änderungen in den `deploy`-Branch gepusht oder gemergt werden.
