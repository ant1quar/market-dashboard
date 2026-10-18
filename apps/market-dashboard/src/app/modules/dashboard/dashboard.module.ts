import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { MarketTableComponent } from './components/market-table/market-table.component';
import { ProducerControlsComponent } from './components/producer-controls/producer-controls.component';
import { dashboardRoutes } from './dashboard.routes';
import { DashboardPageComponent } from './pages/dashboard-page/dashboard-page.component';
import { ImbalancePipe } from './shared/pipes/imbalance.pipe';
import { PriceCentsPipe } from './shared/pipes/price-cents.pipe';

@NgModule({
  declarations: [
    DashboardPageComponent,
    MarketTableComponent,
    ProducerControlsComponent,
    PriceCentsPipe,
    ImbalancePipe,
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(dashboardRoutes),
    TableModule,
    ButtonModule,
    TagModule,
  ],
})
export class DashboardModule {}
