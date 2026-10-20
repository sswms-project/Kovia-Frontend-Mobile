/** `true`/`false` drives success/error feedback; returning nothing means "no verdict, stay silent". */
export type ScanResult = boolean | void | Promise<boolean | void>;

export interface LastScan {
  readonly code: string;
  /** Null when the handler gave no verdict. */
  readonly isValid: boolean | null;
}
