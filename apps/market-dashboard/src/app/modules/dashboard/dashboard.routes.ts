import { Route } from '@angular/router';
import { DashboardPageComponent } from './pages/dashboard-page/dashboard-page.component';

export const dashboardRoutes: Route[] = [
  {
    path: '',
    component: DashboardPageComponent,
  },
];
