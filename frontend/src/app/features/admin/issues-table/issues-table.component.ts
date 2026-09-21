import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';

import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { IssueService, IssueFilters } from '../../../core/services/issue.service';
import { Category, Department, IssueListItem, IssueStatus, STATUS_LABELS } from '../../../core/models/issue.model';

@Component({
  selector: 'app-issues-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    MatTableModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    StatusBadgeComponent,
  ],
  templateUrl: './issues-table.component.html',
  styleUrl: './issues-table.component.scss',
})
export class IssuesTableComponent implements OnInit {
  private issueService = inject(IssueService);
  private snackBar = inject(MatSnackBar);

  issues: IssueListItem[] = [];
  categories: Category[] = [];
  departments: Department[] = [];
  loading = true;
  bulkUpdating = false;

  selected = new Set<number>();
  columns = ['select', 'title', 'category', 'status', 'priority', 'upvotes', 'reported'];
  statusLabels = STATUS_LABELS;
  statusChoices: IssueStatus[] = ['reported', 'acknowledged', 'in_progress', 'resolved', 'closed', 'rejected'];

  filters: IssueFilters = { ordering: '-created_at', page_size: 100 };
  bulkStatus: IssueStatus = 'acknowledged';

  ngOnInit(): void {
    this.issueService.categories().subscribe((res) => (this.categories = res.results));
    this.issueService.departments().subscribe((res) => (this.departments = res.results));
    this.load();
  }

  load(): void {
    this.loading = true;
    this.selected.clear();
    this.issueService.list(this.filters).subscribe({
      next: (res) => {
        this.issues = res.results;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  toggleSelect(id: number): void {
    this.selected.has(id) ? this.selected.delete(id) : this.selected.add(id);
  }

  toggleSelectAll(): void {
    if (this.selected.size === this.issues.length) {
      this.selected.clear();
    } else {
      this.issues.forEach((i) => this.selected.add(i.id));
    }
  }

  quickStatusChange(issue: IssueListItem, status: IssueStatus): void {
    this.issueService.updateStatus(issue.id, { status }).subscribe(() => this.load());
  }

  applyBulkStatus(): void {
    if (this.selected.size === 0) {
      return;
    }
    this.bulkUpdating = true;
    const requests = Array.from(this.selected).map((id) => this.issueService.updateStatus(id, { status: this.bulkStatus }));
    forkJoin(requests).subscribe({
      next: () => {
        this.bulkUpdating = false;
        this.snackBar.open(`Updated ${requests.length} issue(s) to ${this.statusLabels[this.bulkStatus]}.`, 'OK', {
          duration: 3000,
        });
        this.load();
      },
      error: () => (this.bulkUpdating = false),
    });
  }

  exportCsv(): void {
    const header = ['ID', 'Title', 'Category', 'Status', 'Priority', 'Upvotes', 'Reported At'];
    const rows = this.issues.map((i) => [
      i.id,
      `"${i.title.replace(/"/g, '""')}"`,
      i.category_name ?? '',
      i.status,
      i.priority,
      i.upvote_count,
      i.created_at,
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `civicpulse-issues-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
