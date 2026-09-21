import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Category,
  Department,
  DuplicateCandidate,
  IssueDetail,
  IssueListItem,
  IssuePriority,
  IssueStatus,
  PaginatedResponse,
} from '../models/issue.model';

export interface IssueFilters {
  status?: IssueStatus;
  category?: number;
  priority?: IssuePriority;
  assigned_department?: number;
  reporter?: number;
  ordering?: string;
  page?: number;
  page_size?: number;
}

@Injectable({ providedIn: 'root' })
export class IssueService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/issues/`;

  list(filters: IssueFilters = {}): Observable<PaginatedResponse<IssueListItem>> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<PaginatedResponse<IssueListItem>>(this.base, { params });
  }

  get(id: number): Observable<IssueDetail> {
    return this.http.get<IssueDetail>(`${this.base}${id}/`);
  }

  create(formData: FormData): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.base, formData);
  }

  updateStatus(
    id: number,
    payload: { status?: IssueStatus; priority?: IssuePriority; assigned_department?: number | null; note?: string }
  ): Observable<IssueDetail> {
    return this.http.patch<IssueDetail>(`${this.base}${id}/`, payload);
  }

  upvote(id: number): Observable<{ upvoted: boolean; upvote_count: number }> {
    return this.http.post<{ upvoted: boolean; upvote_count: number }>(`${this.base}${id}/upvote/`, {});
  }

  getComments(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}${id}/comments/`);
  }

  addComment(id: number, text: string): Observable<any> {
    return this.http.post(`${this.base}${id}/comments/`, { text });
  }

  uploadImage(id: number, file: File, imageType: 'report' | 'resolution' = 'resolution'): Observable<any> {
    const fd = new FormData();
    fd.append('image', file);
    fd.append('image_type', imageType);
    return this.http.post(`${this.base}${id}/images/`, fd);
  }

  nearbyDuplicates(lat: number, lng: number, categoryId?: number, radius = 100): Observable<DuplicateCandidate[]> {
    let params = new HttpParams().set('lat', lat).set('lng', lng).set('radius', radius);
    if (categoryId) {
      params = params.set('category', categoryId);
    }
    return this.http.get<DuplicateCandidate[]>(`${this.base}nearby_duplicates/`, { params });
  }

  categories(): Observable<PaginatedResponse<Category>> {
    return this.http.get<PaginatedResponse<Category>>(`${environment.apiUrl}/categories/`);
  }

  departments(): Observable<PaginatedResponse<Department>> {
    return this.http.get<PaginatedResponse<Department>>(`${environment.apiUrl}/departments/`);
  }
}
