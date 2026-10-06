# 🏗️ Cores — Tsunami Events Management System

RentalCore 5.3.121 / WarehouseCore 5.9.113 / MCP 1.5.59 ergänzen echte
Produkt-Auftragspositionen mit Vorschau, Anlage, Update und erhaltener Archivierung.
Manuelle Bedarfe können ausdrücklich im selben Schritt auf 0 gesetzt werden;
Position, Materialbedarf und Auftragswert werden atomar aktualisiert.
Der Katalog enthält 442 Werkzeuge. Bestehende Jobs werden nicht automatisch
verändert. Details und Rechte stehen im [Tool-Katalog](cores-mcp/docs/TOOL_CATALOG.md).

MCP 1.5.58 übernimmt die Procurement-Rechte für Bedarfsmeldungen in allen
Lesepfaden: ursprünglicher Anforderer oder aktuell aktiver Administrator.
Suche, Produktkontexte, Zählungen, Seitennavigation, Verknüpfungen und
Aggregationen berücksichtigen diese Rechte vor der Auswertung. Diensttokens
sehen keine Bedarfsmeldungen; alte Rollen im Token umgehen keinen Rechteentzug.
Warehouse 5.9.112, Migrationen und die 433 Werkzeuge bleiben unverändert.
PostgreSQL-/Race-Tests, reale MCP-/Native-Rechtevergleiche, bestehende
Wiederholungsbelege und vollständige Lesetests beider Teststacks sind bestanden.
Finanzrechte, Dokumente und weitere [Abnahmepunkte](cores-mcp/docs/ISSUE_COMPLETION.md)
bleiben in Bearbeitung.

WarehouseCore 5.9.112 / MCP 1.5.57 ergänzen sechs vollständige Case-Abläufe:
Versiegeln, Öffnen, Umsetzen, Job-Ausgabe, Rücknahme und Rücknahmeprüfung.
Der gesamte verschachtelte Inhalt, Reservierungen, Job-Bearbeitungssperren,
Aufgaben und Lagerkapazität binden die finale Vorschau und Bestätigung.
Case-/Gerätestatus, Bewegungen, erhaltene physische Ereignisse, Job-Historie,
Audit und Wiederholungsbeleg sind atomar. Native `062` / Root `046` erhalten
Case-Identitäten und unveränderliche physische Historie; native Entfernung
archiviert. Der Katalog enthält **433 Werkzeuge** (109 Abfragen / 162 Vorschauen /
162 Ausführungen). Warehouse zuerst, danach MCP ausrollen; Produktion nur lesend
prüfen. Die übrigen [MCP-Abnahmepunkte](cores-mcp/docs/ISSUE_COMPLETION.md) bleiben offen.

WarehouseCore 5.9.109 / MCP 1.5.54 ergänzen sieben geführte Pack-/Entpackaktionen
für Geräte, Mengenartikel, Child-Cases und vollständiges Entpacken. Vollständiger
Inhalts-/Lager-/Job-/Aufgabenkontext und genaue Versionen binden Vorschau und
Bestätigung. Inhalt, erhaltene Gesamtmenge, Gerätebewegung, Case-Ereignis, Audit
und Wiederholungsbeleg sind atomar; Child-Cases behalten ihre Versiegelung.
Native `061` / Root `045` schützen Inhalte und berücksichtigen gepackte
Mengen im Gesamtbestand. Neustarts verändern keine Belege oder Referenzversionen.
Der Katalog enthält **420 Werkzeuge**. Warehouse zuerst, danach MCP ausrollen;
Produktion ausschließlich lesend prüfen. Vollständige Case-Abläufe folgen im
oben dokumentierten Folgerelease.

WarehouseCore 5.9.108 / MCP 1.5.53 ergänzen vollständige Case-Sollvorlagen:
Anlegen, Ändern, Archivieren und Wiederherstellen mit erhaltenen IDs,
aktuellem Administrator-/Aktionsrecht, genauer Case-/Artikel-/Inhaltsprüfung,
gebundener Bestätigung und atomarem Audit/Wiederholungsbeleg. Sollmengen bewegen
keinen Bestand. Native Entfernung archiviert; Wiederholungen nach Neustart
verändern keine Mengen oder genauen Versionen. Native `060` / Root `044`
schützen Vorlagen auch vor anderen Schreibern. Der Katalog enthält **405 Werkzeuge**.
Warehouse zuerst, danach MCP ausrollen und Produktion nur lesend prüfen.
Weitere Case-Workflows und die übrigen
[MCP-Abnahmepunkte](cores-mcp/docs/ISSUE_COMPLETION.md) bleiben offen.

WarehouseCore 5.9.107 / MCP 1.5.52 ergänzen Produkt-Batches und die Übernahme
geprüfter Daten aus Herstellerseiten. Die vollständige Vorschau bindet Stammdaten,
Kennungen und gemeinsame Lagerkapazität; Anlage, Anfangsbestand/Geräte, Scan-IDs,
Audit und dauerhafte Wiederholungsantwort sind atomar. Produktpreise benötigen
einen ausdrücklichen Finanz-Scope. URL-Werte bleiben ungeprüfte Geschäftsdaten und
werden vor bestätigter Anlage eingefroren. Der Katalog enthält **395 Werkzeuge**;
die übrigen [MCP-Abnahmepunkte](cores-mcp/docs/ISSUE_COMPLETION.md) bleiben offen.
Warehouse zuerst, danach MCP ausrollen; Produktion ausschließlich lesend prüfen.

ProcurementCore 1.0.76 / MCP 1.5.51 ergänzen die geführte Adam-Hall-Bestellung:
lokale Vorschau, separat bestätigte Warenkorbvorbereitung und vollständige
Geschäftspreis-/Adressprüfung vor der kostenpflichtigen Bestätigung. Vorhandene
fremde Warenkörbe werden nicht gelöscht; geänderte Preise oder Methoden stoppen
den Versand. Verschlüsselte private Checkouts, dauerhafte Übermittlungsaufträge,
Audit und unveränderte Anfragekennungen verhindern erneutes Absenden. Native
`014` / Root `043` bewahren geprüfte Checkouts. Der Katalog enthält 393 Werkzeuge;
die übrigen [MCP-Abnahmepunkte](cores-mcp/docs/ISSUE_COMPLETION.md) bleiben offen.
Produktion wird ausschließlich lesend geprüft.

ProcurementCore 1.0.75 / MCP 1.5.50 ergänzen die geführte menschliche Klärung
ungewisser Übermittlungen. Auftrag, ursprünglicher Lieferantenbeleg und Evidenz
binden genaue Vorschau und Bestätigung; Klärung, Status, Audit und Wiederholungs-
antwort werden atomar gespeichert. Originalübermittlung und Positionen bleiben
erhalten; es wird niemals erneut gesendet. Native `013` / Root `042` bewahren
Klärungsbelege. Der Katalog enthält 389 Werkzeuge. Adam Hall und die übrigen
[MCP-Abnahmepunkte](cores-mcp/docs/ISSUE_COMPLETION.md) bleiben offen.

> **Monorepo für das Cores-Ökosystem**  
> Vollständige Management-Plattform bestehend aus fünf Core-Services, einer MCP-KI-Anbindung, zentraler Authentifizierung, einheitlichem Branding und Shared Infrastructure.

ProcurementCore 1.0.74 / MCP 1.5.49 ergänzen die explizit freigegebene Amazon-
Übermittlung: vollständiger unveränderter freigegebener Warenkorb, Liefer-/Rechnungs-
adressen, EUR-Betrag und Modus binden Vorschau und Bestätigung. Ein dauerhafter
Auftrag wird vor dem externen Aufruf gespeichert. Wiederholungen schließen eine
vorhandene Lieferantenbestätigung ab und senden niemals erneut; unklare Ergebnisse
benötigen menschliche Prüfung. Native `012` / Root `041` schützen Übermittlungs-
identität, Originalpositionen und die Sperre gegen erneutes Absenden. Produktion
wird ausschließlich lesend geprüft. Der Katalog enthält 387 Werkzeuge;
Adam Hall, geführte Klärung unklarer Ergebnisse und weitere
[MCP-Abnahmepunkte](cores-mcp/docs/ISSUE_COMPLETION.md) bleiben offen.

