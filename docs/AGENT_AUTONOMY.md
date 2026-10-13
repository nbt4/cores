# Autonome Cores-Operations

Der Nutzer hat am 12. Oktober 2026 ausdrücklich erlaubt, die Agentenregeln in
allen Cores-Projekten anzupassen und beauftragte Arbeiten eigenständig bis zum
geprüften GitHub- und Produktionsstand abzuschließen.

Der identische Abschnitt „Autonomie und dauerhafte Operationsfreigabe“ steht in
den `AGENTS.md` des Dachrepositories und der sieben Dienst-Repositories:

- [cores](../AGENTS.md)
- [cores-common](../cores-common/AGENTS.md)
- [cores-dashboard](../cores-dashboard/AGENTS.md)
- [cores-mcp](../cores-mcp/AGENTS.md)
- [plannercore](../plannercore/AGENTS.md)
- [procurementcore](../procurementcore/AGENTS.md)
- [rentalcore](../rentalcore/AGENTS.md)
- [warehousecore](../warehousecore/AGENTS.md)

Die Freigabe erlaubt Commits und Pushes, PR-Erstellung und Review, die Umstellung
von Draft auf ready, Merge nach erfolgreichen Prüfungen, Docker-Hub-Pushes,
Submodul- und Versionspflege sowie Deployments und betroffene Dienstneustarts auf
`docker03` über bestehende Komodo-/SSH-Sessions. Dafür sind weder wiederholte
Einzelfreigaben noch ein menschlicher Merge, eine TSU-Nummer oder eine separate
Paperclip-Aufgabe vorgeschrieben. Umfangreiche Änderungen erhalten ein
unabhängiges Review durch einen Review-Agenten.

Prüfungen werden weiterhin passend zur Änderung ausgeführt, mit echter Ausgabe
und ohne Abschalten oder Verbergen von Fehlern. Code- und Release-Gates behalten
ihre Reihenfolge; Go-Beweisläufe verwenden `-count=1`. Reine Dokumentation und
Agentenregeln benötigen Diff-/Strukturchecks und erzeugen keine neuen Images.

Secrets, fremde Arbeitsstände, Produktionsdaten und fachliche App-Berechtigungen
bleiben geschützt. Destruktive Datenänderungen oder manuelle Produktionsmigrationen
brauchen einen konkreten Auftrag dafür. Diese Grenzen verhindern weder normale
Entwicklung noch bereits beauftragte Releases und Deployments.

Die Suite-Pins erhalten die gleichen Regeln durch reine `AGENTS.md`-Commits auf
ihren bisherigen Quellständen. So werden keine zusätzlichen Laufzeitänderungen
aus den Dienst-`main`-Branches übernommen. Der gemeinsame Block und der reine
Dokumentationsdiff jedes dieser sieben Commits wurden geprüft.
