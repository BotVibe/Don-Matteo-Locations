#!/usr/bin/env python3
"""Erzeugt aus den Rohdaten in ``quelldaten/`` die Datei ``data.json`` der Webapp.

Aufruf aus dem Projektwurzelverzeichnis:

    python3 tools/build_data.py

Die Rohdaten (CSV/GeoJSON) bleiben unveraendert; saemtliche Aufbereitung
(Umlaut-Wiederherstellung, Staffel-Zuordnung, Regionen, Kennzeichnungen)
passiert hier, damit sie nachvollziehbar und wiederholbar ist.
"""

from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
QUELLDATEN = WURZEL / "quelldaten"
ZIEL = WURZEL / "data.json"

DATEI_ORTE = QUELLDATEN / "don-matteo-drehorte.csv"
DATEI_QUELLEN = QUELLDATEN / "don-matteo-quellen.csv"
DATEI_DREHZEITEN = QUELLDATEN / "don-matteo-drehzeitraeume.csv"
DATEI_ABDECKUNG = QUELLDATEN / "don-matteo-abdeckung-je-staffel.csv"

DATENSTAND = "2026-08-12"
DATENVERSION = "v4"
LETZTE_STAFFEL = 15


# ---------------------------------------------------------------------------
# 1. Umlaute wiederherstellen
# ---------------------------------------------------------------------------
# Die Rohdaten sind durchgehend transliteriert ("Gebaeude", "Strasse").
# Fuer die Anzeige wird das rueckgaengig gemacht: ae/oe/ue werden generell zu
# Umlauten, ausser bei den unten aufgefuehrten Ausnahmen (italienische Namen und
# deutsche Woerter, in denen die Buchstabenfolge echt ist, z. B. "Quelle").
# "ss" wird nur bei ausdruecklich gelisteten Woertern zu "ß".

AUSNAHMEN_UMLAUT = {
    # italienische / fremdsprachige Eigennamen und Begriffe
    "Aero", "Aeroclub", "Due", "Giosue", "Maestre", "jalanjaeljilla",
    # deutsche Woerter mit echter Buchstabenfolge ue/ae/oe
    "aktuelle", "Aktuelle", "Aktuellste", "manuell",
    "neue", "neuen", "genaue", "genaues", "dauerhaft", "erneuert",
    "Mauer", "Stadtmauer", "Stadtmauern", "Zuschauer",
    # Kompositum, dessen Wortende ("...genaue") sonst falsch umgesetzt wuerde
    "Strassengenaue",
}

# Nur diese Wortformen bekommen ein "ß"; ueberall sonst bleibt "ss" stehen
# (Gasse, Presse, Kulisse, Erdgeschoss, dass ... sowie alle italienischen Namen).
# Umlaute in den Ersetzungen werden anschliessend von den Regeln unten aufgeloest.
WOERTER_MIT_SZ = {
    "Aussen": "Außen", "aussen": "außen",
    "Aussenansicht": "Außenansicht", "Aussenaufnahmen": "Außenaufnahmen",
    "Aussendreharbeiten": "Außendreharbeiten", "Aussenszenen": "Außenszenen",
    "Ausserdem": "Außerdem", "ausserhalb": "außerhalb",
    "beschliessen": "beschließen", "einschliesslich": "einschließlich",
    "schliesslich": "schließlich",
    "Fuss": "Fuß", "Fussball": "Fußball",
    "Groesse": "Groeße", "groesser": "groeßer", "Groesstes": "Groeßtes",
    "grosse": "große", "grossen": "großen", "grosser": "großer", "Grosses": "Großes",
    "heisst": "heißt", "regelmaessig": "regelmaeßig", "weiss": "weiß",
    "Strasse": "Straße", "Strassen": "Straßen", "Strassenliste": "Straßenliste",
    "Strassenmitte": "Straßenmitte", "strassengenau": "straßengenau",
    "Strassengenaue": "Straßengenaue", "Hauptstrasse": "Hauptstraße",
    "Fahrradstrassen": "Fahrradstraßen", "Treppenstrasse": "Treppenstraße",
    "Hauptgeschaeftsstrasse": "Hauptgeschaeftsstraße", "Staatsstrasse": "Staatsstraße",
}

_UMLAUT_REGELN = (
    (re.compile(r"ae"), "ä"), (re.compile(r"[AÄ]e|AE"), "Ä"),
    (re.compile(r"oe"), "ö"), (re.compile(r"[OÖ]e|OE"), "Ö"),
    # "ue" nach q gehoert zum Wortstamm (Quelle, Querhaus, überqueren) und bleibt.
    (re.compile(r"(?<![qQ])ue"), "ü"), (re.compile(r"(?<![qQ])(?:Ue|UE)"), "Ü"),
)

