/*
 * Don Matteo – Interaktive Karte der Drehorte
 *
 * Datengrundlage ist data.json, erzeugt aus den Rohdaten in quelldaten/
 * durch tools/build_data.py. Der komplette Zustand der Anwendung liegt in
 * `zustand`; `window.appData` stellt die geladenen Daten für Tests bereit.
 */

let karte = null;
const marker = new Map(); // ort.id -> Leaflet-Marker
const listeneintraege = new Map(); // ort.id -> <li>

window.appData = null;

const zustand = {
    staffel: 'alle',        // 'alle' | 'ohne' | Staffelnummer
    region: 'alle',
    stufe: 'alle',
    suche: '',
    handlungsorte: true,
    nurKoordinaten: false,
    auswahl: null,
};

const STUFEN_TEXT = {
    hoch: 'hoch belegt',
    mittel: 'mittel belegt',
    niedrig: 'schwach belegt',
};

// ---------------------------------------------------------------------------
// Kleine DOM-Helfer (bewusst ohne innerHTML, siehe AGENTS.md)
// ---------------------------------------------------------------------------

function el(tag, klasse, text) {
    const knoten = document.createElement(tag);
    if (klasse) knoten.className = klasse;
    if (text !== undefined && text !== null && text !== '') knoten.textContent = text;
    return knoten;
}

function leeren(knoten) {
    while (knoten.firstChild) knoten.removeChild(knoten.firstChild);
}

function sichtbar(knoten, anzeigen) {
    knoten.classList.toggle('hidden', !anzeigen);
}

function datumDeutsch(iso) {
    const treffer = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!treffer) return iso || '';
    return `${treffer[3]}.${treffer[2]}.${treffer[1]}`;
}

function zeitraumText(zeitraum) {
    const von = datumDeutsch(zeitraum.von);
    const bis = datumDeutsch(zeitraum.bis);
    if (von && bis) return `${von} – ${bis}`;
    if (von) return `ab ${von}`;
    return 'ohne Datum';
}

function staffelnKurz(ort) {
    if (!ort.staffeln.length) return 'Staffel unklar';
    if (ort.staffeln.length === 1) return `Staffel ${ort.staffeln[0]}`;
    const luecken = ort.staffeln.some((nummer, i) => i > 0 && nummer !== ort.staffeln[i - 1] + 1);
    if (luecken) return `Staffel ${ort.staffeln.join(', ')}`;
    return `Staffel ${ort.staffeln[0]}–${ort.staffeln[ort.staffeln.length - 1]}`;
}

function regionName(id) {
    const region = window.appData.meta.regionen.find((eintrag) => eintrag.id === id);
    return region ? region.name : id;
}

function quelleFinden(id) {
    return window.appData.quellen.find((quelle) => quelle.id === id) || null;
}

function markerKlasse(ort) {
    if (ort.ist_handlungsort) return 'markerpunkt markerpunkt-handlungsort';
    return `markerpunkt markerpunkt-${ort.stufe}`;
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

/**
 * Baut die Leaflet-Karte auf. Steht Leaflet nicht zur Verfügung (kein Netz),
 * läuft die Anwendung ohne Karte weiter – Liste, Filter und Detailansicht
 * funktionieren dann unverändert.
 */
function karteInitialisieren() {
    if (typeof L === 'undefined') {
        const behaelter = document.getElementById('map');
        behaelter.classList.add('karte-fehlt');
        behaelter.appendChild(el('p', null, 'Die Kartenbibliothek konnte nicht geladen werden. Alle Drehorte stehen in der Liste rechts.'));
        return;
    }

    karte = L.map('map', { scrollWheelZoom: true }).setView([42.9, 12.5], 9);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(karte);
}

async function datenLaden() {
    try {
        const antwort = await fetch('data.json');
        if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);
        window.appData = await antwort.json();
    } catch (fehler) {
        console.error('Fehler beim Laden der Daten:', fehler);
        ladefehlerAnzeigen();
        return;
    }

    kennzahlenAufbauen();
    staffelLeisteAufbauen();
    regionAuswahlAufbauen();
    legendeAufbauen();
    vorbehalteAufbauen();
    quellenregisterAufbauen();
    markerAufbauen();
    ereignisseVerbinden();
    document.getElementById('datenstand').textContent = datumDeutsch(window.appData.meta.datenstand);

    ansichtAktualisieren({ karteAnpassen: true });
}

