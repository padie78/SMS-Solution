export {
  RegionDTOSchema,
  RegionalManagerDTOSchema,
  ClimateZoneSchema,
  CarbonMarketTypeSchema,
  MaturityLevelSchema,
  EconomicAreaSchema,
  parseRegionDTO,
  safeParseRegionDTO,
  RegionDTO,
  type RegionDTOInput,
  type ClimateZone,
  type CarbonMarketType,
  type MaturityLevel,
  type EconomicArea
} from './region.dto.js';

export { RegionEntity } from './region.entity.js';

export { RegionMapper, type RegionPersistence } from './region.mapper.js';
