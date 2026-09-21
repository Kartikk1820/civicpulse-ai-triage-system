import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { IssueService } from '../../../core/services/issue.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AuthService } from '../../../core/services/auth.service';
import { Department, IssueDetail, IssueStatus, STATUS_ORDER, STATUS_LABELS } from '../../../core/models/issue.model';

@Component({
  selector: 'app-issue-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    StatusBadgeComponent,
  ],
  templateUrl: './issue-detail.component.html',
  styleUrl: './issue-detail.component.scss',
})
export class IssueDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private issueService = inject(IssueService);
  private ws = inject(WebSocketService);
  private snackBar = inject(MatSnackBar);
  auth = inject(AuthService);

  private sub?: Subscription;
  issue?: IssueDetail;
  loading = true;
  newComment = '';
  postingComment = false;
  upvoting = false;

  departments: Department[] = [];
  statusOrder = STATUS_ORDER;
  statusLabels = STATUS_LABELS;
  adminStatusChoices: IssueStatus[] = ['reported', 'acknowledged', 'in_progress', 'resolved', 'closed', 'rejected'];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.load(id);

    if (this.auth.isAdmin) {
      this.issueService.departments().subscribe((res) => (this.departments = res.results));
    }

    this.ws.connectIssuesFeed();
    this.sub = this.ws.issueEvents$.subscribe((evt) => {
      if (evt?.issue?.id === id && (evt.event === 'ai_suggestion' || evt.event === 'status_changed' || evt.event === 'upvoted')) {
        this.issue = { ...this.issue, ...evt.issue };
        if (evt.event === 'ai_suggestion') {
          this.snackBar.open('AI has analyzed the photo and suggested a category.', 'OK', { duration: 4000 });
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  load(id: number): void {
    this.loading = true;
    this.issueService.get(id).subscribe({
      next: (issue) => {
        this.issue = issue;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  toggleUpvote(): void {
    if (!this.issue || this.upvoting) {
      return;
    }
    this.upvoting = true;
    this.issueService.upvote(this.issue.id).subscribe({
      next: (res) => {
        this.issue = { ...this.issue!, has_upvoted: res.upvoted, upvote_count: res.upvote_count };
        this.upvoting = false;
      },
      error: () => (this.upvoting = false),
    });
  }

  postComment(): void {
    if (!this.issue || !this.newComment.trim()) {
      return;
    }
    this.postingComment = true;
    this.issueService.addComment(this.issue.id, this.newComment.trim()).subscribe({
      next: (comment) => {
        this.issue = { ...this.issue!, comments: [...this.issue!.comments, comment] };
        this.newComment = '';
        this.postingComment = false;
      },
      error: () => (this.postingComment = false),
    });
  }

  updateStatus(status: IssueStatus): void {
    if (!this.issue) {
      return;
    }
    this.issueService.updateStatus(this.issue.id, { status }).subscribe((updated) => {
      this.issue = { ...this.issue!, ...updated };
      this.snackBar.open(`Status updated to ${this.statusLabels[status]}.`, 'OK', { duration: 3000 });
    });
  }

  assignDepartment(departmentId: number): void {
    if (!this.issue) {
      return;
    }
    this.issueService.updateStatus(this.issue.id, { assigned_department: departmentId }).subscribe((updated) => {
      this.issue = { ...this.issue!, ...updated };
    });
  }

  uploadResolutionPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.issue) {
      return;
    }
    this.issueService.uploadImage(this.issue.id, file, 'resolution').subscribe(() => {
      this.load(this.issue!.id);
    });
    input.value = '';
  }

  stepIndex(status: IssueStatus): number {
    return this.statusOrder.indexOf(status);
  }

  statusLabel(status: string): string {
    return (this.statusLabels as Record<string, string>)[status] ?? status;
  }
}
