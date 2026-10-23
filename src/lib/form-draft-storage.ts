import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { z } from 'zod';

const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const indexKey = 'kovia.form-drafts.v1';
const chunkSize = 400;
const maxChunks = 50;
const lifetime = 24 * 60 * 60 * 1000;
const pointerSchema = z.object({ bank: z.enum(['a', 'b']), count: z.number().int().min(1).max(maxChunks) });
const draftSchema = z.object({ scope: z.string(), version: z.string(), savedAt: z.number(), pending: z.boolean(), values: z.record(z.string(), z.unknown()) });
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

export const formDraftStorage = {
  read: (scope: string) => serial(async (): Promise<Draft | null> => {
    const key = await digest(scope);
    const pointer = await SecureStore.getItemAsync(`${key}.pointer`);
    if (!pointer) return null;
    const { bank, count } = pointerSchema.parse(JSON.parse(pointer));
    const chunks = await Promise.all(Array.from({ length: count }, (_, number) => SecureStore.getItemAsync(`${key}.${bank}.${number}`)));
    if (chunks.some(chunk => chunk === null)) throw new Error('Bản nháp chưa lưu đủ. Vui lòng nhập lại.');
    const draft = draftSchema.parse(JSON.parse(chunks.join('')));
    if (draft.scope !== scope || Date.now() - draft.savedAt > lifetime || draft.savedAt > Date.now()) {
      await erase(key); return null;
    }
    return draft;
  }),
  write: (draft: Omit<Draft, 'savedAt'>, assertCurrent: () => void) => {
    const originalEpoch = epoch;
    return serial(async () => {
      const guard = () => { if (epoch !== originalEpoch) throw new Error('Phiên lưu nháp đã kết thúc.'); assertCurrent(); };
      guard();
      if (!(await SecureStore.isAvailableAsync())) throw new Error('Thiết bị chưa hỗ trợ lưu nháp an toàn.');
      const text = JSON.stringify({ ...draft, savedAt: Date.now() });
      const count = Math.ceil(text.length / chunkSize);
      if (count > maxChunks) throw new Error('Form quá lớn để lưu nháp trên thiết bị. Hãy lưu phiếu lên máy chủ.');
      const key = await digest(draft.scope); guard();
      const keys = await index();
      if (!keys.includes(key)) {
        if (keys.length === 12) { await erase(keys.shift()!); }
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
  remove: (scope: string) => serial(async () => { await erase(await digest(scope)); }),
  clear: () => {
    epoch++;
    return serial(async () => { for (const key of await index()) await erase(key); await SecureStore.deleteItemAsync(indexKey); });
  },
};