function ladefehlerAnzeigen() {
    const liste = document.getElementById('ortsliste');
    leeren(liste);
    const hinweis = document.getElementById('leer-hinweis');
    hinweis.textContent = 'Die Daten konnten nicht geladen werden. Bitte die Seite über einen lokalen Webserver öffnen (siehe README).';
    sichtbar(hinweis, true);
}

// ---------------------------------------------------------------------------
// Kopfzeile, Filter und Legende aufbauen
// ---------------------------------------------------------------------------

function kennzahlenAufbauen() {
    const meta = window.appData.meta;
    const ziel = document.getElementById('kennzahlen');
    leeren(ziel);

    const werte = [
        [meta.anzahl_orte, 'Drehorte'],
        [meta.anzahl_mit_koordinaten, 'mit Koordinaten'],
        [meta.anzahl_staffeln, 'Staffeln'],
        [meta.anzahl_quellen, 'Quellen'],
    ];

    werte.forEach(([wert, beschriftung]) => {
        const eintrag = el('li');
        eintrag.appendChild(el('strong', null, String(wert)));
        eintrag.appendChild(el('span', null, beschriftung));
        ziel.appendChild(eintrag);
    });
}

function staffelKnopf(beschriftung, wert, titel, klasse) {
    const knopf = el('button', `staffel-btn${klasse ? ' ' + klasse : ''}`, beschriftung);
    knopf.type = 'button';
    knopf.dataset.staffel = String(wert);
    if (titel) knopf.title = titel;
    knopf.addEventListener('click', () => {
        zustand.staffel = wert === 'alle' || wert === 'ohne' ? wert : Number(wert);
        ansichtAktualisieren({ karteAnpassen: true });
    });
    return knopf;
}

function staffelLeisteAufbauen() {
    const leiste = document.getElementById('staffel-leiste');
    leeren(leiste);

    leiste.appendChild(staffelKnopf('Alle Drehorte', 'alle', 'Alle 78 Einträge anzeigen', 'staffel-btn-alle'));

    let letzteAera = null;
    window.appData.staffeln.forEach((staffel) => {
        if (staffel.aera !== letzteAera) {
            letzteAera = staffel.aera;
            leiste.appendChild(el('span', 'aera-marke', staffel.aera_name));
        }
        const titel = `${staffel.aera_name} · Erstausstrahlung ${staffel.jahr} · ${staffel.folgen} Folgen`;
        leiste.appendChild(staffelKnopf(String(staffel.nummer), staffel.nummer, titel, `aera-${staffel.aera}`));
    });

    leiste.appendChild(el('span', 'aera-marke', 'Sonstiges'));
    leiste.appendChild(staffelKnopf(
        'ohne Staffelzuordnung',
        'ohne',
        'Orte, die keiner Staffel zugeordnet werden konnten',
        'staffel-btn-ohne',
    ));
}

function regionAuswahlAufbauen() {
    const auswahl = document.getElementById('region');
    leeren(auswahl);

    const alle = el('option', null, `alle Regionen (${window.appData.meta.anzahl_orte})`);
    alle.value = 'alle';
    auswahl.appendChild(alle);

    window.appData.meta.regionen.forEach((region) => {
        const option = el('option', null, `${region.name} (${region.anzahl})`);
        option.value = region.id;
        auswahl.appendChild(option);
    });
}

function legendeAufbauen() {
    const legende = document.getElementById('legende');
    leeren(legende);

    const eintraege = [
        ['markerpunkt-hoch', 'Drehort, hoch belegt'],
        ['markerpunkt-mittel', 'Drehort, mittel belegt'],
        ['markerpunkt-niedrig', 'Drehort, schwach belegt'],
        ['markerpunkt-handlungsort', 'nur Handlungsort / nicht belegt'],
    ];

    eintraege.forEach(([klasse, beschriftung]) => {
        const eintrag = el('li');
        eintrag.appendChild(el('span', `legendenpunkt ${klasse}`));
        eintrag.appendChild(el('span', null, beschriftung));
        legende.appendChild(eintrag);
    });

    const ohne = el('li');
    ohne.appendChild(el('span', 'legendenpunkt legendenpunkt-ohne'));
    ohne.appendChild(el('span', null, 'ohne Koordinaten – nur in der Liste'));
    legende.appendChild(ohne);
}

