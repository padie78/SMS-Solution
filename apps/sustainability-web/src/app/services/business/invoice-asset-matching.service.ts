import { Injectable, inject } from '@angular/core';

import type { InvoiceReviewView } from '../../core/models/invoice-review.model';
import type {
  AssetMatchTier,
  InvoiceHierarchySelection
} from '../../core/models/invoice-assignment.model';
import { emptyHierarchy } from '../../core/models/invoice-assignment.model';
import {
  INVOICE_METER_CATALOG,
  type MeterCatalogRow
} from './invoice-hierarchy-catalog';
import { AppSyncApiService } from '../infrastructure/appsync-api.service';
import { LoggerService } from '../utils/logger.service';

export interface InvoiceAssetResolutionResult {
  readonly hierarchy: InvoiceHierarchySelection | null;
  readonly matchTier: AssetMatchTier;
  readonly fromRemote: boolean;
}

function normBlank(v: string | undefined): string | undefined {
  const t = v?.trim();
  return t && t.length > 0 ? t : undefined;
}

function normCups(v: string | undefined): string | undefined {
  const n = normBlank(v);
  return n ? n.replace(/\s+/g, '').toUpperCase() : undefined;
}

function normGen(v: string | undefined): string | undefined {
  const n = normBlank(v);
  return n ? n.replace(/\s+/g, '').toUpperCase() : undefined;
}

function normAddr(v: string | undefined): string | undefined {
  const n = normBlank(v);
  return n ? n.toLowerCase().replace(/\s+/g, ' ').trim() : undefined;
}

@Injectable({ providedIn: 'root' })
export class InvoiceAssetMatchingService {
  private readonly api = inject(AppSyncApiService);
  private readonly logger = inject(LoggerService);

  async resolve(invoice: InvoiceReviewView): Promise<InvoiceAssetResolutionResult> {
    const remote = await this.tryRemote(invoice);
    if (remote) {
      return remote;
    }
    const local = this.resolveLocal(invoice);
    if (local) {
      return local;
    }
    return { hierarchy: null, matchTier: 'none', fromRemote: false };
  }

  private async tryRemote(invoice: InvoiceReviewView): Promise<InvoiceAssetResolutionResult | null> {
    try {
      const res = await this.api.resolveInvoiceAssignment({
        cups: invoice.cups,
        meterSerialNumber: invoice.meterSerialNumber,
        contractReference: invoice.contractReference,
        holderTaxId: invoice.holderTaxId,
        supplyAddress: invoice.supplyAddress
      });

      if (!res.matched || !String(res.meterId ?? '').trim()) {
        return null;
      }

      const hierarchy: InvoiceHierarchySelection = {
        regionId: res.regionId ?? '',
        branchId: res.branchId ?? '',
        buildingId: res.buildingId ?? '',
        assetId: res.assetId ?? '',
        meterId: res.meterId ?? '',
        costCenterId: res.costCenterId ?? ''
      };

      const rawTier = String(res.matchTier ?? 'none').toLowerCase();
      const allowed: AssetMatchTier[] = [
        'cups',
        'meter_serial',
        'contract_reference',
        'holder_address',
        'none'
      ];
      const tier = (allowed.includes(rawTier as AssetMatchTier) ? rawTier : 'cups') as AssetMatchTier;

      return {
        hierarchy,
        matchTier: tier === 'none' ? 'cups' : tier,
        fromRemote: true
      };
    } catch (e: unknown) {
      this.logger.warn('resolveInvoiceAssignment failed; using catalog fallback', {
        detail: e instanceof Error ? e.message : String(e)
      });
      return null;
    }
  }

  private resolveLocal(invoice: InvoiceReviewView): InvoiceAssetResolutionResult | null {
    const cups = normCups(invoice.cups);
    const serial = normGen(invoice.meterSerialNumber);
    const contract = normGen(invoice.contractReference);
    const tax = normGen(invoice.holderTaxId);
    const addr = normAddr(invoice.supplyAddress);

    const tryMatch = (
      tier: AssetMatchTier,
      predicate: (row: MeterCatalogRow) => boolean
    ): InvoiceAssetResolutionResult | null => {
      const row = INVOICE_METER_CATALOG.find(predicate);
      if (!row) return null;
      return {
        hierarchy: this.rowToHierarchy(row),
        matchTier: tier,
        fromRemote: false
      };
    };

    if (cups) {
      const hit = tryMatch('cups', (r) => normCups(r.cupsCode) === cups);
      if (hit) return hit;
    }
    if (serial) {
      const hit = tryMatch('meter_serial', (r) => normGen(r.meterSerial) === serial);
      if (hit) return hit;
    }
    if (contract) {
      const hit = tryMatch('contract_reference', (r) => normGen(r.contractReference) === contract);
      if (hit) return hit;
    }
    if (tax && addr) {
      const hit = tryMatch(
        'holder_address',
        (r) => normGen(r.holderTaxId) === tax && !!r.supplyAddressNorm && addr.includes(r.supplyAddressNorm)
      );
      if (hit) return hit;
    }

    return null;
  }

  private rowToHierarchy(row: MeterCatalogRow): InvoiceHierarchySelection {
    return {
      regionId: row.regionId,
      branchId: row.branchId,
      buildingId: row.buildingId,
      assetId: row.assetId,
      meterId: row.meterId,
      costCenterId: row.costCenterId
    };
  }

  /** Utility when clearing selections */
  static clearedHierarchy(): InvoiceHierarchySelection {
    return { ...emptyHierarchy() };
  }
}
