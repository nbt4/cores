# Cores stack on docker03

## Physischer Case-Inhalt: Warehouse 5.9.109 / MCP 1.5.54

Warehouse zuerst deployen und die genaue gesunde Image-ID, native `061` /
Root `045` sowie `devicescases_guard_physical`,
`case_product_contents_guard_physical`, `case_child_contents_guard_physical`,
`devicescases_sync_membership` und `case_product_contents_sync_stock` prüfen.
Danach MCP deployen und `/ready`, 420 Werkzeuge (108 Abfragen / 156 Vorschauen /
156 Ausführungen), Prompts/Ressourcen und alle bisherigen Guards lesend prüfen.
Beide Compose-Dateien pinnen die veröffentlichten Tags. Neue und aktualisierte
Teststacks prüfen alle sieben Pack-/Entpackaktionen, erhaltene Gesamtmengen,
Child-Versiegelungen und Gerätezuordnungen, genaue Versionen und Kapazitäten,
aktuelle Rechte auch bei Wiederholung, Audit-/Ereignis-/Beleg-Rollback,
Wiederholung mit gleichem Schlüssel, gleichzeitige Entwürfe mit einem Gewinner
sowie unveränderte alte und neue Belege nach Neustart. Die Gesamtmenge schließt
physisch gepackte Mengenartikel ein. Keine produktiven Pack-/Bestandsänderungen
und keine Lieferantenaufrufe zum Testen. Versiegeln/Öffnen, Umsetzen und
Job-Ausgabe/Rücknahme sowie übrige Issue-Anforderungen bleiben offen.

## Case-Sollvorlagen: Warehouse 5.9.108 / MCP 1.5.53

Warehouse zuerst deployen und genaue gesunde Image-ID sowie native `060` /
Root `044` mit `case_templates_guard_lifecycle` prüfen. Danach MCP deployen
und `/ready`, 405 Tools (107 Abfragen / 149 Vorschauen / 149 Ausführungen),
Prompts/Ressourcen und sämtliche bisherigen Guards ausschließlich lesend prüfen.
Beide Compose-Dateien pinnen die freigegebenen Tags. Neue und aktualisierte
Teststacks prüfen Sollzeilen-Lebenszyklus, aktive Standardansichten, native
Kompatibilität, Rechte einschließlich gespeicherter Wiederholung, Kontext und
Versionen, Audit-Rollback und erneuten Versuch mit demselben Schlüssel.
Gleichzeitige vorbereitete Änderungen derselben Case-Version führen zu genau
einer Ausführung. Neustarts erhalten Vorlagen, Belege, Bestand und genaue
Referenzversionen. Keine produktiven Case-/Bestandsänderungen zum Testen.
Weitere Case-Workflows und Issue-Anforderungen bleiben offen.

## Produkt-Batch und URL-Übernahme: Warehouse 5.9.107 / MCP 1.5.52

Warehouse zuerst deployen und `/api/v1/health` sowie die genaue Image-ID prüfen;
danach MCP deployen und `/ready`, 395 Tools (105 Abfragen / 145 Vorschauen /
145 Ausführungen), Prompts/Ressourcen und alle vorhandenen Datenbankguards lesend
verifizieren. Keine neue Migration. Die öffentliche Hersteller-URL wird nur von
der Produktvorbereitung gelesen. Bestätigte Anlage verwendet den geprüften
Entwurf ohne erneuten Seitenabruf. Alle Batch-Produkte, Stammdaten, optionale
Zuordnung, Anfangsbestand/Geräte, Scan-IDs, Audit und Wiederholungsbeleg sind eine
Transaktion. Preise benötigen ausdrückliches Finanzrecht. Aktualisierter und
frischer Teststack prüfen Rechte, pure Vorschau/Dry-run, alte Versionen, vollständigen
Audit-Rollback, denselben Schlüssel und unveränderte Belege nach Neustart. Keine
produktiven Produkt-/Bestandsänderungen oder externen Herstelleraufrufe zum Testen.
Die übrigen MCP-Abnahmepunkte bleiben offen.

## Adam Hall: Procurement 1.0.76 / MCP 1.5.51

Procurement zuerst deployen und genaue gesunde Image-ID prüfen. Native `014` /
Root `043` installieren den gespeicherten privaten Checkout und
`proc_adam_hall_checkouts_guard_retention`; danach MCP deployen und 393 Tools
sowie alle bisherigen Guards ausschließlich lesend prüfen. Tests gegen isolierte
TLS-/SSO-/PKCE-Lieferanten-Fixtures auf Upgrade- und sauberem Root-Volumen ersetzen
jede Produktionsbestellung. Beide Compose-Dateien pinnen die veröffentlichten Tags.

`prepare_build_adam_hall_cart/build_adam_hall_cart` benötigen aktuelle Admin-/Send-
Rechte, genaue lokale Vorschau und eigene Warenkorb-Bestätigung. Kein ungeprüftes
Löschen vorhandener fremder Positionen, kein kostenpflichtiger Bestellaufruf.
`prepare_send_adam_hall/send_adam_hall` benötigen den frischen vollständigen
Lieferanten-Warenkorb, Geschäftsadressen, Methoden, EUR-Summe, exakte Checkout-ID /
Version / Kontext und eigene bezahlte Bestätigung. Derselbe private Kontext wird
vor dem einzigen Bestellaufruf erneut geprüft; es gibt keinen Neuaufbau.

Private Lieferanten-Kontexte werden AES-GCM mit dem gemeinsamen JWT-Secret
verschlüsselt und an ihren Beleg gebunden, ohne API-/Audit-Ausgabe. Secret-Rotation
macht alte Checkouts unlesbar; eine neue bestätigte Warenkorbvorbereitung ist
nötig. Ein unveränderlicher Auftrag und vollständiger Audit gehen jedem bezahlten
Aufruf voraus; gespeicherte Ergebnisse werden nur finalisiert. Ungewissheit benötigt
menschliche Klärung. Der native Dialog nutzt dieselben getrennten Bestätigungen.
KI-Apps benötigen weiterhin Refresh/Rescan für neue Schemas. Beide Parent-Issues
bleiben für die übrigen Abnahmepunkte offen.

## Menschliche Klärung: Procurement 1.0.75 / MCP 1.5.50

