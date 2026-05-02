import { Injectable, inject } from '@angular/core';
import { generateClient } from 'aws-amplify/api';
import { LoggerService } from '../utils/logger.service';

/** Respuesta típica MutationResponse del schema AppSync */
export interface SetupMutationResult {
  success: boolean;
  message?: string | null;
  branchId?: string | null;
  buildingId?: string | null;
  meterId?: string | null;
  factorKey?: string | null;
}

type GraphqlQueryResult<TData> = { data?: TData; errors?: unknown };

@Injectable({ providedIn: 'root' })
export class SetupApiService {
  private readonly client = generateClient();
  private readonly logger = inject(LoggerService);

  private async executeGraphql<TData>(query: string, variables?: Record<string, unknown>): Promise<TData> {
    try {
      const raw: unknown = await this.client.graphql(
        variables === undefined
          ? { query, authMode: 'userPool' }
          : { query, variables, authMode: 'userPool' }
      );
      const response = raw as GraphqlQueryResult<TData>;
      const gqlErrors = response.errors;
      if (Array.isArray(gqlErrors) && gqlErrors.length > 0) {
        this.logger.debug('Setup GraphQL errors', {
          errors: JSON.stringify(gqlErrors)
        });
        throw new Error('GraphQL errors in setup mutation');
      }
      if (!response.data) {
        throw new Error('GraphQL returned no data payload');
      }
      return response.data;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown GraphQL error';
      throw new Error(msg);
    }
  }

  async saveOrgConfig(input: Record<string, unknown>): Promise<SetupMutationResult> {
    const mutation = `
      mutation SaveOrgConfig($input: SaveOrgConfigInput!) {
        saveOrgConfig(input: $input) {
          success
          message
          orgId
        }
      }
    `;
    const data = await this.executeGraphql<{ saveOrgConfig: SetupMutationResult }>(mutation, { input });
    return data.saveOrgConfig;
  }

  async createBranch(input: Record<string, unknown>): Promise<SetupMutationResult> {
    const mutation = `
      mutation CreateBranch($input: CreateBranchInput!) {
        createBranch(input: $input) {
          success
          message
          branchId
        }
      }
    `;
    const data = await this.executeGraphql<{ createBranch: SetupMutationResult }>(mutation, { input });
    return data.createBranch;
  }

  async saveBuilding(branchId: string, buildingId: string, input: Record<string, unknown>): Promise<SetupMutationResult> {
    const mutation = `
      mutation SaveBuilding($branchId: ID!, $buildingId: ID!, $input: SaveBuildingInput!) {
        saveBuilding(branchId: $branchId, buildingId: $buildingId, input: $input) {
          success
          message
          buildingId
        }
      }
    `;
    const data = await this.executeGraphql<{ saveBuilding: SetupMutationResult }>(mutation, {
      branchId,
      buildingId,
      input
    });
    return data.saveBuilding;
  }

  async saveCostCenter(input: Record<string, unknown>): Promise<SetupMutationResult> {
    const mutation = `
      mutation SaveCostCenter($input: SaveCostCenterInput!) {
        saveCostCenter(input: $input) {
          success
          message
          ccId
        }
      }
    `;
    const data = await this.executeGraphql<{ saveCostCenter: SetupMutationResult }>(mutation, { input });
    return data.saveCostCenter;
  }

  async saveAsset(assetId: string, input: Record<string, unknown>): Promise<SetupMutationResult> {
    const mutation = `
      mutation SaveAsset($assetId: ID!, $input: SaveAssetInput!) {
        saveAsset(assetId: $assetId, input: $input) {
          success
          message
          assetId
        }
      }
    `;
    const data = await this.executeGraphql<{ saveAsset: SetupMutationResult }>(mutation, { assetId, input });
    return data.saveAsset;
  }

  async saveMeter(branchId: string, meterId: string, input: Record<string, unknown>): Promise<SetupMutationResult> {
    const mutation = `
      mutation SaveMeter($branchId: ID!, $meterId: ID!, $input: SaveMeterInput!) {
        saveMeter(branchId: $branchId, meterId: $meterId, input: $input) {
          success
          message
          meterId
        }
      }
    `;
    const data = await this.executeGraphql<{ saveMeter: SetupMutationResult }>(mutation, {
      branchId,
      meterId,
      input
    });
    return data.saveMeter;
  }

  async saveTariff(branchId: string, serviceType: string, input: Record<string, unknown>): Promise<SetupMutationResult> {
    const mutation = `
      mutation SaveTariff($branchId: ID!, $serviceType: String!, $input: SaveTariffInput!) {
        saveTariff(branchId: $branchId, serviceType: $serviceType, input: $input) {
          success
          message
          tariffId
          service
        }
      }
    `;
    const data = await this.executeGraphql<{ saveTariff: SetupMutationResult }>(mutation, {
      branchId,
      serviceType,
      input
    });
    return data.saveTariff;
  }

  async saveAlertRule(
    branchId: string,
    entityId: string,
    alertType: string,
    input: Record<string, unknown>
  ): Promise<SetupMutationResult> {
    const mutation = `
      mutation SaveAlertRule($branchId: ID!, $entityId: ID!, $alertType: String!, $input: SaveAlertRuleInput!) {
        saveAlertRule(branchId: $branchId, entityId: $entityId, alertType: $alertType, input: $input) {
          success
          message
        }
      }
    `;
    const data = await this.executeGraphql<{ saveAlertRule: SetupMutationResult }>(mutation, {
      branchId,
      entityId,
      alertType,
      input
    });
    return data.saveAlertRule;
  }

  async saveUser(userId: string, input: Record<string, unknown>): Promise<SetupMutationResult> {
    const mutation = `
      mutation SaveUser($userId: ID!, $input: SaveUserInput!) {
        saveUser(userId: $userId, input: $input) {
          success
          message
        }
      }
    `;
    const data = await this.executeGraphql<{ saveUser: SetupMutationResult }>(mutation, { userId, input });
    return data.saveUser;
  }

  async saveProductionLog(branchId: string, period: string, input: Record<string, unknown>): Promise<SetupMutationResult> {
    const mutation = `
      mutation SaveProductionLog($branchId: ID!, $period: String!, $input: SaveProductionLogInput!) {
        saveProductionLog(branchId: $branchId, period: $period, input: $input) {
          success
          message
          logKey
        }
      }
    `;
    const data = await this.executeGraphql<{ saveProductionLog: SetupMutationResult }>(mutation, {
      branchId,
      period,
      input
    });
    return data.saveProductionLog;
  }

  async saveEmissionFactor(input: Record<string, unknown>): Promise<SetupMutationResult> {
    const mutation = `
      mutation SaveEmissionFactor($input: SaveEmissionFactorInput!) {
        saveEmissionFactor(input: $input) {
          success
          message
          factorKey
        }
      }
    `;
    const data = await this.executeGraphql<{ saveEmissionFactor: SetupMutationResult }>(mutation, { input });
    return data.saveEmissionFactor;
  }
}
