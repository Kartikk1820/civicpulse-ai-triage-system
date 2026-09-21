import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  template: `
    @if (auth.isAuthenticated) {
      <nav class="cp-bottom-nav">
        <a routerLink="/feed" routerLinkActive="active"><mat-icon>list_alt</mat-icon><span>Feed</span></a>
        <a routerLink="/map" routerLinkActive="active"><mat-icon>map</mat-icon><span>Map</span></a>
        <a routerLink="/report" routerLinkActive="active" class="cp-report-fab"
          ><mat-icon>add_circle</mat-icon><span>Report</span></a
        >
        <a routerLink="/my-reports" routerLinkActive="active"><mat-icon>assignment</mat-icon><span>Mine</span></a>
        <a routerLink="/leaderboard" routerLinkActive="active"
          ><mat-icon>leaderboard</mat-icon><span>Ranks</span></a
        >
      </nav>
    }
  `,
  styles: [
    `
      .cp-bottom-nav {
        display: none;
      }

      @media (max-width: 900px) {
        .cp-bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          justify-content: space-around;
          align-items: center;
          background: var(--cp-surface);
          border-top: 1px solid var(--cp-border);
          padding: 6px 0 max(6px, env(safe-area-inset-bottom));
          z-index: 100;
        }

        a {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          font-size: 0.65rem;
          text-decoration: none;
          color: var(--cp-text-muted);
        }

        a.active {
          color: var(--mat-sys-primary, #006494);
          font-weight: 600;
        }

        .cp-report-fab mat-icon {
          transform: scale(1.3);
        }
      }
    `,
  ],
})
export class BottomNavComponent {
  auth = inject(AuthService);
}
