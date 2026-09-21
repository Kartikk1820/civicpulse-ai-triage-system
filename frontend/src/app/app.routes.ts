import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'feed', pathMatch: 'full' },

  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },

  {
    path: 'feed',
    loadComponent: () => import('./features/citizen/feed/feed.component').then((m) => m.FeedComponent),
  },
  {
    path: 'map',
    loadComponent: () => import('./features/citizen/map-view/map-view.component').then((m) => m.MapViewComponent),
  },
  {
    path: 'issues/:id',
    loadComponent: () =>
      import('./features/citizen/issue-detail/issue-detail.component').then((m) => m.IssueDetailComponent),
  },
  {
    path: 'leaderboard',
    loadComponent: () =>
      import('./features/citizen/leaderboard/leaderboard.component').then((m) => m.LeaderboardComponent),
  },

  {
    path: 'report',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/citizen/report-issue/report-issue.component').then((m) => m.ReportIssueComponent),
  },
  {
    path: 'my-reports',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/citizen/my-reports/my-reports.component').then((m) => m.MyReportsComponent),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./features/citizen/profile/profile.component').then((m) => m.ProfileComponent),
  },

  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/dashboard/dashboard.component').then((m) => m.AdminDashboardComponent),
  },
  {
    path: 'admin/issues',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/issues-table/issues-table.component').then((m) => m.IssuesTableComponent),
  },
  {
    path: 'admin/departments',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/departments/departments.component').then((m) => m.DepartmentsComponent),
  },
  {
    path: 'admin/categories',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/categories/categories.component').then((m) => m.CategoriesComponent),
  },

  { path: '**', redirectTo: 'feed' },
];
