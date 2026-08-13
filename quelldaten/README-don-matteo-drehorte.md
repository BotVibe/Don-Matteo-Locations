# Don Matteo – Drehorte Staffel 1–15 · v4

Datenstand: 12.08.2026 · **78 Einträge**, davon 65 mit Koordinaten · 42 Quellen

Gubbio 36 · Spoleto 19 · Tuscia (Nepi/Monterosi) 6 · übriges Umbrien und Latium 17

## Wichtig vorweg: Es gibt eine Staffel 15

Du hast nach „bis letzte Staffel 14" gefragt — **Staffel 15 lief bereits**, vom 8. Januar bis März 2026 auf Rai 1, mit Raoul Bova als Don Massimo. Sie ist vollständig mit drin, und sie ist ausgerechnet die am besten dokumentierte der späten Staffeln, weil aktuelle Presse straßengenau berichtet hat.

## Dateien

| Datei | Inhalt |
|---|---|
| `don-matteo-drehorte.csv` | Haupttabelle, 24 Spalten (umbenannt — nicht mehr nur Gubbio) |
| `don-matteo-drehorte.geojson` | Punkt-Layer für Leaflet/MapLibre |
| `don-matteo-quellen.csv` | Quellenregister Q01–Q41 |
| `don-matteo-drehzeitraeume.csv` | Drehkalender je Staffel, jetzt bis Staffel 15 |
| `don-matteo-abdeckung-je-staffel.csv` | Was pro Staffel belegt ist — alle 15 Staffeln |

## Die Spoleto-Ära (Staffel 9–15)

Hier war die Quellenlage deutlich besser als befürchtet: Dieselbe Autorin, die 2008 Gubbio dokumentiert hat, hat 2015 eine **Spoleto-Reportage** nachgelegt (`RepDonMatteo9`) — acht Locations mit Karte und Fotos. Dazu kommt, dass der **Comune di Spoleto** seine Drehberichte deutlich aktiver pflegt als Gubbio es je tat, und dass Staffel 15 frisch genug ist, dass die Presse noch Straßennamen nennt.

Die Struktur ist kompakter als in Gubbio — fast alles liegt an der Piazza del Duomo:

| Rolle | Ort |
|---|---|
| Kaserne (außen) | Palazzo Bufalini |
| Kirche (innen **und** außen) | Basilica di Sant'Eufemia, Via Saffi 13 |
| Pfarrhaus-Eingang | Nebeneingang Teatro Caio Melisso |
| Gefängnis-Sprechzimmer | ebenfalls Teatro Caio Melisso |
| Gefängnis (außen) | Rocca Albornoziana |
| Schach-Bar | Erdgeschoss Casa Menotti |
| Haus Cecchini/Tommasi | Via di Fontesecca |
| Fahrradweg zum Gefängnis | Ponte delle Torri |

**Ein Unterschied zu Gubbio, der auf die Karte gehört:** In Spoleto liefert Sant'Eufemia *sowohl* Innen- als auch Außenaufnahmen. Die Aufteilung auf zwei Kirchen (San Giovanni außen / San Marziale innen) gab es nur in Gubbio.

**Das häufigste Missverständnis:** Der Dom von Spoleto ist das bekannteste Bild der Serie, aber dort wird **keine** religiöse Szene gedreht. Genutzt werden Fassade und Freitreppe als Kulisse. Steht so in der Tabelle markiert.

## Zwei Widersprüche, die du vor dem Veröffentlichen klären solltest

1. **Pfarrhaus-Eingang:** Die Fan-Reportage sagt Nebeneingang Teatro Caio Melisso. Ein Reiseblog sagt kleine Holztür links der Ex-Kirche Santa Maria della Manna d'Oro. Beide Positionen sind im Datensatz dokumentiert.
2. **Gefängnis-Sprechzimmer:** Mehrheit inklusive Umbria Tourism sagt Teatro Caio Melisso. Eine Quelle sagt „Teatrino delle Sei". 

Dazu eine Kleinigkeit: Die Schach-Bar wird teils „Tric Trac" genannt. Ob das dasselbe Lokal im Erdgeschoss der Casa Menotti ist oder ein zweites, geht aus den Quellen nicht hervor.

## Neu ab Staffel 15: die Tuscia

Erstmals seit der Gubbio-Ära wurde wieder außerhalb Umbriens gedreht, im Latium (Provinz Viterbo) — und dramaturgisch begründet: Die Nepi-Szenen sind **Rückblenden auf Don Massimos Zeit als Polizist**, deshalb bewusst eine andere Umgebung als Spoleto.

- **Monterosi:** Via Roma und Chiesa di Santa Croce (drei Ermittlungsszenen)
- **Nepi:** Via Matteotti, Piazza del Comune, Via San Pietro, Vicolo del Mattonato

Dazu **Castelluccio di Norcia** — ab Staffel 13 im Vorspann, für Staffel 14 als neue Location angekündigt.

## Zwei Warnungen für Besucher

- **Ponte delle Torri ist gesperrt.** Seit den Erdbeben 2016 nicht begehbar. Ansehen ja, überqueren nein.
- **Die Eissporthalle Ussita** (Staffel 4, aus v3) ist seit Jahren geschlossen.

## Abdeckung über alle 15 Staffeln

Die Extremwerte: Staffel 6 mit 32 belegten Orten und Staffel 9 mit 12 sind gut erschlossen, Staffel 15 mit 10 ebenfalls. **Staffel 2, 3, 10, 11 und 12 haben null staffelspezifische Ortsangaben** — dort greifen nur die durchgehend genutzten Kernorte. Details je Staffel in `don-matteo-abdeckung-je-staffel.csv`.

Das Muster ist bemerkenswert: Dokumentiert ist, was jemand zufällig dokumentiert hat — eine Fan-Reise (6, 9) oder aktuelle Presseaufmerksamkeit (15). Die Staffeln dazwischen fallen durchs Raster.

## Weiterhin gültige Vorbehalte

- **Innenaufnahmen sind Studio** (Lux Vide, Formello) — über die gesamte Laufzeit, Ausnahme Sant'Eufemia und wenige zugängliche Gebäude.
- **Kaserne Gubbio:** Palazzo Pretorio vs. Palazzo dei Consoli — Standbildvergleiche sprechen für den Pretorio.
- **Handlungsort ≠ Drehort:** U02, X03, SP02 (Dom Spoleto) und die reinen Ortsnennungen auf der Karte anders einfärben.
- **Koordinaten** aus Google Places. Für eine öffentliche Fanseite gegen OpenStreetMap tauschen; `google_place_id` liegt bei.
