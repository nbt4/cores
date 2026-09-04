# Globales Cores-Routing

Die komplette Suite verwendet genau einen globalen Routingmodus. Eine Mischung
aus Pfaden und Subdomains innerhalb desselben Deployments ist nicht vorgesehen.
Das Dashboard liest die Einstellung `CORES_ROUTING_MODE`.

## Pfadmodus

```env
CORES_ROUTING_MODE=paths
CORES_DASHBOARD_PUBLIC_URL=https://cores.example.com
```

Alle installierten Cores werden vom Dashboard-Gateway unter festen Pfaden
bereitgestellt:

| Service | Öffentliche URL |
|---|---|
| RentalCore | `https://cores.example.com/rentalcore/` |
| WarehouseCore | `https://cores.example.com/warehousecore/` |
| PlannerCore | `https://cores.example.com/plannercore/` |
| ProcurementCore | `https://cores.example.com/procurementcore/` |

Der öffentliche Reverse Proxy muss nur die Dashboard-Domain an
`cores-dashboard:8080` weiterleiten. Das Dashboard entfernt den Core-Prefix,
setzt `X-Forwarded-Prefix` und leitet HTTP-, Asset- und WebSocket-Anfragen an den
internen Service weiter. Dieser Modus hält die Navigation im Scope einer unter
iOS installierten Cores-PWA.

## Subdomainmodus

```env
CORES_ROUTING_MODE=subdomains
CORES_DASHBOARD_PUBLIC_URL=https://cores.example.com
RENTALCORE_PUBLIC_URL=https://rent.example.com
WAREHOUSECORE_PUBLIC_URL=https://warehouse.example.com
PLANNERCORE_PUBLIC_URL=https://planner.example.com
PROCUREMENTCORE_PUBLIC_URL=https://procurement.example.com
COOKIE_DOMAIN=.example.com
```

Jede gesetzte `*_PUBLIC_URL` wird vom Dashboard als direkter Link verwendet.
Nicht installierte Services können im Subdomainmodus leer bleiben. Der externe
Reverse Proxy leitet jede Subdomain direkt an den dazugehörigen Container-Port
weiter. Für domainübergreifendes SSO muss `COOKIE_DOMAIN` die gemeinsame
übergeordnete Domain abdecken.

Die kanonischen Images sind dual lauffähig: Sie bedienen auf einer eigenen
Subdomain weiterhin `/`, während dasselbe Image im Pfadmodus seine Assets,
API-Aufrufe, Router-Basis, Manifest-Scope und Service Worker automatisch auf den
Core-Pfad legt.

## Zentraler Login und Rücksprung

Alle Core-Oberflächen verwenden ausschließlich den Login des Dashboards unter
`<CORES_DASHBOARD_PUBLIC_URL>/login`. Bei fehlender Sitzung wird die vollständig
aufgerufene Core-URL als validierter `redirect`-Parameter übergeben. Nach lokaler
oder Microsoft-Anmeldung landet der Benutzer deshalb wieder auf derselben
Ansicht – im Pfadmodus etwa unter `/warehousecore/products`, im Subdomainmodus
auf der freigegebenen `*_PUBLIC_URL`. Fremde Origins, Protokollhandler und
protokollrelative Ziele werden verworfen.
