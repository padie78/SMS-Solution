import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LocationManagerPage } from '../../pages/compliance/location-manager/location-manager.page';

/**
 * Ruta feature-shell para `/compliance/locations`.
 * Mantiene el mismo patrón que `features/dashboard/*`.
 */
@Component({
  selector: 'app-location',
  standalone: true,
  imports: [LocationManagerPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<sms-location-manager-page />`
})
export class LocationComponent {}

