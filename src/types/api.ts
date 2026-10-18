// ApiResponse<T> lives in '@/lib/api' next to the client that unwraps it.
export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
}

export interface QueryInfo {
  top?: number;
  skip?: number;
  searchText?: string;
  isActive?: boolean;
  orderBy?: string;
  orderType?: OrderTypeValue;
  needTotalCount?: boolean;
}

export interface QueryResult<T> {
  items: T[];
  totalCount: number;
}

// as const instead of enum (rules). Values mirror the BE OrderType.
export const OrderType = { Ascending: 0, Descending: 1 } as const;
export type OrderTypeValue = (typeof OrderType)[keyof typeof OrderType];
