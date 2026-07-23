export class MonetaryRules {
  static round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  static truncate(value: number): number {
    return Math.floor(value * 100) / 100;
  }

  static fromDecimal(value: any): number {
    return Number(value);
  }

  static format(value: number): string {
    return value.toFixed(2);
  }

  static roundToSix(value: number): number {
    return Math.round(value * 1000000) / 1000000;
  }
}
