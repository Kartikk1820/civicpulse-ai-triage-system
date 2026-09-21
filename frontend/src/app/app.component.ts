import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { BottomNavComponent } from './shared/components/navbar/bottom-nav.component';
import { AuthService } from './core/services/auth.service';
import { NotificationService } from './core/services/notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, BottomNavComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private auth = inject(AuthService);
  private notifications = inject(NotificationService);

  private notificationsStarted = false;

  ngOnInit(): void {
    this.auth.currentUser$.subscribe((user) => {
      if (user && !this.notificationsStarted) {
        this.notificationsStarted = true;
        this.notifications.init();
      }
    });
  }
}