Procurement zuerst deployen, genaue gesunde Image-ID und nativen `013` / Root `042`
prüfen; MCP danach deployen. Alle bisherigen Guards plus
`proc_submission_reconciliations_guard_retention` und 389 Tools lesend prüfen.
`prepare_reconcile_submission/reconcile_submission` erfordern aktuellen Admin,
expliziten Send-Scope, abgeschlossene menschliche Lieferantenprüfung/Evidenz,
15 Minuten Abstand zur Originalübermittlung, genaue Version/Kontext und Phrase.
`found_order` speichert die Lieferantenreferenz; `confirmed_not_sent` storniert
unverändert erhaltene Originalpositionen. Klärungsbeleg, Status, Audit/Aktivität
und Replay sind atomar. Originalübermittlung und Antwort bleiben erhalten und
gegen Wiederholung gesperrt. Es gibt keine Lieferantenaufrufe/Bestandsbuchungen.
Neuer Bedarf benötigt einen separat freigegebenen Lieferantenwarenkorb. Produktion
wird ausschließlich lesend geprüft; beide Parent-Issues bleiben für Adam Hall und
weitere Abnahmepunkte offen.


## Amazon-Übermittlung: Procurement 1.0.74 / MCP 1.5.49

Procurement zuerst deployen: Native `012` / Root `041` installieren die dauerhaften
Übermittlungsaufträge und drei Guards. Genaue gesunde Owner-Image-ID prüfen, dann
MCP deployen. `prepare_send_amazon/send_amazon` erfordern aktuellen Admin und
expliziten `cores:procurement:send`-Scope, vollständige exakte Vorschau/Version und
Auftrag/Betrag/Kontext-Bestätigung. Der ursprüngliche von einem anderen Nutzer
freigegebene Warenkorb bleibt unverändert. Allgemeine Schreibrechte gewähren
keine Lieferantenübermittlung; OAuth erläutert dies ausdrücklich in DE/EN.

Ein dauerhafter Auftrag mit geprüftem Geschäftskontext und Audit wird vor dem
einmaligen externen Aufruf gespeichert. Bestätigung und lokaler Abschluss haben
eigene dauerhafte Audit-Phasen. Ursprünglicher Schlüssel kann einen gespeicherten
Abschluss wiederholen; `pending`/`submission_unknown` niemals automatisch erneut
senden. Auch der bestehende UI-Aufruf nutzt diese Absicherung. Geschäftsfelder,
Positionsdaten und Originalidentität bleiben geschützt, Wareneingang bleibt separat.

Beide Compose-Dateien pinnen die neuen Images. Prüfen: genaue gesunde Image-IDs,
alle bisherigen Guards plus `proc_order_submissions_guard_identity`,
`proc_purchase_orders_guard_submission`, `proc_purchase_order_lines_guard_submission`
und den vollständigen lesenden 387-Tool-Katalog. Keine Produktionsbestellungen zum
Testen absenden; Übermittlungstests nutzen einen isolierten lokalen TLS-Mock.
KI-Apps benötigen Refresh/Rescan für die zusätzlichen Werkzeuge und erneute
explizite Freigabe des Senderechts. Parent-Issues bleiben für Adam Hall, geführte
Klärung und die übrige Abnahmeliste offen.

## Bedarf zu Bestellung: Procurement 1.0.73 / MCP 1.5.48

Procurement zuerst deployen und genaue gesunde Image-ID prüfen, MCP danach.
Keine neue Migration; Native `011` / Root `040` und alle bisherigen Guards
bleiben erforderlich. `procurement.requisitions.prepare_order/order` bindet
vollständigen freigegebenen Bedarf, ausgewählten Lieferanten, alle Angebotskandidaten
und abgeleiteten Bestellentwurf an genaue Version, Kontext und Bestätigungsphrase.
Aktuelle Admin-/Create-Rechte gelten auch für gespeicherte Ergebnisse. Bestellung,
Bedarfsstatus, beide Audits/Aktivitäten und Erfolgsbeleg sind atomar. Auch gleichzeitige
bestehende UI-Aufrufe erstellen nur eine Bestellung. Originalfelder und Positions-IDs
bleiben erhalten; die Umwandlung versendet keine Lieferanten-Nachricht und bucht
keinen Bestand. Alter ungeführter MCP-Zugriff erhält 428.

Beide Compose-Dateien pinnen die neuen Images. Abschließend genaue gesunde Image-IDs,
alle installierten Guards und den vollständigen lesenden 385-Tool-Katalog prüfen.
KI-Apps aktualisieren Schemas per Refresh/Rescan gemäß MCP-README. Parent-Issues
bleiben für die restliche Abnahmeliste offen.

## Bestellentwürfe: Procurement 1.0.72 / MCP 1.5.47

Procurement zuerst deployen, MCP danach. Keine neue Migration; Native `011` /
Root `040` und sämtliche bisherigen Guards bleiben erforderlich. Die vier
Create-/Update-Werkzeuge binden vollständige Original-/Entwurfsfelder, native
Gesamtwerte, aktive Referenzen, erhaltene Positionen, Wareneingänge und doppelte
Lieferanten-Bestellnummern an exakten Kontext/Version und Bestätigung. Aktuelle
Admin-/Aktionsrechte gelten auch für gecachtes, altes und dauerhaftes Replay.
Änderung, Audit, Aktivität und Erfolgsbeleg werden atomar verbucht. Entwürfe
versenden keine externe Bestellung und ändern keinen Bestand; ungebuchte alte
öffentliche MCP-Entwurfsaufrufe benötigen neue Vorbereitung.

Beide Compose-Dateien pinnen die neuen Images. Prüfen: genaue gesunde Image-IDs,
sämtliche bisherigen Guards und der vollständige lesende 383-Tool-Katalog.
Bestehende KI-Apps aktualisieren Schemas gemäß MCP-README per Refresh/Rescan.
Parent-Issues bleiben für die restliche Abnahmeliste offen.

## Bedarfsentwürfe: Procurement 1.0.71 / MCP 1.5.46

Procurement zuerst deployen, MCP danach. Native `011` / Root `040` ergänzen vier
Referenz-Guards für alle Schreiber. Referenzzeilen bleiben bis zum Ende der
Speicherung gesperrt; historische abgeschlossene Datensätze behalten ihre Eltern.
Create, Update und Submit delegieren an die geschlossene Owner-API und verlangen
vollständige Vorschau, exakte Version/Kontext, gebundene Bestätigungsphrase und
aktuelle aktive Anforderer-/Adminrechte. Ausgelassene Positionen behalten IDs.
Änderung, Audit, Aktivität und dauerhafter Erfolgsbeleg werden atomar gespeichert.
Alte erfolgreiche Belege bleiben abrufbar; ungebuchte alte öffentliche MCP-
Entwurfs-/Einreichungspfade verlangen neue Vorbereitung.