_WORT = re.compile(r"[A-Za-zÀ-ÿ]+")
_geaenderte_woerter: set[str] = set()


def _wort_umschreiben(treffer: re.Match) -> str:
    wort = treffer.group(0)
    neu = WOERTER_MIT_SZ.get(wort, wort)
    if wort not in AUSNAHMEN_UMLAUT:
        for muster, ersatz in _UMLAUT_REGELN:
            neu = muster.sub(ersatz, neu)
    if neu != wort:
        _geaenderte_woerter.add(f"{wort} -> {neu}")
    return neu


def lesbar(text: str) -> str:
    """Stellt Umlaute und ß in einem transliterierten Text wieder her."""
    if not text:
        return ""
    return _WORT.sub(_wort_umschreiben, text.strip())


# ---------------------------------------------------------------------------
# 2. Hilfsfunktionen fuer die Feldauswertung
# ---------------------------------------------------------------------------

def staffeln_auswerten(text: str) -> list[int]:
    """Wandelt Freitext wie ``1-5 (als Rathaus), 6-8 (Hintergrund)`` in Staffelnummern.

    Klammerinhalte werden vorher entfernt, damit Angaben wie ``(laut Q12)`` oder
    ``(Drehtermin Juli 2003 belegt)`` keine falschen Zahlen liefern.
    ``9 ff.`` wird als "ab Staffel 9" gelesen.
    """
    if not text:
        return []
    rein = re.sub(r"\([^)]*\)", " ", text)
    nummern: set[int] = set()

    for von, bis in re.findall(r"(\d+)\s*[-–]\s*(\d+)", rein):
        nummern.update(range(int(von), int(bis) + 1))
    rein_ohne_bereiche = re.sub(r"\d+\s*[-–]\s*\d+", " ", rein)

    for treffer in re.finditer(r"(\d+)(\s*ff\.?)?", rein_ohne_bereiche):
        nummer = int(treffer.group(1))
        if treffer.group(2):
            nummern.update(range(nummer, LETZTE_STAFFEL + 1))
        else:
            nummern.add(nummer)

    return sorted(n for n in nummern if 1 <= n <= LETZTE_STAFFEL)


REGIONEN = [
    {"id": "gubbio", "name": "Gubbio"},
    {"id": "spoleto", "name": "Spoleto"},
    {"id": "tuscia", "name": "Tuscia (Latium)"},
    {"id": "uebrige", "name": "Übriges Umbrien & Latium"},
]


def region_bestimmen(ort: str) -> str:
    if ort.startswith("Gubbio"):
        return "gubbio"
    if ort == "Spoleto":
        return "spoleto"
    if ort in ("Nepi", "Monterosi"):
        return "tuscia"
    return "uebrige"


STUFEN = {
    "hoch": "hoch",
    "hoch (mit widerspruch)": "hoch",
    "mittel-hoch": "mittel",
    "mittel": "mittel",
    "niedrig-mittel": "niedrig",
    "niedrig": "niedrig",
}


def stufe_bestimmen(verlaesslichkeit: str) -> str:
    return STUFEN.get(verlaesslichkeit.strip().lower(), "mittel")


# Orte, die in der Serie nur als Handlungsort vorkommen bzw. deren Nutzung als
# Drehort nicht belegt ist. Wird aus dem Text erkannt und unten geprueft.
_HANDLUNGSORT = re.compile(
    r"Handlungsort, nicht|Reiner Handlungsort|ACHTUNG - Handlungsort|Nur als Handlungsort",
    re.IGNORECASE,
)
_ERWARTETE_HANDLUNGSORTE = {"SP02", "U02", "X03"}

_BESUCHERHINWEIS = re.compile(
    r"(?:ACHTUNG|WICHTIG|WARNUNG)\s+F[UÜ]R\s+BESUCHER\s*:\s*(.*)",
    re.IGNORECASE | re.DOTALL,
)
# Satzende: Punkt, Leerzeichen, Grossbuchstabe. Abkuerzungen wie "bzw." werden
# nicht getroffen, weil danach ein Kleinbuchstabe folgt.
_SATZENDE = re.compile(r"\.\s+(?=[A-ZÄÖÜ])")


def besucherhinweis(notizen: str) -> str:
    """Zieht einen Besucherhinweis (Sperrung, Schliessung) aus den Notizen.

    Der Hinweis reicht vom Schluesselwort bis zum Ende des ersten vollstaendigen
    Satzes; alles Weitere in den Notizen ist Fliesstext zur Quellenlage.
    """
    treffer = _BESUCHERHINWEIS.search(notizen)
    if not treffer:
        return ""
    rest = treffer.group(1).strip()
    satzende = _SATZENDE.search(rest)
    if satzende:
        rest = rest[: satzende.start() + 1]
    return rest.strip()


