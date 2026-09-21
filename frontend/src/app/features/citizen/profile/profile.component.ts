import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { Badge } from '../../../core/models/notification.model';

interface EarnedBadge {
  id: number;
  badge: Badge;
  earned_at: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  saving = false;
  myBadges: EarnedBadge[] = [];

  form = this.fb.nonNullable.group({
    email: [this.auth.currentUser?.email ?? '', [Validators.required, Validators.email]],
    phone: [this.auth.currentUser?.phone ?? ''],
  });

  ngOnInit(): void {
    this.http.get<EarnedBadge[]>(`${environment.apiUrl}/my-badges/`).subscribe((res) => (this.myBadges = res));
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }
    this.saving = true;
    this.auth.updateMe(this.form.getRawValue()).subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open('Profile updated.', 'OK', { duration: 3000 });
      },
      error: () => {
        this.saving = false;
        this.snackBar.open('Could not update profile.', 'Dismiss', { duration: 4000 });
      },
    });
  }
}
