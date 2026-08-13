"""End-to-End-Tests der Drehorte-Karte (Python + Playwright).

Aufruf aus dem Projektwurzelverzeichnis:

    python3 tests/test_app.py

Externe Anfragen (Leaflet, Kacheln, Schriftarten) werden blockiert, damit die
Tests ohne Internetverbindung und ohne Timeouts laufen. Die Anwendung ist so
gebaut, dass Liste, Filter und Detailansicht auch ohne Leaflet funktionieren.
"""

import json
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

WURZEL = Path(__file__).resolve().parent.parent
PORT = 8000
ADRESSE = f"http://localhost:{PORT}"

# Falls im System bereits ein Chromium liegt, das nicht zur installierten
# Playwright-Version passt, kann der Pfad über diese Variable gesetzt werden.
CHROMIUM_PFAD = os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE", "")


class Testlauf:
    def __init__(self):
        self.fehler = []

    def pruefe(self, bedingung, beschreibung):
        if bedingung:
            print(f"  ok   {beschreibung}")
        else:
            print(f"  FEHL {beschreibung}")
            self.fehler.append(beschreibung)

    def gleich(self, ist, soll, beschreibung):
        self.pruefe(ist == soll, f"{beschreibung} (ist: {ist!r}, soll: {soll!r})")


def server_starten():
    prozess = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(PORT)],
        cwd=WURZEL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    time.sleep(2)
    return prozess


def externe_anfragen_blockieren(seite):
    def weiche(route):
        if "localhost" in route.request.url:
            route.continue_()
        else:
            route.abort()

    seite.route("**/*", weiche)


