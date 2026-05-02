import type { SetupApiService, SetupMutationResult } from '../../services/infrastructure/setup-api.service';
import type { SetupContextService } from '../../services/state/setup-context.service';

export type SetupFieldType = 'text' | 'number' | 'checkbox';

export interface SetupFieldDef {
  key: string;
  label: string;
  type: SetupFieldType;
  default?: string | number | boolean;
}

export type SetupPageKey =
  | 'organization'
  | 'branch'
  | 'building'
  | 'cost-center'
  | 'asset'
  | 'meter'
  | 'tariff'
  | 'alert-rule'
  | 'user'
  | 'production'
  | 'emission-factor';

export interface SetupPageRegistryEntry {
  title: string;
  subtitle: string;
  fields: SetupFieldDef[];
  submit: (
    api: SetupApiService,
    ctx: SetupContextService,
    values: Record<string, unknown>
  ) => Promise<SetupMutationResult>;
}

function gv(form: Record<string, unknown>, key: string): unknown {
  return form[key];
}

function s(form: Record<string, unknown>, key: string): string {
  const v = gv(form, key);
  return v == null ? '' : String(v).trim();
}

function n(form: Record<string, unknown>, key: string): number {
  const x = Number(gv(form, key));
  return Number.isFinite(x) ? x : 0;
}

function b(form: Record<string, unknown>, key: string): boolean {
  return Boolean(gv(form, key));
}

