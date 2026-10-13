# Produktmanagement: WarehouseCore 5.9.115 / RentalCore 5.3.125

## Verhalten und Vertrag

WarehouseCore besitzt einen einheitlichen Produktarbeitsbereich für Produkte,
Geräte, Kabel, Pakete, Website, Beschaffung, Fremdmiete und Stammdaten. Produktseiten
trennen Stammdaten, Bestand, Packregeln, Website, Beschaffung und Verlauf. Vorhandene
fachliche Rollen gelten weiter; Manager lesen, Administratoren bearbeiten.

Die Bildstrecke optimiert optional im Browser, lädt bis zu drei Bilder parallel
hoch und verwendet lokalen Original-/Vorschaucache. Website-Entwurf und
Veröffentlichung sind getrennt; Aktualisierung und Bildlöschung besitzen dauerhafte
Wiederholungswarteschlangen. Ungespeicherte Eingaben sind einschließlich
Browser-Zurück geschützt; verspätete Antworten können verworfene Entwürfe nicht
überschreiben. Bilder werden per MIME-Signatur geprüft und öffentliche URLs geben
nur aktuell veröffentlichte Auswahlbilder aktiver Einträge aus.

Packlisten-PDF und Scanner verwenden denselben versionierten Materialstand.
Typisierte Beziehungen, tatsächliche Gerätekomponenten, Dezimalmengen,
Case-Zuordnungen und manuelle Bedarfe bleiben nachvollziehbar. Geräte werden
atomar geprüft und reserviert; Mengenscans dokumentieren den Packstand und lösen
keine Lagerbewegung aus. RentalCore übermittelt Beziehungstyp/Bezug und begrenzt
seinen bisherigen Auswahlvorschlag auf passende aktive Produkte.

Details einschließlich Grenzen und API-Verträgen:
[Warehouse-Dokumentation](../warehousecore/docs/product-management.md).

## Quellstand und Veröffentlichung

- [WarehouseCore-PR #18](https://github.com/nbt4/warehousecore/pull/18), Release `5.9.115`.
- [RentalCore-PR #24](https://github.com/nbt4/rentalcore/pull/24), Release `5.3.125`.
- WarehouseCore-Quellrevision: `14889f31495b3775c089835522dcc5b30a85a172`.
- WarehouseCore Registry-Digest: `sha256:6e85d44d331837c5f3009b07bac1cbd34fdd6ce6195f6e67dcaa3d93a11976e7`.
- RentalCore-Quellrevision: `c4273ccc91ac26552279ab0163525c79ad712a0b`.
- RentalCore Registry-Digest: `sha256:66458a719094dbff4a9d353b6fa9c61f28564920e3820e64f2f7864f0e17bd3c`.

Beide Abbilder wurden durch `build_and_push_docker.sh` ausschließlich aus committed,
gemergtem Quellcode gebaut, nach vollständiger Docker-Hub-Tag-Prüfung mit dem
nächsten Patch-Tag und `latest` veröffentlicht. Beide Tags verweisen je Dienst
auf denselben oben dokumentierten Digest und die geprüfte OCI-Quellrevision. Compose-Pins, Submodule und
README-Inventar sind synchronisiert. Andere Dienste erhalten keine neuen Images.

Migration `warehousecore/migrations/064_product_workspace.sql` und Root-Mirror
`migrations/postgresql/051_product_workspace.sql` entsprechen dem additiven
Startup-Schema einschließlich Materialstand und Scanbelegen. Das Runtime-Schema
wird durch die Anwendung initialisiert; es ist kein manueller Produktionseingriff
für diesen Release vorgesehen. Ein Downgrade auf die vorherigen Images entfernt
keine neu angelegten Tabellen oder Materialstände.

## Prüfung

- Vollständige Go-Prüfungen beider Dienste mit `-count=1`, isoliertem PostgreSQL,
  `go vet`, Serverbuild und gofmt: erfolgreich.
- Warehouse Frontend: `npm ci`, `npm run lint`, vier Tests und TypeScript/Vite-Build
  erfolgreich. Der bestehende Hinweis zum großen Hauptbundle bleibt sichtbar.
- Storage-/Bildtests mit Race Detector: erfolgreich; Upload/Download/Löschung,
  MKCOL-Reparatur, Cache und MIME-Manipulation sind abgedeckt.
- Vollständiges Root-Init und alle PostgreSQL-Migrationen in einer disponiblen
  PostgreSQL-16-Testdatenbank sowie echter Serverstart: erfolgreich, Health 5.9.115.
  Auch das veröffentlichte Warehouse-Docker-Image startet in dieser isolierten
  Umgebung erfolgreich mit demselben Health-Status.
- Browser mit ausschließlich synthetischen Daten: zwölf Ansichten × vier Breiten
  (390/768/1280/1536) × Hell/Dunkel; keine JavaScript-Fehler, horizontalen Überläufe
  oder fehlenden Übersetzungen. Fokus/Escape, Manager-Leserechte, Lade-/Leer-/Fehler-
  zustände und Browser-Zurück/Verwerfen/erneutes Bearbeiten geprüft.
- Verspätete Uploadantwort nach Verwerfen im weiterhin montierten Website-Panel:
  ignoriert; temporäre Vorschauen entfernt, gespeicherte Baseline erhalten.
- Bildnachweis: synthetisches JPEG 4096×3072, 8.005.692 → 3.377.996 Bytes bei
  2560×1920; Transparenz, unverändertes HEIC-Fallback und echter Multipart geprüft.
  Rund 58 Prozent weniger Daten ist keine garantierte Produktionszeitmessung.
- Unabhängiges Review durch `product_review` in mehreren Durchgängen; Befunde vor
  Veröffentlichung behoben, letzter Durchgang ohne konkrete Release-Blocker.

Lokale Suite-Gates in dokumentierter Reihenfolge:

```text
docker compose --env-file .env.example config --quiet
[Exit 0]
./scripts/check-env-contract.sh
Compose environment contract verified
./scripts/check-release.sh
Compose environment contract verified
Release image pins and inventory verified
./scripts/check-design-system.sh
Designsystem-Prüfung erfolgreich.
```

Suite-CI führt Go-Nachweisläufe nun ausdrücklich mit `-count=1` aus. Service-CI
prüft zusätzlich isoliertes PostgreSQL und Warehouse-Frontend-Lint.

## Rollout

Die bestehenden Operationsfreigaben aus Cores-AGENTS autorisieren Push, PR-Merge,
Image-Veröffentlichung und gezielten Rollout. Deployment nach grüner CI auf
`docker03` mit erhaltenen Laufzeitvariablen, Volumes, Netzwerken und Ports; nur
WarehouseCore und RentalCore werden neu erstellt. Abbild-Digest, OCI-Quellrevision
und Healthchecks werden gegen den veröffentlichten Stand geprüft. Andere Dienste
bleiben erhalten. Konkrete Produktionsnachweise werden nach dem Rollout ergänzt.
