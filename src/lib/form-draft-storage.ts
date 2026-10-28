import * as Crypto from 'expo-crypto';
import { z } from 'zod';

import { SecureStore } from './secure-store';

const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const indexKey = 'kovia.form-drafts.v1';
const chunkSize = 400;
const maxChunks = 50;
const lifetime = 24 * 60 * 60 * 1000;
const pointerSchema = z.object({ bank: z.enum(['a', 'b']), count: z.number().int().min(1).max(maxChunks) });
export const pendingOperationSchema = z.object({ operation: z.string(), commandId: z.string().min(1), fingerprint: z.string().min(1),
  expectedVersion: z.string(), documentId: z.string(), receiptId: z.string().optional() });
export type PendingOperation = z.infer<typeof pendingOperationSchema>;
const draftSchema = z.object({ scope: z.string(), version: z.string(), savedAt: z.number(), pending: z.boolean(),
  operation: pendingOperationSchema.optional(), values: z.record(z.string(), z.unknown()) });
type Draft = z.infer<typeof draftSchema>;
let chain: Promise<unknown> = Promise.resolve();
let epoch = 0;
function serial<T>(operation: () => Promise<T>): Promise<T> {
  const result = chain.then(operation); chain = result.catch(() => undefined); return result;
}
async function digest(scope: string) { return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, scope); }
async function index() { return z.array(z.string().regex(/^[a-f0-9]{64}$/)).max(12).parse(JSON.parse(await SecureStore.getItemAsync(indexKey) ?? '[]')); }
async function erase(key: string) {
  await SecureStore.deleteItemAsync(`${key}.pointer`);
  for (const bank of ['a', 'b']) for (let number = 0; number < maxChunks; number++)
    await SecureStore.deleteItemAsync(`${key}.${bank}.${number}`);
}
async function readKey(key: string): Promise<Draft | null> {
  const pointer = await SecureStore.getItemAsync(`${key}.pointer`);
  if (!pointer) return null;
  const { bank, count } = pointerSchema.parse(JSON.parse(pointer));
  const chunks = await Promise.all(Array.from({ length: count }, (_, number) => SecureStore.getItemAsync(`${key}.${bank}.${number}`)));
  if (chunks.some(chunk => chunk === null)) throw new Error('Bản nháp chưa lưu đủ. Vui lòng nhập lại.');
  return draftSchema.parse(JSON.parse(chunks.join('')));
}

export const formDraftStorage = {
  read: (scope: string) => serial(async (): Promise<Draft | null> => {
    const key = await digest(scope);
    const draft = await readKey(key);
    if (!draft) return null;
    if (draft.scope !== scope) throw new Error('Bản nháp không thuộc phiên hiện tại.');
    if (!draft.pending && (Date.now() - draft.savedAt > lifetime || draft.savedAt > Date.now())) {
      await erase(key); return null;
    }
    return draft;
  }),
  pending: (scope: string) => serial(async () => {
    const parts = z.array(z.unknown()).parse(JSON.parse(scope));
    const result: Draft[] = [];
    for (const key of await index()) {
      const draft = await readKey(key);
      if (!draft?.pending) continue;
      const candidate = z.array(z.unknown()).parse(JSON.parse(draft.scope));
      if (parts.slice(0, 3).some((value, position) => value !== candidate[position])) continue;
      if (parts[4] === candidate[4] || parts[4] === draft.operation?.receiptId || parts[4] === draft.operation?.documentId) result.push(draft);
    }
    return result;
  }),
  write: (draft: Omit<Draft, 'savedAt'>, assertCurrent: () => void, resolvedPrevious = false) => {
    const originalEpoch = epoch;
    return serial(async () => {
      const guard = () => { if (epoch !== originalEpoch) throw new Error('Phiên lưu nháp đã kết thúc.'); assertCurrent(); };
      guard();
      if (!(await SecureStore.isAvailableAsync())) throw new Error('Thiết bị chưa hỗ trợ lưu nháp an toàn.');
      const text = JSON.stringify({ ...draft, savedAt: Date.now() });
      const count = Math.ceil(text.length / chunkSize);
      if (count > maxChunks) throw new Error('Form quá lớn để lưu nháp trên thiết bị. Hãy lưu phiếu lên máy chủ.');
      const key = await digest(draft.scope); guard();
      const existing = await readKey(key);
      if (existing?.pending && !resolvedPrevious && (!draft.pending ||
        existing.operation?.commandId !== draft.operation?.commandId || existing.operation?.fingerprint !== draft.operation?.fingerprint))
        throw new Error('Cần đối soát lệnh đang chờ trước khi thay đổi bản nháp.');
      const keys = await index();
      if (!keys.includes(key)) {
        if (keys.length === 12) {
          let removable = -1;
          for (let position = 0; position < keys.length; position++) {
            if (!(await readKey(keys[position]))?.pending) { removable = position; break; }
          }
          if (removable < 0) throw new Error('Chưa đủ chỗ bảo toàn lệnh. Vui lòng đối soát các chứng từ đang chờ trước khi gửi thêm.');
          await erase(keys.splice(removable, 1)[0]);
        }
        keys.push(key);
        // Register before writing chunks so logout also removes an interrupted write.
        await SecureStore.setItemAsync(indexKey, JSON.stringify(keys), options);
      }
      const previous = pointerSchema.safeParse(JSON.parse(await SecureStore.getItemAsync(`${key}.pointer`) ?? 'null'));
      const bank = previous.success && previous.data.bank === 'a' ? 'b' : 'a';
      for (let number = 0; number < count; number++) {
        guard(); await SecureStore.setItemAsync(`${key}.${bank}.${number}`, text.slice(number * chunkSize, (number + 1) * chunkSize), options);
      }
      guard();
      // Commit last; a process death retains the previous complete bank.
      await SecureStore.setItemAsync(`${key}.pointer`, JSON.stringify({ bank, count }), options);
    });
  },
  remove: (scope: string, resolved = false) => serial(async () => {
    const key = await digest(scope);
    if (!resolved && (await readKey(key))?.pending) throw new Error('Chưa thể xóa thông tin lệnh chưa được đối soát.');
    await erase(key);
  }),
  clear: () => {
    epoch++;
    return serial(async () => { for (const key of await index()) await erase(key); await SecureStore.deleteItemAsync(indexKey); });
  },
};
