import { Component } from '@angular/core';
import { MainAppLayoutComponent } from './ui/templates/main-app-layout/main-app-layout.component';
/* test test test tesstttt  */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MainAppLayoutComponent],
  template: `<app-main-app-layout />`
})
export class AppComponent {}