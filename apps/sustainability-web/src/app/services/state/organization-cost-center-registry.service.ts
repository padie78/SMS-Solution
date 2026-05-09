import { Injectable, computed, inject } from '@angular/core';
import type { CostCenterDTO } from '@sms/common';
import type { SmsLocationNode, SmsLocationNodeMetadata } from '../../core/models/sms-location-node.model';
import { LocationService } from '../../features/location/services/location.service';

/**
 * Clave estable para serializar la lista de Cost Centers dentro de
 * `SmsLocationNodeMetadata.custom` (fuente de verdad alimentada por
 * `OrganizationFormComponent` en la pestaña "Centros de Costo").
 */
export const ORG_COST_CENTERS_CUSTOM_KEY = 'costCenters' as const;

/**
 * L2 State service: Registro centralizado de Cost Centers indexado por organización.
 * Consume el árbol de `LocationService` (Single Source of Truth para estructura)
 * y expone los CCs persistidos en el nodo Organization (`metadata.custom['costCenters']` JSON).
 *
 * Uso:
 *   const list = registry.costCentersFor(orgId);
 *   const cc = registry.findById(orgId, ccId);
 *
 * Mantiene compat con datos legacy (`metadata.costCenters` como array directo).
 */
@Injectable({ providedIn: 'root' })
export class OrganizationCostCenterRegistryService {
  private readonly location = inject(LocationService);

  /**
   * Devuelve la lista de Cost Centers de una organización dado su `location_id`.
   * Si la organización no existe en el árbol o no tiene CCs, retorna `[]`.
   *
   * Es un getter síncrono (no Signal) pero internamente lee `LocationService.tree()`,
   * por lo que cualquier `computed()` que lo invoque se actualizará cuando el árbol cambie.
   */
  costCentersFor(organizationId: string | null | undefined): readonly CostCenterDTO[] {
    const id = (organizationId ?? '').trim();
    if (!id) return [];
    const node = this.findOrganizationNode(id);
    if (!node) return [];
    return parseCostCentersFromMetadata(node.metadata);
  }

  /** Helper para encontrar un Cost Center concreto dentro de la organización. */
  findById(organizationId: string | null | undefined, costCenterId: string | null | undefined): CostCenterDTO | null {
    const ccId = (costCenterId ?? '').trim();
    if (!ccId) return null;
    return this.costCentersFor(organizationId).find((c) => c.id === ccId) ?? null;
  }

  /**
   * Devuelve un Signal-like `computed` enlazado al árbol — útil para consumirlo en
   * componentes con `OnPush` que quieran reaccionar a cambios sin manejar suscripciones.
   */
  costCentersForSignal(organizationId: () => string | null | undefined) {
    return computed(() => {
      // Forzamos lectura del árbol para que el computed dependa de su signal.
      this.location.tree();
      return this.costCentersFor(organizationId());
    });
  }

  /**
   * Persiste un Cost Center en la metadata de la Organización.
   * - Si `dto.id` ya existe → upsert (reemplaza).
   * - Si no existe → append.
   *
   * Único punto de escritura compartido entre el formulario de organización
   * y atajos como el menú contextual del árbol. Mantiene la convención
   * `metadata.custom['costCenters']` (JSON) intacta.
   */
  async addCostCenter(orgId: string, dto: CostCenterDTO): Promise<void> {
    const id = (orgId ?? '').trim();
    if (!id) throw new Error('orgId vacío.');
    const node = this.findOrganizationNode(id);
    if (!node) throw new Error(`Organización ${id} no encontrada en el árbol.`);

    const current = parseCostCentersFromMetadata(node.metadata);
    const idx = current.findIndex((c) => c.id === dto.id);
    const next = idx >= 0 ? current.map((c, i) => (i === idx ? dto : c)) : [...current, dto];

    const previousCustom = (node.metadata?.custom ?? null) as Record<string, string> | null;
    const nextCustom: Record<string, string> = {
      ...(previousCustom ?? {}),
      [ORG_COST_CENTERS_CUSTOM_KEY]: JSON.stringify(next)
    };

    const nextMetadata: SmsLocationNodeMetadata = {
      ...(node.metadata ?? {}),
      custom: nextCustom
    };

    await this.location.updateNode(id, { metadata: nextMetadata });
  }

  /** Remueve un Cost Center de la organización por id. No-op si no existe. */
  async removeCostCenter(orgId: string, costCenterId: string): Promise<void> {
    const id = (orgId ?? '').trim();
    const ccId = (costCenterId ?? '').trim();
    if (!id || !ccId) return;
    const node = this.findOrganizationNode(id);
    if (!node) return;

    const current = parseCostCentersFromMetadata(node.metadata);
    if (!current.some((c) => c.id === ccId)) return;

    const next = current.filter((c) => c.id !== ccId);
    const previousCustom = (node.metadata?.custom ?? null) as Record<string, string> | null;
    const nextCustom: Record<string, string> = {
      ...(previousCustom ?? {}),
      [ORG_COST_CENTERS_CUSTOM_KEY]: JSON.stringify(next)
    };
    const nextMetadata: SmsLocationNodeMetadata = {
      ...(node.metadata ?? {}),
      custom: nextCustom
    };
    await this.location.updateNode(id, { metadata: nextMetadata });
  }

  private findOrganizationNode(orgId: string): SmsLocationNode | null {
    const stack: SmsLocationNode[] = [...this.location.tree()];
    while (stack.length) {
      const cur = stack.pop()!;
      if (cur.type === 'ORGANIZATION' && cur.location_id === orgId) {
        return cur;
      }
      const children = (cur.children ?? []) as SmsLocationNode[];
      if (children.length) stack.push(...children);
    }
    return null;
  }
}

/**
 * Parsea la lista de Cost Centers de la metadata de un nodo Organization.
 * - Formato canónico: `metadata.custom['costCenters']` (JSON string).
 * - Compat legacy: `metadata.costCenters` como array directo.
 */
function parseCostCentersFromMetadata(meta: SmsLocationNodeMetadata | undefined): CostCenterDTO[] {
  if (!meta || typeof meta !== 'object') return [];

  const customRaw = (meta.custom ?? null) as Record<string, string> | null;
  const serialized = customRaw?.[ORG_COST_CENTERS_CUSTOM_KEY];
  if (typeof serialized === 'string' && serialized.length > 0) {
    try {
      const parsed = JSON.parse(serialized) as unknown;
      if (Array.isArray(parsed)) return parsed as CostCenterDTO[];
    } catch {
      // fall through al legacy
    }
  }

  const legacy = (meta as unknown as { costCenters?: unknown }).costCenters;
  return Array.isArray(legacy) ? (legacy as CostCenterDTO[]) : [];
}
