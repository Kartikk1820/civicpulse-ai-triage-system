export interface AppNotification {
  id: number;
  issue: number | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Badge {
  id: number;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold';
  points_required: number;
}
