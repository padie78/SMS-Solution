import type { SmsEntityTag } from '../shared/sms-entity-tag.js';
import { BranchEntity } from './branch.entity.js';
import type { BranchDTO } from './branch.dto.js';
import type { AddressDTO } from '../shared/address.dto.js';
import type { LifecycleStatus } from '../shared/graphql-setup-enums.js';

export interface BranchPersistence {
  sms_et: SmsEntityTag;
  org_id: string;
  br_id: string;
  reg_id: string;
  br_nm: string;
  tz: string;
  m2_sfc: number;
  fac_ty: string;
  en_tgt?: number;
  hq?: boolean;
  st: LifecycleStatus;
  /** Address denormalizada (opcional). */
  addr_ln1?: string;
  addr_ln2?: string;
  addr_city?: string;
  addr_reg?: string;
  addr_post?: string;
  addr_ctry?: string;
  crt_at?: string;
  upd_at?: string;
}

function addressToPersistence(addr: AddressDTO | undefined): Partial<Pick<BranchPersistence, 'addr_ln1' | 'addr_ln2' | 'addr_city' | 'addr_reg' | 'addr_post' | 'addr_ctry'>> {
  if (!addr) return {};
  return {
    addr_ln1: addr.streetLine1,
    ...(addr.streetLine2 ? { addr_ln2: addr.streetLine2 } : {}),
    addr_city: addr.city,
    ...(addr.stateOrRegion ? { addr_reg: addr.stateOrRegion } : {}),
    ...(addr.postalCode ? { addr_post: addr.postalCode } : {}),
    addr_ctry: addr.countryCode
  };
}

function persistenceToAddress(row: BranchPersistence): AddressDTO | undefined {
  if (!row.addr_ln1?.trim() || !row.addr_city?.trim() || !row.addr_ctry?.trim()) return undefined;
  return {
    streetLine1: row.addr_ln1,
    ...(row.addr_ln2 ? { streetLine2: row.addr_ln2 } : {}),
    city: row.addr_city,
    ...(row.addr_reg ? { stateOrRegion: row.addr_reg } : {}),
    ...(row.addr_post ? { postalCode: row.addr_post } : {}),
    countryCode: row.addr_ctry
  };
}

export const BranchMapper = Object.freeze({
  dtoToEntity(dto: BranchDTO): BranchEntity {
    return BranchEntity.fromDTO(dto);
  },

  toPersistence(entity: BranchEntity): BranchPersistence {
    return {
      sms_et: 'BR',
      org_id: entity.organizationId,
      br_id: entity.id,
      reg_id: entity.regionId,
      br_nm: entity.name,
      tz: entity.timezone,
      m2_sfc: entity.m2Surface,
      fac_ty: entity.facilityType,
      st: entity.status,
      ...(entity.energyTarget !== undefined ? { en_tgt: entity.energyTarget } : {}),
      ...(entity.isHeadquarters ? { hq: true } : {}),
      ...addressToPersistence(entity.address),
      ...(entity.createdAt ? { crt_at: entity.createdAt } : {}),
      ...(entity.updatedAt ? { upd_at: entity.updatedAt } : {})
    };
  },

  persistenceToDTO(row: BranchPersistence): BranchDTO {
    const addr = persistenceToAddress(row);
    return {
      id: row.br_id,
      organizationId: row.org_id,
      regionId: row.reg_id,
      name: row.br_nm,
      timezone: row.tz,
      m2Surface: row.m2_sfc,
      facilityType: row.fac_ty as BranchDTO['facilityType'],
      status: row.st,
      isHeadquarters: Boolean(row.hq),
      ...(row.en_tgt !== undefined ? { energyTarget: row.en_tgt } : {}),
      ...(addr ? { address: addr } : {}),
      ...(row.crt_at ? { createdAt: row.crt_at } : {}),
      ...(row.upd_at ? { updatedAt: row.upd_at } : {})
    };
  }
});
