import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IotTelemetryStateService } from '../../../features/iot-telemetry/services/iot-telemetry-state.service';

@Component({
  selector: 'app-iot-telemetry-asset-rail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './iot-telemetry-asset-rail.component.html',
  styleUrl: './iot-telemetry-asset-rail.component.scss'
})
export class IotTelemetryAssetRailComponent {
  readonly svc = inject(IotTelemetryStateService);

  pick(id: string): void {
    this.svc.selectAsset(id);
  }

  isActive(id: string): boolean {
    return this.svc.selectedAssetId() === id;
  }
}
