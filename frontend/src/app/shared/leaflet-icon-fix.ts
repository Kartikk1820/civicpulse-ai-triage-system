import * as L from 'leaflet';

let applied = false;

/** Leaflet's default marker icon paths break under bundlers; point them at the CDN instead. */
export function fixLeafletIcons(): void {
  if (applied) {
    return;
  }
  applied = true;
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}