def liste(text: str, trenner: str = "|") -> list[str]:
    return [teil.strip() for teil in text.split(trenner) if teil.strip()]


def zahl(text: str):
    text = (text or "").strip()
    return float(text) if text else None


def ganzzahl(text: str):
    text = (text or "").strip()
    return int(text) if text else None


# ---------------------------------------------------------------------------
# 3. Rohdaten einlesen
# ---------------------------------------------------------------------------

def csv_lesen(pfad: Path) -> list[dict]:
    with pfad.open(encoding="utf-8-sig", newline="") as datei:
        return list(csv.DictReader(datei))


def orte_aufbauen(zeilen: list[dict]) -> list[dict]:
    orte = []
    for zeile in zeilen:
        lat, lon = zahl(zeile["lat"]), zahl(zeile["lon"])
        notizen = lesbar(zeile["notizen"])
        rolle = lesbar(zeile["rolle_in_der_serie"])
        verlaesslichkeit = lesbar(zeile["verlaesslichkeit"])
        ort_name = zeile["ort"].strip()

        orte.append({
            "id": zeile["id"].strip(),
            "name": lesbar(zeile["name_de"]),
            "name_it": zeile["name_it"].strip(),
            "typ": lesbar(zeile["typ"]),
            "ort": lesbar(ort_name),
            "provinz": zeile["provinz"].strip(),
            "region": region_bestimmen(ort_name),
            # Adressen sind italienisch, enthalten aber vereinzelt deutsche Zusaetze
            "adresse": lesbar(zeile["adresse"]),
            "lat": lat,
            "lng": lon,
            "hat_koordinaten": lat is not None and lon is not None,
            "geo_genauigkeit": lesbar(zeile["geo_genauigkeit"]),
            "geo_quelle": zeile["geo_quelle"].strip(),
            "google_place_id": zeile["google_place_id"].strip(),
            "beschreibung": lesbar(zeile["beschreibung_ort"]),
            "rolle": rolle,
            "staffeln_text": lesbar(zeile["staffeln"]),
            "staffeln": staffeln_auswerten(zeile["staffeln"]),
            "folgen": lesbar(zeile["folgen_beispiele"]),
            "quellen": liste(zeile["quellen"]),
            "quellenkategorie": lesbar(zeile["quellenkategorie"]),
            "verlaesslichkeit": verlaesslichkeit,
            "stufe": stufe_bestimmen(zeile["verlaesslichkeit"]),
            "detailtiefe": lesbar(zeile["quelle_detailtiefe"]),
            "foto_quelle": zeile["foto_quelle"].strip(),
            "kartennr": zeile["budterence_kartennr"].strip(),
            "geprueft_am": zeile["geprueft_am"].strip(),
            "notizen": notizen,
            "ist_handlungsort": bool(_HANDLUNGSORT.search(zeile["rolle_in_der_serie"] + " " + zeile["notizen"])),
            "hat_widerspruch": "widerspruch" in (zeile["verlaesslichkeit"] + zeile["notizen"]).lower(),
            "besucherhinweis": besucherhinweis(notizen),
        })
    return orte


def staffeln_aufbauen(orte: list[dict]) -> list[dict]:
    abdeckung = {int(z["staffel"]): z for z in csv_lesen(DATEI_ABDECKUNG)}
    drehzeiten: dict[int, list[dict]] = {}
    for zeile in csv_lesen(DATEI_DREHZEITEN):
        nummer = int(zeile["staffel"])
        drehzeiten.setdefault(nummer, []).append({
            "von": zeile["von"].strip(),
            "bis": zeile["bis"].strip(),
            "ort": lesbar(zeile["drehort"]),
            "anmerkung": lesbar(zeile["anmerkung"]),
            "quellen": liste(zeile["quellen"]),
            "verlaesslichkeit": lesbar(zeile["verlaesslichkeit"]),
        })

    staffeln = []
    for nummer in range(1, LETZTE_STAFFEL + 1):
        zeile = abdeckung[nummer]
        aera = "gubbio" if nummer <= 8 else "spoleto"
        staffeln.append({
            "nummer": nummer,
            "jahr": ganzzahl(zeile["erstausstrahlung"]),
            "folgen": ganzzahl(zeile["folgen"]),
            "aera": aera,
            "aera_name": "Gubbio-Ära" if aera == "gubbio" else "Spoleto-Ära",
            "orte_staffelspezifisch": ganzzahl(zeile["orte_staffelspezifisch_belegt"]),
            "abdeckung": lesbar(zeile["was_belegt_ist"]),
            "drehtermine": lesbar(zeile["drehtermine"]),
            "drehzeitraeume": drehzeiten.get(nummer, []),
            "ort_ids": [ort["id"] for ort in orte if nummer in ort["staffeln"]],
        })
    return staffeln


