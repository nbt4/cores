# Zuständigkeiten und Stabilisierung

Die Suite nutzt bewusst eine gemeinsame PostgreSQL-Datenbank und unabhängig
gebaute Services. Diese Integration erfordert koordinierte Releases; sie stellt
keine vollständige technische Isolation der Datenbereiche dar.

| Bereich | Verantwortlicher Service | Zugriff anderer Dienste |
|---|---|---|
| Benutzerstatus, Suite-Adminrecht, Microsoft-Identität | Cores Dashboard | aktuelle Kontoprüfung; keine gecachten Adminrechte |
| Jobs, Anforderungen, Kunden, Rechnungen | RentalCore | Lagerworkflows und kuratierte Auswertungen |
| Produkte, Geräte, Lagerorte, physische Bewegungen | WarehouseCore | Vermietung und explizite Einkaufsverknüpfungen |
| Pläne, Aufgaben, Mitgliedschaften | PlannerCore | lesend nur innerhalb aktueller Mitgliedschaften |
| Lieferanten, Angebote, Bestellungen, Wareneingang | ProcurementCore | explizite Lagerverknüpfungen |
| Lesende KI-Abfragen | Cores MCP | kuratierte Felder; PostgreSQL READ ONLY; Produktionsrolle ohne Schreibrechte |
| Release-Inventar, gemeinsame Migrationen, Designsystem, Backups | Cores-Umbrella | versionierter Suite-Vertrag |

Ein bestehendes gemeinsames Schema wird nicht während einer Auth-Korrektur
umgebaut. Die aktuell von Warehouse und Procurement initialisierte Tabelle
`core_product_links` bleibt kompatibel. Weitere Strukturarbeit soll die
Schemaänderungen in versionierte Migrationen mit eindeutiger Zuständigkeit
überführen und Datenbankrechte pro Service einschränken. Dafür sind zuerst
sämtliche bestehenden Schreibpfade und Startmigrationen zu erfassen.

## Automatische Absicherung

Die Umbrella-CI prüft die exakt eingecheckten Submodule, alle Frontend-Builds,
Go-Tests und statischen Go-Prüfungen. Ergänzend laufen echte PostgreSQL- und
MCP-HTTP-Tests für fremde Pläne, Mitgliedschaftsentzug, Administratoren,
Maschinentokens und Wiederverwendung von Datenbankverbindungen. Der Backup-Test
prüft erfolgreiche Wiederherstellung, fehlende Quelldatenbanken und kaputte Dumps.

Noch nicht durch diese Prüfungen abgedeckt sind vollständige Browserabläufe für
Jobausgabe/Rücknahme und Bestellung/Wareneingang, Lasttests und die Wiederherstellung
sämtlicher Dateivolumes. Die großen PDF-Handler und duplizierten LED-Oberflächen
benötigen eigene, fachlich abgegrenzte Refactorings mit Verhaltensprüfungen.
