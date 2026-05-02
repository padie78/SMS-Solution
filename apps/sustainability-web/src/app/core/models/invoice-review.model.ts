/** Parsed line item shown in the invoice validation step */
export interface InvoiceReviewLine {
  description: string;
  value: string;
  unit: string;
  monetary_cost: number;
}

/** UI model for Step 2 (human review before confirm) */
export interface InvoiceReviewView {
  vendor: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  cups?: string;
  contractReference?: string;
  tariff?: string;
  total: number;
  netAmount?: number;
  taxAmount?: number;
  currency: string;
  date: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  consumption: number;
  lines: InvoiceReviewLine[];
  confidence: number;
}