Beide Compose-Dateien pinnen die neuen Versionen. Prüfen: genaue gesunde Image-IDs,
alle bisherigen Guards sowie `proc_requisitions_guard_catalog_references`,
`proc_purchase_orders_guard_catalog_references`,
`proc_requisition_lines_guard_catalog_references` und
`proc_purchase_order_lines_guard_catalog_references`; danach den vollständigen
lesenden 383-Tool-Katalog. Bestehende KI-Apps aktualisieren Metadaten gemäß MCP-
README per Refresh/Rescan. Parent-Issues bleiben für andere Abnahmepunkte offen.

## Freigaben und Status: Procurement 1.0.70 / MCP 1.5.45

Procurement zuerst deployen, MCP danach. Keine neue Migration; alle bisherigen
Guards bleiben erforderlich. Die neuen Owner-Pfade binden vollständigen Datensatz,
Positionen, Abhängigkeiten, Aktion und Begründung an exakte Version/Kontext und
Bestätigung. Aktuelle Admin-/Approve-Rechte sowie ein anderer Bedarfsentscheider
gelten auch für gecachtes, altes und dauerhaftes Replay. Ungebuchte alte MCP-
Entscheidungs-/Statusaufrufe brauchen eine neue Vorbereitung; bereits erfolgreiche
Belege bleiben gültig. Sent versendet keine externe Lieferantennachricht.

Restore erhält den Originalstatus auch bei empfangenen und stornierten Bestellungen.
Gemeinsame Workflow-Vorschauen sind auf 512 KiB Originaldatensatz begrenzt. Beide
Compose-Dateien pinnen die neuen Images. Prüfen: genaue gesunde Image-IDs, sämtliche
bisherigen Guards und der vollständige lesende 383-Werkzeug-Katalog. Neue Schemas
werden in bestehenden KI-Apps gemäß MCP-README per Refresh/Rescan geladen.
Parent-Issues bleiben für die restliche Abnahmeliste offen.

## Bedarfs-/Bestellarchive: Procurement 1.0.69 / MCP 1.5.44

Procurement zuerst deployen, MCP danach. Native `010` und Root `039` ergänzen
Archivzustände, historische Einlagerungszuordnungen und sechs Eltern-/Positions-
Guards. Archiv erhält Status, Geschäftsfelder, Positionen und Historie; offene
Folgebestellungen oder Einlagerungsaufgaben blockieren die Aktion. Restore prüft
ursprüngliche aktive Eltern. Aktuelle Anforderer-/Admin-/Archiv-Rechte und exakte
Version/Kontext/Bestätigung gelten auch vor dauerhaftem und gecachtem Replay.
Zurückgegebene Bedarfe werden ausdrücklich überarbeitet und erneut eingereicht.

Beide Compose-Dateien pinnen die neuen Images. Prüfen: genaue gesunde Images,
vollständiger lesender 383-Werkzeug-Katalog, sämtliche bisherigen Guards und
`proc_requisitions_guard_lifecycle_version`,
`proc_purchase_orders_guard_lifecycle_version`,
`proc_requisition_lines_guard_lifecycle`, `proc_requisition_lines_touch_version`,
`proc_purchase_order_lines_guard_lifecycle`, `proc_purchase_order_lines_touch_version`.
Bestehende Clients aktualisieren ihre Tool-Metadaten gemäß MCP-README per
Refresh/Rescan. Parent-Issues bleiben für die übrige Abnahmeliste offen.

## Wareneingang: Procurement 1.0.68 / MCP 1.5.43

Procurement zuerst deployen, MCP danach. Es gibt keine neue Migration; alle bisher
installierten Guards bleiben erforderlich. Beide Compose-Dateien pinnen die
neuen Images. Der Katalog bleibt bei 373 Werkzeugen. Vorhandene Erfolgsbelege
bleiben ohne erneute Bestandsbuchung wiederholbar; alte ungebuchte Vorschauen
brauchen eine neue Vorbereitung mit exaktem Kontext und Mengenbestätigung.
Der alte MCP-Empfangspfad erlaubt nur gespeicherte Erfolgsbelege.

Wareneingang verlangt ausdrücklich `cores:procurement:receive`, Freigabe und
Bestellstatus `cores:procurement:approve`; `cores:write` alleine genügt nicht.
Verbindungen müssen diese Scopes erneut mit ausdrücklicher Einwilligung anfordern.
Falls der Client alte Schemas zwischenspeichert, Werkzeug-Metadaten gemäß der
MCP-README per Refresh/Rescan aktualisieren. Prüfen: vollständiger lesender
MCP-Katalog, sämtliche bisherigen Guards und die genauen gesunden Image-IDs.
Parent-Issues bleiben bis zur vollständigen Abnahmeliste offen.


## Beschaffungskategorien: 1.0.67 / MCP 1.5.42

Procurement zuerst deployen: Native `009` und Root `038` ergänzen den aktiven
Kategoriezustand für vorhandene und frische Daten sowie Versions-/Identitäts-/
Archivschutz. Aktive Produkte blockieren Archive; Produktanlage und Restore
benötigen eine aktive Kategorie. Parameterdefinitionen und Geschäftsfelder bleiben.
MCP danach deployen: 373 Werkzeuge (103 Abfragen / 135 Vorschauen / 135 Ausführungen).
Archive bleiben als wiederherzustellende Identitäten auflösbar. Exakte Vorschau,
Realnutzer/Admin/Archiv-Scope, gebundene Bestätigung, atomare Historie und Replay
sind erforderlich; alte erfolgreiche Katalog-Belege bleiben gültig.
Prüfen: gesamte lesende MCP-Abnahme, genaue gesunde Images und zusätzlich
`proc_categories_guard_lifecycle_version` sowie die bisherigen Trigger.

## Procurement-Katalogarchive: 1.0.66 / MCP 1.5.41

Procurement zuerst deployen: Native `008` initialisiert auf bestehenden Volumes
dieselben Guard-Trigger wie Root `037` auf frischen Installationen. Danach MCP
deployen. Beide Compose-Dateien pinnen die neuen Versionen; der Katalog umfasst
368 Werkzeuge (102 Abfragen / 133 Vorschauen / 133 Ausführungen).
Identitäten und Geschäftsfelder bleiben beim Archivieren/Wiederherstellen erhalten.
Offene Bestellungen/Bedarfe blockieren betroffene Archive, Angebot-Restore verlangt
aktive Eltern. Hard-Delete und kombinierte Geschäfts-/Archivänderungen werden
abgelehnt. Exakte Version/Kontext, Realnutzer/Admin, Archiv-Scope und Bestätigung
sowie atomare Historie/Receipt schützen die Ausführung.

