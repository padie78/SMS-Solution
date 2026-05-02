import { Injectable } from '@angular/core';
import { multiply, bignumber, type BigNumber } from 'mathjs';

/**
 * Domain conversions before submit (kWh, CO2e helpers). Uses mathjs for stable decimals.
 */
@Injectable({ providedIn: 'root' })
export class SustainabilityLogicService {
  kWhFromWattHours(wh: number): number {
    const raw = multiply(bignumber(wh), bignumber(0.001));
    return typeof raw === 'number' ? raw : (raw as BigNumber).toNumber();
  }

  sumKwhFromLines(values: readonly number[]): number {
    return values.reduce((acc, n) => acc + this.kWhFromWattHours(n), 0);
  }
}