function vorbehalteAufbauen() {
    const liste = document.getElementById('vorbehalte');
    leeren(liste);
    window.appData.meta.vorbehalte.forEach((text) => liste.appendChild(el('li', null, text)));
}

function quellenregisterAufbauen() {
    const liste = document.getElementById('quellenregister');
    leeren(liste);

    window.appData.quellen.forEach((quelle) => {
        const eintrag = el('li');
        eintrag.id = `quelle-${quelle.id}`;

        const kopf = el('p', 'quellen-kopf');
        kopf.appendChild(el('span', 'quellen-id', quelle.id));
        if (quelle.url) {
            const verweis = el('a', null, quelle.bezeichnung);
            verweis.href = quelle.url;
            verweis.target = '_blank';
            verweis.rel = 'noopener noreferrer';
            kopf.appendChild(verweis);
        } else {
            kopf.appendChild(el('span', null, quelle.bezeichnung));
        }
        eintrag.appendChild(kopf);
        eintrag.appendChild(el('p', 'quellen-kategorie', quelle.kategorie));
        if (quelle.anmerkung) eintrag.appendChild(el('p', 'quellen-anmerkung', quelle.anmerkung));
        liste.appendChild(eintrag);
    });

    document.getElementById('quellen-zahl').textContent = `${window.appData.quellen.length} Einträge`;
}

function ereignisseVerbinden() {
    const suche = document.getElementById('suche');
    suche.addEventListener('input', () => {
        zustand.suche = suche.value.trim().toLowerCase();
        ansichtAktualisieren({ karteAnpassen: false });
    });

    document.getElementById('region').addEventListener('change', (ereignis) => {
        zustand.region = ereignis.target.value;
        ansichtAktualisieren({ karteAnpassen: true });
    });

    document.getElementById('stufe').addEventListener('change', (ereignis) => {
        zustand.stufe = ereignis.target.value;
        ansichtAktualisieren({ karteAnpassen: false });
    });

    document.getElementById('handlungsorte').addEventListener('change', (ereignis) => {
        zustand.handlungsorte = ereignis.target.checked;
        ansichtAktualisieren({ karteAnpassen: false });
    });

    document.getElementById('nur-koordinaten').addEventListener('change', (ereignis) => {
        zustand.nurKoordinaten = ereignis.target.checked;
        ansichtAktualisieren({ karteAnpassen: false });
    });

    document.getElementById('filter-zuruecksetzen').addEventListener('click', filterZuruecksetzen);
}

function filterZuruecksetzen() {
    zustand.staffel = 'alle';
    zustand.region = 'alle';
    zustand.stufe = 'alle';
    zustand.suche = '';
    zustand.handlungsorte = true;
    zustand.nurKoordinaten = false;

    document.getElementById('suche').value = '';
    document.getElementById('region').value = 'alle';
    document.getElementById('stufe').value = 'alle';
    document.getElementById('handlungsorte').checked = true;
    document.getElementById('nur-koordinaten').checked = false;

    ansichtAktualisieren({ karteAnpassen: true });
}

// ---------------------------------------------------------------------------
// Filterlogik
// ---------------------------------------------------------------------------

function passtZurSuche(ort, begriff) {
    if (!begriff) return true;
    const felder = [
        ort.id, ort.name, ort.name_it, ort.typ, ort.ort, ort.adresse,
        ort.rolle, ort.beschreibung, ort.folgen, ort.notizen, ort.staffeln_text,
    ];
    return felder.some((feld) => (feld || '').toLowerCase().includes(begriff));
}

function passtZurStufe(ort) {
    switch (zustand.stufe) {
        case 'hoch': return ort.stufe === 'hoch';
        case 'mittel': return ort.stufe === 'hoch' || ort.stufe === 'mittel';
        case 'niedrig': return ort.stufe === 'niedrig';
        default: return true;
    }
}

function passtZurStaffel(ort) {
    if (zustand.staffel === 'alle') return true;
    if (zustand.staffel === 'ohne') return ort.staffeln.length === 0;
    return ort.staffeln.includes(zustand.staffel);
}

function gefilterteOrte() {
    return window.appData.orte.filter((ort) => {
        if (!passtZurStaffel(ort)) return false;
        if (zustand.region !== 'alle' && ort.region !== zustand.region) return false;
        if (!passtZurStufe(ort)) return false;
        if (!zustand.handlungsorte && ort.ist_handlungsort) return false;
        if (zustand.nurKoordinaten && !ort.hat_koordinaten) return false;
        return passtZurSuche(ort, zustand.suche);
    });
}