export const SETUP_PAGE_REGISTRY: Record<SetupPageKey, SetupPageRegistryEntry> = {
  organization: {
    title: 'Organización global',
    subtitle:
      'Perfil corporativo, monedas, confianza mínima de IA y objetivos de reducción (saveOrgConfig).',
    fields: [
      { key: 'name', label: 'Nombre', type: 'text', default: "SMS Be'er Sheva Global" },
      { key: 'taxId', label: 'Tax ID', type: 'text', default: 'ISR-123' },
      { key: 'hqAddress', label: 'Sede / dirección HQ', type: 'text', default: 'South District' },
      { key: 'totalGlobalM2', label: 'Superficie global (m²)', type: 'number', default: 15000 },
      { key: 'industrySector', label: 'Sector industrial', type: 'text', default: 'MANUFACTURING' },
      { key: 'currency', label: 'Moneda operativa', type: 'text', default: 'ILS' },
      { key: 'reportingCurrency', label: 'Moneda reporting', type: 'text', default: 'USD' },
      { key: 'minConfidence', label: 'Confianza mínima (0–1)', type: 'number', default: 0.85 },
      { key: 'baselineYear', label: 'Año baseline', type: 'number', default: 2024 },
      { key: 'reductionTarget', label: 'Objetivo reducción (fracción)', type: 'number', default: 0.4 },
      { key: 'targetYear', label: 'Año objetivo', type: 'number', default: 2030 },
      { key: 'subscriptionPlan', label: 'Plan suscripción', type: 'text', default: 'ENTERPRISE' }
    ],
    submit: async (api, _ctx, v) =>
      api.saveOrgConfig({
        name: s(v, 'name'),
        taxId: s(v, 'taxId'),
        hqAddress: s(v, 'hqAddress'),
        totalGlobalM2: n(v, 'totalGlobalM2'),
        industrySector: s(v, 'industrySector'),
        currency: s(v, 'currency'),
        reportingCurrency: s(v, 'reportingCurrency'),
        minConfidence: n(v, 'minConfidence'),
        baselineYear: Math.round(n(v, 'baselineYear')),
        reductionTarget: n(v, 'reductionTarget'),
        targetYear: Math.round(n(v, 'targetYear')),
        subscriptionPlan: s(v, 'subscriptionPlan')
      })
  },

  branch: {
    title: 'Sucursal',
    subtitle: 'Alta de planta / sede operativa (createBranch). Tras guardar, se memoriza el Branch ID.',
    fields: [
      { key: 'branchId', label: 'Branch ID', type: 'text', default: 'BR-PLANT-001' },
      { key: 'name', label: 'Nombre', type: 'text', default: "Planta Be'er Sheva Sur" },
      { key: 'm2Surface', label: 'Superficie (m²)', type: 'number', default: 4500 },
      { key: 'facilityType', label: 'Tipo instalación', type: 'text', default: 'MANUFACTURING' },
      { key: 'timezone', label: 'Timezone', type: 'text', default: 'Asia/Jerusalem' },
      { key: 'region', label: 'Región / distrito', type: 'text', default: 'South-District' }
    ],
    submit: async (api, ctx, v) => {
      const out = await api.createBranch({
        branchId: s(v, 'branchId'),
        name: s(v, 'name'),
        m2Surface: n(v, 'm2Surface'),
        facilityType: s(v, 'facilityType'),
        timezone: s(v, 'timezone'),
        region: s(v, 'region')
      });
      if (out.success && s(v, 'branchId')) {
        ctx.setBranchId(s(v, 'branchId'));
      }
      return out;
    }
  },

  building: {
    title: 'Edificio',
    subtitle: 'Activo físico bajo sucursal (saveBuilding). Usa Branch ID memorizado si existe.',
    fields: [
      { key: 'branchId', label: 'Branch ID', type: 'text', default: '' },
      { key: 'buildingId', label: 'Building ID', type: 'text', default: 'MAIN-SILO' },
      { key: 'name', label: 'Nombre', type: 'text', default: 'Silo Principal B1' },
      { key: 'usageType', label: 'Uso', type: 'text', default: 'STORAGE_INDUSTRIAL' },
      { key: 'status', label: 'Estado', type: 'text', default: 'OPERATIONAL' },
      { key: 'yearBuilt', label: 'Año construcción', type: 'number', default: 2015 },
      { key: 'm2Surface', label: 'Superficie (m²)', type: 'number', default: 1200 },
      { key: 'm3Volume', label: 'Volumen (m³)', type: 'number', default: 18000 },
      { key: 'hvacType', label: 'HVAC', type: 'text', default: 'CENTRAL_CHILLER' },
      { key: 'hasBms', label: 'BMS integrado', type: 'checkbox', default: true }
    ],
    submit: async (api, ctx, v) => {
      const branchId = s(v, 'branchId') || ctx.branchId();
      const buildingId = s(v, 'buildingId');
      if (!branchId || !buildingId) {
        return { success: false, message: 'branchId y buildingId son obligatorios' };
      }
      const out = await api.saveBuilding(branchId, buildingId, {
        name: s(v, 'name'),
        usageType: s(v, 'usageType'),
        status: s(v, 'status'),
        yearBuilt: Math.round(n(v, 'yearBuilt')),
        m2Surface: n(v, 'm2Surface'),
        m3Volume: n(v, 'm3Volume'),
        hvacType: s(v, 'hvacType'),
        hasBms: b(v, 'hasBms')
      });
      if (out.success) {
        ctx.setBuildingId(buildingId);
      }
      return out;
    }
  },

  'cost-center': {
    title: 'Centro de costos',
    subtitle: 'Prorrateo y presupuesto (saveCostCenter).',
    fields: [
      { key: 'id', label: 'ID centro', type: 'text', default: 'CC-PROD-01' },
      { key: 'name', label: 'Nombre', type: 'text', default: 'Línea de Producción B1' },
      { key: 'branchId', label: 'Branch ID', type: 'text', default: '' },
      { key: 'method', label: 'Método asignación', type: 'text', default: 'SQUARE_METERS' },
      { key: 'percentage', label: 'Porcentaje', type: 'number', default: 100 },
      { key: 'annualBudget', label: 'Presupuesto anual', type: 'number', default: 600000 }
    ],
    submit: async (api, ctx, v) => {
      const branchId = s(v, 'branchId') || ctx.branchId();
      return api.saveCostCenter({
        id: s(v, 'id'),
        name: s(v, 'name'),
        branchId: branchId || undefined,
        method: s(v, 'method'),
        percentage: n(v, 'percentage'),
        annualBudget: n(v, 'annualBudget')
      });
    }
  },

  asset: {
    title: 'Activo energético',
    subtitle: 'Equipo industrial vinculado a jerarquía (saveAsset).',
    fields: [
      { key: 'assetId', label: 'Asset ID', type: 'text', default: 'COMPRESOR-B1' },
      { key: 'name', label: 'Nombre', type: 'text', default: 'Compresor Tornillo B1' },
      { key: 'category', label: 'Categoría', type: 'text', default: 'COMPRESSED_AIR' },
      { key: 'status', label: 'Estado', type: 'text', default: 'OPERATIONAL' },
      { key: 'nominalPower', label: 'Potencia nominal (kW)', type: 'number', default: 75 },
      { key: 'meterId', label: 'Meter ID', type: 'text', default: 'MTR-9988' },
      { key: 'branchId', label: 'Branch ID', type: 'text', default: '' },
      { key: 'buildingId', label: 'Building ID', type: 'text', default: '' },
      { key: 'costCenterId', label: 'Cost center ID', type: 'text', default: 'CC-PROD-01' }
    ],
    submit: async (api, ctx, v) => {
      const assetId = s(v, 'assetId');
      if (!assetId) {
        return { success: false, message: 'assetId obligatorio' };
      }
      const branchId = s(v, 'branchId') || ctx.branchId();
      const buildingId = s(v, 'buildingId') || ctx.buildingId();
      return api.saveAsset(assetId, {
        name: s(v, 'name'),
        category: s(v, 'category'),
        status: s(v, 'status'),
        nominalPower: n(v, 'nominalPower'),
        meterId: s(v, 'meterId'),
        branchId: branchId || undefined,
        buildingId: buildingId || undefined,
        costCenterId: s(v, 'costCenterId')
      });
    }
  },

  meter: {
    title: 'Medidor',
    subtitle: 'Medición física / IoT (saveMeter).',
    fields: [
      { key: 'branchId', label: 'Branch ID', type: 'text', default: '' },
      { key: 'meterId', label: 'Meter ID', type: 'text', default: 'MTR-MAIN-001' },
      { key: 'name', label: 'Nombre', type: 'text', default: 'Medidor General' },
      { key: 'serialNumber', label: 'Nº serie', type: 'text', default: 'SN-2026' },
      { key: 'iotName', label: 'Nombre IoT', type: 'text', default: 'IOT-MTR-01' },
      { key: 'protocol', label: 'Protocolo', type: 'text', default: 'MQTT' },
      { key: 'type', label: 'Tipo', type: 'text', default: 'ELECTRICITY' },
      { key: 'isMain', label: 'Medidor principal', type: 'checkbox', default: true },
      { key: 'buildingId', label: 'Building ID', type: 'text', default: '' }
    ],
    submit: async (api, ctx, v) => {
      const branchId = s(v, 'branchId') || ctx.branchId();
      const meterId = s(v, 'meterId');
      if (!branchId || !meterId) {
        return { success: false, message: 'branchId y meterId obligatorios' };
      }
      const buildingId = s(v, 'buildingId') || ctx.buildingId();
      return api.saveMeter(branchId, meterId, {
        name: s(v, 'name'),
        serialNumber: s(v, 'serialNumber'),
        iotName: s(v, 'iotName'),
        protocol: s(v, 'protocol'),
        type: s(v, 'type'),
        isMain: b(v, 'isMain'),
        buildingId: buildingId || undefined
      });
    }
  },

  tariff: {
    title: 'Tarifa utilidad',
    subtitle: 'Contrato y modelo de precios (saveTariff).',
    fields: [
      { key: 'branchId', label: 'Branch ID', type: 'text', default: '' },
      { key: 'serviceType', label: 'Tipo servicio', type: 'text', default: 'ELECTRICITY' },
      { key: 'providerName', label: 'Proveedor', type: 'text', default: 'IEC' },
      { key: 'contractId', label: 'Contrato ID', type: 'text', default: 'CONT-9988' },
      { key: 'pricingModel', label: 'Modelo precios', type: 'text', default: 'TIME_OF_USE' },
      { key: 'baseRate', label: 'Tarifa base', type: 'number', default: 0.58 },
      { key: 'validFrom', label: 'Válido desde', type: 'text', default: '2026-01-01' },
      { key: 'validTo', label: 'Válido hasta', type: 'text', default: '2026-12-31' }
    ],
    submit: async (api, ctx, v) => {
      const branchId = s(v, 'branchId') || ctx.branchId();
      const serviceType = s(v, 'serviceType');
      if (!branchId || !serviceType) {
        return { success: false, message: 'branchId y serviceType obligatorios' };
      }
      return api.saveTariff(branchId, serviceType, {
        providerName: s(v, 'providerName'),
        contractId: s(v, 'contractId'),
        pricingModel: s(v, 'pricingModel'),
        baseRate: n(v, 'baseRate'),
        validFrom: s(v, 'validFrom'),
        validTo: s(v, 'validTo')
      });
    }
  },

  'alert-rule': {
    title: 'Regla de alerta',
    subtitle: 'Umbral sobre activo (saveAlertRule).',
    fields: [
      { key: 'branchId', label: 'Branch ID', type: 'text', default: '' },
      { key: 'entityId', label: 'Entity ID (activo)', type: 'text', default: 'COMPRESOR-B1' },
      { key: 'alertType', label: 'Tipo alerta', type: 'text', default: 'EFFICIENCY' },
      { key: 'name', label: 'Nombre regla', type: 'text', default: 'Exceso Consumo B1' },
      { key: 'status', label: 'Estado', type: 'text', default: 'ENABLED' },
      { key: 'priority', label: 'Prioridad', type: 'text', default: 'P1_CRITICAL' },
      { key: 'threshold', label: 'Umbral', type: 'number', default: 85.5 },
      { key: 'operator', label: 'Operador', type: 'text', default: 'GREATER_THAN' }
    ],
    submit: async (api, ctx, v) => {
      const branchId = s(v, 'branchId') || ctx.branchId();
      const entityId = s(v, 'entityId');
      const alertType = s(v, 'alertType');
      if (!branchId || !entityId || !alertType) {
        return { success: false, message: 'branchId, entityId y alertType obligatorios' };
      }
      return api.saveAlertRule(branchId, entityId, alertType, {
        name: s(v, 'name'),
        status: s(v, 'status'),
        priority: s(v, 'priority'),
        threshold: n(v, 'threshold'),
        operator: s(v, 'operator')
      });
    }
  },

  user: {
    title: 'Usuario workspace',
    subtitle: 'Perfil SMS ligado al tenant (saveUser). El User ID suele coincidir con el username Cognito.',
    fields: [
      { key: 'userId', label: 'User ID', type: 'text', default: '' },
      { key: 'fullName', label: 'Nombre completo', type: 'text', default: 'Diego Liascovich' },
      { key: 'email', label: 'Email', type: 'text', default: 'diego@sms.com' },
      { key: 'role', label: 'Rol', type: 'text', default: 'BRANCH_ADMIN' },
      { key: 'language', label: 'Idioma', type: 'text', default: 'es' }
    ],
    submit: async (api, _ctx, v) => {
      const userId = s(v, 'userId');
      if (!userId) {
        return { success: false, message: 'userId obligatorio' };
      }
      return api.saveUser(userId, {
        fullName: s(v, 'fullName'),
        email: s(v, 'email'),
        role: s(v, 'role'),
        language: s(v, 'language')
      });
    }
  },

  production: {
    title: 'Registro de producción',
    subtitle: 'Normalización por toneladas / líneas activas (saveProductionLog).',
    fields: [
      { key: 'branchId', label: 'Branch ID', type: 'text', default: '' },
      { key: 'period', label: 'Periodo (YYYY-MM)', type: 'text', default: '2026-04' },
      { key: 'units', label: 'Unidades producidas', type: 'number', default: 1250.5 },
      { key: 'unitType', label: 'Tipo unidad', type: 'text', default: 'TONS' },
      { key: 'shiftMode', label: 'Modo turnos', type: 'text', default: '24/7' },
      { key: 'efficiency', label: 'Eficiencia (0–1)', type: 'number', default: 0.98 },
      { key: 'activeLines', label: 'Líneas activas', type: 'number', default: 3 }
    ],
    submit: async (api, ctx, v) => {
      const branchId = s(v, 'branchId') || ctx.branchId();
      const period = s(v, 'period');
      if (!branchId || !period) {
        return { success: false, message: 'branchId y period obligatorios' };
      }
      return api.saveProductionLog(branchId, period, {
        units: n(v, 'units'),
        unitType: s(v, 'unitType'),
        shiftMode: s(v, 'shiftMode'),
        efficiency: n(v, 'efficiency'),
        activeLines: Math.round(n(v, 'activeLines'))
      });
    }
  },

  'emission-factor': {
    title: 'Factor de emisión',
    subtitle: 'Catálogo global de intensidad grid / combustible (saveEmissionFactor).',
    fields: [
      { key: 'name', label: 'Nombre', type: 'text', default: 'Israel Grid' },
      { key: 'year', label: 'Año', type: 'number', default: 2026 },
      { key: 'regionCode', label: 'Código región', type: 'text', default: 'ISR' },
      { key: 'activityType', label: 'Tipo actividad', type: 'text', default: 'ELEC' },
      { key: 'unit', label: 'Unidad', type: 'text', default: 'kg/kWh' },
      { key: 'value', label: 'Valor CO2e', type: 'number', default: 0.452 },
      { key: 'scope', label: 'Scope GHG', type: 'text', default: 'SCOPE_2' }
    ],
    submit: async (api, _ctx, v) =>
      api.saveEmissionFactor({
        name: s(v, 'name'),
        year: Math.round(n(v, 'year')),
        regionCode: s(v, 'regionCode'),
        activityType: s(v, 'activityType'),
        unit: s(v, 'unit'),
        value: n(v, 'value'),
        scope: s(v, 'scope')
      })
  }
};
