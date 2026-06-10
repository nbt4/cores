import { q } from './db.js';

/**
 * Liest die Branding-Konfiguration für den "planner" Service aus der
 * geteilten branding_config-Tabelle. Wird von allen Cores-Services genutzt.
 */
export async function getBrandingConfig() {
  try {
    const { rows } = await q('SELECT * FROM branding_config WHERE id = 1');
    const row = rows[0] || {};

    return {
      companyName: row.company_name || 'Tsunami Events',
      brandName: row.brand_name || 'Planner',
      sidebarLogo: buildLogoUrl(row.logo_planner_sidebar),
      loginLogo: buildLogoUrl(row.logo_planner_login),
      faviconPath: buildLogoUrl(row.favicon_planner || row.favicon_path),
      logoSizeSidebar: Number(row.logo_size_sidebar) || 100,
      logoSizeLogin: Number(row.logo_size_login) || 100,
    };
  } catch {
    // Tabelle existiert evtl. noch nicht — Fallback liefern
    return {
      companyName: 'Tsunami Events',
      brandName: 'Planner',
      sidebarLogo: '/logos/plannercore_white_side.svg',
      loginLogo: '/logos/plannercore_white_side.svg',
      faviconPath: '/logos/plannercore_favicon.svg',
      logoSizeSidebar: 100,
      logoSizeLogin: 100,
    };
  }
}

function buildLogoUrl(filename) {
  if (!filename) return '';
  // Cache-Busting via Unix-Timestamp (ändert sich bei jedem Neustart,
  // aber das ist ok — Logos werden selten geändert)
  const v = Math.floor(Date.now() / 1000);
  // Wenn der Pfad bereits mit /logos beginnt, use as-is
  if (filename.startsWith('/logos/')) {
    return `${filename}?v=${v}`;
  }
  return `/logos/${filename}?v=${v}`;
}
