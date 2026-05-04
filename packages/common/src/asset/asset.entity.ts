import { SmsDomainError } from '../shared/sms-domain-error.js';
import type { AssetType } from '../shared/domain-enums.js';
import type { AssetDTO } from './asset.dto.js';

/** Activo energético anclado a Building + CostCenter. */
export class AssetEntity {
  constructor(
    public readonly id: string,
    public readonly buildingId: string,
    public readonly costCenterId: string,
    public readonly type: AssetType,
    public readonly name?: string,
    public readonly status?: AssetDTO['status'],
    public readonly branchId?: string,
    public readonly meterId?: string,
    public readonly nominalPower?: number
  ) {
    this.assertHierarchy();
  }

  static fromDTO(dto: AssetDTO): AssetEntity {
    return new AssetEntity(
      dto.id,
      dto.buildingId,
      dto.costCenterId,
      dto.type,
      dto.name,
      dto.status,
      dto.branchId,
      dto.meterId,
      dto.nominalPower
    );
  }

  assertHierarchy(): void {
    if (!this.id?.trim()) throw new SmsDomainError('Asset.id required');
    if (!this.buildingId?.trim()) throw new SmsDomainError('Asset.buildingId required');
    if (!this.costCenterId?.trim()) throw new SmsDomainError('Asset.costCenterId required');
  }

  assertUnderBuilding(expectedBuildingId: string): void {
    if (this.buildingId !== expectedBuildingId) {
      throw new SmsDomainError(`Asset ${this.id} not under building ${expectedBuildingId}`);
    }
  }

  toValue(): AssetDTO {
    return {
      id: this.id,
      buildingId: this.buildingId,
      costCenterId: this.costCenterId,
      type: this.type,
      name: this.name,
      status: this.status,
      branchId: this.branchId,
      meterId: this.meterId,
      nominalPower: this.nominalPower
    };
  }
}
