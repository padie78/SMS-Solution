/**
 * Port: outbound queue dispatch ({@link import('@sms/common').InvoiceDispatchQueueMessage} tras compose).
 *
 * @typedef {Object} InvoiceQueue
 * @property {(params: {
 *   bucket: string,
 *   key: string,
 *   orgId: import('@sms/common').SmsId,
 *   sk: import('@sms/common').InvoiceSk,
 *   requestId: string
 * }) => Promise<void>} enqueueInvoice
 */

export {};

