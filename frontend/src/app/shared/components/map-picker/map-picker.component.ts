import { AfterViewInit, Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GeoService } from '../../../core/services/geo.service';
import { fixLeafletIcons } from '../../leaflet-icon-fix';

const DEFAULT_CENTER: L.LatLngTuple = [28.6139, 77.209]; // New Delhi fallback
let instanceCounter = 0;

@Component({
  selector: 'app-map-picker',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './map-picker.component.html',
  styleUrl: './map-picker.component.scss',
})
export class MapPickerComponent implements AfterViewInit, OnDestroy {
  @Input() initialLat?: number;
  @Input() initialLng?: number;
  @Output() locationChange = new EventEmitter<{ lat: number; lng: number }>();

  private map!: L.Map;
  private marker!: L.Marker;
  locating = false;
  readonly elementId = `map-picker-${instanceCounter++}`;

  constructor(private geo: GeoService) {
    fixLeafletIcons();
  }

  ngAfterViewInit(): void {
    const center: L.LatLngTuple =
      this.initialLat && this.initialLng ? [this.initialLat, this.initialLng] : DEFAULT_CENTER;

    this.map = L.map(this.elementId, { zoomControl: true }).setView(center, 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    this.marker = L.marker(center, { draggable: true }).addTo(this.map);
    this.marker.on('dragend', () => this.emitLocation());
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.marker.setLatLng(e.latlng);
      this.emitLocation();
    });

    if (this.initialLat && this.initialLng) {
      this.emitLocation();
    } else {
      this.useMyLocation();
    }

    setTimeout(() => this.map.invalidateSize(), 200);
  }

  async useMyLocation(): Promise<void> {
    this.locating = true;
    try {
      const pos = await this.geo.getCurrentPosition();
      const latlng: L.LatLngTuple = [pos.coords.latitude, pos.coords.longitude];
      this.map.setView(latlng, 17);
      this.marker.setLatLng(latlng);
      this.emitLocation();
    } catch {
      // user denied or unsupported — leave default/manual pin in place
    } finally {
      this.locating = false;
    }
  }

  private emitLocation(): void {
    const { lat, lng } = this.marker.getLatLng();
    this.locationChange.emit({ lat, lng });
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }
}
