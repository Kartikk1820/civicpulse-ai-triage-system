export type UserRole = 'citizen' | 'admin';

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  points: number;
  avatar: string | null;
  phone: string;
  date_joined: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LeaderboardEntry {
  id: number;
  username: string;
  points: number;
  avatar: string | null;
}
