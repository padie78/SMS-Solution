import type { MeterType } from '@sms/common';
import type { MeterOperationalStatus, MeterProtocol } from '@sms/common';
import { MeterDTO } from '@sms/common';
/** Punto de medición: siempre Building; opcionalmente Asset para sub-medición. */
export declare class MeterEntity {
    readonly id: string;
    readonly orgId: string;
    readonly regionId: string;
    readonly branchId: string;
    readonly buildingId: string;
    readonly name: string;
    readonly serialNumber: string;
    readonly internalTag?: string;
    readonly meterType: MeterType;
    readonly serviceType: 'UTILITY' | 'SUBMETERING' | 'GENERATION';
    readonly unit: 'KWH' | 'M3' | 'GJ' | 'L' | 'BTU';
    readonly accuracyClass: '0.2S' | '0.5S' | '1.0' | '2.0';
    readonly multiplier: number;
    readonly loggingIntervalMinutes: number;
    readonly timeZone: string;
    readonly isMain: boolean;
    readonly isNetMetering: boolean;
    readonly meterLevel: number;
    readonly parentMeterId?: string;
    readonly assetId?: string;
    readonly status: MeterOperationalStatus;
    readonly communicationStatus: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
    readonly lastCalibrationDate?: string;
    readonly nextCalibrationDate?: string;
    readonly monitorsPowerQuality: boolean;
    readonly hasDataLogging: boolean;
    readonly metrologicalSealNumber?: string;
    readonly protocol: MeterProtocol;
    readonly physicalAddress?: string;
    readonly firmwareVersion?: string;
    readonly isVirtual: boolean;
    readonly virtualFormula?: string;
    readonly tags: Record<string, string>;
    readonly createdAt?: string;
    readonly updatedAt?: string;
    constructor(id: string, orgId: string, regionId: string, branchId: string, buildingId: string, name: string, serialNumber: string, internalTag: string | undefined, meterType: MeterType, serviceType: 'UTILITY' | 'SUBMETERING' | 'GENERATION', unit: 'KWH' | 'M3' | 'GJ' | 'L' | 'BTU', accuracyClass: '0.2S' | '0.5S' | '1.0' | '2.0', multiplier: number, loggingIntervalMinutes: number, timeZone: string, isMain: boolean, isNetMetering: boolean, meterLevel: number, parentMeterId: string | undefined, assetId: string | undefined, status: MeterOperationalStatus, communicationStatus: 'ONLINE' | 'OFFLINE' | 'DEGRADED', lastCalibrationDate: string | undefined, nextCalibrationDate: string | undefined, monitorsPowerQuality: boolean, hasDataLogging: boolean, metrologicalSealNumber: string | undefined, protocol: MeterProtocol, physicalAddress: string | undefined, firmwareVersion: string | undefined, isVirtual: boolean, virtualFormula: string | undefined, tags: Record<string, string>, createdAt?: string, updatedAt?: string);
    static fromDTO(dto: MeterDTO): MeterEntity;
    private validateHierarchy;
    isSubMeter(): boolean;
    assertAssetAlignedWithBuilding(assetBuildingId: string): void;
    toValue(): MeterDTO;
}
//# sourceMappingURL=meter.entity.d.ts.map