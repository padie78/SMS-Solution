export interface GeneratePresignedUploadUrlRequest {
  invoiceId: string;
  fileName?: string | null;
  fileType?: string | null;
}

export interface GeneratePresignedUploadUrlResponse {
  uploadURL: string;
  key: string;
  userId: string;
  invoiceId: string;
  message: string;
}

