# Westjiddisch im (langen) 19. Jahrhundert – statische Website

Dies ist die wiederhergestellte Website des DFG-Projekts "Westjiddisch im
(langen) 19. Jahrhundert". Die urspr&uuml;ngliche Version lief auf einem
PHP/MySQL-Server, der inzwischen abgeschaltet wurde. Diese Fassung ist eine
**rein statische** Version, die auf GitLab Pages l&auml;uft:

- Es gibt **keinen Login- oder Eingabebereich** mehr (die frühere
  "Intern"-Funktion zur Dateneingabe wurde entfernt).
- Quellsuche und Ph&auml;nomensuche laufen **im Browser** (JavaScript) auf
  Basis von Daten, die einmalig aus der alten MySQL-Datenbank exportiert
  wurden (`site-data/titelliste.json`, `site-data/phaenliste.json`). Es gibt
  keine Serverabfrage mehr.
- Das Kartenmodul (Leaflet-Karten) war bereits in der alten Version
  gr&ouml;&szlig;tenteils statisch (die Kartendaten liegen als JavaScript-Dateien
  in `data/`) und wurde unver&auml;ndert &uuml;bernommen.

## Ver&ouml;ffentlichung auf GitLab Pages

Die Datei `.gitlab-ci.yml` ist bereits enthalten und richtet GitLab Pages
automatisch ein. Sobald dieses Repository auf GitLab liegt und die
Pipeline auf dem Standard-Branch (meist `main`) durchl&auml;uft, ist die Seite
unter `https://<benutzername>.gitlab.io/<projektname>/` erreichbar
(genaue Adresse erscheint unter *Deploy &rarr; Pages* in den
Projekteinstellungen).

## Struktur

```
index.html, suche.html, belegsuche.html, maps.html, projekt.html,
kontakt.html, datenschutz.html, dwj.html, katzkarte.html, bibmaps.html
  -> die einzelnen Seiten
karte-*.html
  -> die einzelnen Kartierungen (Leaflet)
css/, js/, images/, data/
  -> Bibliotheken, Bilder und Kartendaten (wie in der alten Seite)
site-data/
  -> aus der MySQL-Datenbank exportierte Daten f&uuml;r die Suche
     (titelliste.json, phaenliste.json, merkmale.json)
```

## Daten aktualisieren

Da es keine Dateneingabe mehr &uuml;ber die Website gibt, m&uuml;ssten neue
Quellen oder Belege direkt in `site-data/titelliste.json` bzw.
`site-data/phaenliste.json` erg&auml;nzt werden (gleiche Feldnamen wie in der
ehemaligen Datenbank). Alternativ kann bei Bedarf ein neuer Export aus
einer aktuellen Datenbank erstellt werden.

## Was bewusst nicht &uuml;bernommen wurde

- **Login/Dateneingabe** (`#eingabe*.php`, `#abmelden.php`,
  `ajax/saveMap.php`) – wie gew&uuml;nscht entfernt.
- **`#dboeffnen.php`** – enthielt die MySQL-Zugangsdaten des alten Servers.
  Diese Datei wurde **nicht** in dieses Repository &uuml;bernommen und sollte
  auch nicht nachtr&auml;glich hinzugef&uuml;gt werden, da der Datenbankzugang
  ohnehin nicht mehr existiert.

## Hinweis zur Datenschutzerkl&auml;rung

Der Text unter `datenschutz.html` wurde weitgehend unver&auml;ndert aus der
alten Seite &uuml;bernommen. Er erw&auml;hnt u.a. Cookies und Logfiles, die sich
auf den fr&uuml;heren eigenen Server bezogen. Da das Hosting jetzt &uuml;ber
GitLab Pages l&auml;uft, sollte dieser Text bei Gelegenheit &uuml;berpr&uuml;ft und
ggf. angepasst werden (keine juristische Beratung – bitte im Zweifel
fachlich pr&uuml;fen lassen).
