# M365 Contacts Bidirectional Sync — Design Spec

**Datum:** 2026-05-09  
**Projekt:** RentalCore  
**Status:** Zur Implementierung freigegeben

---

## Überblick

Bidirektionale Synchronisierung zwischen RentalCore-Kunden und einem M365 Shared Mailbox-Kontaktordner. Alle Kunden werden synchronisiert. Konfliktauflösung per Last-Write-Wins.

---

## 1. Architektur

Neues internes Package in RentalCore — kein separater Service:

```
internal/sync/m365/
├── client.go    — Graph API Auth + CRUD (create/update/delete contact)
├── mapper.go    — Customer ↔ M365-Kontakt Feldmapping
└── sync.go      — Sync-Logik: Delta-Poll-Loop + Push-on-Save
```

Der Sync wird beim Server-Start als Goroutine gestartet. Wenn keine M365-Env-Vars gesetzt sind, startet der Sync nicht — RentalCore läuft unverändert weiter.

---

## 2. Konfiguration

Alle Vars in die **globale `.env`** des Komodo-Stacks:

```env
M365_TENANT_ID=
M365_CLIENT_ID=
M365_CLIENT_SECRET=
M365_SHARED_MAILBOX_ID=   # Object-ID oder E-Mail-Adresse des Shared Mailbox
M365_SYNC_INTERVAL=5m     # Standard: 5 Minuten
```

**Azure App Registration** benötigt folgende API-Permission (Application, nicht Delegated):
- `Contacts.ReadWrite` — scoped auf das Shared Mailbox via Exchange Mailbox Policy

---

## 3. Datenbankänderungen

### customers-Tabelle (neue Spalten)

```sql
ALTER TABLE customers ADD COLUMN m365_id VARCHAR(255);
ALTER TABLE customers ADD COLUMN m365_updated_at TIMESTAMP;
ALTER TABLE customers ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN archived_at TIMESTAMP;
```

- `m365_id` — Graph-API-Kontakt-ID im Shared Mailbox, `NULL` wenn noch nicht gesynct
- `m365_updated_at` — Zeitstempel der letzten M365-seitigen Änderung (für Last-Write-Wins)
- `is_archived` — Kontakt ist archiviert und nicht mehr nutzbar (z.B. nach Löschung in M365)
- `archived_at` — Zeitstempel der Archivierung

### sync_state-Tabelle (neu)

```sql
CREATE TABLE sync_state (
    key        VARCHAR(100) PRIMARY KEY,
    value      TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Der M365 Delta-Token wird unter dem Key `m365_delta_token` gespeichert, sodass Server-Neustarts keinen vollständigen Resync auslösen.

---

## 4. Datenfluss

### RentalCore → M365 (sofortiger Push)

| Ereignis | Graph-Call |
|---|---|
| Customer Create | `POST /users/{mailbox}/contacts` → `m365_id` in DB speichern |
| Customer Update | `PATCH /users/{mailbox}/contacts/{m365_id}` |
| Customer Delete | `DELETE /users/{mailbox}/contacts/{m365_id}` |

Schlägt der Graph-Call fehl, wird der Fehler geloggt. Beim nächsten Delta-Poll wird der fehlende/veraltete Kontakt nachgeholt.

### M365 → RentalCore (Delta-Poll, alle 5 Min)

1. `GET /users/{mailbox}/contacts/delta?$deltaToken={token}`
2. Für jeden geänderten Kontakt: Lookup in DB per `m365_id`
3. Last-Write-Wins: `customers.updated_at` vs. `m365_updated_at` aus Delta-Response
   - M365 neuer → RentalCore-Felder überschreiben
   - RentalCore neuer → ignorieren (Push läuft bereits)
4. Neuer Delta-Token in `sync_state` speichern

**Neuer M365-Kontakt (kein `m365_id`-Match):**
→ Neuen Customer in RentalCore anlegen, `m365_id` sofort setzen

**Gelöschter M365-Kontakt:**
→ Customer in RentalCore wird **archiviert**: `is_archived = true`, `archived_at = now()`, `m365_id = NULL`
→ Bestehende Job-Zuordnungen bleiben erhalten
→ Archivierte Kunden erscheinen nicht in der Kunden-Auswahl bei neuen Jobs
→ Reaktivierung manuell in RentalCore möglich

---

## 5. Konfliktauflösung

**Last-Write-Wins** auf Basis von Timestamps:

- `customers.updated_at` — wird bei jeder RentalCore-Änderung aktualisiert
- `m365_updated_at` — wird aus dem `lastModifiedDateTime`-Feld der Graph-Response befüllt

Beide Timestamps müssen in UTC verglichen werden.

---

## 6. Feldmapping

| RentalCore | M365 Graph API |
|---|---|
| `firstname` | `givenName` |
| `lastname` | `surname` |
| `companyname` | `companyName` |
| `email` | `emailAddresses[0].address` |
| `phonenumber` | `businessPhones[0]` |
| `street` + `housenumber` | `businessAddress.street` (zusammengeführt) |
| `zip` | `businessAddress.postalCode` |
| `city` | `businessAddress.city` |
| `country` | `businessAddress.countryOrRegion` |
| `notes` | `personalNotes` |

**Nicht synchronisiert** (RentalCore-intern):
- `customertype`, `is_customer`, `is_supplier`, `federalstate`

---

## 7. Archivierung in der UI

- Kundenliste: archivierte Kunden werden standardmäßig ausgeblendet
- Separater Filter/Tab "Archiv" zum Anzeigen archivierter Kunden
- Archivierte Kunden sind in Job-Zuordnungen (bestehend) weiterhin sichtbar, aber bei neuen Jobs nicht auswählbar
- Reaktivierungs-Button in der Kundendetailansicht

---

## 8. Nicht im Scope

- Synchronisierung von Kalender, E-Mails oder anderen M365-Daten
- Synchronisierung von WarehouseCore
- Automatisches Löschen in RentalCore (nur Archivierung)
- Mehrere Shared Mailboxes
