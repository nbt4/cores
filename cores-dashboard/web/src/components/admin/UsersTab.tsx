import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { api } from '../../lib/api';

interface AppUser {
  userid?: number;
  UserID?: number;
  username?: string;
  Username?: string;
  email?: string;
  Email?: string;
  is_active?: boolean;
  IsActive?: boolean;
}

export function UsersTab() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/proxy/rental/api/v1/security/auth/users')
      .then(r => {
        const data = r.data as { users?: AppUser[] } | AppUser[];
        setUsers(Array.isArray(data) ? data : (data as { users?: AppUser[] }).users || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400 text-sm">Lade Benutzer...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-accent-red" />
        <h2 className="text-white font-semibold">Benutzerverwaltung</h2>
      </div>
      <div className="space-y-2">
        {users.map(u => {
          const id = u.userid ?? u.UserID;
          const name = u.username ?? u.Username ?? '—';
          const email = u.email ?? u.Email ?? '';
          const active = u.is_active ?? u.IsActive;
          return (
            <div key={id} className="flex items-center justify-between p-3 rounded-lg"
              style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <p className="text-white text-sm font-medium">{name}</p>
                <p className="text-gray-500 text-xs">{email}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${active ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                {active ? 'Aktiv' : 'Inaktiv'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
