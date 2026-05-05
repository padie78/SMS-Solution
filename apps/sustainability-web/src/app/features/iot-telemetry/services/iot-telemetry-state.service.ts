import { Injectable, computed, signal } from '@angular/core';
import type { TelemetryExplorerState } from '../../../core/models/iot-telemetry.model';
import { MOCK_TELEMETRY_EXPLORER_STATE } from '../data/iot-telemetry.mock';

@Injectable({ providedIn: 'root' })
export class IotTelemetryStateService {
  private readonly _state = signal<TelemetryExplorerState>(MOCK_TELEMETRY_EXPLORER_STATE);
  private readonly _selectedAssetId = signal<string>(MOCK_TELEMETRY_EXPLORER_STATE.assets[0]!.id);

  readonly state = this._state.asReadonly();
  readonly selectedAssetId = this._selectedAssetId.asReadonly();

  readonly selectedAsset = computed(() => {
    const id = this._selectedAssetId();
    return this._state().assets.find((a) => a.id === id) ?? this._state().assets[0]!;
  });

  selectAsset(id: string): void {
    this._selectedAssetId.set(id);
  }

  reloadMock(): void {
    this._state.set({ ...MOCK_TELEMETRY_EXPLORER_STATE });
  }
}