OAuth bietet die zusätzlichen Rental-/Procurement-Archiv- und Rental-Finanz-Scopes.
Vorhandene Token brauchen neue ausdrückliche Einwilligung; Finanzzugriff bleibt
separat ausgeschaltet. Client-Kataloge nach README per Refresh/Rescan erneuern.
Prüfen: Gesundheitszustand und genaue Images, vollständiger lesender MCP-Smoke
sowie alle bisherigen und die drei `proc_*_guard_lifecycle_version`-Trigger.
Parent-Issues bleiben bis zur vollständigen Abnahmeliste geöffnet.

## Frischer Stack: MCP 1.5.40 / Root 036

Die Compose-Startreihenfolge wartet auf gesunde Dienste: Rental vor Warehouse,
Warehouse vor Procurement und alle vier Cores vor MCP. Damit kollidieren die
gemeinsamen Rental-/Warehouse-Startmigrationen nicht und MCP startet erst mit
dem vollständigen Schema.

Root `036` übernimmt das bestehende committed Planner-Schema `003`/`004` für
frische Umbrella-Datenbanken. Bestehende Tabellen bleiben erhalten. Neue
Produktionsdatenbanken erhalten alle Cores-Tabellen über die Root-Migrationen;
auf bestehenden Installationen fehlt kein Planner-Schema. MCP 1.5.40 rundet
Packpreise und Wareneingangsprozente unabhängig davon, ob Mengen in SQL als
NUMERIC oder über GORM als DOUBLE PRECISION gespeichert sind. Der Katalog
bleibt bei 353 Werkzeugen. Vollständige Race-/DB-/Vet-/Build-Prüfungen sowie
frischer kompletter Stack und ausschließlich lesender Katalog sind Release-Checks.


## Procurement-Startschutz: 1.0.65

GORM erhält vorhandene PostgreSQL-UNIQUE-Constraints für nullable PunchOut-
Zuordnungen, Session-Token-Hashes und Confirmation-Payload-IDs. Keine neue
Migration und keine Datenänderung erforderlich. Vollständige Race-/DB-/Vet-/Build-
Prüfungen, 23 Frontend-Tests, Frontend-Build und wiederholte Initialisierung
gegen die originalen SQL-Migrationsconstraints gehören zur Verifikation.
Ein frischer kompletter Stack muss danach gesund starten; anschließend den
ausschließlich lesenden MCP-Katalog und exakte produktive Image-IDs prüfen.


## Materialbedarfe: Rental 5.3.120 / Warehouse 5.9.106 / MCP 1.5.39

353 Werkzeuge (99 Abfragen / 127 Vorschauen / 127 Ausführungen).
Rental `049` / Root `035` ergänzt exakte Zeilenversionen, Archivzeitpunkt und
allgemeinen Schreib-/Identitäts-/Archivschutz; native Auswahlabläufe behalten
die ursprünglichen IDs. Root `032` und Warehouse-Initialisierung behandeln
archivierte Bedarfe als historische Referenzen. Zuerst Rental deployen und
gesund prüfen, danach Warehouse und MCP. Warehouse berücksichtigt zusätzliche
manuelle Mengen in Packlisten samt Zubehör; Archive fehlen in aktiven Bedarfen.
Alte erfolgreiche Job-Belege bleiben nach dem Upgrade identisch wiederholbar.
Alte unversionierte Material-Schreibvorschauen müssen neu vorbereitet werden.
Vollständige Race-/DB-/Vet-/Build-Prüfungen, Upgrade-Replay, frische tatsächliche
MCP-Abläufe samt Kunden-/Venue-/Job-Regression und Packlisten-Mengentests sind
Release-Checks. Nach Rollout exakte Images, Material-/Jobschutz und den gesamten
ausschließlich lesenden MCP-Katalog prüfen. Elternissues bleiben offen.


## Vollständige Jobs: Rental 5.3.119 / MCP 1.5.38

346 Werkzeuge (96 Abfragen / 125 Vorschauen / 125 Ausführungen).
Rental `048` / Root `034` installiert Job-/Inhaltsschutz, exakte monotone Versionen
und vorhandene Personalzuordnungen auf frischen Installationen. Rental zuerst
ausrollen und gesund prüfen, dann MCP. Offene Job-Vorschauen neu erstellen;
Ausführung benötigt exakte Kontext-/Datensatzversion und Bestätigungsphrase.
Finanzfelder und berechnete Summen benötigen ausdrücklich Rental-Finanzzugriff.
Aktive Bearbeitungssitzungen, Geräte-Zeitkonflikte und Änderungen an Abhängigkeiten
blockieren die bestätigte Ausführung. Archive erhalten alle Inhalte und blockieren
ausgegebene Geräte, aktive Cases sowie offene Warehouse-Aufgaben. Restore erhält
Status und Summen; Öffnen ist eine eigene Statusänderung. Native Historie, Audit
und dauerhafter Beleg sind atomar; Replay prüft aktuelle Owner-Rechte.
Race-/DB-/Vet-/Build-Prüfungen, frische tatsächliche MCP-Workflows und Kunden-/Venue-
Regression sowie indirekte Positions-/Paket-Inhaltsprüfungen sind Release-Checks.
Nach Rollout Image-IDs, Job-/Inhaltstrigger und den ganzen lesenden Katalog prüfen.
App-Metadaten ggf. im ChatGPT-Plugin-Portal per Rescan bzw. Developer Mode per
Refresh aktualisieren; ein bestehender Chat garantiert keine neue Tool-Liste.

## Kunden-/Venue-Feldrevert: Rental 5.3.118 / MCP 1.5.37

341 Werkzeuge (95 Abfragen / 123 Vorschauen / 123 Ausführungen).
Keine neue Migration. Zuerst RentalCore ausrollen und gesund prüfen, danach
Cores MCP. Offene Vorschauen neu erstellen; erfolgreiche Belege aus der vorherigen
Version bleiben identisch wiederholbar. `prepare_revert_update/revert_update`
benötigt aktuelle Admin-/update-Rechte, eigenes letztes unverändertes MCP-Update,
exakten Quellaudit, Datensatz-/Kontextversion und Vorschauphrase. Feldrevert,
Auditverweis und dauerhafter Beleg sind atomar. Vollständige Race-/DB-Tests,
Vet/Build, Rental-Frontend-/Suite-Design-Prüfung, tatsächlicher Upgrade-Replay
und frischer MCP-Test prüfen beide Entitäten und archivierte Duplikatrestores.
Abschließend tatsächliche Image-IDs und ausschließlich lesenden MCP-Smoke prüfen.

## Kunden/Venues: Rental 5.3.117 / MCP 1.5.36

