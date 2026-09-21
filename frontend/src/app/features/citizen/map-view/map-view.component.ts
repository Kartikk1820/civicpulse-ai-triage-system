import { AfterViewInit, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.heat';
import { Subscription } from 'rxjs';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';

import { IssueService } from '../../../core/services/issue.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { Category, IssueListItem } from '../../../core/models/issue.model';
import { fixLeafletIcons } from '../../../shared/leaflet-icon-fix';

const DEFAULT_CENTER: L.LatLngTuple = [28.6139, 77.209];

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonToggleModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './map-view.component.html',
  styleUrl: './map-view.component.scss',
})
export class MapViewComponent implements OnInit, AfterViewInit, OnDestroy {
  private issueService = inject(IssueService);
  private ws = inject(WebSocketService);
  private router = inject(Router);
  private sub?: Subscription;

  private map!: L.Map;
  private clusterLayer!: L.MarkerClusterGroup;
  private heatLayer?: L.HeatLayer;
  private markersById = new Map<number, L.Marker>();

  mode: 'pins' | 'heat' = 'pins';
  categories: Category[] = [];
  selectedCategory?: number;
  issues: IssueListItem[] = [];

  constructor() {
    fixLeafletIcons();
  }

  ngOnInit(): void {
    this.issueService.categories().subscribe((res) => (this.categories = res.results));
    this.ws.connectIssuesFeed();
    this.sub = this.ws.issueEvents$.subscribe((evt) => this.handleLiveEvent(evt));
  }

  ngAfterViewInit(): void {
    this.map = L.map('cp-issues-map').setView(DEFAULT_CENTER, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    this.clusterLayer = (L as any).markerClusterGroup();
    this.map.addLayer(this.clusterLayer);

    this.loadIssues();
    setTimeout(() => this.map.invalidateSize(), 200);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.map?.remove();
  }

  onFilterChange(): void {
    this.loadIssues();
  }

  setMode(mode: 'pins' | 'heat'): void {
    this.mode = mode;
    this.renderLayers();
  }

  private loadIssues(): void {
    this.issueService.list({ category: this.selectedCategory, page: 1, ordering: '-created_at' }).subscribe((res) => {
      this.issues = res.results;
      this.renderLayers();
    });
  }

  private renderLayers(): void {
    if (!this.map) {
      return;
    }
    this.clusterLayer.clearLayers();
    this.markersById.clear();
    if (this.heatLayer) {
      this.map.removeLayer(this.heatLayer);
      this.heatLayer = undefined;
    }

    if (this.mode === 'pins') {
      this.issues.forEach((issue) => this.addMarker(issue));
      if (!this.map.hasLayer(this.clusterLayer)) {
        this.map.addLayer(this.clusterLayer);
      }
    } else {
      this.map.removeLayer(this.clusterLayer);
      const points: [number, number, number][] = this.issues.map((i) => [
        Number(i.latitude),
        Number(i.longitude),
        1,
      ]);
      this.heatLayer = (L as any).heatLayer(points, { radius: 28, blur: 20 }).addTo(this.map);
    }
  }

  private addMarker(issue: IssueListItem): void {
    const marker = L.marker([Number(issue.latitude), Number(issue.longitude)]);
    marker.bindPopup(this.popupHtml(issue));
    marker.on('popupopen', () => {
      const btn = document.getElementById(`cp-view-issue-${issue.id}`);
      btn?.addEventListener('click', () => this.router.navigate(['/issues', issue.id]));
    });
    this.markersById.set(issue.id, marker);
    this.clusterLayer.addLayer(marker);
  }

  private popupHtml(issue: IssueListItem): string {
    return `
      <div style="min-width:180px">
        <strong>${this.escape(issue.title)}</strong><br/>
        <span style="color:#666;font-size:0.8rem">${this.escape(issue.category_name ?? 'Uncategorized')} · ${issue.upvote_count} upvotes</span><br/>
        <button id="cp-view-issue-${issue.id}" style="margin-top:6px;cursor:pointer">View details</button>
      </div>
    `;
  }

  private escape(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private handleLiveEvent(evt: { event: string; issue: IssueListItem }): void {
    if (!evt?.issue || this.mode !== 'pins') {
      return;
    }
    if (evt.event === 'created') {
      this.issues = [evt.issue, ...this.issues];
      this.addMarker(evt.issue);
    }
  }
}
