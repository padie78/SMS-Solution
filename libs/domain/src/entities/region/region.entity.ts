import { DomainInvariantError } from '../../exceptions/domain-invariant.error.js';
import type { LifecycleStatus } from '@sms/common';
import type { GeoCoordinatesDTO } from '@sms/common';
import { RegionDTO } from '@sms/common';

/** Nivel 2 — agrupa sucursales geopolíticas / compliance. */
export class RegionEntity {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly name: string,
    public readonly code: string,
    public readonly countryCode: string,
    public readonly timezone: string,
    public readonly coordinates: GeoCoordinatesDTO,
    public readonly climateZone: RegionDTO['climateZone'],
    public readonly avgHDD: number,
    public readonly avgCDD: number,
    public readonly totalRegionalM2: number,
    public readonly totalHeadcount: number,
    public readonly annualRevenueTarget: number | undefined,
    public readonly gridEmissionFactor: number,
    public readonly carbonTaxRate: number,
    public readonly carbonMarketType: RegionDTO['carbonMarketType'],
    public readonly marginalAbatementCost: number,
    public readonly renewableEnergyAvailability: number,
    public readonly gridRenewableShare: number,
    public readonly waterStressIndex: number,
    public readonly localRegulations: readonly string[],
    public readonly maturityLevel: RegionDTO['maturityLevel'],
    public readonly economicArea: RegionDTO['economicArea'],
    public readonly regionalManager: RegionDTO['regionalManager'],
    public readonly regionalReductionTarget: number,
    public readonly energyScarcityRisk: number,
    public readonly status: LifecycleStatus,
    public readonly description?: string,
    public readonly createdAt?: string,
    public readonly updatedAt?: string
  ) {
    this.assertIdentity();
  }

  static fromDTO(dto: RegionDTO): RegionEntity {
    return new RegionEntity(
      dto.id,
      dto.organizationId,
      dto.name,
      dto.code,
      dto.countryCode,
      dto.timezone,
      dto.coordinates,
      dto.climateZone,
      dto.avgHDD,
      dto.avgCDD,
      dto.totalRegionalM2,
      dto.totalHeadcount,
      dto.annualRevenueTarget,
      dto.gridEmissionFactor,
      dto.carbonTaxRate,
      dto.carbonMarketType,
      dto.marginalAbatementCost,
      dto.renewableEnergyAvailability,
      dto.gridRenewableShare,
      dto.waterStressIndex,
      dto.localRegulations,
      dto.maturityLevel,
      dto.economicArea,
      dto.regionalManager,
      dto.regionalReductionTarget,
      dto.energyScarcityRisk,
      dto.status,
      dto.description,
      dto.createdAt,
      dto.updatedAt
    );
  }

  assertIdentity(): void {
    if (!this.id?.trim()) throw new DomainInvariantError('Region.id required');
    if (!this.organizationId?.trim()) throw new DomainInvariantError('Region.organizationId required');
    if (!this.name?.trim()) throw new DomainInvariantError('Region.name required');
    if (!this.code?.trim()) throw new DomainInvariantError('Region.code required');
    if (!this.countryCode?.trim()) throw new DomainInvariantError('Region.countryCode required');
    if (!this.timezone?.trim()) throw new DomainInvariantError('Region.timezone required');
  }

  toValue(): RegionDTO {
    return new RegionDTO(
      this.id,
      this.organizationId,
      this.name,
      this.code,
      this.countryCode,
      this.timezone,
      this.coordinates,
      this.climateZone,
      this.avgHDD,
      this.avgCDD,
      this.totalRegionalM2,
      this.totalHeadcount,
      this.annualRevenueTarget,
      this.gridEmissionFactor,
      this.carbonTaxRate,
      this.carbonMarketType,
      this.marginalAbatementCost,
      this.renewableEnergyAvailability,
      this.gridRenewableShare,
      this.waterStressIndex,
      [...this.localRegulations],
      this.maturityLevel,
      this.economicArea,
      this.regionalManager,
      this.regionalReductionTarget,
      this.energyScarcityRisk,
      this.status,
      this.createdAt,
      this.updatedAt,
      this.description
    );
  }
}