337 Werkzeuge (95 Abfragen / 121 Vorschauen / 121 Ausführungen).
Rental `047` / Root `033` installiert die Venue-Grundtabellen sowie
Stammdaten-/Job-/Versionsschutz und dauerhafte Receipts. Zuerst RentalCore
ausrollen und gesund prüfen, danach Cores MCP; dessen minimale Venue-Abfragen
benötigen das Lifecycle-Feld. Race-/DB-Tests, Vet/Build, Rental-Frontend- und
Suite-Design-Prüfung sowie frische Streamable-HTTP-Lifecycle-Tests sind
Release-Checks. Image-IDs und lesender produktiver MCP-Test abschließend prüfen.

## Produktbeziehungen: Warehouse 5.9.105 / MCP 1.5.35 / Rental 5.3.116

315 Werkzeuge (89 Abfragen / 113 Vorschauen / 113 Ausführungen).
Warehouse `059` / Root `032` installiert Historien-, Graph-, Job- und
Versionsschutz. Zuerst WarehouseCore und Cores MCP ausrollen und gesund prüfen,
danach RentalCore; dessen normale Beziehungsvorschläge benötigen das neue
Lifecycle-Feld. Vollständige Race-/DB-Tests aller drei Dienste, Vet/Build,
Rental-Frontend-/Suite-Design-Prüfung und frischer Streamable-HTTP-Test sind
Release-Checks. Abschließend tatsächliche Image-IDs, gesonderte Trigger und
nur lesende MCP-Abfragen im produktiven Stack prüfen.


## Kategorie-Lifecycle: WarehouseCore 5.9.104 / MCP 1.5.34

Release ergänzt Archivierung/Restore und redigierte Historien aller drei
Kategorieebenen; 304 Werkzeuge (86 Abfragen / 109 Vorschauen / 109 Ausführungen).
Warehouse `058` / Umbrella `031` erhalten Referenzen und prüfen Archivzustand,
aktive Eltern und Produktpfade auch bei UI-Schreibern. Eigentümer-API benötigt
Admin/archive-Scope, genaue Record-/Abhängigkeitsversionen und recordgebundene
Bestätigung; Lifecycle, Audit und dauerhafter Replay sind atomar. Fehler können
mit demselben Schlüssel wiederholt werden. Vor Rollout vollständige Race-/DB-
Tests, Vet/Build und frischer MCP-Ende-zu-Ende-Test; nach Rollout Containerstatus,
Image-IDs, Schema-Sperren und ausschließlich lesender MCP-Smoke-Test prüfen.


The production deployment is one Compose project named `cores`. Its canonical
definition is `deploy/docker03/compose.yaml`; all substitutions are documented
once in the repository-root `.env.example`.

## Komodo configuration

Create or update the Stack with these settings:

- Source: Git repository
- Repository: `https://github.com/nbt4/cores.git`
- Branch: `main`
- Compose file: `deploy/docker03/compose.yaml`
- Project name: `cores`
- Environment: the production values corresponding to `.env.example`

Relative bind mounts are resolved from the directory containing this Compose
file. The MCP knowledge mount therefore uses `../../knowledge` to reach the
repository-root knowledge directory after Komodo clones the repository.

Komodo stores the Stack Environment as the stack `.env` and passes it to
Compose. Mark credentials and tokens as secret variables. Do not add additional
service-specific `.env` files; `ADAMHALL_*`, `OPENROUTER_API_KEY`, and all other
settings belong to the single Stack Environment.
Add every `JEV_*` and `OPENROUTER_*` entry from `.env.example` there, including
the empty `OPENROUTER_API_KEY` placeholder until a key is available. Compose
passes these entries to RentalCore and ProcurementCore without inline defaults.

The Compose source is maintained in Git. Edit environment values in Komodo;
edit Compose in this repository and redeploy the Stack. The explicit
`name: cores` also keeps manual and Komodo deployments in the same Compose
project.

Komodo Periphery must have outbound DNS and HTTPS access to `github.com`, since
Periphery performs the clone on the target server. If Komodo's backend network
is declared `internal: true`, attach the Periphery service to an additional
egress-capable network without publishing its port. Keep the `km` CLI version
aligned with the Komodo Core version when automating Stack updates.

Before a deployment, validate the contract without reading any secret values:

```bash
./scripts/check-env-contract.sh
docker compose --env-file .env -f deploy/docker03/compose.yaml config --quiet
```

## Lagerplatzpflege (30.09.2026)

WarehouseCore `5.9.89` und Cores MCP `1.5.20` ergänzen die versionsgesicherte
Lagerplatzpflege. WarehouseCore installiert die idempotente Migration
`046_warehouse_location_version` beim Start. Neue Datenbankvolumes erhalten
denselben Trigger über die Umbrella-Migration `019_warehouse_location_version`.
Der Trigger erhöht `storage_zones.updated_at` bei allen Schreibpfaden. Es sind
keine zusätzlichen Umgebungsvariablen erforderlich; die Ausführung nutzt den
bestehenden OAuth-Scope `cores:warehouse:update` und Warehouse-Adminrechte.

Cores MCP `1.5.20` bietet im OAuth-Dialog außerdem die ausdrückliche Auswahl
Nur Lesen oder Lesen und Schreiben. Bestehende lesende Tokens bleiben lesend;
für Schreibtools den Connector neu verbinden und Lesen und Schreiben wählen.
Es ist keine neue Konfiguration nötig; `MCP_ENABLE_WRITES=true` bleibt erforderlich.

## Hersteller- und Markenpflege (30.09.2026)

WarehouseCore `5.9.91` und Cores MCP `1.5.21` ergänzen die eigenständige
Hersteller- und Markenpflege mit Vorschau und Versionsprüfung. WarehouseCore
installiert die idempotente Migration `047_warehouse_master_version` beim Start;
neue Datenbankvolumes erhalten dieselben Trigger über die Umbrella-Migration
`020_warehouse_master_version`. Die Trigger erhöhen `manufacturer.updated_at`
und `brands.updated_at` bei allen Updates. Ein Herstellerwechsel wird blockiert,
wenn verknüpfte Produkte nicht bereits diese Zuordnung verwenden.

Es sind keine zusätzlichen Umgebungsvariablen nötig. Die Ausführung benötigt
`MCP_ENABLE_WRITES=true`, Warehouse-Adminrechte und den bestehenden Scope
`cores:warehouse:update` oder `cores:write`. Für die vier neuen Werkzeuge die
Tool-Liste im MCP-Client aktualisieren. Vorschauen benötigen ebenfalls den
passenden Schreib-Scope und Warehouse-Administratorrechte.

