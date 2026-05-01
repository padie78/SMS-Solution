import { Component, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ShellHeaderComponent } from '../../organisms/shell-header/shell-header.component';
import { ShellSidebarComponent } from '../../organisms/shell-sidebar/shell-sidebar.component';
import { FooterComponent } from '../../../components/layout/footer/footer.component';

@Component({
  selector: 'app-main-app-layout',
  standalone: true,
  imports: [RouterOutlet, ToastModule, ShellHeaderComponent, ShellSidebarComponent, FooterComponent],
  template: `
    <p-toast position="top-right" styleClass="rounded-xl shadow-xl"></p-toast>
    <div class="flex flex-col min-h-screen">
      <app-shell-header (toggleSidebar)="onToggleSidebar()" />
      <div class="flex flex-1 relative">
        <app-shell-sidebar #sidebar />
        <main class="flex-1 bg-slate-50 p-6 md:p-8" role="main">
          <router-outlet />
        </main>
      </div>
      <app-footer />
    </div>
  `
})
export class MainAppLayoutComponent {
  @ViewChild('sidebar') private sidebar!: ShellSidebarComponent;

  onToggleSidebar(): void {
    this.sidebar.toggle();
  }
}
