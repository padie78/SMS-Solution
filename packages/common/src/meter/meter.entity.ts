import { SmsDomainError } from '../shared/sms-domain-error.js';
import type { MeterType } from '../shared/domain-enums.js';
import type { MeterProtocol } from '../shared/graphql-setup-enums.js';
import type { MeterDTO } from './meter.dto.js';

/** Punto de medición: siempre Building; opcionalmente Asset para sub-medición. */
export class MeterEntity {
  constructor(
    public readonly id: string,
    public readonly buildingId: string,
    public readonly meterType: MeterType,
    public readonly assetId?: string,
    public readonly serialNumber?: string,
    public readonly name?: string,
    public readonly branchId?: string,
    public readonly iotName?: string,
    public readonly protocol?: MeterProtocol,
    public readonly isMain?: boolean
  ) {
    this.assertMeasurementHierarchy();
  }

  static fromDTO(dto: MeterDTO): MeterEntity {
    return new MeterEntity(
      dto.id,
      dto.buildingId,
      dto.meterType,
      dto.assetId,
      dto.serialNumber,
      dto.name,
      dto.branchId,
      dto.iotName,
      dto.protocol,
      dto.isMain
    );
  }

  assertMeasurementHierarchy(): void {
    if (!this.id?.trim()) throw new SmsDomainError('Meter.id required');
    if (!this.buildingId?.trim()) {
      throw new SmsDomainError('Meter cannot exist without buildingId (localization tree)');
    }
  }

  isSubMeter(): boolean {
    return Boolean(this.assetId?.trim());
  }

  assertAssetAlignedWithBuilding(assetBuildingId: string): void {
    if (!this.assetId) return;
    if (this.buildingId !== assetBuildingId) {
      throw new SmsDomainError(
        `Meter ${this.id}: asset-linked meter must reference same building as asset (${assetBuildingId})`
      );
    }
  }

  toValue(): MeterDTO {
    return {
      id: this.id,
      buildingId: this.buildingId,
      meterType: this.meterType,
      assetId: this.assetId,
      serialNumber: this.serialNumber,
      name: this.name,
      branchId: this.branchId,
      iotName: this.iotName,
      protocol: this.protocol,
      isMain: this.isMain
    };
  }
}