WarehouseCore `5.9.91` bewahrt bei der historischen Kategorieübersetzung bereits
vorhandene Zielkategorien und ihre Referenzen. Migration `048` (Umbrella `021`)
setzt die Markenidentität auf Name plus Hersteller, einschließlich einer
eindeutigen NULL-Herstellergruppe. Dafür ist PostgreSQL >=15 nötig; der Stack
verwendet Version 16. Es werden keine Kategorien oder Zuordnungen gelöscht.

## Kategoriepflege und Entfernen (30.09.2026)

WarehouseCore `5.9.92` und Cores MCP `1.5.22` ergänzen versionsgesicherte Updates
und das explizit bestätigte Entfernen ungenutzter Haupt-, Unter- und dritter
Kategorien. Produkte oder Kinder sperren die Löschung; widersprüchliche
Produktzuordnungen sperren Elternwechsel. Es gibt kein Cascade oder MCP-Undo.

WarehouseCore installiert `049_warehouse_category_version` beim Start;
frische Datenbankvolumes erhalten dieselben Trigger über Umbrella-Migration
`022_warehouse_category_version`. Die Trigger versionieren auch UI-/Importpfade.
Es sind keine neuen Umgebungsvariablen erforderlich. `MCP_ENABLE_WRITES=true`
und Warehouse-Adminrechte bleiben nötig. Updates verwenden
`cores:warehouse:update`; das Entfernen benötigt neu `cores:warehouse:delete`
oder Legacy `cores:write`. Bestehende granulare Update-Tokens dürfen nicht
löschen; für Löschrechte den Connector neu autorisieren. Tool-Liste im Client
aktualisieren; die zwölf neuen Werkzeuge liefern ihre Felder über
`cores.entities.schema` (`update_fields`, `delete_fields`).

## Produktpakete (30.09.2026)

WarehouseCore `5.9.93` und Cores MCP `1.5.23` bieten geführtes Anlegen und
Bearbeiten von Produktpaketen mit vollständigen Inhalten und optionalen
Bestandteilen. Vorhandene Jobnutzung sperrt Preis- und Inhaltsänderungen;
Metadaten bleiben bearbeitbar. Es werden weder Bestände bewegt noch Produkte
erzeugt. Vier neue Werkzeuge; Schema-Discovery enthält auch `item_fields`.

WarehouseCore installiert `050_warehouse_package_version` beim Start, frische
Volumes erhalten die Trigger über Umbrella-Migration `023`. Versionierung
umfasst Paketmetadaten und Einzelzeilenänderungen in UI-/Importpfaden.
Keine neuen Umgebungsvariablen oder Scopes: Warehouse-Admin und vorhandener
Create-/Update-Scope oder Legacy `cores:write` sind erforderlich.

WarehouseCore `5.9.94` / Cores MCP `1.5.24` ergänzen Einzelgeräte-Anlage und
Metadatenpflege sowie Archivierung/Restore, redigierte Geräte-Audits und den
kontrollierten Rückweg der eigenen letzten unveränderten MCP-Feldänderung.
Migration `051` läuft beim Warehouse-Start; `024_warehouse_device_version.sql`
initialisiert frische Umbrella-Datenbanken. Jede Geräteänderung versioniert;
Archivierung deaktiviert Scan-Kennungen, Restore prüft Referenzen/Kapazität.
Der MCP registriert 173 Werkzeuge (65 Abfragen, 54 Vorschauen, 54 Ausführungen).
Die neuen Aktionen benötigen Warehouse-Admin und create/update/archive-Scope,
Bestätigung, Version und Idempotenz; Archivierung/Revert zusätzlich eine
Geräte- bzw. Audit-gebundene Phrase. Keine endgültige Geräte-Löschung.

WarehouseCore `5.9.95` / Cores MCP `1.5.25` ergänzen geführte Paket-Archivierung
und Restore sowie redigierte Paket-Audits. Admin/archive-Scope, exakte Version,
Idempotenz und Paket-gebundene Phrase sind erforderlich. Aktive Jobs/offene
Reservierungen sperren; Restore prüft Produkte/Bestandteile. Beide Aktionen
setzen Website-Sichtbarkeit auf false und erhalten Historie/Inhaltszeilen.
Keine neue Migration; vorhandene Paket-Versionstrigger gelten weiter.
Geräte-Abhängigkeiten behandeln fehlenden Jobstatus nun ebenfalls als offen.
Der MCP bietet 178 Werkzeuge: 66 Abfragen, 56 Vorschauen, 56 Ausführungen.

WarehouseCore `5.9.96` / Cores MCP `1.5.26` ergänzen Lagerplatz-Archivierung,
Restore und redigierte Audits. Admin/archive-Scope, Version, Idempotenz und
Lagerplatz-gebundene Phrase sind erforderlich. Bestand, aktive Nachfahren,
Heimat-Cases sowie offene Aufgaben/Inventuren sperren. Restore prüft Hierarchie
und Identität; unveränderte MCP-Archive erhalten den belegten Betriebszustand,
ältere/bearbeitete Archive werden gesperrt aktiviert. Keine neue Migration;
vorhandener Lagerplatz-Versionstrigger aus Root `019` bleibt maßgeblich.
Der MCP bietet 183 Werkzeuge: 67 Abfragen, 58 Vorschauen, 58 Ausführungen.


WarehouseCore `5.9.97` / Cores MCP `1.5.27` ergänzen vollständige Case-Anlage,
Metadatenpflege, Archivierung/Restore, Modellauflösung und redigierte Audits.
Warehouse-Admin, vorhandener create/update/archive-Scope, finale Bestätigung,
exakte Version und Idempotenz sind nötig; Lifecycle verlangt eine Case-Phrase.
Migration `052` / Umbrella `025` versioniert auch Scanner-/UI-Inhalte und
Verschachtelungen. Case, Audit und Replay sind atomar. Archive deaktiviert Scan-
Kennungen; Restore prüft Vorlagen/Referenzen/Lagerhierarchie und Kapazität.
Keine neue Konfiguration. MCP bietet 193 Tools (69/62/62). Tool-Liste neu laden.

### MCP-Gerätestapel: WarehouseCore 5.9.98 / Cores MCP 1.5.28

`warehouse.devices.prepare_bulk_create` und `bulk_create` ergänzen atomare
Anlage für 1–100 vollständige Geräte. Admin/create-Scope, explizite Bestätigung,
batchgebundene Phrase und Idempotenz sind erforderlich. Vorschau und Dry-run
schreiben nichts; kombinierte Lagerkapazität, aktive Hierarchie, Profile sowie
reservierte Serien-/Scan-Kennungen werden im WarehouseCore erneut geprüft.
Geräte, Kennungen, per-Gerät-Audit und dauerhafter Replay werden gemeinsam
committet. Keine neue Migration oder Konfiguration; MCP-Tool-Liste neu laden:
195 Tools (69 Abfragen / 63 Vorschauen / 63 Ausführungen).

