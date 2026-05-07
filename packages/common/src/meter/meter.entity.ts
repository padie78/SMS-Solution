import { SmsDomainError } from '../shared/sms-domain-error.js';
import type { MeterType } from '../shared/domain-enums.js';
import type { MeterOperationalStatus, MeterProtocol } from '../shared/graphql-setup-enums.js';
import type { MeterDTO } from './meter.dto.js';

/** Punto de medición: siempre Building; opcionalmente Asset para sub-medición. */
export class MeterEntity {
  constructor(
    public readonly id: string,
    public readonly orgId: string,
    public readonly regionId: string,
    public readonly branchId: string,
    public readonly buildingId: string,
    public readonly meterType: MeterType,
    public readonly serialNumber: string,
    public readonly name: string,
    public readonly iotName: string,
    public readonly protocol: MeterProtocol,
    public readonly status: MeterOperationalStatus,
    public readonly isMain: boolean = false,
    public readonly assetId?: string,
    public readonly parentMeterId?: string,
    public readonly createdAt?: string,
    public readonly updatedAt?: string
  ) {
    this.assertMeasurementHierarchy();
  }

  static fromDTO(dto: MeterDTO): MeterEntity {
    return new MeterEntity(
      dto.id,
      dto.orgId,
      dto.regionId,
      dto.branchId,
      dto.buildingId,
      dto.meterType,
      dto.serialNumber,
      dto.name,
      dto.iotName,
      dto.protocol,
      dto.status,
      dto.isMain,
      dto.assetId,
      dto.parentMeterId,
      dto.createdAt,
      dto.updatedAt
    );
  }

  assertMeasurementHierarchy(): void {
    if (!this.id?.trim()) throw new SmsDomainError('Meter.id required');
    if (!this.orgId?.trim()) throw new SmsDomainError('Meter.orgId required');
    if (!this.regionId?.trim()) throw new SmsDomainError('Meter.regionId required');
    if (!this.branchId?.trim()) throw new SmsDomainError('Meter.branchId required');
    if (!this.buildingId?.trim()) {
      throw new SmsDomainError('Meter cannot exist without buildingId (localization tree)');
    }
    if (!this.serialNumber?.trim()) throw new SmsDomainError('Meter.serialNumber required');
    if (!this.name?.trim()) throw new SmsDomainError('Meter.name required');
    if (!this.iotName?.trim()) throw new SmsDomainError('Meter.iotName required');
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
      orgId: this.orgId,
      regionId: this.regionId,
      branchId: this.branchId,
      buildingId: this.buildingId,
      meterType: this.meterType,
      serialNumber: this.serialNumber,
      name: this.name,
      iotName: this.iotName,
      protocol: this.protocol,
      status: this.status,
      isMain: this.isMain,
      ...(this.assetId !== undefined ? { assetId: this.assetId } : {}),
      ...(this.parentMeterId !== undefined ? { parentMeterId: this.parentMeterId } : {}),
      ...(this.createdAt !== undefined ? { createdAt: this.createdAt } : {}),
      ...(this.updatedAt !== undefined ? { updatedAt: this.updatedAt } : {})
    };
  }
}
