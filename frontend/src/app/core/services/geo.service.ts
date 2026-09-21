import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

@Injectable({ providedIn: 'root' })
export class GeoService {
  private http = inject(HttpClient);

  reverseGeocode(lat: number, lng: number): Observable<string> {
    const url = `${NOMINATIM_BASE}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    return this.http.get<{ display_name?: string }>(url).pipe(map((res) => res.display_name ?? ''));
  }

  getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
    });
  }
}
