import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AnalyticsSummary {
  total: number;
  open: number;
  resolved_this_week: number;
  avg_resolution_hours: number | null;
  by_category: { category__name: string | null; count: number }[];
  by_status: { status: string; count: number }[];
}

export interface TrendPoint {
  day: string;
  count: number;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private http = inject(HttpClient);

  summary(): Observable<AnalyticsSummary> {
    return this.http.get<AnalyticsSummary>(`${environment.apiUrl}/analytics/summary/`);
  }

  trends(days = 30): Observable<TrendPoint[]> {
    return this.http.get<TrendPoint[]>(`${environment.apiUrl}/analytics/trends/?days=${days}`);
  }
}
