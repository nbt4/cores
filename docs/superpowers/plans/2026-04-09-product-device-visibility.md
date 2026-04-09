# Product Device Visibility — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gerätezähler direkt in Produktliste (Tabelle + Karten) anzeigen und im Detail-Modal eine vollständige Geräteliste mit IDs, Status, Zone etc. zugänglich machen.

**Architecture:** Backend ergänzt `device_count` per SQL-Subquery in beide Produkt-Endpoints. Frontend nutzt das existierende `ProductDevicesModal` im Listenkontext und fügt dem `ProductDetailModal` einen neuen "Geräte"-Tab mit lazy-loaded Geräteliste hinzu.

**Tech Stack:** Go 1.21+, `database/sql`, React 18, TypeScript, Tailwind CSS, Lucide Icons

---

## File Map

| Datei | Aktion | Zweck |
|---|---|---|
| `warehousecore/internal/handlers/product_handlers.go` | Modify | `DeviceCount` zu `Product`-Struct + Subquery in `GetProducts` + `GetProduct` |
| `warehousecore/web/src/components/admin/ProductsTab.tsx` | Modify | `device_count` im Interface, Tabellenspalte, Karten-Badge, Modal-State + Wiring |
| `warehousecore/web/src/components/ProductDetailModal.tsx` | Modify | Tab-System (Details / Geräte) + lazy-loaded Geräteliste |

---

## Task 1: Backend — device_count in Product struct und SQL-Queries

**Files:**
- Modify: `warehousecore/internal/handlers/product_handlers.go`

- [ ] **Schritt 1: `DeviceCount`-Feld zum `Product`-Struct hinzufügen**

In `product_handlers.go`, nach dem `CountTypeAbbr`-Feld (Zeile ~65), das Feld einfügen:

```go
// vorher (Zeile ~64–66):
	CountTypeName       *string `json:"count_type_name,omitempty"`
	CountTypeAbbr       *string `json:"count_type_abbr,omitempty"`
}

// nachher:
	CountTypeName       *string `json:"count_type_name,omitempty"`
	CountTypeAbbr       *string `json:"count_type_abbr,omitempty"`
	DeviceCount         int     `json:"device_count"`
}
```

- [ ] **Schritt 2: Subquery in `GetProducts` — SELECT ergänzen**

In `GetProducts` (ab Zeile ~82), in der `query`-Konstante, nach `ct.abbreviation as count_type_abbr` die Subquery anhängen:

```go
// vorher:
		ct.name as count_type_name,
		ct.abbreviation as count_type_abbr
	FROM products p

// nachher:
		ct.name as count_type_name,
		ct.abbreviation as count_type_abbr,
		(SELECT COUNT(*) FROM devices WHERE productID = p.productID) AS device_count
	FROM products p
```

- [ ] **Schritt 3: Scan in `GetProducts` — `&p.DeviceCount` anhängen**

In der `rows.Scan(...)`-Aufrufstelle in `GetProducts`, am Ende der Scan-Liste:

```go
// vorher:
			&p.CountTypeName,
			&p.CountTypeAbbr,
		)

// nachher:
			&p.CountTypeName,
			&p.CountTypeAbbr,
			&p.DeviceCount,
		)
```

- [ ] **Schritt 4: Subquery in `GetProduct` — SELECT ergänzen**

In `GetProduct` (ab Zeile ~219), identische Änderung wie Schritt 2:

```go
// vorher:
		ct.name as count_type_name,
		ct.abbreviation as count_type_abbr
	FROM products p

// nachher:
		ct.name as count_type_name,
		ct.abbreviation as count_type_abbr,
		(SELECT COUNT(*) FROM devices WHERE productID = p.productID) AS device_count
	FROM products p
```

- [ ] **Schritt 5: Scan in `GetProduct` — `&p.DeviceCount` anhängen**

In der `db.QueryRow(...).Scan(...)`-Aufrufstelle in `GetProduct`:

```go
// vorher:
		&p.CountTypeName,
		&p.CountTypeAbbr,
	)

// nachher:
		&p.CountTypeName,
		&p.CountTypeAbbr,
		&p.DeviceCount,
	)
```

- [ ] **Schritt 6: Backend bauen und prüfen**

```bash
cd warehousecore && go build ./...
```

Erwartetes Ergebnis: Kein Fehler.

- [ ] **Schritt 7: Manuell testen**

```bash
curl -s http://localhost:PORT/api/v1/admin/products | jq '.[0].device_count'
```

Erwartetes Ergebnis: Zahl (z. B. `5` oder `0`) — kein `null`.

- [ ] **Schritt 8: Commit**

```bash
cd warehousecore
git add internal/handlers/product_handlers.go
git commit -m "feat: add device_count to product list and detail endpoints"
```

---

## Task 2: Frontend — Gerätezähler in Produktliste (Tabelle + Karten) + Modal-Wiring

**Files:**
- Modify: `warehousecore/web/src/components/admin/ProductsTab.tsx`

- [ ] **Schritt 1: Imports erweitern**

Am Anfang der Datei die bestehenden Importe ergänzen:

```tsx
// vorher (Zeile ~1–19):
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Eye,
  GitBranch,
  LayoutGrid,
  List,
  Package,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../../lib/api';
import { ModalPortal } from '../ModalPortal';
import { DeviceTreeTab } from './DeviceTreeTab';
import { ProductDependenciesModal } from '../ProductDependenciesModal';
import { ProductDetailModal } from '../ProductDetailModal';

// nachher:
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu,
  Eye,
  GitBranch,
  LayoutGrid,
  List,
  Package,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { api, devicesApi, ledApi, type Device } from '../../lib/api';
import { ModalPortal } from '../ModalPortal';
import { DeviceTreeTab } from './DeviceTreeTab';
import { ProductDependenciesModal } from '../ProductDependenciesModal';
import { ProductDetailModal } from '../ProductDetailModal';
import { ProductDevicesModal } from '../ProductDevicesModal';
import { DeviceDetailModal } from '../DeviceDetailModal';
```

- [ ] **Schritt 2: `device_count` zum `Product`-Interface hinzufügen**

Im `Product`-Interface (Zeile ~21), nach dem letzten Feld `website_images`:

```tsx
// vorher:
  website_visible?: boolean;
  website_thumbnail?: string | null;
  website_images?: string[];
}

// nachher:
  website_visible?: boolean;
  website_thumbnail?: string | null;
  website_images?: string[];
  device_count?: number;
}
```

- [ ] **Schritt 3: `useNavigate` und neuen Modal-State hinzufügen**

Direkt nach dem ersten `useState`-Block der Komponente (nach Zeile ~182 wo `viewMode` initialisiert wird):

```tsx
// Nach den bestehenden useState-Deklarationen, vor dem ersten useEffect:
const navigate = useNavigate();

const [devicesModal, setDevicesModal] = useState<{ productId: number; productName: string } | null>(null);
const [devicesModalDevices, setDevicesModalDevices] = useState<Device[]>([]);
const [devicesModalLoading, setDevicesModalLoading] = useState(false);
const [devicesModalSelectedDevice, setDevicesModalSelectedDevice] = useState<Device | null>(null);
const [devicesModalDetailOpen, setDevicesModalDetailOpen] = useState(false);
```

- [ ] **Schritt 4: `handleOpenDevicesModal` und zugehörige Callbacks hinzufügen**

Nach den bestehenden Handler-Funktionen (z. B. nach `handleRefresh`), folgende Funktionen einfügen:

```tsx
const handleOpenDevicesModal = async (productId: number, productName: string) => {
  setDevicesModal({ productId, productName });
  setDevicesModalDevices([]);
  setDevicesModalLoading(true);
  try {
    const { data } = await api.get<Device[]>(`/admin/products/${productId}/devices`);
    setDevicesModalDevices(data);
  } catch (error) {
    console.error('Failed to load product devices:', error);
  } finally {
    setDevicesModalLoading(false);
  }
};

const handleDevicesModalLocate = async (device: Device) => {
  if (!device.zone_code) return;
  try {
    await ledApi.locateBin(device.zone_code);
  } catch (error) {
    console.error('LED locate failed:', error);
  }
};

const handleDevicesModalOpenZone = (device: Device) => {
  if (device.zone_id) {
    navigate(`/zones/${device.zone_id}`);
  }
};

const handleDevicesModalOpenDevice = async (device: Device) => {
  try {
    const { data } = await devicesApi.getById(device.device_id);
    setDevicesModalSelectedDevice(data);
    setDevicesModalDetailOpen(true);
  } catch (error) {
    console.error('Failed to load device detail:', error);
  }
};
```

- [ ] **Schritt 5: "Geräte"-Spalte in der Tabellenansicht hinzufügen**

In der Tabellen-Ansicht (`viewMode === 'table'`), in den `<thead>`:

```tsx
// vorher:
<th className="px-4 py-3 text-left font-semibold">Preis pro Tag</th>
<th className="px-4 py-3 text-right font-semibold">Aktionen</th>

// nachher:
<th className="px-4 py-3 text-left font-semibold">Preis pro Tag</th>
<th className="px-4 py-3 text-left font-semibold">Geräte</th>
<th className="px-4 py-3 text-right font-semibold">Aktionen</th>
```

In den `<tbody>`-Zeilen, nach der Preis-Zelle und vor der Aktions-Zelle:

```tsx
// vorher:
<td className="px-4 py-3 align-top text-sm text-gray-200">
  {formatCurrency(product.item_cost_per_day)}
</td>
<td className="px-4 py-3 align-top">
  <div className="flex justify-end gap-2">

// nachher:
<td className="px-4 py-3 align-top text-sm text-gray-200">
  {formatCurrency(product.item_cost_per_day)}
</td>
<td className="px-4 py-3 align-top">
  {(product.device_count ?? 0) > 0 ? (
    <button
      onClick={() => handleOpenDevicesModal(product.product_id, product.name)}
      className="flex items-center gap-1.5 rounded-lg bg-accent-red/20 px-2.5 py-1 text-xs font-semibold text-accent-red hover:bg-accent-red/30 transition-colors"
    >
      <Cpu className="h-3.5 w-3.5" />
      {product.device_count} Gerät{product.device_count === 1 ? '' : 'e'}
    </button>
  ) : (
    <span className="text-xs text-gray-500">— Keine</span>
  )}
</td>
<td className="px-4 py-3 align-top">
  <div className="flex justify-end gap-2">
```

- [ ] **Schritt 6: Geräte-Badge in der Kartenansicht hinzufügen**

In der Karten-Ansicht (`viewMode === 'cards'`), nach der `categoryPath`-Zeile:

```tsx
// vorher:
<p className="text-sm text-gray-400 break-words">{categoryPath(product)}</p>
{(product.brand_name || product.manufacturer_name) && (

// nachher:
<p className="text-sm text-gray-400 break-words">{categoryPath(product)}</p>
{(product.device_count ?? 0) > 0 ? (
  <button
    onClick={() => handleOpenDevicesModal(product.product_id, product.name)}
    className="flex items-center gap-1.5 rounded-lg bg-accent-red/20 px-2.5 py-1 text-xs font-semibold text-accent-red hover:bg-accent-red/30 transition-colors w-fit"
  >
    <Cpu className="h-3.5 w-3.5" />
    {product.device_count} Gerät{product.device_count === 1 ? '' : 'e'}
  </button>
) : (
  <span className="text-xs text-gray-500">Keine Geräte</span>
)}
{(product.brand_name || product.manufacturer_name) && (
```

- [ ] **Schritt 7: `ProductDevicesModal` und `DeviceDetailModal` rendern**

Direkt vor dem abschließenden `</div>` am Ende des JSX-Returns (vor der `{modalOpen && (...)}` Stelle), einfügen:

```tsx
{devicesModal && (
  <ProductDevicesModal
    isOpen={!!devicesModal}
    onClose={() => { setDevicesModal(null); setDevicesModalDevices([]); }}
    productName={devicesModal.productName}
    devices={devicesModalDevices}
    loading={devicesModalLoading}
    onLocate={handleDevicesModalLocate}
    onOpenZone={handleDevicesModalOpenZone}
    onOpenDevice={handleDevicesModalOpenDevice}
  />
)}

<DeviceDetailModal
  device={devicesModalSelectedDevice}
  isOpen={devicesModalDetailOpen}
  onClose={() => setDevicesModalDetailOpen(false)}
/>
```

- [ ] **Schritt 8: Frontend bauen**

```bash
cd warehousecore/web && npm run build 2>&1 | tail -20
```

Erwartetes Ergebnis: `✓ built in Xs` ohne TypeScript-Fehler.

- [ ] **Schritt 9: Commit**

```bash
cd warehousecore
git add web/src/components/admin/ProductsTab.tsx
git commit -m "feat: show device count badge in product list and add device modal"
```

---

## Task 3: Frontend — Geräte-Tab im ProductDetailModal

**Files:**
- Modify: `warehousecore/web/src/components/ProductDetailModal.tsx`

- [ ] **Schritt 1: Imports ergänzen**

Am Anfang der Datei:

```tsx
// vorher:
import { useEffect, useState } from 'react';
import { X, Package, Ruler, Weight, Zap, Tag, Box, DollarSign, Wrench, Barcode, Info, Image as ImageIcon, UploadCloud, Loader2, Eye } from 'lucide-react';
import { ModalPortal } from './ModalPortal';
import { useBlockBodyScroll } from '../hooks/useBlockBodyScroll';
import { productPicturesApi, productWebsiteApi } from '../lib/api';
import type { ChangeEvent } from 'react';
import type { ProductPicture } from '../lib/api';

// nachher:
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Package, Ruler, Weight, Zap, Tag, Box, DollarSign, Wrench, Barcode, Info, Image as ImageIcon, UploadCloud, Loader2, Eye, Cpu, MapPin } from 'lucide-react';
import { ModalPortal } from './ModalPortal';
import { useBlockBodyScroll } from '../hooks/useBlockBodyScroll';
import { productPicturesApi, productWebsiteApi, api, ledApi, devicesApi } from '../lib/api';
import type { ChangeEvent } from 'react';
import type { ProductPicture, Device } from '../lib/api';
import { DeviceDetailModal } from './DeviceDetailModal';
import { formatStatus, getStatusColor } from '../lib/utils';
```

- [ ] **Schritt 2: Tab-State und Geräte-State zur Komponente hinzufügen**

In `ProductDetailModal` direkt nach den bestehenden `useState`-Deklarationen (nach `websiteMessage`):

```tsx
const navigate = useNavigate();
const [activeTab, setActiveTab] = useState<'details' | 'devices'>('details');
const [devices, setDevices] = useState<Device[]>([]);
const [loadingDevices, setLoadingDevices] = useState(false);
const [devicesLoaded, setDevicesLoaded] = useState(false);
const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
const [deviceDetailOpen, setDeviceDetailOpen] = useState(false);
```

- [ ] **Schritt 3: Reset beim Öffnen/Schließen ergänzen**

Im bestehenden `useEffect` (Zeile ~101), das auf `[isOpen, product?.product_id]` lauscht:

```tsx
// vorher:
  useEffect(() => {
    if (isOpen && product) {
      loadPictures();
      setWebsiteVisible(Boolean(product.website_visible));
      setSelectedImages(new Set(product.website_images || []));
      setWebsiteThumbnail(product.website_thumbnail || null);
      setWebsiteMessage(null);
    } else {
      setPictures([]);
      setPictureError(null);
      setSelectedImages(new Set());
      setWebsiteThumbnail(null);
      setWebsiteMessage(null);
    }
  }, [isOpen, product?.product_id]);

// nachher:
  useEffect(() => {
    if (isOpen && product) {
      loadPictures();
      setWebsiteVisible(Boolean(product.website_visible));
      setSelectedImages(new Set(product.website_images || []));
      setWebsiteThumbnail(product.website_thumbnail || null);
      setWebsiteMessage(null);
      setActiveTab('details');
      setDevices([]);
      setDevicesLoaded(false);
    } else {
      setPictures([]);
      setPictureError(null);
      setSelectedImages(new Set());
      setWebsiteThumbnail(null);
      setWebsiteMessage(null);
      setDevices([]);
      setDevicesLoaded(false);
    }
  }, [isOpen, product?.product_id]);
```