def quellen_aufbauen() -> list[dict]:
    quellen = []
    for zeile in csv_lesen(DATEI_QUELLEN):
        quellen.append({
            "id": zeile["quellen_id"].strip(),
            "bezeichnung": lesbar(zeile["bezeichnung"]),
            "url": zeile["url"].strip(),
            "kategorie": lesbar(zeile["kategorie"]),
            "anmerkung": lesbar(zeile["anmerkung"]),
        })
    return quellen


# Dauerhaft gueltige Vorbehalte aus der Datendokumentation (README der Rohdaten).
VORBEHALTE = [
    "Innenaufnahmen entstehen über die gesamte Laufzeit im Studio von Lux Vide in "
    "Formello bei Rom – Ausnahmen sind Sant'Eufemia in Spoleto und wenige zugängliche Gebäude.",
    "Handlungsort ist nicht gleich Drehort: Einzelne Orte werden in der Serie nur genannt "
    "oder als Kulisse gezeigt. Sie sind auf der Karte eigens gekennzeichnet.",
    "Die Koordinaten stammen aus Google Places; für jeden Ort ist die erreichte Genauigkeit "
    "vermerkt. 13 der 78 Einträge haben bewusst keine Koordinate, weil kein konkreter "
    "Drehort bekannt ist.",
    "Dokumentiert ist, was jemand dokumentiert hat: Die dichte Erschließung von Staffel 6, 9 "
    "und 15 beruht auf Fan-Reportagen und aktueller Presse. Für die Staffeln 2, 3, 10, 11 und 12 "
    "gibt es keine staffelspezifischen Ortsangaben.",
]


def main() -> int:
    orte = orte_aufbauen(csv_lesen(DATEI_ORTE))
    staffeln = staffeln_aufbauen(orte)
    quellen = quellen_aufbauen()

    # --- Pruefungen -------------------------------------------------------
    fehler = []
    bekannte_quellen = {quelle["id"] for quelle in quellen}
    for ort in orte:
        unbekannt = set(ort["quellen"]) - bekannte_quellen
        if unbekannt:
            fehler.append(f"{ort['id']}: unbekannte Quellen {sorted(unbekannt)}")
        if ort["geo_quelle"] and ort["geo_quelle"] not in bekannte_quellen:
            fehler.append(f"{ort['id']}: unbekannte Geo-Quelle {ort['geo_quelle']}")

    handlungsorte = {ort["id"] for ort in orte if ort["ist_handlungsort"]}
    if handlungsorte != _ERWARTETE_HANDLUNGSORTE:
        fehler.append(
            f"Handlungsorte weichen ab: erkannt {sorted(handlungsorte)}, "
            f"erwartet {sorted(_ERWARTETE_HANDLUNGSORTE)}"
        )

    if fehler:
        for eintrag in fehler:
            print(f"FEHLER: {eintrag}", file=sys.stderr)
        return 1

    mit_koordinaten = [ort for ort in orte if ort["hat_koordinaten"]]
    regionen = [
        dict(region, anzahl=sum(1 for ort in orte if ort["region"] == region["id"]))
        for region in REGIONEN
    ]

    daten = {
        "meta": {
            "datenstand": DATENSTAND,
            "datenversion": DATENVERSION,
            "anzahl_orte": len(orte),
            "anzahl_mit_koordinaten": len(mit_koordinaten),
            "anzahl_quellen": len(quellen),
            "anzahl_staffeln": len(staffeln),
            "regionen": regionen,
            "vorbehalte": VORBEHALTE,
        },
        "orte": orte,
        "staffeln": staffeln,
        "quellen": quellen,
    }

    with ZIEL.open("w", encoding="utf-8") as datei:
        json.dump(daten, datei, ensure_ascii=False, indent=2)
        datei.write("\n")

    ohne_staffel = [ort["id"] for ort in orte if not ort["staffeln"]]
    print(f"{ZIEL.name} geschrieben:")
    print(f"  {len(orte)} Orte ({len(mit_koordinaten)} mit Koordinaten)")
    print(f"  {len(staffeln)} Staffeln, {len(quellen)} Quellen")
    print(f"  {len(ohne_staffel)} Orte ohne Staffelzuordnung: {', '.join(ohne_staffel)}")
    print(f"  {len(handlungsorte)} Handlungsorte: {', '.join(sorted(handlungsorte))}")
    print(f"  {len(_geaenderte_woerter)} Wortformen mit wiederhergestellten Umlauten")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