### MCP-Stammdaten-Lifecycle: WarehouseCore 5.9.99 / Cores MCP 1.5.29

Hersteller und Marken besitzen Archivierung/Restore und redigierte Audit-Historien.
Die Startup-Initialisierung installiert Warehouse-Migration `053`; Umbrella-
Migration `026` hält neue Datenbanken synchron. Aktive Referenzen sperren Archive;
Datenbankregeln verhindern aktive Zuordnungen zu archivierten Stammdaten und
Bearbeitung archivierter Metadaten. Restore-Reihenfolge: Hersteller, Marke,
Produkt. Warehouse-Admin/archive-Scope, genaue Version, Bestätigungsphrase und
Idempotenz sind erforderlich. Keine neue Konfiguration. Tool-Liste neu laden:
205 Tools (71 Abfragen / 67 Vorschauen / 67 Ausführungen).

### MCP-Wartungspläne: WarehouseCore 5.9.100 / Cores MCP 1.5.30

Wartungspläne unterstützen Anlage, Teilupdates, Archivierung/Restore, Suche
und redigierte Audits. Warehouse-Admin, create/update/archive-Scope, genaue
Plan-/Geräteversionen, Bestätigung und Idempotenz sind erforderlich; Lifecycle
zusätzlich eine recordgebundene Phrase und keine offenen Aufträge. Vorschau
und Dry-run schreiben nichts. Plan, Gerätetermin, gegebenenfalls erzeugter
geplanter Auftrag/Ereignis, Audits und dauerhafter Replay sind atomar.
Warehouse-Migration `054` installiert Versionstrigger; Umbrella `027` ergänzt
auch das kanonische Schema für neue Datenbanken. Vorhandene benutzerdefinierte
Pläne bleiben bei Neustarts erhalten. Keine neue Konfiguration. Tool-Liste neu
laden: 215 Tools (73 Abfragen / 71 Vorschauen / 71 Ausführungen).

### MCP-Wartungsaufträge/Defekte: WarehouseCore 5.9.101 / Cores MCP 1.5.31

Vollständige manuelle Auftrag-/Defektanlage und Teilupdates, Statuswechsel,
Abschluss/Storno/Wiederöffnung, Archivierung/Restore und redigierte Historien.
Warehouse-Admin und Aktionsscope, genaue Auftrag-/Geräte-/Planversionen,
Bestätigung und Idempotenz sind erforderlich; terminale/Lifecycle-Aktionen
zusätzlich eine recordgebundene Phrase. Alle Folgeänderungen und Audits sind
atomar. Warehouse-Startup `055` und Umbrella-Migration `028` schützen Archive
und versionieren abhängige Geräte, Pläne, Aufträge, Ereignisse und Legacy-Defekte.
Die normale Auftragsliste blendet Archive aus; historische IDs bleiben erhalten.

Wartungskosten benötigen separat `cores:warehouse:financial`; Legacy-write
genügt dafür nicht. Die OAuth-Freigabe zeigt bei angefragten Kosten einen
unabhängigen, standardmäßig gesperrten Suite-Select. Read-only-Konfiguration
kann Kosten lesen, wenn explizit erlaubt, aber keine Änderungen ausführen.
Aktuelle Adminrechte werden bei jeder MCP-Anfrage gelesen, ohne Token-Scopes
zu erweitern. Kein neuer Konfigurationswert. Tool-Liste neu laden:
252 Tools (78 Abfragen / 87 Vorschauen / 87 Ausführungen).

### MCP-Lageraufgaben: WarehouseCore 5.9.102 / Cores MCP 1.5.32

Vollständige Anlage/Teilupdates und Start, Abschluss, Storno/Wiederöffnung,
Archivierung/Restore mit Vorschauen und redigierter Historie. Aktuelle Adminrechte,
Aktionsscope, Bestätigung und Idempotenz sind erforderlich, ebenso genaue
Aufgaben- und Referenzversionen. Terminale/Lifecycle-Aktionen benötigen eine
recordgebundene Phrase; Storno/Wiederöffnung zusätzlich einen Grund.
Aufgabe, Ereignis, Referenzversionen, Audits und dauerhafter Replay sind atomar.
Aufgabenabschluss quittiert Arbeit; physische Bestandsbewegungen bleiben eigene
Aktionen. Warehouse-Startup `056` und Umbrella `029` schützen Archive, versionieren
Aufgaben/Ereignisse und deren Referenzen und ergänzen das Schema für Neuinstallationen.
Fehlgeschlagene dauerhaft abgesicherte Aufgaben-/Wartungsaktionen dürfen mit
demselben Schlüssel erneut ausgeführt werden. Keine neue Konfiguration.
Tool-Liste neu laden: 268 Tools (80 Abfragen / 94 Vorschauen / 94 Ausführungen).

### Geführte MCP-Inventur: WarehouseCore 5.9.103 / Cores MCP 1.5.33

Neun benannte Vorschau-/Ausführungspaare plus Suche, Detail und redigierte
Historie ergänzen Inventurzählungen. Alle Aktionen brauchen aktuelle Adminrechte,
Aktionsscope, vollständige Vorschau, Bestätigung, exakte Versions-/Kontextwerte
und Idempotenz. Freigabe benötigt ausdrücklich `cores:warehouse:approve`;
Legacy-write sowie create/update genügen nicht. Review, Freigabe, Storno und
Lifecycle verlangen eine recordgebundene Phrase. Mengen werden ersetzt;
fehlende Zählungen nur nach ausdrücklicher Review-Bestätigung genullt.

Blinde Sollmengen bleiben bis Review verborgen. Nur Freigabe gleicht physischen
Bestand ab; Lagerhierarchien/Profile, Anfangsbestand und Abhängigkeiten werden
atomar erneut geprüft. Gepackte Inhalte folgen ihrer Wurzelposition. Bestand,
Bewegungen, Differenzjournal, Lagertermine, Ereignisse, Audits und dauerhafter
Replay sind eine Transaktion. Terminale Zählungen bleiben nach Restore terminal;
neue Inventuren sind neue Zählungen. Warehouse-Startup `057` / Umbrella `030`
ergänzen Schema und Versions-/Archiv-/Baseline-Guards. Die alte UI-Freigabe für
geführte MCP-Zählungen ist zugunsten des geprüften Pfads gesperrt. Keine neue
Konfiguration. OAuth für Inventurfreigaben mit approve-Scope neu autorisieren.
Tool-Liste neu laden: 289 Tools (83 Abfragen / 103 Vorschauen / 103 Ausführungen).

