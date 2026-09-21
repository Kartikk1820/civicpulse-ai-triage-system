import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';

import { AnalyticsService, AnalyticsSummary } from '../../../core/services/analytics.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule, MatProgressSpinnerModule, BaseChartDirective],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  private analytics = inject(AnalyticsService);

  loading = true;
  summary?: AnalyticsSummary;

  categoryChartData?: ChartData<'doughnut'>;
  statusChartData?: ChartData<'bar'>;
  trendChartData?: ChartData<'line'>;

  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
  };

  ngOnInit(): void {
    this.analytics.summary().subscribe({
      next: (summary) => {
        this.summary = summary;
        this.buildCategoryChart(summary);
        this.buildStatusChart(summary);
        this.loading = false;
      },
      error: () => (this.loading = false),
    });

    this.analytics.trends(30).subscribe((points) => {
      this.trendChartData = {
        labels: points.map((p) => p.day),
        datasets: [{ label: 'Issues reported', data: points.map((p) => p.count), fill: true, tension: 0.3 }],
      };
    });
  }

  private buildCategoryChart(summary: AnalyticsSummary): void {
    this.categoryChartData = {
      labels: summary.by_category.map((c) => c.category__name ?? 'Uncategorized'),
      datasets: [{ data: summary.by_category.map((c) => c.count) }],
    };
  }

  private buildStatusChart(summary: AnalyticsSummary): void {
    this.statusChartData = {
      labels: summary.by_status.map((s) => s.status),
      datasets: [{ label: 'Issues', data: summary.by_status.map((s) => s.count) }],
    };
  }
}