def tests_ausfuehren(seite, lauf: Testlauf):
    daten = json.loads((WURZEL / "data.json").read_text(encoding="utf-8"))

    print("\n1. Daten laden")
    seite.wait_for_function("window.appData !== null", timeout=15000)
    geladen = seite.evaluate("window.appData.orte.length")
    lauf.gleich(geladen, len(daten["orte"]), "Alle Orte aus data.json geladen")
    lauf.gleich(seite.evaluate("window.appData.staffeln.length"), 15, "15 Staffeln vorhanden")

    print("\n2. Grundansicht")
    eintraege = seite.locator("#ortsliste .ortseintrag")
    expect(eintraege).to_have_count(len(daten["orte"]))
    lauf.pruefe(True, f"Liste zeigt alle {len(daten['orte'])} Orte")

    mit_koordinaten = sum(1 for ort in daten["orte"] if ort["hat_koordinaten"])
    lauf.gleich(
        seite.evaluate("document.getElementById('treffer-zahl').textContent"),
        f"{len(daten['orte'])} Orte · {len(daten['orte']) - mit_koordinaten} davon ohne Koordinaten",
        "Trefferzahl nennt Orte ohne Koordinaten",
    )

    print("\n3. Staffelfilter")
    staffel15 = next(s for s in daten["staffeln"] if s["nummer"] == 15)
    seite.locator("#staffel-leiste .staffel-btn[data-staffel='15']").click()
    expect(eintraege).to_have_count(len(staffel15["ort_ids"]))
    lauf.pruefe(True, f"Staffel 15 zeigt {len(staffel15['ort_ids'])} Orte")
    expect(seite.locator("#staffel-info h2")).to_have_text("Staffel 15 (2026)")
    lauf.pruefe(
        seite.locator("#staffel-info .drehzeit-tabelle tbody tr").count()
        == len(staffel15["drehzeitraeume"]),
        "Drehzeiträume der Staffel 15 werden tabellarisch gezeigt",
    )

    print("\n4. Orte ohne Staffelzuordnung")
    ohne_zuordnung = [ort for ort in daten["orte"] if not ort["staffeln"]]
    seite.locator("#staffel-leiste .staffel-btn[data-staffel='ohne']").click()
    expect(eintraege).to_have_count(len(ohne_zuordnung))
    lauf.pruefe(True, f"{len(ohne_zuordnung)} Orte ohne Staffelzuordnung")

    print("\n5. Region und Verlässlichkeit")
    seite.locator("#filter-zuruecksetzen").click()
    tuscia = [ort for ort in daten["orte"] if ort["region"] == "tuscia"]
    seite.locator("#region").select_option("tuscia")
    expect(eintraege).to_have_count(len(tuscia))
    lauf.pruefe(True, f"Region Tuscia: {len(tuscia)} Orte")

    seite.locator("#filter-zuruecksetzen").click()
    hoch = [ort for ort in daten["orte"] if ort["stufe"] == "hoch"]
    seite.locator("#stufe").select_option("hoch")
    expect(eintraege).to_have_count(len(hoch))
    lauf.pruefe(True, f"Nur hoch belegte Orte: {len(hoch)}")

    print("\n6. Handlungsorte ausblenden")
    seite.locator("#filter-zuruecksetzen").click()
    handlungsorte = [ort for ort in daten["orte"] if ort["ist_handlungsort"]]
    seite.locator("#handlungsorte").uncheck()
    expect(eintraege).to_have_count(len(daten["orte"]) - len(handlungsorte))
    lauf.pruefe(True, f"{len(handlungsorte)} Handlungsorte werden ausgeblendet")

    print("\n7. Suche")
    seite.locator("#filter-zuruecksetzen").click()
    seite.locator("#suche").fill("Ponte delle Torri")
    expect(eintraege).to_have_count(1)
    expect(eintraege.first).to_contain_text("Ponte delle Torri")
    lauf.pruefe(True, "Suche findet den Ponte delle Torri")

    seite.locator("#suche").fill("Rückblende")
    lauf.pruefe(eintraege.count() > 0, "Volltextsuche greift auch auf die Rolle in der Serie zu")
    seite.locator("#filter-zuruecksetzen").click()

    print("\n8. Detailansicht")
    details = seite.locator("#details-container")
    expect(details).to_have_class("hidden")
    seite.evaluate("window.showDetails('kennt-keiner')")
    expect(details).to_have_class("hidden")
    lauf.pruefe(True, "Unbekannte Kennung öffnet keine Detailansicht")

    seite.evaluate("window.showDetails('SP08')")
    expect(details).not_to_have_class("hidden")
    expect(seite.locator("#details-name")).to_have_text("Ponte delle Torri")
    expect(seite.locator("#details-name-it")).to_have_text("Ponte delle Torri")
    lauf.pruefe(
        "GESPERRT" in seite.locator("#details-warnung").inner_text(),
        "Besucherwarnung zur gesperrten Brücke wird angezeigt",
    )
    lauf.pruefe(
        seite.locator("#details-quellen li").count() > 0,
        "Quellen des Drehorts werden aufgelistet",
    )
    lauf.pruefe(
        seite.locator("#details-fakten dt").count() >= 5,
        "Steckbrief enthält die Kerndaten",
    )

    print("\n9. Kennzeichnung besonderer Orte")
    seite.evaluate("window.showDetails('SP02')")
    expect(seite.locator("#details-badges .badge-handlungsort")).to_have_count(1)
    lauf.pruefe(True, "Dom von Spoleto ist als Handlungsort gekennzeichnet")

    seite.evaluate("window.showDetails('SP05')")
    expect(seite.locator("#details-badges .badge-widerspruch")).to_have_count(1)
    lauf.pruefe(True, "Teatro Caio Melisso ist als widersprüchlich belegt gekennzeichnet")

    seite.evaluate("window.showDetails('U11')")
    expect(seite.locator("#details-badges .badge-ohne")).to_have_count(1)
    lauf.pruefe(True, "Orvieto ist als Ort ohne Koordinaten gekennzeichnet")

    seite.locator("#close-details").click()
    expect(details).to_have_class("hidden")
    lauf.pruefe(True, "Detailansicht lässt sich schließen")

    print("\n10. Aufbereitete Texte")
    seitentext = seite.locator("body").inner_text()
    for rest in ("Gebaeude", "Aussenansicht", "Strassenmitte", "fuer "):
        lauf.pruefe(rest not in seitentext, f"Keine Rohform {rest!r} im sichtbaren Text")

    lauf.pruefe(
        seite.locator("#quellenregister li").count() == len(daten["quellen"]),
        f"Quellenregister listet alle {len(daten['quellen'])} Quellen",
    )
    lauf.pruefe(
        seite.locator("#vorbehalte li").count() == len(daten["meta"]["vorbehalte"]),
        "Vorbehalte werden ausgegeben",
    )

    print("\n11. Störungshinweis")
    expect(seite.locator("#fehlerbanner")).to_have_class("fehlerbanner hidden")
    lauf.pruefe(True, "Kein Störungsbanner im Normalbetrieb")

    seite.evaluate("window.fehlerAnzeigen('Testfehler.', 'Einzelheit')")
    lauf.pruefe(
        seite.locator("#fehlerbanner").is_visible()
        and "Testfehler" in seite.locator("#fehlerbanner").inner_text(),
        "Störungsbanner wird bei einem Fehler sichtbar",
    )


def main():
    server = server_starten()
    lauf = Testlauf()
    try:
        with sync_playwright() as p:
            start_optionen = {"headless": True, "args": ["--no-sandbox"]}
            if CHROMIUM_PFAD:
                start_optionen["executable_path"] = CHROMIUM_PFAD
            browser = p.chromium.launch(**start_optionen)
            seite = browser.new_page()
            externe_anfragen_blockieren(seite)
            fehlerausgaben = []
            seite.on("pageerror", lambda fehler: fehlerausgaben.append(str(fehler)))

            print(f"Öffne {ADRESSE}")
            seite.goto(ADRESSE, wait_until="commit")

            tests_ausfuehren(seite, lauf)

            print("\n12. Konsole")
            lauf.gleich(fehlerausgaben, [], "Keine JavaScript-Fehler auf der Seite")

            browser.close()
    except Exception as fehler:  # noqa: BLE001 - Testlauf soll die Ursache zeigen
        print(f"\nTestlauf abgebrochen: {fehler}")
        lauf.fehler.append(str(fehler))
    finally:
        os.kill(server.pid, signal.SIGTERM)

    print()
    if lauf.fehler:
        print(f"{len(lauf.fehler)} Prüfung(en) fehlgeschlagen:")
        for eintrag in lauf.fehler:
            print(f"  - {eintrag}")
        return 1

    print("Alle Prüfungen bestanden.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
