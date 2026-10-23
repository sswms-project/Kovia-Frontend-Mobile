export interface ReportColumn {
  readonly key: string;
  readonly label: string;
  readonly dataType: string;
}

export interface ReportDefinition {
  readonly type: string;
  readonly name: string;
  readonly group: string;
  readonly description: string;
  readonly usesPeriod: boolean;
  readonly requiresProduct: boolean;
  readonly columns: readonly ReportColumn[];
}

export type ReportRow = Readonly<Record<string, unknown>>;

// Reports that read well as cards and need no required date range or product. The wide balance
// table, the product stock card and slow-moving (all need dates or a product) stay on the web.
export const PHONE_REPORT_TYPES: readonly string[] = [
  'inventory-snapshot',
  'replenishment',
  'task-progress',
  'inbound-progress',
  'outbound-progress',
  'transfer-reconciliation',
  'count-adjustment',
];
