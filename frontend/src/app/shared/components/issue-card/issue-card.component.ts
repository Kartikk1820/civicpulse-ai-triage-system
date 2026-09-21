import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { IssueListItem } from '../../../core/models/issue.model';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { IssueService } from '../../../core/services/issue.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-issue-card',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule, StatusBadgeComponent],
  templateUrl: './issue-card.component.html',
  styleUrl: './issue-card.component.scss',
})
export class IssueCardComponent {
  @Input({ required: true }) issue!: IssueListItem;
  @Output() upvoted = new EventEmitter<IssueListItem>();

  private issueService = inject(IssueService);
  auth = inject(AuthService);
  upvoting = false;

  toggleUpvote(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.auth.isAuthenticated || this.upvoting) {
      return;
    }
    this.upvoting = true;
    this.issueService.upvote(this.issue.id).subscribe({
      next: (res) => {
        this.issue = { ...this.issue, has_upvoted: res.upvoted, upvote_count: res.upvote_count };
        this.upvoting = false;
        this.upvoted.emit(this.issue);
      },
      error: () => (this.upvoting = false),
    });
  }
}
