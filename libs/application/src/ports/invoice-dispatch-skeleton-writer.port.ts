/** Puerto driven: persistir el skeleton `PROCESSING` tras S3 PUT. */
export interface InvoiceDispatchSkeletonWriterPort {
  putInvoiceSkeleton(params: {
    orgId: string;
    sk: string;
    bucket: string;
    key: string;
    requestId: string;
  }): Promise<void>;
}
