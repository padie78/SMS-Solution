import type { InvoiceDTO } from './invoice.dto.js';
import { InvoiceEntity } from './invoice.entity.js';

export const InvoicePersistenceShape = Object.freeze({
  entityTag: 'sms_et',
  amountKey: 'amt',
  kwhKey: 'kwh_c',
  facilityKey: 'f_id',
  billingPeriodKey: 'b_per'
});

export type InvoicePersistence = {
  sms_et: 'INV';
  amt: number;
  kwh_c: number;
  f_id: string;
  b_per: string;
};

export const InvoiceMapper = Object.freeze({
  dtoToEntity(dto: InvoiceDTO): InvoiceEntity {
    return InvoiceEntity.fromDTO(dto);
  },

  toPersistence(entity: InvoiceEntity): InvoicePersistence {
    return {
      sms_et: 'INV',
      amt: entity.amount,
      kwh_c: entity.kwhConsumption,
      f_id: entity.facilityId,
      b_per: entity.billingPeriod
    };
  },

  persistenceToDTO(row: InvoicePersistence): InvoiceDTO {
    return {
      amount: row.amt,
      kwhConsumption: row.kwh_c,
      facilityId: row.f_id,
      billingPeriod: row.b_per
    };
  }
});
