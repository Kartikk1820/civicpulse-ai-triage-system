export type IssueStatus = 'reported' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed' | 'rejected';
export type IssuePriority = 'low' | 'medium' | 'high' | 'critical';
export type IssueSeverity = '' | 'low' | 'medium' | 'high';

export interface Department {
  id: number;
  name: string;
  contact_email: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  default_department: number | null;
}

export interface IssueImage {
  id: number;
  image: string;
  image_type: 'report' | 'resolution';
  uploaded_at: string;
}

export interface IssueStatusHistoryEntry {
  id: number;
  old_status: string;
  new_status: string;
  changed_by_name: string | null;
  note: string;
  changed_at: string;
}

export interface Comment {
  id: number;
  user: number;
  user_name: string;
  text: string;
  created_at: string;
}

export interface IssueListItem {
  id: number;
  title: string;
  category: number | null;
  category_name: string | null;
  category_color: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  latitude: string;
  longitude: string;
  address: string;
  ai_severity: IssueSeverity;
  upvote_count: number;
  view_count: number;
  reporter_name: string;
  thumbnail: string | null;
  has_upvoted: boolean;
  created_at: string;
}

export interface IssueDetail extends IssueListItem {
  description: string;
  ai_category_suggestion: string;
  ai_summary: string;
  ai_processed: boolean;
  assigned_department: number | null;
  assigned_department_name: string | null;
  assigned_staff: number | null;
  images: IssueImage[];
  status_history: IssueStatusHistoryEntry[];
  comments: Comment[];
  updated_at: string;
  resolved_at: string | null;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface DuplicateCandidate {
  id: number;
  title: string;
  status: string;
  latitude: number;
  longitude: number;
  upvote_count: number;
  distance_m: number;
}

export const STATUS_LABELS: Record<IssueStatus, string> = {
  reported: 'Reported',
  acknowledged: 'Acknowledged',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  rejected: 'Rejected',
};

export const STATUS_ORDER: IssueStatus[] = ['reported', 'acknowledged', 'in_progress', 'resolved'];