- [ ] **Schritt 4: `loadDevices`-Funktion und Device-Aktions-Handler hinzufügen**

Nach der bestehenden `loadPictures`-Funktion:

```tsx
const loadDevices = async () => {
  if (!product || devicesLoaded) return;
  setLoadingDevices(true);
  try {
    const { data } = await api.get<Device[]>(`/admin/products/${product.product_id}/devices`);
    setDevices(data);
    setDevicesLoaded(true);
  } catch (error) {
    console.error('Failed to load devices:', error);
  } finally {
    setLoadingDevices(false);
  }
};

const handleLocateDevice = async (device: Device) => {
  if (!device.zone_code) return;
  try {
    await ledApi.locateBin(device.zone_code);
  } catch (error) {
    console.error('LED locate failed:', error);
  }
};

const handleOpenZone = (device: Device) => {
  if (device.zone_id) {
    navigate(`/zones/${device.zone_id}`);
  }
};

const handleOpenDevice = async (device: Device) => {
  try {
    const { data } = await devicesApi.getById(device.device_id);
    setSelectedDevice(data);
    setDeviceDetailOpen(true);
  } catch (error) {
    console.error('Failed to load device:', error);
  }
};
```

- [ ] **Schritt 5: Tab-Wechsel-Handler mit lazy load**

```tsx
const handleTabChange = (tab: 'details' | 'devices') => {
  setActiveTab(tab);
  if (tab === 'devices' && !devicesLoaded) {
    loadDevices();
  }
};
```

- [ ] **Schritt 6: Tab-Navigation in den Header einfügen**

Direkt nach dem `{/* Header */}`-Block (nach dem schließenden `</div>` des Headers, vor `{/* Content */}`):

```tsx
{/* Tabs */}
<div className="flex border-b border-white/10 px-6">
  <button
    onClick={() => handleTabChange('details')}
    className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
      activeTab === 'details'
        ? 'border-accent-red text-white'
        : 'border-transparent text-gray-400 hover:text-white'
    }`}
  >
    Details
  </button>
  <button
    onClick={() => handleTabChange('devices')}
    className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
      activeTab === 'devices'
        ? 'border-accent-red text-white'
        : 'border-transparent text-gray-400 hover:text-white'
    }`}
  >
    <Cpu className="w-4 h-4" />
    Geräte
    {product.device_count !== undefined && product.device_count > 0 && (
      <span className="ml-1 rounded-full bg-accent-red/20 px-1.5 py-0.5 text-xs text-accent-red">
        {product.device_count}
      </span>
    )}
  </button>
</div>
```

- [ ] **Schritt 7: Bestehenden Content in `details`-Tab einschließen und `devices`-Tab hinzufügen**

Die bestehende `{/* Content */}`-Section wrappen:

