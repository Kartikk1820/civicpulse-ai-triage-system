import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { LeaderboardEntry } from '../../../core/models/user.model';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './leaderboard.component.html',
  styleUrl: './leaderboard.component.scss',
})
export class LeaderboardComponent implements OnInit {
  private http = inject(HttpClient);
  auth = inject(AuthService);

  entries: LeaderboardEntry[] = [];
  loading = true;

  ngOnInit(): void {
    this.http.get<LeaderboardEntry[]>(`${environment.apiUrl}/auth/leaderboard/`).subscribe({
      next: (res) => {
        this.entries = res;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  medal(index: number): string | null {
    return index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;
  }
}
