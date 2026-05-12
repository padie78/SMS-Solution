import type { InvoiceDTO } from './invoice.dto.js';
import { InvoiceEntity } from './invoice.entity.js';

/** 
 * Alias cortos para DynamoDB para reducir el tamaño del item (Storage Costs & RCU/WCU). 
 */
export const InvoicePersistenceShape = Object.freeze({
  pk: 'PK',
  sk: 'SK',
  aiAnalysis: 'aia',
  analytics: 'anl',
  climatiq: 'clq',
  extData: 'ext',
  meta: 'mt',
  processedAt: 'pat',
  totalDays: 'tdp'
});

export type InvoicePersistence = {
  PK: string;
  SK: string;
  aia: InvoiceDTO['aiAnalysis'];
  anl: InvoiceDTO['analyticsDimensions'];
  clq: InvoiceDTO['climatiqResult'];
  ext: InvoiceDTO['extractedData'];
  mt: InvoiceDTO['metadata'];
  pat: string;
  tdp: number;
};

export const InvoiceMapper = Object.freeze({
  /** Transforma el DTO validado a Entidad de Dominio */
  dtoToEntity(dto: InvoiceDTO): InvoiceEntity {
    return InvoiceEntity.fromDTO(dto);
  },

  /** Transforma la Entidad al formato plano de persistencia (Item de DynamoDB) */
  toPersistence(entity: InvoiceEntity): InvoicePersistence {
    const dto = entity.toDTO();
    return {
      PK: dto.pk,
      SK: dto.sk,
      aia: dto.aiAnalysis,
      anl: dto.analyticsDimensions,
      clq: dto.climatiqResult,
      ext: dto.extractedData,
      mt: dto.metadata,
      pat: dto.processedAt,
      tdp: dto.totalDaysProrated
    };
  },

  /** Transforma el registro de base de datos a un DTO limpio para el resto del sistema */
  persistenceToDTO(row: InvoicePersistence): InvoiceDTO {
    return {
      pk: row.PK,
      sk: row.SK,
      aiAnalysis: row.aia,
      analyticsDimensions: row.anl,
      climatiqResult: row.clq,
      extractedData: row.ext,
      metadata: row.mt,
      processedAt: row.pat,
      totalDaysProrated: row.tdp
    };
  }
});