// ---------------------------------------------------------------------------
// Karte
// ---------------------------------------------------------------------------

function markerAufbauen() {
    if (!karte) return;

    window.appData.orte.forEach((ort) => {
        if (!ort.hat_koordinaten) return;

        const punkt = L.marker([ort.lat, ort.lng], {
            icon: L.divIcon({
                className: markerKlasse(ort),
                iconSize: [18, 18],
                iconAnchor: [9, 9],
                popupAnchor: [0, -10],
            }),
            title: ort.name,
            alt: ort.name,
            riseOnHover: true,
        });

        punkt.bindPopup(popupInhalt(ort), { closeButton: true, minWidth: 200 });
        punkt.on('click', () => ortWaehlen(ort.id, { karteZentrieren: false, detailsOeffnen: false }));
        marker.set(ort.id, punkt);
    });
}

function popupInhalt(ort) {
    const behaelter = el('div', 'popup');
    behaelter.appendChild(el('h3', null, ort.name));
    behaelter.appendChild(el('p', 'popup-meta', `${ort.typ} · ${ort.ort}`));
    behaelter.appendChild(el('p', 'popup-meta', staffelnKurz(ort)));

    const knopf = el('button', 'popup-btn', 'Details ansehen');
    knopf.type = 'button';
    knopf.addEventListener('click', () => showDetails(ort.id));
    behaelter.appendChild(knopf);
    return behaelter;
}

function markerAktualisieren(orte, karteAnpassen) {
    if (!karte) return;

    const sichtbareIds = new Set(orte.map((ort) => ort.id));
    const grenzen = L.latLngBounds([]);

    marker.forEach((punkt, id) => {
        const anzeigen = sichtbareIds.has(id);
        if (anzeigen && !karte.hasLayer(punkt)) punkt.addTo(karte);
        if (!anzeigen && karte.hasLayer(punkt)) karte.removeLayer(punkt);
        if (anzeigen) grenzen.extend(punkt.getLatLng());
    });

    if (karteAnpassen && grenzen.isValid()) {
        karte.fitBounds(grenzen, { padding: [40, 40], maxZoom: 16 });
    }
}

// ---------------------------------------------------------------------------
// Liste
// ---------------------------------------------------------------------------

function listeAufbauen(orte) {
    const liste = document.getElementById('ortsliste');
    leeren(liste);
    listeneintraege.clear();

    let letzteRegion = null;
    orte.forEach((ort) => {
        if (ort.region !== letzteRegion) {
            letzteRegion = ort.region;
            const ueberschrift = el('li', 'listen-gruppe', regionName(ort.region));
            ueberschrift.setAttribute('role', 'presentation');
            liste.appendChild(ueberschrift);
        }
        liste.appendChild(listeneintrag(ort));
    });

    sichtbar(document.getElementById('leer-hinweis'), orte.length === 0);
}

function listeneintrag(ort) {
    const eintrag = el('li', 'ortseintrag');
    const knopf = el('button', 'ortsknopf');
    knopf.type = 'button';

    const kopf = el('span', 'ortsknopf-kopf');
    kopf.appendChild(el('span', `punkt ${markerKlasse(ort)}`));
    kopf.appendChild(el('span', 'ortsknopf-name', ort.name));
    knopf.appendChild(kopf);

    const meta = el('span', 'ortsknopf-meta', `${ort.typ} · ${ort.ort} · ${staffelnKurz(ort)}`);
    knopf.appendChild(meta);

    const marken = el('span', 'ortsknopf-marken');
    if (ort.ist_handlungsort) marken.appendChild(el('span', 'marke marke-handlungsort', 'Handlungsort'));
    if (ort.hat_widerspruch) marken.appendChild(el('span', 'marke marke-widerspruch', 'Widerspruch'));
    if (ort.besucherhinweis) marken.appendChild(el('span', 'marke marke-warnung', 'Besucherhinweis'));
    if (!ort.hat_koordinaten) marken.appendChild(el('span', 'marke marke-ohne', 'ohne Koordinaten'));
    if (marken.childElementCount) knopf.appendChild(marken);

    knopf.addEventListener('click', () => ortWaehlen(ort.id, { karteZentrieren: true, detailsOeffnen: true }));

    eintrag.appendChild(knopf);
    listeneintraege.set(ort.id, eintrag);
    return eintrag;
}

