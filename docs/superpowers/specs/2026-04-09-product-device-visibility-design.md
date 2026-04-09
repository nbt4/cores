# Product–Device Visibility: Liste & Detail-Modal

**Datum:** 2026-04-09  
**Projekt:** WarehouseCore  
**Scope:** Gerätezähler in der Produktliste (Tabelle + Karten) + Geräte-Tab im Detail-Modal

---

## Problem

Aktuell sind Geräte pro Produkt nur im "Gerätebaum"-View der ProductsPage sichtbar. In der Tabellen- und Kartenansicht gibt es weder einen Zähler noch eine Möglichkeit, die zugeordneten Devices direkt einzusehen. Das Detail-Modal zeigt zwar ein optionales `device_count`-Feld, dieses wird aber nie befüllt, und eine Device-Liste fehlt vollständig.

---

## Entscheidungen

| Entscheidung | Gewählt |
|---|---|
| Wie device_count laden? | SQL-Subquery direkt in `GetProducts` + `GetProduct` — ein Roundtrip, kein N+1 |
| Wo Geräteliste in der Liste zeigen? | Klickbarer Badge in Tabellenspalte + Karten-Badge → öffnet `ProductDevicesModal` |
| Wo Geräteliste in Details zeigen? | Neuer "Geräte"-Tab in `ProductDetailModal`, lazy load beim ersten Öffnen |
| Kein extra Endpoint nötig? | Korrekt — `/admin/products/:id/devices` existiert bereits |

---

## Backend

### Änderung: `product_handlers.go`

**`GetProducts` und `GetProduct`** bekommen identisch dieselbe Subquery im SELECT:

```sql
(SELECT COUNT(*) FROM devices WHERE productID = p.productID) AS device_count
```

Das `Product`-Struct bekommt:
```go
DeviceCount int `json:"device_count"`
```

Scan-Reihenfolge in beiden Funktionen um `&p.DeviceCount` ergänzen.

**Keine Schema-Änderung, kein neuer Endpoint.**

---

## Frontend

### 1. Tabelle (`ProductsTab.tsx` — `viewMode === 'table'`)

- Neue Spalte **"Geräte"** nach "Preis pro Tag"
- Inhalt: Badge-Button mit `{product.device_count} Gerät(e)`
- Bei `device_count === 0`: grauer, nicht klickbarer Badge
- Bei `device_count > 0`: klickbarer Badge (accent-red/80) → öffnet `ProductDevicesModal`
- `Product`-Interface: `device_count?: number` ergänzen

### 2. Karten (`viewMode === 'cards'`)

- Badge unter dem Produktnamen: `{product.device_count} Gerät(e)`
- Gleiche Klick-Logik wie Tabelle

### 3. Modal-State in `ProductsTab`

Neuer State:
```ts
const [devicesModal, setDevicesModal] = useState<{ productId: number; productName: string } | null>(null);
const [devicesModalDevices, setDevicesModalDevices] = useState<Device[]>([]);
const [devicesModalLoading, setDevicesModalLoading] = useState(false);
```

Handler `handleOpenDevicesModal(productId, productName)`:
1. Setzt State, öffnet Modal
2. Fetcht `/admin/products/${productId}/devices`
3. Setzt `devicesModalDevices`

`onLocate`, `onOpenZone`, `onOpenDevice` analog zu `DeviceTreeTab` verdrahten.

### 4. `ProductDetailModal` — neuer "Geräte"-Tab

**Interface-Erweiterung:**
```ts
interface ProductDetailModalProps {
  product: ProductDetail | null;
  isOpen: boolean;
  onClose: () => void;
}
```

`ProductDetail` bekommt `device_count?: number` (existiert bereits).

**Tabs:** Neuer Tab-Reiter "Geräte" neben dem Bilder/Website-Bereich.

**Tab-Inhalt:**
- Beim ersten Öffnen des Tabs: Fetch `/admin/products/{product_id}/devices`
- Loading-Spinner während Fetch
- Device-Liste: für jedes Device eine Zeile mit ID, Status-Badge, Zone, Case, Job, Seriennummer — identisches Layout wie `ProductDevicesModal` (kein nested Modal)
- Bei 0 Geräten: leerer State "Keine Geräte zugeordnet"

---

## Was existiert bereits

| Komponente | Status |
|---|---|
| `/admin/products/:id/devices` Endpoint | ✓ existiert |
| `ProductDevicesModal` (Liste + Aktionen) | ✓ existiert, wird übernommen |
| `Device`-Interface in `api.ts` | ✓ existiert |
| `ProductDetail.device_count` Feld | ✓ existiert (aber nie befüllt) |
| `DeviceTreeTab` als Referenz für Modal-Wiring | ✓ existiert |

---

## Out of Scope

- Gerät direkt aus dem Detail-Modal bearbeiten
- Filter/Sortierung der Geräteliste im Detail-Modal
- Geräte-Export
