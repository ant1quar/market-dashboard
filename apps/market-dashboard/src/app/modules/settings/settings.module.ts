import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { SettingsFormComponent } from './components/settings-form/settings-form.component';
import { SettingsPageComponent } from './pages/settings-page/settings-page.component';
import { settingsRoutes } from './settings.routes';

@NgModule({
  declarations: [SettingsPageComponent, SettingsFormComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(settingsRoutes),
    InputNumberModule,
    ButtonModule,
  ],
})
export class SettingsModule {}