function auswahlHervorheben() {
    listeneintraege.forEach((eintrag, id) => {
        eintrag.classList.toggle('ausgewaehlt', id === zustand.auswahl);
    });
    marker.forEach((punkt, id) => {
        const element = punkt.getElement();
        if (element) element.classList.toggle('markerpunkt-aktiv', id === zustand.auswahl);
    });
}

// ---------------------------------------------------------------------------
// Staffelinformationen
// ---------------------------------------------------------------------------

function staffelInfoAktualisieren(anzahlTreffer) {
    const bereich = document.getElementById('staffel-info');
    leeren(bereich);

    if (zustand.staffel === 'alle') {
        sichtbar(bereich, false);
        return;
    }

    if (zustand.staffel === 'ohne') {
        bereich.appendChild(el('h2', null, 'Orte ohne Staffelzuordnung'));
        bereich.appendChild(el('p', 'staffel-abdeckung',
            'Diese Orte sind als Drehorte belegt, die Quellen nennen aber keine Staffel. '
            + 'Sie tauchen deshalb in keiner Staffelauswahl auf.'));
        sichtbar(bereich, true);
        return;
    }

    const staffel = window.appData.staffeln.find((eintrag) => eintrag.nummer === zustand.staffel);
    if (!staffel) {
        sichtbar(bereich, false);
        return;
    }

    bereich.appendChild(el('h2', null, `Staffel ${staffel.nummer} (${staffel.jahr})`));

    const meta = el('ul', 'staffel-meta');
    [
        staffel.aera_name,
        `${staffel.folgen} Folgen`,
        `${staffel.orte_staffelspezifisch} staffelspezifisch belegte Orte`,
        `${anzahlTreffer} Orte in der aktuellen Auswahl`,
    ].forEach((text) => meta.appendChild(el('li', null, text)));
    bereich.appendChild(meta);

    bereich.appendChild(el('p', 'staffel-abdeckung', staffel.abdeckung));

    if (staffel.drehzeitraeume.length) {
        bereich.appendChild(el('h3', null, 'Belegte Drehzeiträume'));
        bereich.appendChild(drehzeitTabelle(staffel.drehzeitraeume));
    } else {
        bereich.appendChild(el('p', 'staffel-hinweis', `Drehtermine: ${staffel.drehtermine || 'keine ermittelt'}`));
    }

    sichtbar(bereich, true);
}

function drehzeitTabelle(zeitraeume) {
    const huelle = el('div', 'tabellen-huelle');
    const tabelle = el('table', 'drehzeit-tabelle');

    const kopf = el('thead');
    const kopfzeile = el('tr');
    ['Zeitraum', 'Drehort', 'Anmerkung', 'Quelle'].forEach((titel) => {
        kopfzeile.appendChild(el('th', null, titel));
    });
    kopf.appendChild(kopfzeile);
    tabelle.appendChild(kopf);

    const koerper = el('tbody');
    zeitraeume.forEach((zeitraum) => {
        const zeile = el('tr');
        zeile.appendChild(el('td', 'zelle-zeitraum', zeitraumText(zeitraum)));
        zeile.appendChild(el('td', null, zeitraum.ort));
        zeile.appendChild(el('td', null, zeitraum.anmerkung));

        const quellenZelle = el('td', 'zelle-quellen');
        if (zeitraum.quellen.length) {
            zeitraum.quellen.forEach((id) => quellenZelle.appendChild(quellenVerweis(id)));
        } else {
            quellenZelle.appendChild(el('span', 'quellen-fehlt', '–'));
        }
        zeile.appendChild(quellenZelle);
        koerper.appendChild(zeile);
    });
    tabelle.appendChild(koerper);

    huelle.appendChild(tabelle);
    return huelle;
}

function quellenVerweis(id) {
    const quelle = quelleFinden(id);
    if (!quelle) return el('span', 'quellen-marke', id);

    const marke = el('a', 'quellen-marke', id);
    marke.href = quelle.url || `#quelle-${id}`;
    marke.title = `${quelle.bezeichnung} (${quelle.kategorie})`;
    if (quelle.url) {
        marke.target = '_blank';
        marke.rel = 'noopener noreferrer';
    }
    return marke;
}

