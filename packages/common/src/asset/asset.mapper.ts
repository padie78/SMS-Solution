import { ASSET_TYPE_TO_PERSISTENCE } from '../shared/domain-enums.js';
import type { SmsEntityTag } from '../shared/sms-entity-tag.js';
import { decodeAssetType } from '../shared/persistence-codecs.js';
import { AssetEntity } from './asset.entity.js';
import type { AssetDTO } from './asset.dto.js';

export interface AssetPersistence {
  sms_et: SmsEntityTag;
  ast_id: string;
  bld_id: string;
  cc_id: string;
  ast_ty: string;
  ast_nm?: string;
  ast_st?: string;
  br_id?: string;
  met_id?: string;
  nom_pwr?: number;
}

export const AssetMapper = Object.freeze({
  dtoToEntity(dto: AssetDTO): AssetEntity {
    return AssetEntity.fromDTO(dto);
  },

  toPersistence(entity: AssetEntity): AssetPersistence {
    return {
      sms_et: 'AST',
      ast_id: entity.id,
      bld_id: entity.buildingId,
      cc_id: entity.costCenterId,
      ast_ty: ASSET_TYPE_TO_PERSISTENCE[entity.type],
      ...(entity.name ? { ast_nm: entity.name } : {}),
      ...(entity.status ? { ast_st: entity.status } : {}),
      ...(entity.branchId?.trim() ? { br_id: entity.branchId } : {}),
      ...(entity.meterId?.trim() ? { met_id: entity.meterId } : {}),
      ...(entity.nominalPower !== undefined ? { nom_pwr: entity.nominalPower } : {})
    };
  },

  persistenceToDTO(row: AssetPersistence): AssetDTO {
    return {
      id: row.ast_id,
      buildingId: row.bld_id,
      costCenterId: row.cc_id,
      type: decodeAssetType(row.ast_ty),
      name: row.ast_nm,
      status: row.ast_st as AssetDTO['status'],
      branchId: row.br_id,
      meterId: row.met_id,
      nominalPower: row.nom_pwr
    };
  }
});
