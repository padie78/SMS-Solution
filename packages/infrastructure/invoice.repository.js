import { InvoiceMapper } from '@sms/common';
import { BaseRepository } from './base.repository.js';

/**
 * Persistencia de facturas / líneas invoice-like usando atributos compactos del mapper.
 * La clave compuesta (p. ej. PK/SK single-table) la define el llamador.
 */
export class InvoiceRepository extends BaseRepository {
  /**
   * Upsert de entidad de dominio — obligatorio pasar por InvoiceMapper.toPersistence.
   * @param {import('@sms/common').InvoiceEntity} entity
   * @param {Record<string, unknown>} keyAttributes Atributos de clave DynamoDB (p. ej. PK, SK) + metadata opcional no conflictiva
   */
  async save(entity, keyAttributes) {
    if (!keyAttributes || typeof keyAttributes !== 'object') {
      throw new Error('InvoiceRepository.save: keyAttributes (PK/SK/...) is required');
    }
    const payload = InvoiceMapper.toPersistence(entity);
    await this.putItem({
      ...keyAttributes,
      ...payload,
      entity_type: keyAttributes.entity_type ?? 'INVOICE_SNAPSHOT'
    });
  }
}
