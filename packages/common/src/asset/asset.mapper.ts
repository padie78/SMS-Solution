import { ASSET_TYPE_TO_PERSISTENCE } from '../shared/domain-enums.js';
import type { SmsEntityTag } from '../shared/sms-entity-tag.js';
import { decodeAssetType } from '../shared/persistence-codecs.js';
import { AssetEntity } from './asset.entity.js';
import type { AssetDTO } from './asset.dto.js';
import type { AssetLifecycleStatus } from '../shared/graphql-setup-enums.js';

export interface AssetPersistence {
  sms_et: SmsEntityTag;
  ast_id: string;
  org_id: string;
  reg_id: string;
  br_id: string;
  bld_id: string;
  cc_id: string;
  ast_ty: string;
  ast_nm: string;
  ast_st: AssetLifecycleStatus | 'OPERATIONAL' | 'DECOMMISSIONED' | 'MAINTENANCE';
  met_id?: string;
  nom_pwr?: number;
  /** Mapa compacto serializado en capa de persistencia como pares clave/valor. */
  tags?: Record<string, string>;
  crt_at?: string;
  upd_at?: string;
}

function decodeAssetStatus(raw: string | undefined): AssetDTO['status'] {
  if (!raw) return 'ACTIVE';
  const u = raw.toUpperCase();
  if (u === 'OPERATIONAL') return 'ACTIVE';
  if (u === 'DECOMMISSIONED') return 'INACTIVE';
  if (u === 'MAINTENANCE') return 'MAINTENANCE';
  if (u === 'ACTIVE' || u === 'INACTIVE' || u === 'MAINTENANCE') return u as AssetDTO['status'];
  return 'ACTIVE';
}

export const AssetMapper = Object.freeze({
  dtoToEntity(dto: AssetDTO): AssetEntity {
    return AssetEntity.fromDTO(dto);
  },

  toPersistence(entity: AssetEntity): AssetPersistence {
    const hasTags = entity.tags && Object.keys(entity.tags).length > 0;
    return {
      sms_et: 'AST',
      ast_id: entity.id,
      org_id: entity.organizationId,
      reg_id: entity.regionId,
      br_id: entity.branchId,
      bld_id: entity.buildingId,
      cc_id: entity.costCenterId,
      ast_ty: ASSET_TYPE_TO_PERSISTENCE[entity.type],
      ast_nm: entity.name,
      ast_st: entity.status,
      ...(entity.meterId?.trim() ? { met_id: entity.meterId } : {}),
      ...(entity.nominalPower !== undefined ? { nom_pwr: entity.nominalPower } : {}),
      ...(hasTags ? { tags: entity.tags } : {}),
      ...(entity.createdAt ? { crt_at: entity.createdAt } : {}),
      ...(entity.updatedAt ? { upd_at: entity.updatedAt } : {})
    };
  },

  persistenceToDTO(row: AssetPersistence): AssetDTO {
    return {
      id: row.ast_id,
      organizationId: row.org_id,
      regionId: row.reg_id,
      branchId: row.br_id,
      buildingId: row.bld_id,
      costCenterId: row.cc_id,
      type: decodeAssetType(row.ast_ty),
      name: row.ast_nm?.trim() ? row.ast_nm : 'Unnamed asset',
      status: decodeAssetStatus(row.ast_st),
      meterId: row.met_id,
      nominalPower: row.nom_pwr,
      ...(row.tags ? { tags: row.tags } : {}),
      ...(row.crt_at ? { createdAt: row.crt_at } : {}),
      ...(row.upd_at ? { updatedAt: row.upd_at } : {})
    };
  }
});
