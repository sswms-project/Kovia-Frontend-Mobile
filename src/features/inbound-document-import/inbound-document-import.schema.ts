import { z } from 'zod';

import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

const id = nonEmptyDotNetGuidSchema('Mã chứng từ không hợp lệ.');
const nullableText = z.string().nullable().optional().transform(value => value ?? null);
const nullableNumber = z.number().nullable().optional().transform(value => value ?? null);

function extractedFieldSchema<T extends z.ZodType>(valueSchema: T) {
  return z.object({
    value: valueSchema.nullable().optional().transform(value => value ?? null),
    rawValue: nullableText,
    confidence: nullableNumber,
    source: z.string(),
    verificationStatus: z.string(),
  });
}
const textField = extractedFieldSchema(z.string()).nullable().optional().transform(value => value ?? null);
const numberField = extractedFieldSchema(z.number()).nullable().optional().transform(value => value ?? null);

export const extractionLineSchema = z.object({
  sourceLineNumber: z.number().int(),
  sku: textField, productName: textField, unitOfMeasure: textField,
  deliveredQuantity: numberField, damagedQuantity: numberField,
});
export const extractionSchema = z.object({
  schemaVersion: nullableText,
  documentNumber: textField, inboundRequestCode: textField, supplierName: textField,
  documentDate: textField, supplierDeliveryDate: textField, warehouseCode: textField, warehouseName: textField,
  items: z.array(extractionLineSchema).default([]),
});
export const reviewLineSchema = z.object({
  sourceLineNumber: z.number().int(),
  extractedSku: nullableText, extractedProductName: nullableText, extractedUnitOfMeasure: nullableText,
  documentQuantity: nullableNumber,
  inboundRequestItemId: nullableText, productId: nullableText, productSku: nullableText, productName: nullableText,
  unitName: nullableText, orderedQuantity: nullableNumber, previouslyReceivedQuantity: nullableNumber, remainingQuantity: nullableNumber,
  confirmedQuantity: nullableNumber, damagedQuantity: nullableNumber, exceptionReason: nullableText,
  isLotTracked: z.boolean().default(false), lotNumber: nullableText, manufacturedDate: nullableText, expiryDate: nullableText,
  status: z.string(), isUserCorrected: z.boolean().default(false), isManuallyAdded: z.boolean().default(false),
});
export const reviewSchema = z.object({
  extraction: extractionSchema.nullable().optional().transform(value => value ?? null),
  inboundRequestId: nullableText, inboundRequestCode: nullableText,
  supplierName: nullableText, warehouseId: nullableText, warehouseCode: nullableText, warehouseName: nullableText,
  expectedReceiptDate: nullableText,
  hasWarehouseMismatch: z.boolean().default(false), warehouseMismatchAcknowledged: z.boolean().default(false),
  lines: z.array(reviewLineSchema).default([]),
  warnings: z.array(z.string()).default([]), blockingErrors: z.array(z.string()).default([]),
  canCreateDraft: z.boolean().default(false),
});
export const documentImportSchema = z.object({
  id, fileName: z.string(), status: z.string(),
  failureCode: nullableText, failureMessage: nullableText,
  extractionProvider: nullableText, extractionModel: nullableText,
  reviewedAt: nullableText, goodsReceiptId: nullableText,
  duplicateFileDetected: z.boolean().default(false),
  review: reviewSchema.nullable().optional().transform(value => value ?? null),
});

const optionalDate = z.string().trim().regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Ngày phải theo dạng YYYY-MM-DD.');
export const reviewFormLineSchema = z.object({
  sourceLineNumber: z.number().int().positive(),
  isManuallyAdded: z.boolean(),
  inboundRequestItemId: z.string().min(1, 'Chọn dòng hàng trong yêu cầu nhập.'),
  isLotTracked: z.boolean(),
  confirmedQuantity: z.string().trim().refine(value => Number(value) > 0, 'Số xác nhận phải lớn hơn 0.'),
  damagedQuantity: z.string().trim().refine(value => value === '' || Number(value) >= 0, 'Số hỏng không hợp lệ.'),
  exceptionReason: z.string().trim().max(500, 'Lý do tối đa 500 ký tự.'),
  lotNumber: z.string().trim().max(100, 'Số lô tối đa 100 ký tự.'),
  manufacturedDate: optionalDate,
  expiryDate: optionalDate,
}).superRefine((line, context) => {
  const confirmed = Number(line.confirmedQuantity);
  const damaged = Number(line.damagedQuantity || 0);
  if (damaged > confirmed) context.addIssue({ code: 'custom', path: ['damagedQuantity'], message: 'Số hỏng không vượt quá số xác nhận.' });
  if (damaged > 0 && !line.exceptionReason) context.addIssue({ code: 'custom', path: ['exceptionReason'], message: 'Nhập lý do khi có hàng hỏng.' });
  if (line.manufacturedDate && line.expiryDate && line.expiryDate < line.manufacturedDate)
    context.addIssue({ code: 'custom', path: ['expiryDate'], message: 'Hạn dùng phải sau ngày sản xuất.' });
});
export const reviewFormSchema = z.object({
  acknowledgeWarehouseMismatch: z.boolean(),
  lines: z.array(reviewFormLineSchema).min(1, 'Chứng từ chưa có dòng hàng.'),
}).superRefine((form, context) => {
  const seen = new Set<string>();
  form.lines.forEach((line, index) => {
    if (!line.inboundRequestItemId) return;
    if (seen.has(line.inboundRequestItemId))
      context.addIssue({ code: 'custom', path: ['lines', index, 'inboundRequestItemId'], message: 'Dòng hàng này đã được chọn ở dòng khác.' });
    seen.add(line.inboundRequestItemId);
  });
});

export type ExtractedTextField = z.infer<typeof extractionSchema>['documentNumber'];
export type DocumentImport = z.infer<typeof documentImportSchema>;
export type DocumentReview = z.infer<typeof reviewSchema>;
export type DocumentReviewLine = z.infer<typeof reviewLineSchema>;
export type ReviewForm = z.infer<typeof reviewFormSchema>;
export type ReviewFormLine = z.infer<typeof reviewFormLineSchema>;
export interface PickedDocument { readonly uri: string; readonly mimeType: string; readonly fileName: string; readonly file?: File }
