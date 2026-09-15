/* Westjiddisch-Datenbank: clientseitige Nachbildung der ehemaligen
   PHP/MySQL-Suchen (#suche.php und #belegsuche.php). Die Daten wurden
   einmalig aus der MySQL-Datenbank exportiert (siehe site-data/*.json)
   und werden hier im Browser gefiltert - es findet keine Server-Abfrage
   mehr statt.

   Dieses Skript wird sowohl von den deutschen als auch von den englischen
   Seiten eingebunden; die Sprache wird aus <html lang="..."> gelesen und
   steuert nur die Oberflaechentexte (STRINGS) und die Auswahl von
   merkmale.json/merkmale.en.json - die zugrunde liegenden Forschungsdaten
   (Titel, Belege) bleiben in jeder Sprache unveraendert. */

(function () {
  "use strict";

  var LANG = (document.documentElement.lang || "de").slice(0, 2) === "en" ? "en" : "de";

  var DATA_ROOT = window.WJ_DATA_ROOT || "site-data/";

  var STRINGS = {
    de: {
      loadError: function (name, status) { return "Konnte " + name + " nicht laden (" + status + ")"; },
      fillOneField: "Bitte füllen Sie mindestens ein Suchfeld aus oder wählen Sie „alle Quellen anzeigen“.",
      searching: "Suche läuft ...",
      loadDataError: function (msg) { return "Fehler beim Laden der Daten: " + msg; },
      searchResult: "Suchergebnis",
      notFound: "Der Suchbegriff wurde in unserer Datenbank leider nicht gefunden.",
      hits: function (n) { return n + " Treffer"; },
      colAutor: "Autor", colTitel: "Titel", colJahr: "Jahr", colVerlag: "Verlag",
      colVerlagsort: "Verlagsort", colFundort: "Fundort",
      downloadCsv: "Ergebnis als CSV herunterladen",
      csvNameQuellen: "quellsuche_ergebnis.csv",
      csvNamePhaenomen: "phaenomensuche_ergebnis.csv",
      lexLabel: "Lexikalische Phänomene", phonLabel: "Phonologische Phänomene", morphLabel: "Morphosyntaktische Phänomene",
      chooseOnePhen: "Bitte wählen Sie mindestens ein Phänomen aus.",
      enterWord: "Bitte geben Sie ein Wort ein.",
      noMatch: "Leider konnte kein Eintrag gefunden werden, der alle Suchkriterien erfüllt.",
      colQuelle: "Quelle", colPhaenomen: "Phänomen", colBeleg: "Beleg",
    },
    en: {
      loadError: function (name, status) { return "Could not load " + name + " (" + status + ")"; },
      fillOneField: "Please fill in at least one search field, or select “show all sources”.",
      searching: "Searching ...",
      loadDataError: function (msg) { return "Error loading data: " + msg; },
      searchResult: "Search results",
      notFound: "Unfortunately, the search term was not found in our database.",
      hits: function (n) { return n + (n === 1 ? " result" : " results"); },
      colAutor: "Author", colTitel: "Title", colJahr: "Year", colVerlag: "Publisher",
      colVerlagsort: "Place of publication", colFundort: "Library",
      downloadCsv: "Download results as CSV",
      csvNameQuellen: "source_search_results.csv",
      csvNamePhaenomen: "phenomenon_search_results.csv",
      lexLabel: "Lexical phenomena", phonLabel: "Phonological phenomena", morphLabel: "Morphosyntactic phenomena",
      chooseOnePhen: "Please select at least one phenomenon.",
      enterWord: "Please enter a word.",
      noMatch: "Unfortunately, no entry could be found that satisfies all search criteria.",
      colQuelle: "Source", colPhaenomen: "Phenomenon", colBeleg: "Attestation",
    },
  };
  var T = STRINGS[LANG];

  var cache = {};
  function loadJSON(name) {
    if (cache[name]) return cache[name];
    cache[name] = fetch(DATA_ROOT + name).then(function (r) {
      if (!r.ok) throw new Error(T.loadError(name, r.status));
      return r.json();
    });
    return cache[name];
  }

  function merkmaleFile() {
    return LANG === "en" ? "merkmale.en.json" : "merkmale.json";
  }

  /* ---------- Hilfsfunktionen, 1:1 aus #funktionen.php uebernommen ---------- */

  function levenshtein(a, b) {
    a = a || ""; b = b || "";
    var m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    var d = [];
    for (var i = 0; i <= m; i++) { d[i] = [i]; }
    for (var j = 0; j <= n; j++) { d[0][j] = j; }
    for (i = 1; i <= m; i++) {
      for (j = 1; j <= n; j++) {
        var cost = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(
          d[i - 1][j] + 1,
          d[i][j - 1] + 1,
          d[i - 1][j - 1] + cost
        );
      }
    }
    return d[m][n];
  }

  function trimChars(s, chars) {
    s = s == null ? "" : String(s);
    var re = new RegExp("^[" + chars + "]+|[" + chars + "]+$", "g");
    return s.replace(re, "");
  }

  /* wortAbgleich(eingabe, ziel, suchtyp)
     suchtyp 0: Teilstring-Suche (case-insensitive) im Gesamtstring
     suchtyp 1: wortweiser EXAKTER Abgleich (jedes Eingabewort muss ein Zielwort exakt treffen)
     suchtyp 2: wortweiser UNSCHARFER Abgleich (Levenshtein-Distanz < 3) */
  function wortAbgleich(eingabe, ziel, suchtyp) {
    var trimSet = " ,'´`";
    eingabe = trimChars(eingabe, trimSet.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));
    ziel = trimChars(ziel, trimSet.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));

    if (suchtyp > 0) {
      var eingabeArr = eingabe.split(" ").filter(function (w) { return w !== ""; });
      var zielArr = ziel.split(" ").filter(function (w) { return w !== ""; });
      if (eingabeArr.length === 0) eingabeArr = [eingabe];
      if (zielArr.length === 0) zielArr = [ziel];

      var gleich = false;
      for (var i = 0; i < eingabeArr.length; i++) {
        gleich = false;
        var e = eingabeArr[i].toLowerCase();
        for (var k = 0; k < zielArr.length; k++) {
          var z = zielArr[k].toLowerCase();
          var lev = levenshtein(e, z);
          if (suchtyp === 1 && lev === 0) { gleich = true; break; }
          if (suchtyp === 2 && lev < 3) { gleich = true; break; }
        }
        if (!gleich) break;
      }
      return gleich;
    } else {
      if (!ziel) return false;
      return ziel.toLowerCase().indexOf(eingabe.toLowerCase()) !== -1;
    }
  }

  function kurztitel(langtitel, grenze, anzahl) {
    var woerter = (langtitel || "").split(grenze).filter(function (w) { return w !== ""; });
    if (woerter.length > anzahl) {
      return woerter.slice(0, anzahl).join(" ") + " ...";
    }
    return (langtitel || "").split(grenze).join(" ");
  }

  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "text") e.textContent = attrs[k];
        else if (k === "html") e.innerHTML = attrs[k];
        else e.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }

  function makeSortable(table) {
    if (window.sorttable && typeof window.sorttable.makeSortable === "function") {
      window.sorttable.makeSortable(table);
    }
  }

  function downloadCSV(filename, rows) {
    var csv = rows.map(function (row) {
      return row.map(function (cell) {
        cell = (cell == null ? "" : String(cell)).replace(/"/g, '""');
        return '"' + cell + '"';
      }).join(",");
    }).join("\r\n");
    var blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ============================= Quellsuche ============================= */

  /* Die Dropdown-Beschriftungen unterscheiden sich je nach Sprache (siehe
     suche.html / suche_en.html), zeigen aber auf dieselben Kurzcodes in den
     Daten (site-data/titelliste.json) - deshalb sind hier beide Sprachen im
     selben Lookup zusammengefasst. */
  var regionMap = {
    "Nordwestjiddisch": "NWJ", "Zentralwestjiddisch": "ZWJ", "Südwestjiddisch": "SWJ",
    "nördliches Übergangsgebiet": "NÜJ", "südliches Übergangsgebiet": "SÜJ", "Ostjiddisch": "OJ",
    "Northwestern Yiddish": "NWJ", "Central Western Yiddish": "ZWJ", "Southwestern Yiddish": "SWJ",
    "northern transition area": "NÜJ", "southern transition area": "SÜJ", "Eastern Yiddish": "OJ",
  };
  var konfMap = {
    "jüdischer Autor": "J", "christlicher Autor": "C",
    "Jewish author": "J", "Christian author": "C",
  };
  var textMap = {
    "Theaterstücke": "d", "Prosatexte": "e", "gebundene Sprache": "l",
    "plays": "d", "prose texts": "e", "verse": "l",
  };

  function initQuellsuche() {
    var form = document.getElementById("suche-form");
    if (!form) return;
    var ergebnisDiv = document.getElementById("suche-ergebnis");

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var fd = new FormData(form);
      var autor = (fd.get("autor") || "").trim();
      var autorexakt = fd.get("autortreffer") === "autorexakt";
      var titel = (fd.get("titel") || "").trim();
      var titelexakt = fd.get("titeltreffer") === "titelexakt";
      var jahr = (fd.get("jahr") || "").trim();
      var region = fd.get("region") || "";
      var konfession = fd.get("konfession") || "";
      var textsorte = fd.get("textsorte") || "";
      var alle = fd.get("alle") === "alle";

      if (region.indexOf("--") === 0) region = "";
      if (konfession.indexOf("--") === 0) konfession = "";
      if (textsorte.indexOf("--") === 0) textsorte = "";

      if (regionMap[region]) region = regionMap[region];
      if (konfMap[konfession]) konfession = konfMap[konfession];
      if (textMap[textsorte]) textsorte = textMap[textsorte];

      if (!autor && !titel && !jahr && !region && !konfession && !textsorte && !alle) {
        ergebnisDiv.innerHTML = "<p><i>" + T.fillOneField + "</i></p>";
        return;
      }

      ergebnisDiv.innerHTML = "<p><i>" + T.searching + "</i></p>";
      loadJSON("titelliste.json").then(function (rows) {
        var treffer = rows.filter(function (r) {
          var okAutor = !autor || wortAbgleich(autor, r.Autor, autorexakt ? 1 : 2);
          var okTitel = !titel || wortAbgleich(titel, r.Titel, titelexakt ? 1 : 2);
          var okJahr = !jahr || wortAbgleich(jahr, r.Jahr, 0);
          var okRegion = !region || wortAbgleich(region, r.Region, 0);
          var okKonf = !konfession || wortAbgleich(konfession, r.Konfession, 0);
          var okText = !textsorte || wortAbgleich(textsorte, r.Textsorte, 0);
          return okAutor && okTitel && okJahr && okRegion && okKonf && okText;
        });
        renderQuellsucheErgebnis(ergebnisDiv, treffer);
      }).catch(function (err) {
        ergebnisDiv.innerHTML = "<p><i>" + T.loadDataError(err.message) + "</i></p>";
      });
    });
  }

  function renderQuellsucheErgebnis(container, treffer) {
    container.innerHTML = "";
    container.appendChild(el("h2", { text: T.searchResult }));
    if (treffer.length === 0) {
      container.appendChild(el("p", { html: "<i>" + T.notFound + "</i>" }));
      return;
    }
    container.appendChild(el("p", { text: T.hits(treffer.length) }));
    var table = el("table", { align: "justify", id: "breite", cellspacing: "8", cellpadding: "8", border: "0", "class": "sortable" });
    var head = el("tr", {}, [T.colAutor, T.colTitel, T.colJahr, T.colVerlag, T.colVerlagsort, T.colFundort].map(function (h) {
      return el("td", {}, [el("b", { text: h })]);
    }));
    table.appendChild(head);
    var tbody = el("tbody");
    treffer.forEach(function (r) {
      tbody.appendChild(el("tr", {}, [
        el("td", { text: r.Autor || "" }),
        el("td", { text: r.Titel || "" }),
        el("td", { text: r.Jahr || "" }),
        el("td", { text: r.Verlag || "" }),
        el("td", { text: r.Ort || "" }),
        el("td", { text: r.Bibliothek || "" })
      ]));
    });
    table.appendChild(tbody);
    container.appendChild(table);
    makeSortable(table);

    var csvBtn = el("p", {}, [el("button", { type: "button", text: T.downloadCsv })]);
    csvBtn.querySelector("button").addEventListener("click", function () {
      var rows = [[T.colAutor, T.colTitel, T.colJahr, T.colVerlag, T.colVerlagsort, T.colFundort]];
      treffer.forEach(function (r) {
        rows.push([r.Autor, r.Titel, r.Jahr, r.Verlag, r.Ort, r.Bibliothek]);
      });
      downloadCSV(T.csvNameQuellen, rows);
    });
    container.appendChild(csvBtn);
  }

  /* =========================== Phänomensuche =========================== */

  function flattenMerkmale(merkmalnamen) {
    var all = {};
    Object.keys(merkmalnamen).forEach(function (ebene) {
      Object.keys(merkmalnamen[ebene]).forEach(function (key) {
        all[key] = merkmalnamen[ebene][key];
      });
    });
    return all;
  }

  function initMerkmalForm() {
    var container = document.getElementById("merkmal-checkboxes");
    if (!container) return;
    loadJSON(merkmaleFile()).then(function (merkmalnamen) {
      var labels = { lex: T.lexLabel, phon: T.phonLabel, morph: T.morphLabel };
      ["lex", "phon", "morph"].forEach(function (ebene) {
        container.appendChild(el("h4", { text: labels[ebene] }));
        Object.keys(merkmalnamen[ebene]).forEach(function (key) {
          var id = "merkmal-" + key;
          var label = el("label", { style: "display:block" }, [
            el("input", { type: "checkbox", name: "merkmale", value: key, id: id }),
            document.createTextNode(" " + merkmalnamen[ebene][key])
          ]);
          container.appendChild(label);
        });
      });
    });
  }

  function initBelegsuche() {
    var merkmalForm = document.getElementById("merkmal-form");
    var lexemForm = document.getElementById("lexem-form");
    var ergebnisDiv = document.getElementById("beleg-ergebnis");
    if (!merkmalForm && !lexemForm) return;

    initMerkmalForm();

    if (merkmalForm) {
      merkmalForm.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var checked = Array.prototype.slice.call(merkmalForm.querySelectorAll('input[name="merkmale"]:checked')).map(function (c) { return c.value; });
        if (checked.length === 0) {
          ergebnisDiv.innerHTML = "<p><i>" + T.chooseOnePhen + "</i></p>";
          return;
        }
        ergebnisDiv.innerHTML = "<p><i>" + T.searching + "</i></p>";
        Promise.all([loadJSON("phaenliste.json"), loadJSON("titelliste.json"), loadJSON(merkmaleFile())]).then(function (res) {
          searchByMerkmale(checked, res[0], res[1], res[2], ergebnisDiv);
        });
      });
    }

    if (lexemForm) {
      lexemForm.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var fd = new FormData(lexemForm);
        var lexem = (fd.get("lexem") || "").trim();
        var exakt = fd.get("genauertreffer") === "genauertreffer";
        if (!lexem) {
          ergebnisDiv.innerHTML = "<p><i>" + T.enterWord + "</i></p>";
          return;
        }
        ergebnisDiv.innerHTML = "<p><i>" + T.searching + "</i></p>";
        Promise.all([loadJSON("phaenliste.json"), loadJSON("titelliste.json"), loadJSON(merkmaleFile())]).then(function (res) {
          searchByLexem(lexem, exakt, res[0], res[1], res[2], ergebnisDiv);
        });
      });
    }
  }

  function titelInfo(titelliste, id) {
    var t = titelliste.find(function (r) { return String(r.ID) === String(id); });
    if (!t) return "";
    return t.Titel + ". " + t.Autor + " (" + t.Jahr + ").";
  }

  function renderMatchboxTable(container, kopf, zeilen) {
    container.innerHTML = "";
    container.appendChild(el("h2", { text: T.searchResult }));
    if (zeilen.length === 0) {
      container.appendChild(el("p", { text: T.noMatch }));
      return;
    }
    var table = el("table", { align: "justify", valign: "top", cellspacing: "15", border: "0", "class": "sortable" });
    var headRow = el("tr", {}, kopf.map(function (h) {
      return el("td", { valign: "top", width: "200", style: "width:200px" }, [el("span", { style: "padding:10px;font-weight:bold", text: h })]);
    }));
    table.appendChild(headRow);
    var tbody = el("tbody");
    zeilen.forEach(function (zeile) {
      var row = el("tr", {}, zeile.map(function (pair) {
        var box = el("div", { id: "matchbox" }, [
          el("a", { href: "#", "class": "mb" }, [
            el("span", { "class": "zwei", text: pair[1] }),
            el("span", { "class": "eins", text: pair[0] })
          ])
        ]);
        return el("td", { valign: "top" }, [box]);
      }));
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    container.appendChild(table);
    makeSortable(table);

    var csvBtn = el("p", {}, [el("button", { type: "button", text: T.downloadCsv })]);
    csvBtn.querySelector("button").addEventListener("click", function () {
      var rows = [kopf];
      zeilen.forEach(function (zeile) { rows.push(zeile.map(function (p) { return p[1]; })); });
      downloadCSV(T.csvNamePhaenomen, rows);
    });
    container.appendChild(csvBtn);
  }

  function searchByMerkmale(suchmerkmale, phaenliste, titelliste, merkmalnamen, ergebnisDiv) {
    var merkmalnamenAlle = flattenMerkmale(merkmalnamen);
    var sammlung = {}; // QuellID -> { phaenomen: [ [beleg, uebersetzung, seite], ... ] }
    phaenliste.forEach(function (r) {
      if (suchmerkmale.indexOf(r.Phaenomen) !== -1) {
        var id = r.QuellID;
        if (!sammlung[id]) sammlung[id] = {};
        if (!sammlung[id][r.Phaenomen]) sammlung[id][r.Phaenomen] = [];
        sammlung[id][r.Phaenomen].push([r.Beleg, r.Uebersetzung, r.Seitenzahl]);
      }
    });

    var kopf = suchmerkmale.map(function (m) { return merkmalnamenAlle[m] || m; }).concat([T.colQuelle]);
    var zeilen = [];
    Object.keys(sammlung).forEach(function (id) {
      var vorhanden = Object.keys(sammlung[id]);
      var vollstaendig = suchmerkmale.every(function (m) { return vorhanden.indexOf(m) !== -1; });
      if (!vollstaendig) return;
      var zeile = suchmerkmale.map(function (m) {
        var text = sammlung[id][m].map(function (b) {
          return b[0] + ' "' + b[1] + '" (' + b[2] + ")";
        }).join(", ");
        return [kurztitel(text, " ", 3), text];
      });
      var titelText = titelInfo(titelliste, id);
      zeile.push([kurztitel(titelText, " ", 4), titelText]);
      zeilen.push(zeile);
    });

    renderMatchboxTable(ergebnisDiv, kopf, zeilen);
  }

  function searchByLexem(lexem, exakt, phaenliste, titelliste, merkmalnamen, ergebnisDiv) {
    var suchtyp = exakt ? 1 : 2;
    var treffer = {}; // QuellID -> phaenomen -> [beleg strings]
    var gefunden = false;
    phaenliste.forEach(function (r) {
      if (r.Beleg && wortAbgleich(lexem, r.Beleg, suchtyp)) {
        gefunden = true;
        var id = r.QuellID;
        if (!treffer[id]) treffer[id] = {};
        if (!treffer[id][r.Phaenomen]) treffer[id][r.Phaenomen] = [];
        treffer[id][r.Phaenomen].push(r.Beleg + ' "' + r.Uebersetzung + '" (' + r.Seitenzahl + ")");
      }
    });

    var kopf = [T.colPhaenomen, T.colBeleg, T.colQuelle];
    var zeilen = [];
    if (gefunden) {
      Object.keys(treffer).forEach(function (id) {
        Object.keys(treffer[id]).forEach(function (phaenomen) {
          var label = null;
          Object.keys(merkmalnamen).some(function (ebene) {
            if (merkmalnamen[ebene][phaenomen]) { label = merkmalnamen[ebene][phaenomen]; return true; }
            return false;
          });
          var belegText = treffer[id][phaenomen].join(", ");
          var titelText = titelInfo(titelliste, id);
          zeilen.push([
            [label || phaenomen, label || phaenomen],
            [kurztitel(belegText, " ", 3), belegText],
            [kurztitel(titelText, " ", 4), titelText]
          ]);
        });
      });
    }
    renderMatchboxTable(ergebnisDiv, kopf, zeilen);
  }

  document.addEventListener("DOMContentLoaded", function () {
    initQuellsuche();
    initBelegsuche();
  });
})();