```tsx
{/* Content */}
{activeTab === 'details' ? (
  <div className="overflow-y-auto p-6 space-y-6">
    {/* BESTEHENDER INHALT UNVERÄNDERT (Produktbilder, Website-Einstellungen, technische Details etc.) */}
    {/* ... alle bestehenden Sections bleiben hier, nur eingerückt unter dieses div */}
  </div>
) : (
  <div className="overflow-y-auto p-6">
    {loadingDevices ? (
      <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Geräte werden geladen...</span>
      </div>
    ) : devices.length === 0 ? (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-gray-500">
        <Cpu className="w-10 h-10 text-gray-600" />
        <p className="text-sm">Keine Geräte diesem Produkt zugeordnet.</p>
      </div>
    ) : (
      <div className="space-y-2">
        <p className="text-sm text-gray-400 mb-4">{devices.length} Gerät{devices.length === 1 ? '' : 'e'}</p>
        {devices.map((device) => (
          <div
            key={device.device_id}
            onClick={() => handleOpenDevice(device)}
            className="glass rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-white text-sm truncate">{device.device_id}</span>
                {device.status && (
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full bg-white/10 uppercase tracking-wide ${getStatusColor(device.status)}`}>
                    {formatStatus(device.status)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mt-1">
                {device.zone_name && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {device.zone_name}
                  </span>
                )}
                {device.zone_code && (
                  <span className="text-gray-500 font-mono">({device.zone_code})</span>
                )}
                {device.case_name && <span>📦 {device.case_name}</span>}
                {device.job_number && <span>🔧 Job #{device.job_number}</span>}
                {device.serial_number && <span>SN: {device.serial_number}</span>}
                {device.barcode && <span>Barcode: {device.barcode}</span>}
              </div>
            </div>
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => handleLocateDevice(device)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-white/10 hover:bg-white/20 transition-colors"
                title="Fach aufleuchten"
              >
                <Cpu className="w-4 h-4 text-yellow-300" />
              </button>
              <button
                onClick={() => handleOpenZone(device)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-accent-red/80 hover:bg-accent-red transition-colors text-white"
                title="Zone öffnen"
              >
                <MapPin className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

- [ ] **Schritt 8: `DeviceDetailModal` am Ende des JSX rendern**

Direkt vor dem letzten `</div>` der Modalstruktur (vor `{previewIndex !== null && (...)}` Lightbox):

```tsx
<DeviceDetailModal
  device={selectedDevice}
  isOpen={deviceDetailOpen}
  onClose={() => setDeviceDetailOpen(false)}
/>
```

- [ ] **Schritt 9: `device_count` in ProductsTab an DetailModal übergeben**

In `ProductsTab.tsx`, in der `<ProductDetailModal>`-Stelle (Zeile ~1396), `device_count` zur Props-Übergabe hinzufügen:

```tsx
// vorher:
        product={viewProduct ? {
          product_id: viewProduct.product_id,
          name: viewProduct.name,
          // ...
          count_type_abbreviation: viewProduct.count_type_abbr || undefined,
        } : null}

// nachher:
        product={viewProduct ? {
          product_id: viewProduct.product_id,
          name: viewProduct.name,
          // ...
          count_type_abbreviation: viewProduct.count_type_abbr || undefined,
          device_count: viewProduct.device_count,
        } : null}
```

- [ ] **Schritt 10: Frontend bauen**

```bash
cd warehousecore/web && npm run build 2>&1 | tail -20
```

Erwartetes Ergebnis: `✓ built in Xs` ohne TypeScript-Fehler.

- [ ] **Schritt 11: Commit**

```bash
cd warehousecore
git add web/src/components/ProductDetailModal.tsx web/src/components/admin/ProductsTab.tsx
git commit -m "feat: add devices tab to product detail modal with lazy loading"
```

---

## Task 4: Docker Build & Push

**Files:** keine

- [ ] **Schritt 1: Aktuelle Version prüfen**

```bash
cd warehousecore && cat README.md | grep -E "^## Version|Version:" | head -3
```

Merke die aktuelle Versionsnummer (z. B. `1.14`).

- [ ] **Schritt 2: README-Version hochzählen**

Im `README.md` die Versionsnummer um eins erhöhen (z. B. `1.14` → `1.15`).

- [ ] **Schritt 3: GitLab pushen**

```bash
cd warehousecore && git push origin main
```

- [ ] **Schritt 4: Docker Image bauen und pushen**

```bash
cd warehousecore
docker build -t nobentie/warehousecore:1.NEW_VERSION .
docker push nobentie/warehousecore:1.NEW_VERSION
docker tag nobentie/warehousecore:1.NEW_VERSION nobentie/warehousecore:latest
docker push nobentie/warehousecore:latest
```

`NEW_VERSION` durch die neue Versionsnummer ersetzen.
