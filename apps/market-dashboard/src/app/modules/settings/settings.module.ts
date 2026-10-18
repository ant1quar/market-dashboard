import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SettingsPageComponent } from './pages/settings-page/settings-page.component';
import { settingsRoutes } from './settings.routes';

@NgModule({
  declarations: [SettingsPageComponent],
  imports: [CommonModule, RouterModule.forChild(settingsRoutes)],
})
export class SettingsModule {}
