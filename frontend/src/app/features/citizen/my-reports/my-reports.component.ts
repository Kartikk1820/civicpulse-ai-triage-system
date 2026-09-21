import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { IssueCardComponent } from '../../../shared/components/issue-card/issue-card.component';
import { IssueService } from '../../../core/services/issue.service';
import { AuthService } from '../../../core/services/auth.service';
import { IssueListItem } from '../../../core/models/issue.model';

@Component({
  selector: 'app-my-reports',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule, MatProgressSpinnerModule, IssueCardComponent],
  templateUrl: './my-reports.component.html',
  styleUrl: '../feed/feed.component.scss',
})
export class MyReportsComponent implements OnInit {
  private issueService = inject(IssueService);
  private auth = inject(AuthService);

  issues: IssueListItem[] = [];
  loading = true;

  ngOnInit(): void {
    const userId = this.auth.currentUser?.id;
    if (!userId) {
      this.loading = false;
      return;
    }
    this.issueService.list({ reporter: userId, ordering: '-created_at' }).subscribe({
      next: (res) => {
        this.issues = res.results;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }
}
