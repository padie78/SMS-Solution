export {
  EmissionFactorDTOSchema,
  parseEmissionFactorDTO,
  safeParseEmissionFactorDTO,
  EmissionFactorDTO,
  generateEmissionFactorId,
  EmissionFactorActivityTypeSchema,
  EmissionFactorScopeNumberSchema,
  EmissionFactorPhysicalUnitSchema,
  EmissionFactorCalculationMethodSchema,
  EmissionFactorGwpReferenceSchema,
  EmissionFactorCatalogStatusSchema,
  EmissionFactorDataQualityTierSchema,
  type EmissionFactorDTOInput
} from './emission-factor.dto.js';
export { EmissionFactorEntity } from './emission-factor.entity.js';
export {
  EmissionFactorMapper,
  type EmissionFactorPersistence
} from './emission-factor.mapper.js';