// ---------------------------------------------------------------------------
// Detailansicht
// ---------------------------------------------------------------------------

/** Scrollt den ausgewählten Eintrag in der Liste sichtbar, ohne die Seite zu bewegen. */
function listeneintragZeigen(id) {
    const eintrag = listeneintraege.get(id);
    const liste = document.getElementById('ortsliste');
    if (!eintrag) return;

    const oben = eintrag.offsetTop - liste.offsetTop;
    const unten = oben + eintrag.offsetHeight;
    if (oben < liste.scrollTop || unten > liste.scrollTop + liste.clientHeight) {
        liste.scrollTop = Math.max(0, oben - liste.clientHeight / 3);
    }
}

function ortWaehlen(id, { karteZentrieren = false, detailsOeffnen = true } = {}) {
    zustand.auswahl = id;
    auswahlHervorheben();
    listeneintragZeigen(id);

    const punkt = marker.get(id);
    if (karte && punkt && karteZentrieren && karte.hasLayer(punkt)) {
        karte.setView(punkt.getLatLng(), Math.max(karte.getZoom(), 16), { animate: true });
        punkt.openPopup();
    }

    if (detailsOeffnen) showDetails(id);
}

window.showDetails = function showDetails(id) {
    const daten = window.appData;
    if (!daten || !Array.isArray(daten.orte)) return;
    const ort = daten.orte.find((eintrag) => eintrag.id === id);
    if (!ort) return;

    zustand.auswahl = id;
    auswahlHervorheben();

    document.getElementById('details-typ').textContent = `${ort.typ} · ${ort.ort}${ort.provinz ? ` (${ort.provinz})` : ''}`;
    document.getElementById('details-name').textContent = ort.name;

    const nameIt = document.getElementById('details-name-it');
    nameIt.textContent = ort.name_it || '';
    sichtbar(nameIt, Boolean(ort.name_it) && ort.name_it !== ort.name);

    badgesAufbauen(ort);
    warnungAufbauen(ort);

    document.getElementById('details-rolle').textContent = ort.rolle || 'Keine Angabe zur Rolle in der Serie.';
    textblock('details-beschreibung', ort.beschreibung);
    textblock('details-folgen', ort.folgen);
    textblock('details-notizen', ort.notizen);

    faktenAufbauen(ort);
    detailQuellenAufbauen(ort);
    detailLinksAufbauen(ort);

    const behaelter = document.getElementById('details-container');
    sichtbar(behaelter, true);
    behaelter.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

function textblock(elementId, text) {
    const knoten = document.getElementById(elementId);
    knoten.textContent = text || '';
    sichtbar(knoten.parentElement, Boolean(text));
}

function badgesAufbauen(ort) {
    const leiste = document.getElementById('details-badges');
    leeren(leiste);

    const badge = (klasse, text) => {
        const eintrag = el('li', `badge ${klasse}`, text);
        leiste.appendChild(eintrag);
    };

    badge(`badge-stufe badge-${ort.stufe}`, `Beleg: ${STUFEN_TEXT[ort.stufe] || ort.stufe}`);
    badge('badge-staffel', staffelnKurz(ort));
    badge('badge-region', regionName(ort.region));
    if (ort.ist_handlungsort) badge('badge-handlungsort', 'Handlungsort, kein belegter Drehort');
    if (ort.hat_widerspruch) badge('badge-widerspruch', 'Quellen widersprechen sich');
    if (!ort.hat_koordinaten) badge('badge-ohne', 'ohne Koordinaten');
}

function warnungAufbauen(ort) {
    const kasten = document.getElementById('details-warnung');
    leeren(kasten);

    const meldungen = [];
    if (ort.besucherhinweis) meldungen.push(['Hinweis für Besucher', ort.besucherhinweis]);
    if (ort.ist_handlungsort) {
        meldungen.push([
            'Handlungsort, kein belegter Drehort',
            'Dieser Ort kommt in der Serie vor oder wird genannt, ist als Drehort aber nicht belegt.',
        ]);
    }

    meldungen.forEach(([titel, text]) => {
        const block = el('p');
        block.appendChild(el('strong', null, `${titel}: `));
        block.appendChild(document.createTextNode(text));
        kasten.appendChild(block);
    });

    sichtbar(kasten, meldungen.length > 0);
}

function faktenAufbauen(ort) {
    const liste = document.getElementById('details-fakten');
    leeren(liste);

    const zeile = (bezeichnung, wert) => {
        if (!wert) return;
        liste.appendChild(el('dt', null, bezeichnung));
        liste.appendChild(el('dd', null, wert));
    };

    zeile('Adresse', ort.adresse);
    zeile('Staffeln laut Quellen', ort.staffeln_text);
    zeile('Verlässlichkeit', ort.verlaesslichkeit);
    zeile('Art der Quellen', ort.quellenkategorie);
    zeile('Detailtiefe der Quelle', ort.detailtiefe);
    if (ort.hat_koordinaten) {
        zeile('Koordinaten', `${ort.lat.toFixed(6)}, ${ort.lng.toFixed(6)}`);
        zeile('Genauigkeit', ort.geo_genauigkeit);
    } else {
        zeile('Koordinaten', `keine – ${ort.geo_genauigkeit || 'nicht ermittelt'}`);
    }
    zeile('Karten-Nr. der Fan-Reportage', ort.kartennr);
    zeile('Geprüft am', datumDeutsch(ort.geprueft_am));
    zeile('Kennung im Datensatz', ort.id);
}

function detailQuellenAufbauen(ort) {
    const liste = document.getElementById('details-quellen');
    leeren(liste);

    const ids = (ort.quellen || []).slice();
    if (ort.geo_quelle && !ids.includes(ort.geo_quelle)) ids.push(ort.geo_quelle);

    if (!ids.length) {
        liste.appendChild(el('li', 'quellen-fehlt', 'Keine Quelle hinterlegt.'));
        return;
    }

    ids.forEach((id) => {
        const quelle = quelleFinden(id);
        const eintrag = el('li');
        eintrag.appendChild(quellenVerweis(id));
        if (quelle) {
            eintrag.appendChild(el('span', 'quellen-text', quelle.bezeichnung));
            eintrag.appendChild(el('span', 'quellen-kategorie', quelle.kategorie));
        }
        liste.appendChild(eintrag);
    });
}

function detailLinksAufbauen(ort) {
    const bereich = document.getElementById('details-links');
    leeren(bereich);

    const verweis = (text, url) => {
        const knoten = el('a', 'aktion-link', text);
        knoten.href = url;
        knoten.target = '_blank';
        knoten.rel = 'noopener noreferrer';
        bereich.appendChild(knoten);
    };

    if (ort.hat_koordinaten) {
        const ziel = `${ort.lat},${ort.lng}`;
        const platz = ort.google_place_id ? `&query_place_id=${encodeURIComponent(ort.google_place_id)}` : '';
        verweis('In Google Maps öffnen', `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ziel)}${platz}`);
        verweis('In OpenStreetMap öffnen', `https://www.openstreetmap.org/?mlat=${ort.lat}&mlon=${ort.lng}#map=18/${ort.lat}/${ort.lng}`);
    }
    if (ort.foto_quelle) verweis('Fotos und Standbildvergleiche', ort.foto_quelle);
}

function detailsSchliessen() {
    sichtbar(document.getElementById('details-container'), false);
}

// ---------------------------------------------------------------------------
// Gesamtaktualisierung
// ---------------------------------------------------------------------------

function ansichtAktualisieren({ karteAnpassen = false } = {}) {
    const orte = gefilterteOrte();

    document.querySelectorAll('#staffel-leiste .staffel-btn').forEach((knopf) => {
        knopf.classList.toggle('aktiv', knopf.dataset.staffel === String(zustand.staffel));
    });

    markerAktualisieren(orte, karteAnpassen);
    listeAufbauen(orte);
    staffelInfoAktualisieren(orte.length);
    auswahlHervorheben();

    const ohneKoordinaten = orte.filter((ort) => !ort.hat_koordinaten).length;
    const zahl = document.getElementById('treffer-zahl');
    zahl.textContent = ohneKoordinaten
        ? `${orte.length} Orte · ${ohneKoordinaten} davon ohne Koordinaten`
        : `${orte.length} Orte`;
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('close-details').addEventListener('click', detailsSchliessen);
    document.addEventListener('keydown', (ereignis) => {
        if (ereignis.key === 'Escape') detailsSchliessen();
    });
    karteInitialisieren();
    datenLaden();
});
