import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { IssueCardComponent } from '../../../shared/components/issue-card/issue-card.component';
import { IssueService, IssueFilters } from '../../../core/services/issue.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { Category, IssueListItem, IssueStatus } from '../../../core/models/issue.model';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    IssueCardComponent,
  ],
  templateUrl: './feed.component.html',
  styleUrl: './feed.component.scss',
})
export class FeedComponent implements OnInit, OnDestroy {
  private issueService = inject(IssueService);
  private ws = inject(WebSocketService);
  private sub?: Subscription;

  issues: IssueListItem[] = [];
  categories: Category[] = [];
  loading = true;

  filters: IssueFilters = { ordering: '-created_at' };
  statusOptions: { value: IssueStatus; label: string }[] = [
    { value: 'reported', label: 'Reported' },
    { value: 'acknowledged', label: 'Acknowledged' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
  ];

  ngOnInit(): void {
    this.issueService.categories().subscribe((res) => (this.categories = res.results));
    this.load();

    this.ws.connectIssuesFeed();
    this.sub = this.ws.issueEvents$.subscribe((evt) => this.handleLiveEvent(evt));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  load(): void {
    this.loading = true;
    this.issueService.list(this.filters).subscribe({
      next: (res) => {
        this.issues = res.results;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  onUpvoted(updated: IssueListItem): void {
    this.issues = this.issues.map((i) => (i.id === updated.id ? updated : i));
  }

  private handleLiveEvent(evt: { event: string; issue: IssueListItem }): void {
    if (!evt?.issue) {
      return;
    }
    if (evt.event === 'created') {
      this.issues = [evt.issue, ...this.issues];
    } else {
      this.issues = this.issues.map((i) => (i.id === evt.issue.id ? { ...i, ...evt.issue } : i));
    }
  }
}
