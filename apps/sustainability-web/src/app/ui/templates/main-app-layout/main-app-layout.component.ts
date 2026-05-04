import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ShellHeaderComponent } from '../../organisms/shell-header/shell-header.component';
import { ShellSidebarComponent } from '../../organisms/shell-sidebar/shell-sidebar.component';
import { FooterComponent } from '../../../components/layout/footer/footer.component';
import { SidenavLayoutService } from '../../layout/sidenav-layout.service';

@Component({
  selector: 'app-main-app-layout',
  standalone: true,
  imports: [RouterOutlet, ToastModule, ShellHeaderComponent, ShellSidebarComponent, FooterComponent],
  templateUrl: './main-app-layout.component.html',
  styleUrls: ['./main-app-layout.component.scss']
})
export class MainAppLayoutComponent {
  readonly sidenav = inject(SidenavLayoutService);
}
