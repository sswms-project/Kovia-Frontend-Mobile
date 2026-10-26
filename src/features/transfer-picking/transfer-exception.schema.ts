import { z } from 'zod';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';
import { transferSuggestionSchema } from './transfer-picking.schema';

const id = nonEmptyDotNetGuidSchema('Mã dòng hàng hoặc vị trí không hợp lệ.');
export const PICK_REASONS = [
  { value: 'InsufficientAtLocation', label: 'Không đủ hàng tại vị trí' },
  { value: 'NotFound', label: 'Không tìm thấy hàng' },
  { value: 'Damaged', label: 'Hàng hỏng' },
  { value: 'LocationBlocked', label: 'Vị trí bị chặn' },
  { value: 'LotExhausted', label: 'Lô đã hết hàng' },
  { value: 'NonFefoLot', label: 'Cần dùng lô khác thứ tự FEFO' },
  { value: 'Other', label: 'Lý do khác' },
] as const;
const reason = z.enum(['InsufficientAtLocation', 'NotFound', 'Damaged', 'LocationBlocked', 'LotExhausted', 'NonFefoLot', 'Other']);
const positive = z.number({ error: 'Vui lòng nhập số lượng.' }).finite().positive('Số lượng phải lớn hơn 0.')
  .refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 1e-7, 'Số lượng tối đa hai chữ số thập phân.');
export const transferAlternativeSchema = transferSuggestionSchema.omit({ suggestedQuantity: true, reservedQuantity: true })
  .extend({ availableQuantity: z.number().finite().nonnegative() });
export const transferExceptionFormSchema = z.object({
  action: z.enum(['Switch', 'Escalate', 'Return']), lineId: id,
  fromInventoryStockId: z.string(), toInventoryStockId: z.string(), pickDetailId: z.string(),
  quantity: z.number(), reasonCode: reason, note: z.string().trim().max(500, 'Mô tả tối đa 500 ký tự.'),
  scannedSlotCode: z.string().trim().max(100, 'Mã vị trí tối đa 100 ký tự.'),
}).superRefine((value, context) => {
  const invalid = (path: string, message: string) => context.addIssue({ code: 'custom', path: [path], message });
  if (value.action !== 'Escalate' && !positive.safeParse(value.quantity).success) invalid('quantity', 'Số lượng phải lớn hơn 0, tối đa hai chữ số thập phân.');
  if (value.action !== 'Return' && !value.note) invalid('note', 'Vui lòng mô tả lý do để lưu lịch sử.');
  if (value.action === 'Switch') {
    if (!id.safeParse(value.fromInventoryStockId).success) invalid('fromInventoryStockId', 'Vui lòng chọn nguồn đang giữ chỗ.');
    if (!id.safeParse(value.toInventoryStockId).success || value.fromInventoryStockId === value.toInventoryStockId)
      invalid('toInventoryStockId', 'Vui lòng chọn vị trí hoặc lô khác nguồn hiện tại.');
  }
  if (value.action === 'Return') {
    if (!id.safeParse(value.pickDetailId).success) invalid('pickDetailId', 'Vui lòng chọn lượt lấy cần trả.');
    if (!value.scannedSlotCode) invalid('scannedSlotCode', 'Vui lòng quét hoặc nhập mã vị trí trả về.');
  }
});
const command = { transferId: id, shipmentId: id, commandId: id };
export const switchTransferCommandSchema = z.object({ ...command, lineId: id, fromInventoryStockId: id, toInventoryStockId: id,
  quantity: positive, reasonCode: reason, note: z.string().trim().min(1).max(500) });
export const escalateTransferCommandSchema = z.object({ ...command, lineId: id, reasonCode: reason, note: z.string().trim().min(1).max(500) });
export const returnTransferCommandSchema = z.object({ ...command, pickDetailId: id, quantity: positive,
  scannedSlotCode: z.string().trim().min(1).max(100) });
export type TransferExceptionForm = z.infer<typeof transferExceptionFormSchema>;
export type TransferAlternative = z.infer<typeof transferAlternativeSchema>;
