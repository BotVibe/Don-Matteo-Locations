# Interaktive Karte: Drehorte von Don Matteo

Dieses Projekt zeigt die Drehorte der italienischen Fernsehserie **„Don Matteo"** auf einer
interaktiven Karte – von der Gubbio-Ära (Staffel 1–8) über die Spoleto-Ära (Staffel 9–15) bis zu
den Rückblenden-Drehorten in der Tuscia (Latium).

**Datenstand: 12.08.2026 · 78 Einträge, davon 65 mit Koordinaten · 42 Quellen · Staffel 1–15**

Der Datensatz ist bewusst kein „Best of": Er verzeichnet auch schwach belegte Orte, Widersprüche
zwischen Quellen und Orte ohne ermittelbare Koordinaten – jeweils klar gekennzeichnet.

## Funktionen

*   **Interaktive Karte** (Leaflet.js mit OpenStreetMap-Kacheln). Die Marker sind nach
    Belegqualität eingefärbt: hoch, mittel, schwach belegt sowie reine Handlungsorte.
*   **Staffelfilter 1–15** inklusive Ära-Kennzeichnung. Zu jeder Staffel erscheinen
    Erstausstrahlung, Folgenzahl, der Stand der Erschließung und die belegten Drehzeiträume
    als Tabelle. Eine eigene Schaltfläche zeigt die Orte, die keiner Staffel zugeordnet sind.
*   **Weitere Filter:** Volltextsuche (Name, Adresse, Rolle in der Serie, Folgen, Anmerkungen),
    Region (Gubbio, Spoleto, Tuscia, übriges Umbrien und Latium), Verlässlichkeit sowie
    Schalter für Handlungsorte und für Orte ohne Koordinaten.
*   **Liste neben der Karte:** alle Treffer nach Regionen gruppiert, mit Kennzeichnungen für
    Widersprüche, Besucherhinweise und fehlende Koordinaten. Karte und Liste sind gekoppelt.
*   **Detailansicht** mit Rolle in der Serie, Beschreibung des Ortes, Folgenbeispielen,
    Anmerkungen zur Quellenlage, Steckbrief (Adresse, Geo-Genauigkeit, Prüfdatum …),
    verlinkten Einzelquellen und Links zu Google Maps, OpenStreetMap und Fotoquellen.
*   **Quellenregister** mit allen 42 Quellen und **Vorbehalten** zur Datenlage (Studioaufnahmen,
    Handlungsort ≠ Drehort, Herkunft der Koordinaten).
*   **Robust ohne Netz:** Fällt Leaflet aus, bleiben Liste, Filter und Detailansicht nutzbar.

## Projektstruktur

| Pfad | Inhalt |
|---|---|
| `index.html` | Aufbau der Seite |
| `style.css` | Gestaltung (umbrische Erdtöne, Carabinieri-Blau und -Rot) |
| `script.js` | Karte, Filterlogik, Liste und Detailansicht |
| `data.json` | **erzeugte** Datei, die die Webapp lädt |
| `quelldaten/` | unveränderte Rohdaten (CSV/GeoJSON) samt Datendokumentation |
| `tools/build_data.py` | erzeugt `data.json` aus den Rohdaten |
| `tests/test_app.py` | End-to-End-Tests mit Playwright |

## Datenpflege

`data.json` wird **nicht von Hand bearbeitet**. Grundlage sind die Rohdaten in `quelldaten/`:

| Datei | Inhalt |
|---|---|
| `don-matteo-drehorte.csv` | Haupttabelle mit 78 Orten und 24 Spalten |
| `don-matteo-drehorte.geojson` | dieselben Orte als Punkt-Layer (65 mit Koordinaten) |
| `don-matteo-quellen.csv` | Quellenregister Q01–Q41 (inkl. Q06b) |
| `don-matteo-drehzeitraeume.csv` | belegte Drehzeiträume je Staffel |
| `don-matteo-abdeckung-je-staffel.csv` | Stand der Erschließung je Staffel |
| `README-don-matteo-drehorte.md` | Datendokumentation des Datensatzes |

Nach einer Änderung an den Rohdaten:

```bash
python3 tools/build_data.py
```

Das Skript übernimmt dabei:

*   **Umlaute:** Die Rohdaten sind transliteriert (`Gebaeude`, `Strasse`). Für die Anzeige werden
    Umlaute und `ß` wiederhergestellt – regelbasiert, mit einer Ausnahmeliste für italienische
    Namen und für Wörter, in denen die Buchstabenfolge echt ist (`Quelle`, `aktuelle`, `Mauer`).
*   **Staffelzuordnung:** Freitext wie `1-5 (als Rathaus), 6-8 (Hintergrund)` oder `9 ff.` wird in
    konkrete Staffelnummern übersetzt. Klammerinhalte werden vorher entfernt, damit Angaben wie
    `(laut Q12)` keine falschen Zahlen liefern.
*   **Ableitungen:** Region, normierte Belegstufe (hoch/mittel/niedrig), Kennzeichnung reiner
    Handlungsorte, Widersprüche und Besucherhinweise (z. B. gesperrter Ponte delle Torri).
*   **Prüfungen:** Alle Quellenverweise müssen im Register existieren; die erkannten
    Handlungsorte werden gegen die erwartete Liste geprüft. Sonst bricht das Skript ab.

## Lokale Ausführung

Wegen CORS muss das Projekt über einen lokalen Webserver laufen, damit `data.json` geladen
werden kann:

```bash
python3 -m http.server 8000
```

Anschließend `http://localhost:8000` im Browser öffnen. Alternativ die Erweiterung
„Live Server" in Visual Studio Code verwenden.

## Tests (End-to-End)

```bash
python3 tests/test_app.py
```

Der Test startet einen lokalen Server auf Port 8000, blockiert alle externen Anfragen
(Leaflet, Kacheln, Schriftarten) und prüft unter anderem Datenladen, Staffel-, Regions- und
Suchfilter, die Kennzeichnung besonderer Orte, die Detailansicht und die Textaufbereitung.

Passt das im System vorhandene Chromium nicht zur installierten Playwright-Version, kann der
Pfad gesetzt werden:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/pfad/zu/chrome python3 tests/test_app.py
```

## Datenquellen

Die Ortsangaben stammen aus offiziellen Seiten (Comune di Gubbio, Comune di Spoleto, Umbria
Tourism, Italy for Movies), aus Vor-Ort-Reportagen von Fanseiten, aus der Presse sowie aus
Reise-Blogs; das vollständige Register ist in der Webapp einsehbar. Die Koordinaten stammen aus
Google Places, die zugehörigen `google_place_id` liegen im Datensatz bei.

## Deployment auf GitHub Pages

Ein GitHub-Actions-Workflow (`.github/workflows/deploy.yml`) veröffentlicht die Seite
automatisch, sobald Änderungen im Standard-Branch `main` landen; zusätzlich lässt er sich im
Reiter **Actions** manuell starten (`workflow_dispatch`). Einmalig muss unter
**Settings › Pages › Build and deployment › Source** der Eintrag **GitHub Actions** gewählt
werden.

Die Seite ist danach unter `https://<benutzername>.github.io/<repository-name>/` erreichbar.
Eine eigene Domain lässt sich unter **Settings › Pages › Custom domain** eintragen; dazu müssen
beim Domain-Anbieter die passenden A- bzw. CNAME-Records auf GitHub zeigen (siehe
[GitHub-Dokumentation](https://docs.github.com/de/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)).
Anschließend sollte **Enforce HTTPS** aktiviert werden.
