import { useState } from 'react';
import { Settings, Users, Layers, Lightbulb, Cpu, FolderTree, Database, Ruler, KeyRound, Tag, Download, Shield } from 'lucide-react';
import { UsersTab } from '../components/admin/UsersTab';
import { ZoneTypesTab } from '../components/admin/ZoneTypesTab';
import { LEDSettingsTab } from '../components/admin/LEDSettingsTab';
import { LEDControllersTab } from '../components/admin/LEDControllersTab';
import { CategoriesTab } from '../components/admin/CategoriesTab';
import { BrandsManufacturersTab } from '../components/admin/BrandsManufacturersTab';
import { CountTypesTab } from '../components/admin/CountTypesTab';
import { RolesTab } from '../components/admin/RolesTab';
import { APISettingsTab } from '../components/admin/APISettingsTab';
import { APIKeysTab } from '../components/admin/APIKeysTab';
import { ExportTab } from '../components/admin/ExportTab';

type TabId = 'users' | 'roles' | 'zonetypes' | 'led' | 'controllers' | 'categories' | 'brands' | 'counttypes' | 'apisettings' | 'apikeys' | 'export';

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'users', label: 'Benutzer', icon: Users },
  { id: 'roles', label: 'Rollen', icon: Shield },
  { id: 'zonetypes', label: 'Lagertypen', icon: Layers },
  { id: 'led', label: 'LED-Verhalten', icon: Lightbulb },
  { id: 'controllers', label: 'ESP-Controller', icon: Cpu },
  { id: 'categories', label: 'Kategorien', icon: FolderTree },
  { id: 'brands', label: 'Marken', icon: Tag },
  { id: 'counttypes', label: 'Maßeinheiten', icon: Ruler },
  { id: 'apisettings', label: 'API-Einstellungen', icon: Database },
  { id: 'apikeys', label: 'API-Keys', icon: KeyRound },
  { id: 'export', label: 'CSV-Export', icon: Download },
];

export function AdminPage() {
  const [active, setActive] = useState<TabId>('users');

  const renderTab = () => {
    switch (active) {
      case 'users': return <UsersTab />;
      case 'roles': return <RolesTab />;
      case 'zonetypes': return <ZoneTypesTab />;
      case 'led': return <LEDSettingsTab />;
      case 'controllers': return <LEDControllersTab />;
      case 'categories': return <CategoriesTab />;
      case 'brands': return <BrandsManufacturersTab />;
      case 'counttypes': return <CountTypesTab />;
      case 'apisettings': return <APISettingsTab />;
      case 'apikeys': return <APIKeysTab />;
      case 'export': return <ExportTab />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-7 h-7 text-accent-red" />
        <div>
          <h1 className="text-2xl font-black text-white">Administration</h1>
          <p className="text-gray-500 text-sm">Systemeinstellungen aller Cores</p>
        </div>
      </div>

      <div className="rounded-xl p-2 flex gap-1 overflow-x-auto" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActive(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0
              ${active === id ? 'bg-accent-red text-white shadow-lg' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      <div className="rounded-xl p-5" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
        {renderTab()}
      </div>
    </div>
  );
}