## Auftragspositionen — Rental 5.3.121 / Warehouse 5.9.113 / MCP 1.5.59

`rental.job_positions.prepare_create/create`, `prepare_update/update` und
`prepare_archive/archive` pflegen echte Produkt-Auftragspositionen wie **+ Produkt**.
`get`, `search` und `audit_history` ergänzen gezielte Abfragen; insgesamt **442
Werkzeuge** (112 Abfragen / 165 Vorschauen / 165 Ausführungen).

Anlage verlangt Produkt/Job sowie ausdrücklich Menge und Einzelpreis (auch 0).
Produktmengen sind positive ganze Zahlen; Preise, Faktoren, Steuer und Rabatte
haben höchstens zwei Nachkommastellen. Standardwerte: Einheit Stück,
Folgetag-Faktor 0,50, Steuer 19 %, Rabatte 0; Beschreibung aus dem Produktnamen.
Teilupdates erhalten ausgelassene Felder; Job, Produkt und Herkunft bleiben
unveränderlich. Dienstleistungen, Fremdmiet- und Paketpositionen behalten ihre
nativen Abläufe; diese Tools verwalten Produktpositionen.

Die finale Vorschau zeigt Position, Preisberechnung nach den bestehenden
Job-/Steuer-/Tages-/Rabattregeln, Auftragswert und alle Materialquellen. Bereits
vorhandene manuelle Zusatzmengen benötigen ausdrücklich `manual_quantity`
(Ersatzmenge) oder `preserve_manual_quantity=true` (bewusst zusätzlicher Bedarf).
Beispiel: 9 manuelle Bedarfe mit `quantity=9, manual_quantity=0` übernehmen ergibt
9 aus Positionen + 0 manuell, nicht 18. Die Bedarfs-ID bleibt erhalten. Bereits
vorhandene Produktpositionen verlangen bei Anlage zusätzlich `allow_duplicate=true`.
Archivierung erhält Originalfelder/Historie, entfernt nur den Positionsanteil aus
aktivem Bedarf und Umsatz und lässt unabhängige Zusatzmengen bestehen.

Alle Vorschauen/Ausführungen benötigen aktuelle Rental-Adminrechte, passenden
`cores:rental:create|update|archive`-Scope (oder Legacy-write) **und separat**
`cores:rental:financial`. `get/search` benötigen den Finanzscope; die redigierte
Historie verlangt Adminrechte und enthält keine Preise. Bestätigte Ausführungen
benötigen `expected_updated_at` bei bestehenden Positionen,
`expected_job_updated_at`, `expected_context`, die genaue
`required_confirmation_text` als `confirmation_text`, `confirm_change=true`
und `idempotency_key`. Dry-run/Vorschau schreiben nichts. Veraltete Vorschauen,
fremde aktive Bearbeiter oder widersprüchliche Gerätezuordnungen sperren.
Position, genau zugehöriger Materialbedarf, Auftragswert, Job-Historie, Audit und
dauerhafte Wiederholungsantwort sind eine Transaktion. Wiederholungen prüfen
aktuelle Zielrechte erneut. Beschaffung und physischer Bestand werden nicht geändert.

Rental-Startup `050` / Suite-Migration `047` schützt Originalidentität und Archive,
versioniert alle Positionsschreiber und verhindert Gerätezuordnung zu Archiven.
Native Entfernung archiviert; native Listen und Analytics schließen Archive aus.
Warehouse-Upgrade `063` / Suite `048` aktualisiert den Produktbeziehungskontext.
Warehouse-Picklisten, Scan-Auswahl und Packlisten berücksichtigen ebenfalls nur
aktive Positionen. Rental zuerst ausrollen, danach Warehouse und MCP; keine neuen
Umgebungsvariablen. MCP-Tool-Liste neu laden, zusätzliche Finanz-/Schreibrechte bei
Bedarf über erneute OAuth-Verbindung freigeben. Bestehende Jobs/Bedarfe werden
beim Release nicht automatisch übernommen.

Validierung: vollständige Go-Tests aller drei Dienste, PostgreSQL-Tests für
atomare Übernahme, Preis-/Rabattberechnung, Zusatzmengen, Archive, veraltete
Kontexte, Rechteentzug, Rollback und dauerhafte Wiederholungen sowie Packlisten.

## OAuth-Nachfreigabe für Auftragspositionen — MCP 1.5.60

Die neun `rental.job_positions`-Werkzeuge veröffentlichen ihre benötigten
OAuth-Scopes direkt im Tool-Descriptor (`securitySchemes` und `_meta`-Spiegel).
Vorschau/Anlage/Update/Archivierung benötigen den passenden Rental-Aktionsscope
und `cores:rental:financial`; `get/search` benötigen den Finanzscope, die
redigierte Historie nur den Basis-Lesescope plus unveränderte Adminprüfung.
Legacy `cores:write` erfüllt weiterhin die Aktionsprüfung, niemals den Finanzscope.

Fehlt eine Freigabe, antwortet der MCP vor jedem Geschäftsaufruf mit einem
strukturierten `_meta["mcp/www_authenticate"]`-Challenge: Metadaten-URL,
`insufficient_scope`, verständliche Beschreibung und genau die fehlenden Rechte.
Vorhandene gültige Grants werden in der erneuten Anfrage erhalten. ChatGPT kann
so die OAuth-Nachfreigabe starten und den Finanzschalter im bestehenden
Cores-Dialog anzeigen; Nutzer müssen die gewünschte Freigabe ausdrücklich
bestätigen. Token-Refresh erweitert keine Rechte, und abgelehnter Finanzzugriff
bleibt abgelehnt. Geschäftliche Bestätigungen werden dabei nicht ausgeführt
oder automatisch wiederholt; danach eine frische Positionsvorschau erstellen.

Tool-Namen, Eingabe-/Geschäftsschemas und Kataloggröße (442) bleiben stabil.
Keine neue Konfiguration oder Migration; nur MCP ausrollen und im Client die
Tool-Definitionen aktualisieren. Statische Maschinentokens sind weiterhin reine
Lesezugänge und kein PAT-Ersatz für diese persönlichen Schreibabläufe.

Der lokale HTTP-Regressionslauf prüft beide Descriptor-Felder, alle relevanten
Positionstools, alte/lesende/falsche Finanzgrants, gültige granulare und
Legacy-Schreibrechte, unveränderte Adminprüfung und signierte Owner-Vorschauen.
OAuth-Code-/Refresh-Tests prüfen ausdrückliche Finanzfreigabe und deren Ablehnung;
zusätzlich laufen vollständige Tests, Vet und PostgreSQL-Rechteprüfungen mit Race.
