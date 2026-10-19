/** Vietnamese grouping, trimmed to `maximumFractionDigits` decimals (units can be fractional). */
export function formatQuantity(value: number, maximumFractionDigits = 3): string {
  return value.toLocaleString('vi-VN', { maximumFractionDigits });
}