ProcurementCore 1.0.73 / MCP 1.5.48 ergänzen die geführte Umwandlung freigegebener
Bedarfe in Lieferanten-Bestellentwürfe. Vollständiger Bedarf, Lieferant, Angebote
und abgeleiteter Entwurf binden exakte Vorschau/Version und Bestätigung. Bestellung,
Bedarfsstatus, beide Audits/Aktivitäten und Erfolgsbeleg werden atomar gespeichert;
auch gleichzeitige UI-/MCP-Aufrufe erzeugen nur eine Bestellung. Originalfelder und
Positions-IDs bleiben erhalten. Der Katalog umfasst 385 Werkzeuge; externe
Lieferanteneinreichung und weitere [MCP-Abnahmepunkte](cores-mcp/docs/ISSUE_COMPLETION.md)
bleiben offen. KI-Apps aktualisieren ihre Schemas wie im
[MCP-README](cores-mcp/README.md#tool-katalog-in-ki-apps-aktualisieren) beschrieben.

ProcurementCore 1.0.72 / MCP 1.5.47 sichern vollständige Bestellentwürfe über die
Owner-API: vollständige Kopfdaten, Positionswerte, native Gesamtwerte, aktuelle
Referenzen und doppelte Lieferanten-Bestellnummern binden Vorschau und Bestätigung.
Ausgelassene Positionen behalten ihre IDs. Aktuelle Admin-/Aktionsrechte gelten auch
für Replay; Änderung, Audit, Aktivität und Erfolgsbeleg werden atomar gespeichert.
Bestätigte, empfangene, archivierte und Amazon-Bestellungen bleiben geschützt.
383 Werkzeuge; Bedarf-zu-Bestellung, externe Lieferanteneinreichung und weitere
[MCP-Abnahmepunkte](cores-mcp/docs/ISSUE_COMPLETION.md) bleiben offen.

ProcurementCore 1.0.71 / MCP 1.5.46 sichern vollständige Bedarfsentwürfe und
Einreichung über die geschlossene Owner-API. Aktuelle Anforderer-/Adminrechte,
vollständige Felder/Positionen, Katalogreferenzen und eigene Duplikate gehören zur
exakten Vorschau und Bestätigung. Ausgelassene Positionen behalten ihre IDs;
Audit, Aktivität und Erfolgsbeleg werden atomar gespeichert. Native `011` / Root
`040` schließen Referenz-/Archivrennen für alle Schreiber. Der Katalog bleibt bei
383 Tools; Bestellentwürfe, Lieferanteneinreichung und weitere Abnahmepunkte bleiben
laut [MCP-Abnahmeliste](cores-mcp/docs/ISSUE_COMPLETION.md) offen.

ProcurementCore 1.0.70 / MCP 1.5.45 sichern Bedarfsentscheidungen und Bestellstatus
über eine geschlossene, kontextgebundene Owner-API. Aktuelle Admin-/Approve-Rechte
und bei Bedarfen ein anderer Entscheider gelten auch für Replay. Originale Felder,
Positionen, Abhängigkeiten und konkrete Begründung binden Vorschau und Bestätigung;
Audit, Aktivität und Erfolgsbeleg werden atomar verbucht. Restore erhält auch bei
empfangenen/stornierten Bestellungen den Originalstatus. Der Katalog bleibt bei
383 Werkzeugen; andere Issue-Abnahmepunkte sind weiterhin offen.

ProcurementCore 1.0.69 / MCP 1.5.44 ergänzen erhaltene Bedarfs-/Bestellarchive,
Restore und redigierte Versionshistorien: 383 Werkzeuge insgesamt. Root `039` /
Procurement `010` schützen Eltern, Positionen und Identitäten aller Schreiber.
Offene Folge-Bestellungen und Einlagerungsaufgaben blockieren Archive;
Wiederherstellung prüft ursprüngliche aktive Eltern. Aktuelle Anforderer-/Admin-
und Archiv-Rechte, exakte Vorschau, Version, Kontext und Bestätigung gelten auch
für Replay. Zurückgegebene Bedarfe werden ausdrücklich überarbeitet und erneut
eingereicht; die alte Entscheidung bleibt in der Historie. Siehe die
[MCP-Abnahmeliste](cores-mcp/docs/ISSUE_COMPLETION.md) für verbleibende Issue-Punkte.

ProcurementCore 1.0.66 / MCP 1.5.41 ergänzen getrennte, erhaltene Archive und
Wiederherstellungen für Lieferanten, Produkte und Angebote sowie redigierte
Historien. Root `037` / Procurement `008` sichern Identitäten und Versionen auch
für native Schreiber; dauerhafte Löschung liefert 409. Aktuelle Adminrechte,
Archiv-Scope, exakte Vorschau und Bestätigung schützen die atomare Ausführung.
OAuth unterstützt jetzt auch Rental-Finanzzugriff sowie Rental-/Procurement-
Archiv-Scopes. Angefragte Finanzbereiche werden ausdrücklich angezeigt und
bleiben standardmäßig nicht freigegeben. Vorhandene Token benötigen eine neue
Einwilligung für zusätzliche Rechte; siehe die MCP-README.

ProcurementCore 1.0.67 / MCP 1.5.42 ergänzen Kategoriearchive und Restore mit
vollständig erhaltenen Parameterdefinitionen und redigierter Historie. Aktive
Produkte blockieren Kategoriearchive; neue/reaktivierte Produkte brauchen aktive
Kategorien. Root `038` / Procurement `009` schützen sämtliche Schreiber.
Historische Kategorien und Lieferanten bleiben in der MCP-Auflösung auffindbar
und verlangen separate Wiederherstellung. Der Gesamtkatalog enthält 373 Werkzeuge.

ProcurementCore 1.0.68 / MCP 1.5.43 sichern den vollständigen Wareneingang:
Teil-/Voll-/Überlieferung, Produktzuordnung, Lagerverteilung, Seriennummern und
Zielplatz gehören zur exakten Vorschau. Buchung, Geräte/Bestand, Einlagerungs-
aufgabe/-ereignis, Audit und dauerhafter Beleg sind atomar. Empfang und Freigabe
verlangen ausdrücklich getrennte Scopes; allgemeines Schreibrecht genügt nicht.
Erfolgreiche alte Belege bleiben ohne Doppelbuchung wiederholbar. Der Katalog
bleibt bei 373 Werkzeugen; die übrigen Abnahmepunkte der MCP-Issues bleiben offen.

## Einheitliches Designsystem

Alle Oberflächen der Cores Suite verwenden ein verbindliches Designsystem für Farbpalette, Inter-Typografie, Größenleiter, Shell/Sidebar, Tabellen, Formulare, Selects, Dropdowns, Scrollbars, Karten, Responsive-Verhalten und Dashboards. Die vollständige Spezifikation steht in [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md); Marken- und Logoregeln stehen ergänzend in [`docs/BRANDING.md`](docs/BRANDING.md).

Die kanonischen Implementierungen liegen in `theme/tsunami-theme.css` und `theme/cores-design.ts`. Service-Kopien werden nicht direkt geändert:

```bash
./scripts/sync-design-system.sh
./scripts/check-design-system.sh
```

Jede neue oder überarbeitete UI muss diese Prüfung sowie den jeweiligen Frontend-Build bestehen. Die Regel ist zusätzlich in den `AGENTS.md`-Dateien der Suite und ihrer Services verankert.

## Gemeinsame Oberflächensprache

Dashboard, RentalCore, WarehouseCore, PlannerCore und ProcurementCore bieten in
der Sidebar dieselbe Sprachwahl für Deutsch und Englisch. Die Auswahl wird als
`cores_language` gespeichert und gilt beim Wechsel zwischen allen Cores weiter;
Datumsformate und Begrüßungen folgen ebenfalls der gewählten Sprache. Gemeinsame
Übersetzungen liegen unter `theme/locales/` und werden mit dem Designsystem
synchronisiert. Neue Sprachen können dort als gleich strukturierte Ressource
ergänzt werden.

Die Übersetzungsauflösung akzeptiert deutsche und englische Quelltexte und
liefert immer die ausgewählte Zielsprache. Gemeinsame Platzhalter erhalten
dynamische Zähler, Uhrzeiten und Statuswerte; die Dashboards aller fünf Cores
sind einschließlich ihrer Live-Kennzahlen vollständig abgedeckt.

## Flexibler Datentransfer

Unter **Administration → Datenimport/-export** stellt das Cores Dashboard einen
gemeinsamen Arbeitsbereich für Produkte, Geräte, Kontakte, Hersteller, Marken,
Kategorien, Lagerbereiche, Kabel und Jobs bereit. Exporte erlauben eine freie
Feldauswahl, lesbare oder technische Überschriften, drei CSV-Trennzeichen und
XLSX. CSV-/XLSX-Importe werden anhand der Spaltennamen zugeordnet, vorab auf
Typen und Referenzen geprüft und anschließend atomar geschrieben. Erkannte
Konflikte lassen sich vollständig überspringen oder pro Spalte mit Importwert,
Bestandswert beziehungsweise „nur leere Felder“ zusammenführen.

## A4-Etikettenbögen und individuelle Stückzahlen

Das WarehouseCore-Druckcenter erzeugt neben maßhaltigen Einzelseiten jetzt auch
A4-Etikettenbögen für normale Büro- und Aufkleberdrucker. Hoch-/Querformat,
Seitenrand, horizontale und vertikale Abstände sowie optionale Schnittführungen
sind konfigurierbar. Für jedes ausgewählte Geräte-, Kabel-, Case- oder
Lagerzonenlabel lässt sich eine eigene Kopienzahl setzen; dieselben Stückzahlen
gelten auf Wunsch auch für Zebra-Direktdruck.

Aktueller Suite-Release (06.10.2026):

| Service | Image |
|---|---|
| Cores Dashboard | `nobentie/cores-dashboard:1.14.39` |
| RentalCore | `nobentie/rentalcore:5.3.121` |
| WarehouseCore | `nobentie/warehousecore:5.9.113` |
| PlannerCore | `nobentie/plannercore:2.6.25` |
| ProcurementCore | `nobentie/procurementcore:1.0.76` |
| Cores MCP | `nobentie/cores-mcp:1.5.59` |
| Datenbanksicherung | `nobentie/cores-backup:1.0.0` |

WarehouseCore 5.9.106 und Cores MCP 1.5.40 bieten vollständige Einzelgeräte-Anlage
und Metadatenpflege, Archivierung/Restore, redigierte Geräte-Audits und den
kontrollierten Rückweg der eigenen letzten unveränderten MCP-Feldänderung.
Die neuen Geräteaktionen benötigen Adminrechte, passende create/update/archive-
Scopes, vollständige Vorschau, Bestätigung und Idempotenz; bestehende Geräte
zusätzlich die exakte Version. Root-Migration `024` und Warehouse-Migration `051`
versionieren auch andere Geräte-Schreiber und halten Scan-Kennungen am
Archivstatus. Aktive Abhängigkeiten und belegte Lagerplätze werden erneut im
Owning Core geprüft. Der MCP bietet 373 Werkzeuge (103 Abfragen, 135 Vorschauen,
135 Ausführungen). Details stehen in den Service-READMEs und im Tool-Katalog.

Die Compose-Startreihenfolge wartet auf gesunde Dienste: Rental vor Warehouse,
Warehouse vor Procurement und alle vier Cores vor MCP. Damit kollidieren die
gemeinsamen Rental-/Warehouse-Startmigrationen nicht und MCP startet erst mit
dem vollständigen Schema.

Root `036` initialisiert das bestehende Planner-Schema inklusive wiederkehrender
Aufgaben bei einer frischen Installation. MCP 1.5.40 rundet Beschaffungs-Packpreise
und Wareneingangsprozente auch mit Gleitkomma-Mengen korrekt; der Katalog bleibt
bei 353 Werkzeugen.

ProcurementCore 1.0.65 erhält vorhandene SQL-UNIQUE-Constraints für PunchOut-
Zuordnungen, Token-Hashes und Confirmation-IDs. Damit startet auch ein frisch
mit Umbrella-Migrationen angelegter Stack ohne GORM-Constraint-Fehler.

RentalCore 5.3.120 ergänzt vollständige Materialbedarfe mit Gesamt-, manueller
und servergesteuerter Positionsmenge, Archivierung/Restore und redigierter Historie.
Exakte Zeilen-/Job-/Kontextversionen, aktuelle Admin-/Aktionsrechte und gebundene
Vorschau schützen atomare native Historie, Audit und dauerhaften Replay.
Rental `049` / Root `035` erhält IDs und ursprüngliche Mengen auch in nativen
Auswahlabläufen. Archive fehlen in aktiven Bedarfen und Packlisten; Warehouse
5.9.106 berücksichtigt zusätzliche manuelle Mengen neben Produktpositionen
und erweitert Zubehör aus der Gesamtmenge. Rental zuerst deployen, danach
Warehouse und MCP. Alte Job-Belege bleiben wiederholbar; alte unversionierte
Materialvorschauen müssen mit neuen Metadaten neu erstellt werden.

RentalCore 5.3.119 ergänzt vollständige Jobfelder, positionsbasierte Preisberechnung,
Archivierung/Restore und redigierte Job-Audits. Exakte Job-/Kontextversionen,
aktuelle Aktions-/Adminrechte, Vorschauphrase und getrennte Finanzfreigabe schützen
Änderungen; aktive Bearbeiter und Geräte-Zeitkonflikte blockieren sie.
Job, native Historie, Audit und Replay sind atomar. Rental `048` / Root `034`
versionieren alle Jobschreiber und schützen direkte sowie indirekte Inhalte
archivierter Jobs. Ausgegebene Geräte folgen weiterhin dem physischen Rückgabeprozess.
Hinweise zur clientseitigen Tool-Aktualisierung stehen in der
[Cores-MCP-README](cores-mcp/README.md#tool-katalog-in-ki-apps-aktualisieren).

Kunden und Venues unterstützen vollständige fachliche Feldpflege,
Archivierung/Restore, minimale Identitätsabfragen und redigierte Historien.
Signierte Rental-Aktionsrechte, aktuelle Adminrechte, genaue Datensatz-/Kontext-
versionen, vollständige Vorschau und gebundene Bestätigung sind erforderlich.
Rental `047` / Root `033` erhält historische Referenzen, blockiert aktive Jobs
und schützt alle Stammdatenschreiber. Datensatz, Audit und Replay sind atomar.
Eigene letzte unveränderte MCP-Kunden-/Venue-Feldänderungen lassen sich mit
exaktem Quellaudit, Datensatz-/Kontextversion und update-Scope zurücknehmen.
Der neue Audit dokumentiert den Rückweg; alte erfolgreiche Belege bleiben über
den Versionswechsel wiederholbar. Absichtlich verschiedene gleichnamige
Archivdatensätze können nach ausdrücklicher Duplikatprüfung wiederhergestellt
werden. Neuanlage aus exaktem Archivtreffer bleibt gesperrt.

Produktbeziehungen unterstützen vollständige Anlage/Teilupdates,
Archivierung/Restore, Schema und redigierte Historien. Exakte Beziehungs-/Produkt-
und Graphkontexte, aktuelle Admin/Aktionsrechte, recordgebundene Bestätigung
und atomarer Audit/Replay sind erforderlich. Aktive Jobs über die Packlisten-
Hierarchie und Pflichtzyklen blockieren Änderungen. Warehouse `059` / Root `032`
erhalten Historie und versionieren alle Beziehungs-/Produkt-Schreiber.
RentalCore 5.3.116 sowie Warehouse-Scanner/Packlisten verwenden ausschließlich
aktive Beziehungen/Produkte; Archivierung bucht keinen Bestand.

Alle drei Warehouse-Kategorieebenen unterstützen Archivierung/Restore und
redigierte Historien. Aktive Produkte/Unterkategorien blockieren Archivierung;
Restore prüft aktive Eltern und erhält alle IDs, Metadaten und historischen
Produktpfade. Genaue Record-/Abhängigkeitsversionen, Admin/archive-Scope und
recordgebundene Bestätigung sind erforderlich. Lifecycle, Audit und dauerhafter
Replay sind atomar. Root `031` / Warehouse `058` schützen auch bestehende
Schreiber und verhindern das Löschen referenzierter Historie.

Lageraufgaben unterstützen vollständige Anlage/Teilupdates, Start, Abschluss,
Storno/Wiederöffnung, Archivierung/Restore und redigierte Historien. Alle Aktionen
prüfen genaue Aufgaben- und Referenzversionen, aktuelle Adminrechte und passende
Aktionsscopes. Aufgabe, Ereignis, Referenzversionen, Audits und dauerhafter Replay
sind atomar; ein Aufgabenabschluss bucht keinen physischen Bestand. Terminale
Aktionen verlangen eine recordgebundene Phrase. Root `029` / Warehouse `056`
schützen Archive und versionieren Aufgaben, Ereignisse und Referenzen. Fehlgeschlagene
dauerhaft abgesicherte Aufgaben-/Wartungsaktionen können mit demselben Schlüssel
wiederholt werden. Erfolgreiche Aktionen werden unverändert wiedergegeben.

Geführte Inventuren unterstützen Anlage/Teilupdates, explizite Mengenpflege,
Review/Korrektur, Freigabe, Storno und Archivierung/Restore. Freigabe verlangt
den separaten `cores:warehouse:approve`-Scope, exakte Versionen/Bestandskontext,
eine recordgebundene Phrase und einen unveränderten Startbestand. Blinde
Sollmengen bleiben bis Review verborgen; fehlende Zählungen werden nur nach
expliziter Bestätigung genullt. Bestandsabgleich, Bewegungen, gepackte Case-Folgen,
Differenzjournal, Lagertermine, Audits und dauerhafter Replay sind atomar.
Warehouse `057` / Root `030` schützen alle Zeilen-/Ereignisschreiber. Vollständige
Race-/Datenbanktests und frische MCP-Ende-zu-Ende-Prüfung sind erfolgreich.
Details: `cores-mcp/docs/ISSUE_COMPLETION.md`.

Manuelle Wartungsaufträge und Defekte bieten vollständige Feldpflege, geprüfte
Statuswechsel, Abschluss/Storno/Wiederöffnung, Archivierung/Restore und redigierte
Historien. Exakte Auftrags-/Geräte-/Planversionen, Admin/Aktionsscope, Bestätigung
und Idempotenz sind erforderlich; terminale und Lifecycle-Aktionen zusätzlich
eine recordgebundene Phrase. Auftrag, Ereignis, Geräte-/Plan-/Legacy-Folgen, Audits
und Replay sind atomar. Root `028` / Warehouse `055` schützen Archive und
versionieren alle Abhängigkeiten. Wartungskosten erfordern zusätzlich den
ausdrücklichen Financial-Scope und eine separate OAuth-Freigabe; Read-only
bleibt schreibfrei. Aktuelle Adminrechte werden vor jeder MCP-Anfrage geprüft.

Wartungspläne bieten vollständige Anlage, Teilupdates, Archivierung/Restore,
Suche und redigierte Audits. Die Vorschau zeigt Plan, Gerät, Abhängigkeiten,
den nächsten Gerätetermin und gegebenenfalls einen fälligen geplanten Auftrag.
Plan, Gerätetermin, Auftrag/Ereignis, Audits und Replay werden atomar gespeichert.
Admin/create/update/archive-Scope, genaue Plan-/Geräteversionen, Bestätigung
und Idempotenz sind erforderlich; Lifecycle zusätzlich eine recordgebundene Phrase.
Migration `027` (Warehouse `054`) ergänzt das Wartungsschema und versioniert
Plan-/Auftragsschreiber. Neustarts erhalten vorhandene benutzerdefinierte Pläne.

Hersteller und Marken unterstützen Archivierung/Restore und redigierte
Audit-Historien. Aktive Produkte beziehungsweise aktive Marken sperren Archive;
IDs und historische Beziehungen bleiben erhalten. Migration `026` (Warehouse
`053`) schützt aktive Zuordnungen und archivierte Metadaten bei allen Schreibern.
Restore erfolgt vom Hersteller zur Marke zum Produkt. Die benannten MCP-Aktionen
benötigen Admin/archive-Scope, genaue Version und eine recordgebundene Phrase.

Gerätestapel lassen sich über `warehouse.devices.prepare_bulk_create` und
`bulk_create` mit 1–100 vollständigen Entwürfen atomar anlegen. Lagerkapazität
wird für die gesamte Liste geprüft; eine zusätzliche Bestätigungsphrase bindet
Anzahl und Felder. Geräte, Kennungen, Audits und dauerhafter Replay werden
zusammen gespeichert. Schema: `warehouse.device_batches`. Keine neue Konfiguration.

Cases unterstützen vollständige Anlage, Metadatenpflege, Archivierung/Restore,
Modellauflösung und redigierte Audits. Migration `025` (Warehouse `052`)
versioniert auch Case-Inhalte, Templates und Verschachtelung; Lifecycle erhält
Historie und sperrt aktive Abhängigkeiten. [MCP-Abschlusscheck](cores-mcp/docs/ISSUE_COMPLETION.md)
führt die verbleibenden Anforderungen aus #4/#5 auf.

Produktpakete lassen sich jetzt mit vollständiger Vorschau, exakter Version,
Warehouse-Admin/archive-Scope und Paket-gebundener Phrase archivieren und
wiederherstellen. Aktive Jobs und offene Reservierungen sperren; Restore prüft
Bestandteile/Produkte und veröffentlicht das Paket nicht erneut. Historie und
Inhaltszeilen bleiben erhalten. Paket-Audit-Historie ist redigiert.

Lagerplätze unterstützen geführtes Archivieren/Restore und redigierte Audits.
Bestand, aktive Nachfahren, Heimat-Cases sowie offene Aufgaben/Inventuren sperren.
Restore prüft Identität und Elternhierarchie, erhält den belegten Vorzustand oder
aktiviert ältere/bearbeitete Archive gesperrt. Metadaten und Historie bleiben.

Compose verwendet feste Release-Tags. `cores-common:v1.2.0` stellt die aktuelle
Sitzungsprüfung für Dashboard und ProcurementCore bereit: Kontosperren und
Administratoränderungen gelten auch für bestehende Tokens ab der nächsten Anfrage.
MCP prüft aktive Konten bei jedem OAuth-Zugriff und beschränkt alle Planner-Abfragen
auf die Mitgliedschaften des angemeldeten Nutzers, einschließlich Suche und Kennzahlen.
Maschinentokens erhalten keine privaten Planner-Daten. MCP verlangt am Endpunkt
nur `cores:read`, sodass bewusst read-only ausgestellte Tokens gültig bleiben;
jedes Schreibtool prüft zusätzlich `cores:write` oder seinen granularen
Service-/Aktions-Scope.
Warehouse-Produkte lassen sich über MCP mit einer Vorschau der betroffenen
Geräte und aktiven Jobverwendungen archivieren oder wiederherstellen. Die
Ausführung benötigt `cores:warehouse:archive`, die exakte Version und eine
produktgebundene Bestätigung; offene Anforderungen und gepackte Geräte
blockieren die Archivierung auch im WarehouseCore selbst.
Typisierte Beziehungen zwischen Warehouse-Produkten können nach vollständigem
Diff und Versionsprüfung ebenfalls bestätigt und auditiert angelegt oder
geändert werden.
Hersteller und Marken lassen sich per MCP einzeln anlegen sowie nach vollständigem
Diff und Versionsprüfung ändern. Herstellerwechsel einer Marke sind gesperrt,
wenn verknüpfte Produkte dadurch widersprüchlich werden. Website und
Herstellerzuordnung können ausdrücklich geleert werden; Änderung, Audit und
Idempotenzbeleg werden atomar gespeichert. Normale Oberflächenänderungen erhöhen
ebenfalls die Version. Die Markenidentität besteht aus Name und Hersteller;
Marken ohne Hersteller bleiben ebenfalls eindeutig. Der Neustart bewahrt
bestehende englische und deutsche Kategorien mit ihren IDs und Zuordnungen.
Hersteller und Marken lassen sich anschließend
über ihre IDs einem vorhandenen Warehouse-Produkt zuordnen. Der Produkt-Update-
Body übernimmt vorhandene numerische Werte als Zahlen, damit reine Feldänderungen
nicht am JSON-Decoder scheitern.
Produktpakete lassen sich über MCP mit vollständigen Produktlisten, Mengen,
Optionalität, Preis und Website-Sichtbarkeit anlegen und bearbeiten. Paket- und
Inhaltsversionen schützen parallel geänderte Daten; vorhandene Jobnutzung sperrt
Preis- und Inhaltsänderungen. Paket, Inhalte, Audit und Wiederholungsbeleg werden
atomar gespeichert.
Haupt-, Unter- und dritte Kategorien können über MCP versionsgesichert geändert
werden. Elternwechsel dürfen bestehende Produktzuordnungen nicht verletzen.
Ungenutzte Kategorien ohne Kinder lassen sich nach vollständiger Vorschau,
exakter Version, eigener Löschberechtigung und datensatzgebundener Bestätigung
entfernen; Audit bleibt erhalten, es gibt kein Cascade oder MCP-Undo.
Haupt-, Unter- und dritte Kategorien lassen sich ebenfalls einzeln nach
Elternprüfung und Duplikatvorschau anlegen; WarehouseCore speichert Audit und
Idempotenzbeleg mit dem Datensatz.
Die MCP-OAuth-Freigabe bietet jetzt ausdrücklich Nur Lesen oder Lesen und
Schreiben, auch bei anfänglicher Read-only-Anforderung durch den Client.
Bestehende Verbindungen müssen für Schreibrechte neu autorisiert werden.
Lagerplätze können mit Code, Scan-Code, Elternknoten und Kapazitätsdaten
ebenfalls nach Vorschau angelegt werden. Die Anlage ist auditiert und
idempotent. Änderungen aktiver Lagerplätze zeigen einen vollständigen Diff,
prüfen die exakte Version, Elternhierarchie, Duplikate und Belegung und werden
mit Vorher/Nachher-Audit atomar gespeichert. Kapazitäten unter Belegung und
Hierarchiekreise sind gesperrt; Frontend- und Inventuränderungen machen alte
Vorschauen ungültig.
Procurement-Kategorien können über MCP nach einer Vorschau mit Duplikatprüfung,
vollständigem Parameter-Schema und ausdrücklicher Bestätigung angelegt oder
versionsgesichert geändert werden.
Procurement-Produkte lassen sich über MCP mit vollständigem Diff und
Versionsprüfung ändern, ohne offene Bestellungen oder Bedarfe zu archivieren.
Bei einer Anlage werden Produkt und optionales Erstangebot atomar gespeichert.
Bestellentwürfe lassen sich über MCP nach vollständiger Vorschau und
Versionsprüfung einschließlich aller Positionen ändern; ProcurementCore
speichert die Änderung mit Audit und Idempotenzbeleg atomar.
Der redigierte Procurement-Auditverlauf deckt für Administratoren auch
Produkte, Produktlinks, Lieferanten, Kategorien und Angebote ab.
WarehouseCore prüft bei MCP-Produktänderungen die exakte Vorschau-Version im
Zielservice und speichert Anlage oder Änderung mit Audit und dauerhaftem
Idempotenzbeleg atomar.
Der MCP zeigt Warehouse-Administratoren den redigierten Produkt-Auditverlauf
einschließlich Archivierung und Wiederherstellung.
Bestehende Beschaffungsprodukte können über geführte MCP-Werkzeuge zusätzliche
Lieferantenangebote erhalten; Änderungen und Archivierung prüfen den Ist/Soll-Diff
und die aktuelle Datensatzversion.
Warehouse-Produkte können nach vollständigem Ist/Soll-Diff, Stammdatenprüfung
und Versionsprüfung über MCP geändert werden; die Änderung wird im WarehouseCore
auditiert und idempotent gespeichert.
Die aktuellen Webclients teilen sich außerdem eine persistente Deutsch/Englisch-
Auswahl. Cores MCP `1.5.0` bietet zusätzlich zu den geführten Anlagen acht
zweistufige P0/P1- und Procurement-Workflows: Gerätezuweisung,
Job-/Storno-Änderung, Requirement-Mengenänderung, Bestellung, Lagerbewegung,
Gerätezustand, Bedarfsentscheidung und Wareneingang. Jede
Ausführung folgt auf eine read-only Live-Vorschau, Ziel-Core-Berechtigung und
ausdrückliche Bestätigung. Bestätigte Aufrufe verlangen einen Idempotenzschlüssel;
`dry_run=true` erzwingt eine auswirkungsfreie Simulation. MCP dedupliziert
Wiederholungen, blockiert abweichende Payloads unter demselben Schlüssel und
protokolliert die Herkunft `MCP/AI`. ProcurementCore erlaubt Administratoren
seit `1.0.62` auch die Freigabe eigener Bedarfe. Für Freigaben und Wareneingänge gelten
Versionsprüfung, persistente Idempotenz und eine atomare Fachtransaktion.
Seriennummern, Überlieferungen und Putaway-Tasks werden vor der erhöhten
Bestätigung vollständig ausgewiesen; beliebige Mutationen und Hard-Deletes
bleiben ausgeschlossen.
Die Produktauswahl für Job-Bedarfe löst Hersteller dabei korrekt über die
normalisierte Warehouse-Relation auf. Neue Schema- und Resolve-Tools beschreiben
pflegbare Felder und unterscheiden exakte, ähnliche, mehrdeutige oder fehlende
Warehouse-Stammdaten. Die bestätigte Produktanlage erstellt freigegebene
Hersteller, Marken und Kategorieebenen mit Produkt, Anfangsbestand und Devices
atomar über WarehouseCore `5.9.78`.

Der Backupdienst stellt jeden Dump in einem temporären PostgreSQL-Cluster wieder
her, bevor er Erfolg meldet. Optional lädt er Dump und Prüfsumme in eine dedizierte
Nextcloud-Collection hoch. Konfiguration und Grenzen: [Backup-Dokumentation](backup/README.md).
Die [GitHub-Prüfung](.github/workflows/verify.yml) baut alle fünf Frontends, testet
alle sieben Go-Module und prüft Planner-Isolation, Backups, Designsystem und Release-Inventar.
Technische Zuständigkeiten und weitere Architekturarbeit stehen in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

RentalCore ergänzt Kundenorte aus deutschen PLZ, übernimmt OCR-Positionsrabatte
und synchronisiert auch aus OCR erzeugte Jobs unmittelbar mit der zentralen
Raum-Mailbox `events-calender@tsunami-events.de`.

RentalCore `5.3.108` und ProcurementCore `1.0.38` ergänzen optional Jev über
OpenRouter als eng begrenzte Entscheidungsschicht: OCR-Positionen werden gegen
Produkte, Pakete, Mietmaterial und Dienstleistungen entschieden; Procurement-
Artikel werden zusätzlich gegen WarehouseCore-Kandidaten neu gerankt. Exakte
IDs, gespeicherte Zuordnungen, Preise, Mengen und Berechtigungen bleiben
deterministisch. Ohne API-Key, bei Timeout oder bei geringer Konfidenz läuft der
bisherige Ablauf unverändert weiter. Alle Jev- und OpenRouter-Werte werden im
Komodo Stack Environment gepflegt und von Compose ohne Inline-Standardwerte an
RentalCore und ProcurementCore weitergereicht. Konfiguration, Datenfluss und
Grenzen sind in [docs/JEV_DECISIONS.md](docs/JEV_DECISIONS.md) beschrieben.
ProcurementCore `1.0.42` nutzt Jev außerdem beim Produktlinkimport, um bei
widersprüchlichen strukturierten Datensätzen das Hauptprodukt auszuwählen. Die
lokale Vorschau bleibt bei Unsicherheit erhalten; ein Preis für eine andere
Produktidentität wird zur Prüfung geleert. HTTP/2 verbessert den Abruf der
Huss-Produktseiten.

ProcurementCore `1.0.55` übernimmt Lieferantenangebote als prüfbare
Bedarfsentwürfe. Gescannte PDFs werden lokal mit Tesseract gelesen, JEV schlägt
Katalogzuordnungen vor, und fehlende Artikel samt Bezugsquelle können in
derselben Transaktion wie der Bedarf entstehen. Die Angebots-PDF wird nicht
gespeichert; Preise, Mengen und Zuordnungen bleiben vor der Anlage editierbar.

Die Suite-Navigation steht in allen fünf Oberflächen an derselben Sidebar-Position:
ein Dropdown wechselt zwischen den Fach-Cores, ein eigener Link führt zum Dashboard.
WarehouseCore `5.9.76` ergänzt den Geräte-Lebenszyklus: Produkte archivieren ihre
Devices atomar mit, archivierte Geräte bleiben aus allen operativen Abläufen heraus
und archivierte Produkte oder Devices können kontrolliert endgültig gelöscht werden.
Die Produktarchivierung schaltet dabei sämtliche Produkt- und Device-Kennungen
transaktional und typsicher gemeinsam um. Die Produktbeziehungs-Tabelle wird bei
frischen oder lückenhaft migrierten Installationen selbstständig nachgezogen.
ProcurementCore `1.0.35` startet zuverlässig auf den vom Umbrella angelegten
PostgreSQL-Constraints und unterstützt fortlaufende Wareneingänge samt Lieferantenreferenz
und einen vorab bereinigten, exakt geprüften Adam-Hall-Live-Warenkorb mit
Shop-Direktlink und verbindlicher Direktbestellung sowie die nachträgliche
Bestellerfassung aus PDF mit editierbarer Erkennungsvorschau
sowie PlannerCore den vollständig funktionsfähigen `/plannercore/`-Pfadmodus.
Die Docker03-Konfiguration initialisiert Mosquitto mit einem netzwerkfähigen,
authentifizierten Listener und prüft den Broker über einen MQTT-Healthcheck.

[![License](https://img.shields.io/badge/license-proprietary-red)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-compose-blue?logo=docker)](docker-compose.yml)
[![Go](https://img.shields.io/badge/Go-1.22+-00ADD8?logo=go)](https://go.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169E1?logo=postgresql)](https://www.postgresql.org/)

---

## 📋 Inhaltsverzeichnis

- [Projektübersicht](#projektübersicht)
- [Services im Detail](#services-im-detail)
  - [cores-dashboard](#cores-dashboard)
  - [rentalcore](#rentalcore)
  - [warehousecore](#warehousecore)
  - [plannercore](#plannercore)
  - [procurementcore](#procurementcore)
- [Architektur](#architektur)
- [Globales Routing](#globales-routing)
- [Repository-Struktur](#repository-struktur)
- [Installation & Deployment](#installation--deployment)
- [Entwicklung](#entwicklung)
- [Branding-System](#branding-system)
- [Security](#security)
- [Technologie-Stack](#technologie-stack)
- [Betrieb & Wartung](#betrieb--wartung)

---

## Projektübersicht

**Cores** ist das zentrale Management-Ökosystem von **Tsunami Events**. Fünf Core-Services decken Planung, Vermietung, Lager, Einkauf und zentrale Administration ab.

Das System wurde als **Monorepo** konzipiert, um eine einheitliche Codebasis mit geteilten Ressourcen, zentralem Branding und konsistenter Authentifizierung über alle Dienste hinweg zu ermöglichen.

## Globales Routing

`CORES_ROUTING_MODE` entscheidet einmal für das gesamte Deployment zwischen
`paths` und `subdomains`; ein Mischbetrieb ist ausgeschlossen. Der vollständige
Stack verwendet standardmäßig `paths` und stellt die Apps unter
`/rentalcore/`, `/warehousecore/`, `/plannercore/` und `/procurementcore/` auf
der Dashboard-Domain bereit. Mit `subdomains` verlinkt das Dashboard stattdessen
die vier `*_PUBLIC_URL`-Werte. Details und Reverse-Proxy-Beispiele stehen in
[`docs/ROUTING.md`](docs/ROUTING.md).

### 🎯 Kernziele

- **Zentrales SSO** — Ein Login gilt für Dashboard, RentalCore, WarehouseCore, PlannerCore und ProcurementCore
- **Ein Loginfenster** — Jeder Core leitet unauthentifizierte Nutzer zu `cores.tsunami-events.de/login`; lokale und Microsoft-Anmeldung führen anschließend zur ursprünglich geöffneten Core-Ansicht zurück
- **Flexible Benutzerquellen** — Lokale, Microsoft-Entra- oder hybride Benutzerverwaltung mit gruppenbasierter Synchronisation
- **Einheitliches Branding** — Zentral verwaltetes Theme- und Logo-System
- **Shared Infrastructure** — Gemeinsame PostgreSQL-Datenbank, zentrales Reverse-Proxying
- **Installierbare Mobile-Apps** — Alle fünf Oberflächen laufen als touchoptimierte PWAs mit Standalone-Modus, Safe Areas und App-Navigation; im globalen Pfadmodus bleiben alle Cores unter `/rentalcore/`, `/warehousecore/`, `/plannercore/` und `/procurementcore/` innerhalb der installierten Cores-PWA ohne externe iOS-Browserleiste
- **Docker-basiertes Deployment** — Vollständig containerisiert mit docker-compose
- **Git Submodules** — Jeder Service ist ein eigenständiges Repository, eingebunden als Submodule

---

## Services im Detail

---

### cores-dashboard

> **Zentraler Einstiegspunkt & Authentifizierungs-Hub**

| Eigenschaft | Detail |
|-------------|--------|
| **Zweck** | Organisationsweites Operations-Cockpit, zentrale SSO-Authentifizierung, API-Reverse-Proxy, Branding-Management und Administration |
| **Tech-Stack** | Go (Backend) + React/TypeScript (Frontend) |
| **Docker Image** | `cores-dashboard` |
| **Interner Port** | `8080` |
| **URL** | [cores.tsunami-events.de](https://cores.tsunami-events.de) |

#### 🔑 Haupt-Features

1. **Zentrale JWT-Authentifizierung (SSO)** — Single-Sign-On für alle Cores-Services mit Token-basierter Authentifizierung
2. **Live-Operations-Cockpit** — Priorisiertes Lagebild mit Umsatz, aktiven Jobs, Lagerbereitschaft, Rückläufen, persönlichen Planner-Aufgaben, Beschaffungsfreigaben und direkten Arbeitswegen
3. **Plattformgesundheit** — Parallele Healthchecks aller fünf Cores-Dienste, Cores-MCP, MQTT-Broker und PostgreSQL mit verfügbaren Versionen, Antwortzeiten und teilfehlertoleranter Darstellung
4. **API Reverse-Proxy** — Intelligentes Routing an RentalCore, WarehouseCore und PlannerCore
5. **Admin Branding-Management** — Zentrale Verwaltung von Logos, Farben, Themes und Branding-Einstellungen für alle Services
6. **Konfigurations-Endpunkt** — Bereitstellung globaler Konfigurationen für alle verbundenen Services
7. **SPA-Proxys für RentalCore und Plannercore** — Auslieferung beider Single-Page-Applications unter `/rental/` und `/planner/` über das Dashboard
8. **Benutzerverwaltung** — Zentrale lokale/Microsoft-/Hybrid-Benutzerverwaltung; Microsoft-Stammdaten read-only, Cores-Rollen weiterhin lokal pflegbar
9. **Microsoft 365 & Entra** — Eine zentral konfigurierte Tenant-App für Microsoft-Login, Gruppen-Sync sowie RentalCore-Kontakte und -Kalender
10. **Installierbare Mobile-App** — Responsive Admin-PWA mit eigenem Icon, Safe Areas, Touch-Zielen, Drawer und fester App-Tabbar
11. **Flexibler Datentransfer** — Feldselektiver CSV-/XLSX-Export und validierter Import mit headerbasierter Zuordnung, Vorschau und Konfliktregeln pro Spalte

#### 📡 Wichtigste API-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| `POST` | `/api/v1/auth/login` | SSO-Login mit JWT-Cookie |
| `POST` | `/api/v1/auth/logout` | Sitzung beenden |
| `GET` | `/api/v1/auth/me` | Angemeldeten Benutzer abrufen |
| `GET` | `/api/v1/config` | Globale Konfiguration und Cross-Links abrufen |
| `GET` | `/api/v1/branding` | Öffentliche Branding-Einstellungen |
| `GET` | `/api/v1/analytics/summary` | Cores-Lagebild, Prioritäten und Servicezustand |
| `GET` | `/api/v1/admin/health` | Service-Versionen und Antwortzeiten (Admin) |
| `*` | `/api/v1/proxy/rental/*` | Proxy zu RentalCore |
| `*` | `/api/v1/proxy/warehouse/*` | Proxy zu WarehouseCore |
| `*` | `/api/v1/proxy/planner/*` | Proxy zu PlannerCore |

---

### rentalcore

> **Vermietung, Event-Management & Kundenverwaltung**

| Eigenschaft | Detail |
|-------------|--------|
| **Zweck** | Vollständiges Vermietungs- und Event-Management inkl. Geräteverwaltung, Kundenmanagement, Rechnungsstellung |
| **Tech-Stack** | Go (Backend) + React/TypeScript (Frontend) |
| **Docker Image** | `rentalcore` |
| **Interner Port** | `8081` |
| **URL** | [cores.tsunami-events.de/rentalcore](https://cores.tsunami-events.de/rentalcore/) |

#### 🔑 Haupt-Features

1. **Job-/Event-Management** — Verbindlicher Lebenszyklus `Planung → Bestätigt → Abgeschlossen` mit `Storniert` als Abbruch; Packfortschritt, Datumsaktivität, Geräterücklauf und Abrechnung bleiben getrennte Dimensionen
2. **Device-/Equipment-Verwaltung** — Katalogisierung und Verwaltung aller Mietgeräte mit Barcode-/QR-Code-Identifikation
3. **Kundenmanagement** — Vollständige CRM-Funktionalität mit Microsoft 365-Synchronisation für Kontaktdaten
4. **PDF-Belegextraktion (OCR)** — Automatische Erkennung editierbarer Jobtitel, mehrzeiliger Positionsbeschreibungen, Mengen und Preise aus Angeboten, Auftragsbestätigungen und Rechnungen
5. **Deutsche DIN-5008-Rechnungserstellung** — Erstellung normgerechter Rechnungen nach DIN 5008 direkt aus dem System
6. **RBAC + WebAuthn/2FA** — Rollenbasierte Zugriffskontrolle mit hardwaregestützter Zwei-Faktor-Authentifizierung
7. **Nextcloud WebDAV File-Pool** — Integration mit Nextcloud für zentrale Dateiablage und Dokumentenmanagement
8. **Dashboard mit Widgets** — Konfigurierbare Dashboard-Ansicht mit Status-Übersichten, Statistiken und KPIs
9. **Installierbare Mobile-App** — RentalCore bietet im Standalone-Modus Safe Areas, große Touch-Ziele, Drawer und eine feste App-Tabbar

Der Job-Arbeitsbereich zeigt Suche, Status, Zeitraum, Materialdeckung und
Auftragswert zusammen. Produktpositionen und manuell geplanter Zusatzbedarf
werden getrennt gespeichert und für WarehouseCore addiert. Statuswechsel
werden geprüft; die Bestätigung verlangt einen Zeitraum. Änderungen der
Stammdaten verwenden eine Revision gegen gleichzeitiges Überschreiben.
PDF-Importe aktualisieren nur ihre eigenen Positionen. Jobs werden archiviert,
wobei Verlauf und Gerätebeziehungen erhalten bleiben; ausgegebene Geräte müssen
zuvor zurückgenommen werden. Der Jobkalender entfernt archivierte Termine und
bereinigt ältere Resttermine beim Start. Die Jobdetails ordnen die rechte Spalte
bei wenig Platz unter dem Hauptbereich an. Dokumente nutzen den File Pool und bei lokaler
Ablage das persistente Volume `rentalcore-uploads`.

Die RentalCore-Umsatzanalyse zählt standardmäßig nur abgeschlossene Jobs.
Geplante und bestätigte Jobs stehen getrennt in der Pipeline; stornierte Jobs
erscheinen in keiner Umsatzansicht. Der Drilldown führt von Dienstleistungen,
Produkten und Geräten zu den konkreten Jobs und Positionen. Im Jobdetail
erklärt ein direkter Link den Weg von kaufmännischen Produktpositionen zum
Materialbedarf und zur Gerätezuordnung.

#### 📡 Wichtigste API-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| `GET/POST` | `/api/jobs` | Jobs auflisten / erstellen |
| `GET/PUT/DELETE` | `/api/jobs/:id` | Job abrufen / aktualisieren / archivieren |
| `GET/POST` | `/api/devices` | Geräte auflisten / erstellen |
| `GET/PUT/DELETE` | `/api/devices/:id` | Gerät abrufen / aktualisieren / löschen |
| `GET/POST` | `/api/customers` | Kunden auflisten / erstellen |
| `POST` | `/api/invoices` | Rechnung erstellen (DIN 5008 PDF) |
| `POST` | `/api/invoices/extract` | PDF-Rechnungsextraktion via OCR |
| `GET` | `/api/dashboard` | Dashboard-Widgets & KPIs |

---

### warehousecore

> **Lagerverwaltung, Kommissionierung & Geräte-Tracking**

| Eigenschaft | Detail |
|-------------|--------|
| **Zweck** | Professionelles Warehouse-Management mit Barcode-Scanning, Zonenlogik und IoT-gestützter Kommissionierung |
| **Tech-Stack** | Go (Backend) + React/TypeScript (Frontend) |
| **Docker Image** | `warehousecore` |
| **Interner Port** | `8082` |
| **URL** | [cores.tsunami-events.de/warehousecore](https://cores.tsunami-events.de/warehousecore/) |

#### 🔑 Haupt-Features

1. **Geräteverwaltung mit QR/Barcode** — Vollständige Inventarisierung mit getrenntem, workflowgeführtem Lagerstatus und unabhängigem Betriebszustand samt automatischer Statushistorie
2. **Live-Lagercockpit** — Priorisierte Aufgaben, Einsatzbereitschaft, Materialfluss, Tagesbewegungen, aktive Jobs, Case-Prozesse und technische Risiken mit automatischer Aktualisierung
3. **Professionelle Lagersteuerung** — Hierarchische Standorte bis zum Fach mit Prozessrollen, Sperrzuständen, Kapazitäten, Pick-Reihenfolge, Arbeitsvorrat und scannerbasierter Blind-/Zählinventur
4. **Geführte Job- und Lager-Scans** — Nur bestätigte Jobs können ausgegeben werden; Ausgaben führen von Job zu Artikel, Einlagerungen von Artikel zu Lagerplatz, Mengenartikel besitzen ein eigenes Mengenfeld und Rückgaben werden physisch bestätigt
5. **LED-Bin-Highlighting via MQTT** — IoT-gestützte optische Kommissionierhilfe: Lagerfächer leuchten per MQTT-Signal auf
6. **Dynamische Handling Units** — Euroboxen, Flightcases und Kits frei oder nach Soll-Inhalt packen; Geräte, Mengenartikel und Untercases scannen, versiegeln, gesammelt ausgeben und zurücklagern
7. **Defekt- und Wartungsmanagement** — Erfassung von Defekten, Reparaturhistorie und Wartungszyklen
8. **Label Studio & Direktdruck** — Visueller Designer und Seriendruck für Geräte-, Kabel-, Case- und Zonenlabels; individuelle Stückzahlen, konfigurierbare A4-Etikettenbögen und Zebra-ZPL-Direktdruck über TCP
9. **Produktstammdaten 2.0** — Getrennte Produktklasse, Zubehörrolle und Bestandsführung; transaktionale Anlage mit initialen Devices, global unveränderliche Produkt-/Device-/Case-Barcodes, Scan-Aliase, typisierte Zubehörbeziehungen, Case-Modelle und automatisch kategorisierte Kabelprodukte
10. **Procurement-Verknüpfung** — Bestehende Produkte automatisch vorgeschlagen oder manuell eindeutig abgleichen, Procurement-Artikel vollständig vorausgefüllt im Warehouse anlegen und Lagerbedarf direkt als Einkaufsentwurf melden
11. **Installierbare Mobile-App** — WarehouseCore bietet im Standalone-Modus Safe Areas, große Touch-Ziele, Drawer und eine feste App-Tabbar
12. **Schema-getriebener Datentransfer** — Beschreibt exportierbare Felder und verarbeitet CSV-/XLSX-Importe bis 5.000 Zeilen atomar mit Vorschau und Zusammenführungsregeln

#### 📡 Wichtigste API-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| `GET/POST` | `/api/devices` | Geräte auflisten / erstellen |
| `GET/PUT` | `/api/devices/:id` | Gerät abrufen / aktualisieren |
| `GET` | `/api/devices/:id/status-history` | Lagerstatus-, Zustands- und Ortsänderungen nachvollziehen |
| `GET/POST` | `/api/zones` | Zonen auflisten / erstellen |
| `GET/POST` | `/api/warehouse/locations` | Lagerstruktur steuern |
| `GET/POST` | `/api/warehouse/counts` | Zählinventuren verwalten |
| `GET/POST` | `/api/handling-units` | Dynamische und feste Cases verwalten |
| `GET/POST` | `/api/picklists` | Picklisten auflisten / generieren |
| `POST` | `/api/picklists/:id/scan` | Barcode-Scan auf Pickliste bestätigen |
| `POST` | `/api/mqtt/highlight` | MQTT-LED-Highlighting auslösen |
| `GET/POST` | `/api/defects` | Defekte auflisten / melden |
| `POST` | `/api/labels` | Label generieren & drucken |

---

### plannercore

> **Aufgabenplanung, Kanban-Boards & Team-Kollaboration**

| Eigenschaft | Detail |
|-------------|--------|
| **Zweck** | Projektplanung und Aufgabenverwaltung mit Kanban-Boards, Team-Zuweisungen und Benachrichtigungen |
| **Tech-Stack** | Node.js (Backend) + React (Frontend) |
| **Docker Image** | `plannercore` |
| **Interner Port** | `8083:8080` |
| **URL** | [cores.tsunami-events.de/plannercore](https://cores.tsunami-events.de/plannercore/) |

#### 🔑 Haupt-Features

1. **Plan-Management (Kanban-Boards)** — Flexible Kanban-Boards für Projektplanung mit visueller Aufgabenverfolgung
2. **Task-Management mit Zuweisung** — Aufgaben mit Verantwortlichkeiten, Prioritäten und Status-Tracking
3. **Bucket/Kanban-Spalten** — Frei definierbare Kanban-Spalten (Buckets), die per Drag-and-drop nach links und rechts verschoben und dauerhaft synchronisiert werden
4. **Checklisten** — Aufgaben mit detaillierten Checklisten für schrittweise Abarbeitung
5. **Kommentare** — Aufgabenbezogene Diskussionen und Notizen mit Timeline-Ansicht
6. **Datei-Anhänge** — Dokumenten-Upload und Verlinkung direkt an Aufgaben
7. **Benachrichtigungen** — In-App- und E-Mail-Benachrichtigungen bei Änderungen und Fälligkeiten
8. **Fälligkeits-Scheduler** — Automatische Deadline-Überwachung mit Eskalationslogik
9. **Installierbare Mobile-App** — PlannerCore bietet Safe Areas, Touch-Drag-and-drop, eine mobile App-Tabbar und funktioniert eigenständig sowie unter `/planner/`

#### 📡 Wichtigste API-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| `GET/POST` | `/api/plans` | Pläne auflisten / erstellen |
| `GET/PUT/DELETE` | `/api/plans/:id` | Plan abrufen / aktualisieren / löschen |
| `GET/POST` | `/api/plans/:id/tasks` | Tasks eines Plans auflisten / erstellen |
| `GET/PUT` | `/api/tasks/:id` | Task abrufen / aktualisieren |
| `POST` | `/api/tasks/:id/comments` | Kommentar zu Task hinzufügen |
| `POST` | `/api/tasks/:id/attachments` | Dateianhang zu Task hochladen |
| `GET` | `/api/notifications` | Benachrichtigungen abrufen |
| `GET` | `/api/admin/users` | Admin: Benutzerverwaltung |

---

### procurementcore

> **Einkaufsplanung, Lieferantensteuerung & Beschaffung**

| Eigenschaft | Detail |
|-------------|--------|
| **Zweck** | Bedarf, Sourcing, Preisüberwachung, Bestellungen und Wareneingänge |
| **Tech-Stack** | Go + React/TypeScript |
| **Docker Image** | `nobentie/procurementcore` |
| **Interner Port** | `8084` |
| **Öffentliche URL** | `https://cores.tsunami-events.de/procurementcore/` |
| **Docker03 Host-Port** | `8084` |

Amazon Business PunchOut nutzt eine einmalige cXML-Sitzung, erstellt aus dem
Warenkorb einen Bedarfsentwurf und versendet freigegebene Bestellungen erst
nach ausdrücklicher Bestätigung. Die Konfiguration steht in `.env.example`
und im [ProcurementCore-README](procurementcore/README.md).
Eine erfolgreiche cXML-Antwort bestätigt die Übertragung. Die optionale
Amazon-Business-Order-Confirmation und Ship-Notification senden spätere
Bestellnummern, Mengen, Liefertermine und Stornos an ProcurementCore. Die
Rückmelde-URLs und ihre Einrichtung stehen im ProcurementCore-README.
Spätere Stornos ohne cXML-Rückmeldung erfordern eine gesonderte Amazon-API-
Anbindung oder manuelle Prüfung.

#### 🔑 Haupt-Features

1. Parametrisierbarer Beschaffungskatalog mit visuellem Schema-Editor und technischen Filtern
2. Sicherer Artikelimport aus Produktlinks mit JSON-LD, schema.org-Microdata und OpenGraph sowie eigenen Adaptern für Adam Hall, LTT, Huss, Thomann, Steinigke, Eurobox- und Casebau-Shops; Vorschau, Originalattribute, Kategorieparameter und optionale Adam-Hall-Kundenpreise bleiben prüfbar
3. Preferred Supplier, Bewertungen, Risiken, Konditionen und Lieferzeiten
4. Bezugsquellen mit Preisverlauf, Mindestmengen und direkten Einkaufslinks
5. Tiefpreis-Alarme gegen persönliche Zielpreise
6. Bedarfsmeldungen mit Einreichungs- und Freigabeprozess
7. Angebots-/Lieferantenvergleich und Übernahme des besten gepflegten Preises
8. Bestehende Einkaufsartikel mit Warehouse-Produkten über EAN, Artikelnummer, Modell, Hersteller und Name abgleichen oder in den vollständigen Warehouse-Produktdialog übernehmen
9. Bestellungen, Teilwareneingänge und vollständige Empfangsverfolgung; verknüpfte Warehouse-Produkte erhalten atomar Mengenbestand oder neue Devices, fehlende Produkte können direkt übernommen werden
10. Spend-, Einsparungs- und Aktivitätsübersicht sowie CSV-Export
11. Cores-SSO, zentrales Branding, responsive Oberfläche und Health-Monitoring

#### 📡 Wichtigste API-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| `GET/POST` | `/api/v1/products` | Katalog suchen / Artikel anlegen |
| `GET` | `/api/v1/product-links` | Procurement- und Warehouse-Produkte abgleichen |
| `GET/POST` | `/api/v1/suppliers` | Lieferanten auflisten / anlegen |
| `GET/POST` | `/api/v1/alerts` | Tiefpreis-Alarme verwalten |
| `GET/POST` | `/api/v1/requisitions` | Bedarfsmeldungen verwalten |
| `POST` | `/api/v1/requisitions/:id/decision` | Bedarf freigeben / ablehnen |
| `GET/POST` | `/api/v1/orders` | Bestellungen verwalten |
| `POST` | `/api/v1/orders/:id/receipt` | Wareneingang verbuchen |

---

### cores-mcp

> **KI- und Agent-Anbindung mit sicheren Abfragen und geführten Schreibfunktionen**

| Eigenschaft | Detail |
|-------------|--------|
| **Zweck** | Aktuellen Cores-Kontext per Model Context Protocol für ChatGPT, Claude und Agents bereitstellen |
| **Tech-Stack** | Go + offizielles MCP SDK + Streamable HTTP |
| **Docker Image** | `nobentie/cores-mcp` |
| **Interner Port** | `8090` |
| **Öffentlicher Endpunkt** | `https://cores.tsunami-events.de/mcp` |

Der Dienst umfasst 109 fest definierte Abfragetools für Jobs, Bestand, Geräte, Planung, Beschaffung, Datenqualität und Cross-Core-Entscheidungen sowie fünf geführte Analyse-Prompts und Knowledge-Ressourcen. Optional kommen 162 read-only Vorbereitungstools und 162 bestätigte Schreibtools hinzu. Sie decken eng begrenzte Anlagen sowie Gerätezuweisung, Job-/Requirement-Änderung, Bestellung, Lagerbewegung und Gerätezustand über die validierte API des zuständigen Core ab. OAuth trennt `cores:read` und `cores:write`; Maschinentokens bleiben read-only. Benannte Freigabe-, Wareneingangs- und Archivierungsworkflows verlangen zusätzliche Scopes und Bestätigungen. Beliebiges SQL, generische Mutation und Hard-Deletes bleiben ausgeschlossen. Vollständige Dokumentation: [`cores-mcp/README.md`](cores-mcp/README.md).

Bleiben `MCP_DB_USER` und `MCP_DB_PASSWORD` leer, übernimmt Compose automatisch `POSTGRES_USER` und `POSTGRES_PASSWORD`. Ein abweichender PostgreSQL-Login funktioniert damit ohne zusätzliche MCP-Konfiguration. Produktionssysteme können weiterhin beide MCP-Werte auf einen dedizierten Read-only-Login setzen.

---

## Architektur

### 🏛️ System-Architektur

```
                          ┌──────────────────────────────┐
                          │     NPM Reverse Proxy        │
                          │   (nginxproxymanager)        │
                          │         auf docker03         │
                          └──────┬──────────┬────────────┘
                                 │          │
                 ┌───────────────┤          ├──────────────┐
                 │               │          │              │
          ┌──────▼──────┐ ┌─────▼─────┐ ┌──▼────────┐ ┌──▼──────────┐
          │ cores.      │ │ rent.     │ │ warehouse.│ │ planner.    │
          │ tsunami-    │ │ tsunami-  │ │ tsunami-  │ │ tsunami-    │
          │ events.de   │ │ events.de │ │ events.de │ │ events.de   │
          └──────┬──────┘ └─────┬─────┘ └──┬────────┘ └──┬──────────┘
                 │              │           │             │
          ┌──────▼──────────────▼───────────▼─────────────▼──────┐
          │                  cores-dashboard                     │
          │              (API Gateway + SSO)                     │
          │                    Port 8080                         │
          └──┬──────────┬────────────┬─────────────┬────────────┘
             │          │            │             │
      ┌──────▼──┐ ┌────▼────┐ ┌─────▼──────┐ ┌───▼──────────┐
      │ Proxy   │ │ Proxy   │ │ Proxy      │ │ SPA Proxy    │
      │ rental  │ │ whouse  │ │ planner    │ │ (plannercore │
      │ :8081   │ │ :8082   │ │ :8083      │ │  Frontend)   │
      └─────────┘ └─────────┘ └────────────┘ └──────────────┘
                           │
                    ┌──────▼──────┐
                    │  PostgreSQL │
                    │   (Shared)  │
                    └─────────────┘
```

### 🔄 Datenfluss & Service-Interaktion

1. **Client → NPM Reverse Proxy**: Alle eingehenden Anfragen werden über den Nginx Proxy Manager auf `docker03` geroutet
2. **NPM → cores-dashboard**: Als zentraler Entrypoint empfängt das Dashboard alle API- und Frontend-Anfragen
3. **dashboard → Backend-Services**: Das Dashboard fungiert als API-Gateway und proxyed Anfragen an die jeweiligen Services
4. **SSO-Authentifizierung**: cores-dashboard stellt JWT-Tokens aus und validiert diese für alle Backend-Services
5. **Shared Branding**: Alle Services beziehen Logos, Themes und Branding-Konfiguration vom zentralen Branding-Endpunkt
6. **Shared PostgreSQL**: Gemeinsame Datenbank-Instanz für konsistente Datenhaltung
7. **MCP-Anbindung**: Dashboard reicht `/mcp`, OAuth und Discovery an Cores MCP weiter; Abfragen lesen direkt, bestätigte additive Anlagen für Procurement-, Rental-, Planner- und WarehouseCore laufen über fest verdrahtete Core-APIs

### 🔗 Service-Abhängigkeiten

```
cores-dashboard ──► PostgreSQL (Auth + Config)
                  ├─► rentalcore (Proxy)
                  ├─► warehousecore (Proxy)
                  ├─► plannercore (Proxy + SPA)
                  └─► cores-mcp (MCP + OAuth Proxy)

cores-mcp ─────────► PostgreSQL (Read-only)
                  ├─► Cores Health-Endpunkte
                  ├─► Core-APIs (nur geführte, bestätigte Fachoperationen)
                  └─► freigegebene Knowledge-Dokumente

rentalcore ───────► PostgreSQL (Data)
                  ├─► M365 API (Kunden-Sync)
                  ├─► Nextcloud WebDAV (Files)
                  └─► cores-dashboard (SSO Validate)

warehousecore ────► PostgreSQL (Data)
                  ├─► MQTT Broker (Mosquitto)
                  └─► cores-dashboard (SSO Validate)

plannercore ──────► PostgreSQL (Data)
                  ├─► SMTP (E-Mail)
                  └─► cores-dashboard (SSO Validate)
```

---

## Repository-Struktur

```
cores/                              # Monorepo Root
├── docker-compose.yml              # Gesamt-Deployment-Konfiguration
├── .env.example                    # Beispiel-Umgebungsvariablen
├── cores-dashboard/                # Submodule: Dashboard + Auth
├── cores-common/                   # Submodule: gemeinsame Go-Pakete
├── cores-mcp/                      # Submodule: MCP-KI-Anbindung und geführte Schreibzugriffe
├── rentalcore/                     # Submodule: Vermietung
├── warehousecore/                  # Submodule: Lager
├── plannercore/                    # Submodule: Planung
├── procurementcore/                # Submodule: Einkauf
├── shared/                         # Geteilte Ressourcen
│   ├── logos/                      # Zentrales Logo- & Branding-Material
│   ├── migrations/                 # Datenbank-Migrationen (alle Services)
│   ├── theme/                      # Gemeinsame Theme-Dateien (CSS, Templates)
│   └── scripts/                    # Gemeinsame Utility-Scripts
└── README.md                       # Diese Datei
```

### GitHub-Repositories

GitHub unter `github.com/nbt4` ist die einzige Source-of-Truth für den Quellcode.
Zugangsdaten gehören ausschließlich in die lokale Laufzeitumgebung oder einen Secret Manager.

| Komponente | Repository |
|------------|------------|
| Monorepo | [nbt4/cores](https://github.com/nbt4/cores) |
| Dashboard | [nbt4/cores-dashboard](https://github.com/nbt4/cores-dashboard) |
| Gemeinsame Go-Pakete | [nbt4/cores-common](https://github.com/nbt4/cores-common) |
| Cores MCP | [nbt4/cores-mcp](https://github.com/nbt4/cores-mcp) |
| RentalCore | [nbt4/rentalcore](https://github.com/nbt4/rentalcore) |
| WarehouseCore | [nbt4/warehousecore](https://github.com/nbt4/warehousecore) |
| PlannerCore | [nbt4/plannercore](https://github.com/nbt4/plannercore) |
| ProcurementCore | [nbt4/procurementcore](https://github.com/nbt4/procurementcore) |

---

## Installation & Deployment

### 📦 Voraussetzungen

| Komponente | Version | Zweck |
|------------|---------|-------|
| **Docker** | ≥ 24.0 | Container-Runtime |
| **Docker Compose** | ≥ 2.20 | Multi-Container-Orchestrierung |
| **PostgreSQL** | ≥ 16 | Gemeinsame Datenbank |
| **Nginx Proxy Manager (NPM)** | latest | Reverse Proxy & SSL-Terminierung |
| **Mosquitto (MQTT)** | ≥ 2.0 | IoT-Kommunikation für Warehouse-Highlighting |

### 🚀 Schritt-für-Schritt-Installation

#### 1. Repository klonen (mit allen Submodules)

```bash
git clone --recurse-submodules git@github.com:nbt4/cores.git
cd cores
```

Falls das Repository bereits ohne Submodules geklont wurde:

```bash
git submodule update --init --recursive
```

#### 2. Umgebungsvariablen konfigurieren

```bash
cp .env.example .env
# Bearbeiten Sie .env mit Ihren spezifischen Werten:
nano .env
```

**Wichtige Umgebungsvariablen:**

```env
# PostgreSQL (the Compose file starts PostgreSQL automatically)
POSTGRES_DB=rentalcore
POSTGRES_USER=rentalcore
POSTGRES_PASSWORD=your-secure-password

# JWT Secret (für SSO; mindestens 32 Zeichen)
CORES_JWT_SECRET=your-jwt-secret-key-min-32-chars

# Optional Nextcloud File-Pool
NEXTCLOUD_WEBDAV_URL=https://cloud.example.com/remote.php/dav/files/user
NEXTCLOUD_WEBDAV_USER=rentalcore-user
NEXTCLOUD_WEBDAV_PASSWORD=your-nextcloud-app-password
NEXTCLOUD_WEBDAV_BASE_PATH=rentalcore-filepool

# MQTT (Warehouse LED-Highlighting)
LED_MQTT_USER=leduser
LED_MQTT_PASS=your-mqtt-password

# M365 / Microsoft Entra (optional; zentrale App im Dashboard)
M365_TENANT_ID=your-tenant-id
M365_CLIENT_ID=your-client-id
M365_CLIENT_SECRET=your-client-secret
# Exchange Online room mailbox; requires Calendars.ReadWrite (Application)
M365_CALENDAR_MAILBOX=events@yourdomain.com
APP_BASE_URL=https://cores.example.com
```

`M365_CALENDAR_MAILBOX` wird als zentrale Exchange-Raumressource betrieben. RentalCore legt jeden Job dort genau einmal an, führt Bearbeiter als Teilnehmer desselben Meetings und bestätigt deren Teilnehmerinstanz ohne Antwortmail. Die Ressource kann in Exchange Online PowerShell mit `Set-Mailbox events@yourdomain.com -Type Room` und `Set-CalendarProcessing events@yourdomain.com -AutomateProcessing AutoAccept -AllowConflicts $true -AllBookInPolicy $true -DeleteSubject $false -DeleteComments $false -AddOrganizerToSubject $false` vorbereitet werden.

#### 3. Docker-Container starten

```bash
# Alle Services starten
docker compose up -d

# Logs überwachen
docker compose logs -f

# Einzelnen Service neustarten
docker compose restart rentalcore
```

**Verfügbare Docker-Services:**

| Service | Container-Name | Port | Health Check |
|---------|---------------|------|-------------|
| `cores-dashboard` | cores-dashboard | 8080 | `/health` |
| `rentalcore` | rentalcore | 8081 | `/health` |
| `warehousecore` | warehousecore | 8082 | `/api/v1/health` |
| `plannercore` | plannercore | 8083 | `/health` |
| `procurementcore` | procurementcore | 8084 | `/health` |
| `postgres` | cores-postgres | 5432 | `pg_isready` |
| `mosquitto` | cores-mosquitto | 1883 | MQTT Connect |

#### 4. NPM Reverse Proxy einrichten

Im standardmäßigen Pfadmodus genügt ein **Proxy Host**:

| Domain | Forward Host | Forward Port | SSL |
|--------|-------------|-------------|-----|
| `cores.tsunami-events.de` | `cores-dashboard` | `8080` | ✅ Force SSL |

Das Dashboard routet die vier Core-Pfade intern. Im Subdomainmodus wird dagegen
jede öffentliche Core-Domain direkt an ihren Service-Port weitergeleitet. Die
vollständige Zuordnung steht in [`docs/ROUTING.md`](docs/ROUTING.md).

#### 5. Deployment via Komodo (docker03)

Das Produktions-Deployment wird in **Komodo** als ein Git-basierter Stack namens
`cores` verwaltet. Die kanonische Compose-Quelle ist
[`deploy/docker03/compose.yaml`](deploy/docker03/compose.yaml), alle Werte liegen
in genau einem Komodo **Stack Environment** entsprechend [`.env.example`](.env.example).
Compose-Änderungen werden in Git vorgenommen; ENV-Werte werden in Komodo gepflegt.
Service-spezifische ENV-Dateien sind nicht vorgesehen. Die vollständige
Konfiguration steht in [`deploy/docker03/README.md`](deploy/docker03/README.md).

```bash
# Vor dem Release im Repository:
./scripts/check-env-contract.sh
./scripts/check-release.sh

# Danach in Komodo: Stack "cores" -> Pull and Deploy
```

#### 6. Clean-Install-Smoke-Test

Auf einem neuen Host werden PostgreSQL, Mosquitto, das Branding-Volume und die
Service-Volumes automatisch angelegt. Nach dem Start sollten alle Container
healthy sein:

```bash
docker compose up -d
docker compose ps
curl -fsS http://localhost:8080/health
curl -fsS http://localhost:8081/health
curl -fsS http://localhost:8082/api/v1/health
curl -fsS http://localhost:8083/health
curl -fsS http://localhost:8084/health
```

Die erste Anmeldung erfolgt über `http://localhost:8080/login` mit `admin/admin`;
das Dashboard erzwingt danach die Änderung des Passworts. Für einen wirklich
frischen Test dürfen keine bestehenden Container oder Volumes mit denselben
Compose-Namen vorhanden sein.

---

## Entwicklung

### 🔧 Mit Submodules arbeiten

Jeder Service ist ein eigenständiges Git-Repository und wird als Submodule eingebunden.

```bash
# Alle Submodules auf den neuesten Stand bringen
git submodule update --remote --recursive

# In einem Submodule arbeiten
cd rentalcore
git checkout main
# ... Änderungen vornehmen ...
git add .
git commit -m "feat: neue Funktion X"
git push origin main

# Zurück im Monorepo: Submodule-Update committen
cd ..
git add rentalcore
git commit -m "chore: rentalcore auf neuesten Stand aktualisiert"
git push
```

### 🖥️ Lokale Entwicklungsumgebung

Für die lokale Entwicklung einzelner Services:

```bash
# Nur die benötigten Services starten
docker compose up -d postgres mosquitto

# Service-spezifisch entwickeln (Beispiel: rentalcore)
cd rentalcore
# Backend (Go)
cd backend
go run ./cmd/server

# Frontend (React/TypeScript)
cd ../frontend
npm install
npm run dev
```

### 📁 Shared Resources

Das `shared/`-Verzeichnis enthält monorepo-weite Ressourcen:

- **logos/** — Logo-Varianten (SVG, PNG) für alle Services und das zentrale Branding
- **migrations/** — Datenbank-Migrationsdateien, die von allen Services verwendet werden
- **theme/** — Gemeinsame CSS-Variablen, Farbpaletten und UI-Templates
- **scripts/** — Hilfsskripte für Entwicklung, Deployment und Wartung

---

## Branding-System

Das Dashboard verwaltet getrennte Unternehmens- und Produktmarken. Die fünf
Services verwenden semantische Varianten für Bildmarke, horizontales und
gestapeltes Logo, Favicon sowie PWA-Icons. Änderungen werden aus dem gemeinsamen
PostgreSQL-Datensatz und Branding-Volume ohne Neustart übernommen.
Produktlogos stehen ausschließlich in den ein-/ausklappbaren Sidebars: geöffnet
in einer einheitlichen 176 × 48-px-Fläche, eingeklappt als 40 × 40-px-Symbol.
App-Header bleiben logofrei; Browser-Tabs verwenden immer nur das Favicon.

Die verbindliche Matrix „welches Logo wo“ sowie Dateivorgaben und der
Asset-Sync sind im [Cores Brand Guide](docs/BRANDING.md) dokumentiert.

---

## Security

### 🔐 Sicherheitsarchitektur

#### JWT-basiertes Single-Sign-On (SSO)

Das Dashboard ist der einzige interaktive Login-Einstieg. Die Core-Clients
übergeben ihr aktuelles Ziel als `redirect`; das Dashboard prüft es gegen die
eigene Origin und die konfigurierten Core-Origins. Derselbe Rücksprung gilt für
lokale Anmeldung, Microsoft Entra und den Cores-MCP-OAuth-Dialog.

- **Ausstellung**: cores-dashboard stellt signierte JWT-Access-Tokens und Refresh-Tokens aus
- **Validierung**: Alle Backend-Services validieren Tokens gegen den zentralen `/api/auth/validate`-Endpunkt
- **Token-Lebensdauer**:
  - Access-Token: 15 Minuten
  - Refresh-Token: 7 Tage
- **Signatur**: HMAC-SHA256 mit serverseitigem Secret

#### Rollenbasierte Zugriffskontrolle (RBAC)

```
Admin           ──► Voller Zugriff auf alle Services
Event-Manager   ──► Jobs, Kunden, Rechnungen verwalten
Warehouse-Mgr   ──► Lager, Geräte, Picklisten verwalten
Planner         ──► Pläne und Tasks verwalten
Viewer          ──► Lesezugriff auf zugewiesene Bereiche
```

#### Zusätzliche Sicherheitsfeatures

| Feature | Beschreibung |
|---------|-------------|
| **WebAuthn / FIDO2** | Hardware-gestützte 2FA für Admin-Konten (rentalcore) |
| **TOTP 2FA** | Zeitbasierte Einmalpasswörter für erhöhte Sicherheit |
| **TLS 1.3** | Verschlüsselte Kommunikation via NPM Reverse Proxy (Let's Encrypt) |
| **Rate Limiting** | Schutz vor Brute-Force-Angriffen auf Login-Endpunkte |
| **CORS Policy** | Strikte Cross-Origin-Richtlinien für API-Endpunkte |
| **Input Sanitization** | Validierung aller Benutzereingaben gegen XSS und SQL-Injection |
| **Audit Logging** | Protokollierung sicherheitsrelevanter Aktionen |

---

## Technologie-Stack

### ⚙️ Zusammenfassung

| Bereich | Technologie |
|---------|------------|
| **Backend (Dashboard, Rental, Warehouse)** | Go 1.22+ |
| **Backend (Planner)** | Node.js 20+ |
| **Frontend (alle Services)** | React 18+ mit TypeScript |
| **Datenbank** | PostgreSQL 16+ |
| **Container** | Docker + Docker Compose |
| **Reverse Proxy** | Nginx Proxy Manager (NPM) |
| **IoT/MQTT** | Eclipse Mosquitto 2.0+ |
| **Authentifizierung** | JWT (HS256) |
| **2FA** | WebAuthn, TOTP |
| **Dateiablage** | Nextcloud WebDAV |
| **Deployment** | Komodo (docker03) |
| **Monitoring** | Docker Health Checks + Service-Endpunkte |

---

## Betrieb & Wartung

### 📊 Monitoring

```bash
# Service-Status prüfen
docker compose ps

# Health-Checks
curl --fail https://cores.tsunami-events.de/health
curl --fail https://cores.tsunami-events.de/rentalcore/health
curl --fail https://cores.tsunami-events.de/warehousecore/api/v1/health
curl --fail https://cores.tsunami-events.de/plannercore/health

# Ressourcen-Nutzung
docker stats
```

### 🔄 Updates

```bash
# Alle Submodules und Images aktualisieren
git pull --recurse-submodules
docker compose pull
docker compose up -d --force-recreate

# Alte Docker-Images bereinigen
docker image prune -a
```

### 💾 Backup

```bash
# PostgreSQL-Dump
docker exec cores-postgres pg_dump -U cores_user cores > backup_$(date +%Y%m%d).sql

# Volume-Backup (Uploads, Logs)
tar -czf cores_data_$(date +%Y%m%d).tar.gz /var/lib/docker/volumes/cores_*
```

### 🐛 Fehlerbehebung

```bash
# Logs eines bestimmten Services
docker compose logs rentalcore -f --tail=100

# Container-Shell öffnen
docker exec -it rentalcore sh

# Datenbank verbinden
docker exec -it cores-postgres psql -U cores_user -d cores

# Docker-Netzwerk prüfen
docker network inspect cores_default
```

---

## 📄 Lizenz

**Proprietär** — Alle Rechte vorbehalten.  
© Tsunami Events — [tsunami-events.de](https://tsunami-events.de)

---

> **Cores** — Das Herzstück von Tsunami Events.  
> *Built with ❤️ for event professionals.*
