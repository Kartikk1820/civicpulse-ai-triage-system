import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { ImageUploaderComponent } from '../../../shared/components/image-uploader/image-uploader.component';
import { MapPickerComponent } from '../../../shared/components/map-picker/map-picker.component';
import { IssueService } from '../../../core/services/issue.service';
import { GeoService } from '../../../core/services/geo.service';
import { Category, DuplicateCandidate } from '../../../core/models/issue.model';

@Component({
  selector: 'app-report-issue',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    ImageUploaderComponent,
    MapPickerComponent,
  ],
  templateUrl: './report-issue.component.html',
  styleUrl: './report-issue.component.scss',
})
export class ReportIssueComponent implements OnInit {
  private fb = inject(FormBuilder);
  private issueService = inject(IssueService);
  private geo = inject(GeoService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  categories: Category[] = [];
  photos: File[] = [];
  submitting = false;
  geocoding = false;
  duplicates: DuplicateCandidate[] = [];
  checkingDuplicates = false;
  selectedLocation: { lat: number; lng: number } | null = null;

  locationForm = this.fb.nonNullable.group({
    address: [''],
  });

  detailsForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(6)]],
    description: [''],
    category: [null as number | null],
  });

  ngOnInit(): void {
    this.issueService.categories().subscribe((res) => (this.categories = res.results));

    this.detailsForm.controls.category.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.checkDuplicates();
    });
  }

  onPhotosChanged(files: File[]): void {
    this.photos = files;
  }

  onLocationChange(loc: { lat: number; lng: number }): void {
    this.selectedLocation = loc;
    this.geocoding = true;
    this.geo.reverseGeocode(loc.lat, loc.lng).subscribe({
      next: (address) => {
        this.locationForm.patchValue({ address });
        this.geocoding = false;
      },
      error: () => (this.geocoding = false),
    });
    this.checkDuplicates();
  }

  private checkDuplicates(): void {
    if (!this.selectedLocation) {
      return;
    }
    this.checkingDuplicates = true;
    const categoryId = this.detailsForm.controls.category.value ?? undefined;
    this.issueService.nearbyDuplicates(this.selectedLocation.lat, this.selectedLocation.lng, categoryId).subscribe({
      next: (results) => {
        this.duplicates = results;
        this.checkingDuplicates = false;
      },
      error: () => (this.checkingDuplicates = false),
    });
  }

  upvoteExisting(issueId: number): void {
    this.issueService.upvote(issueId).subscribe(() => {
      this.snackBar.open('Thanks! Upvoted the existing report instead.', 'OK', { duration: 4000 });
      this.router.navigate(['/issues', issueId]);
    });
  }

  submit(): void {
    if (this.detailsForm.invalid || !this.selectedLocation) {
      this.detailsForm.markAllAsTouched();
      return;
    }
    this.submitting = true;
    const { title, description, category } = this.detailsForm.getRawValue();
    const { address } = this.locationForm.getRawValue();

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description ?? '');
    if (category) {
      formData.append('category', String(category));
    }
    formData.append('latitude', String(this.selectedLocation.lat));
    formData.append('longitude', String(this.selectedLocation.lng));
    formData.append('address', address ?? '');
    this.photos.forEach((file) => formData.append('images', file));

    this.issueService.create(formData).subscribe({
      next: (issue) => {
        this.submitting = false;
        this.snackBar.open('Issue reported! AI is analyzing your photo…', 'OK', { duration: 4000 });
        this.router.navigate(['/issues', issue.id]);
      },
      error: () => {
        this.submitting = false;
        this.snackBar.open('Could not submit the report. Please try again.', 'Dismiss', { duration: 5000 });
      },
    });
  }
}
