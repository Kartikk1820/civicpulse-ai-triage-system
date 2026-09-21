import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';

import { environment } from '../../../../environments/environment';
import { Category, Department } from '../../../core/models/issue.model';

@Component({
  selector: 'app-categories',
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
    MatSelectModule,
  ],
  templateUrl: './categories.component.html',
  styleUrl: '../issues-table/issues-table.component.scss',
})
export class CategoriesComponent implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  categories: Category[] = [];
  departments: Department[] = [];

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    color: ['#6750A4'],
    icon: [''],
    default_department: [null as number | null],
  });

  ngOnInit(): void {
    this.load();
    this.http
      .get<{ results: Department[] } | Department[]>(`${environment.apiUrl}/departments/`)
      .subscribe((res) => (this.departments = Array.isArray(res) ? res : res.results));
  }

  load(): void {
    this.http.get<{ results: Category[] } | Category[]>(`${environment.apiUrl}/categories/`).subscribe((res) => {
      this.categories = Array.isArray(res) ? res : res.results;
    });
  }

  add(): void {
    if (this.form.invalid) {
      return;
    }
    this.http.post(`${environment.apiUrl}/categories/`, this.form.getRawValue()).subscribe({
      next: () => {
        this.form.reset({ color: '#6750A4' });
        this.load();
      },
      error: () => this.snackBar.open('Could not create category.', 'Dismiss', { duration: 4000 }),
    });
  }

  remove(id: number): void {
    this.http.delete(`${environment.apiUrl}/categories/${id}/`).subscribe(() => this.load());
  }
}
