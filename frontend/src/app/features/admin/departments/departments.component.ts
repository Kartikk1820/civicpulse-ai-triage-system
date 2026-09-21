import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';

import { environment } from '../../../../environments/environment';
import { Department } from '../../../core/models/issue.model';

@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './departments.component.html',
  styleUrl: '../issues-table/issues-table.component.scss',
})
export class DepartmentsComponent implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  departments: Department[] = [];

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    contact_email: [''],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.http.get<{ results: Department[] } | Department[]>(`${environment.apiUrl}/departments/`).subscribe((res) => {
      this.departments = Array.isArray(res) ? res : res.results;
    });
  }

  add(): void {
    if (this.form.invalid) {
      return;
    }
    this.http.post(`${environment.apiUrl}/departments/`, this.form.getRawValue()).subscribe({
      next: () => {
        this.form.reset();
        this.load();
      },
      error: () => this.snackBar.open('Could not create department.', 'Dismiss', { duration: 4000 }),
    });
  }

  remove(id: number): void {
    this.http.delete(`${environment.apiUrl}/departments/${id}/`).subscribe(() => this.load());
  }
}
