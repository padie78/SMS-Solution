import { SmsDomainError } from '../shared/sms-domain-error.js';
import type { AssetType } from '../shared/domain-enums.js';
import type { AssetLifecycleStatus } from '../shared/graphql-setup-enums.js';
import type { AssetDTO } from './asset.dto.js';

/** Activo energético anclado a Building + CostCenter. */
export class AssetEntity {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly regionId: string,
    public readonly branchId: string,
    public readonly buildingId: string,
    public readonly costCenterId: string,
    public readonly name: string,
    public readonly type: AssetType,
    public readonly status: AssetLifecycleStatus,
    public readonly nominalPower?: number,
    public readonly meterId?: string,
    public readonly tags?: Record<string, string>,
    public readonly createdAt?: string,
    public readonly updatedAt?: string
  ) {
    this.assertHierarchy();
  }

  static fromDTO(dto: AssetDTO): AssetEntity {
    return new AssetEntity(
      dto.id,
      dto.organizationId,
      dto.regionId,
      dto.branchId,
      dto.buildingId,
      dto.costCenterId,
      dto.name,
      dto.type,
      dto.status,
      dto.nominalPower,
      dto.meterId,
      dto.tags,
      dto.createdAt,
      dto.updatedAt
    );
  }

  assertHierarchy(): void {
    if (!this.id?.trim()) throw new SmsDomainError('Asset.id required');
    if (!this.organizationId?.trim()) throw new SmsDomainError('Asset.organizationId required');
    if (!this.regionId?.trim()) throw new SmsDomainError('Asset.regionId required');
    if (!this.branchId?.trim()) throw new SmsDomainError('Asset.branchId required');
    if (!this.buildingId?.trim()) throw new SmsDomainError('Asset.buildingId required');
    if (!this.costCenterId?.trim()) throw new SmsDomainError('Asset.costCenterId required');
    if (!this.name?.trim()) throw new SmsDomainError('Asset.name required');
  }

  assertUnderBuilding(expectedBuildingId: string): void {
    if (this.buildingId !== expectedBuildingId) {
      throw new SmsDomainError(`Asset ${this.id} not under building ${expectedBuildingId}`);
    }
  }

  toValue(): AssetDTO {
    return {
      id: this.id,
      organizationId: this.organizationId,
      regionId: this.regionId,
      branchId: this.branchId,
      buildingId: this.buildingId,
      costCenterId: this.costCenterId,
      name: this.name,
      type: this.type,
      status: this.status,
      ...(this.nominalPower !== undefined ? { nominalPower: this.nominalPower } : {}),
      ...(this.meterId !== undefined ? { meterId: this.meterId } : {}),
      ...(this.tags !== undefined ? { tags: this.tags } : {}),
      ...(this.createdAt !== undefined ? { createdAt: this.createdAt } : {}),
      ...(this.updatedAt !== undefined ? { updatedAt: this.updatedAt } : {})
    };
  }
}
