import { useExitProtection, useModalExit } from '@/hooks/use-screen-exit';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useFormDraft } from '@/hooks/use-form-draft';
import { toast } from 'sonner-native';

import type { InventoryStock } from '@/features/inventory/inventory.types';
import { useInventoryReportContext } from '@/features/inventory/hooks/use-inventory-report-context';
import { inventoryLookupApi } from '@/features/inventory-lookup/inventory-lookup.api';
import { damageCasesApi } from '@/features/damage-cases/damage-cases.api';
import { useEvidencePhotos } from '@/hooks/use-evidence-photos';
import { useWarehouseSelection } from '@/features/warehouse-access/warehouse-access.store';
import { getApiErrorMessage, logApiError } from '@/lib/api-error';
import { discrepanciesApi } from '../discrepancies.api';
import { discrepancyCommandSchema, discrepancyFormSchema, type Discrepancy, type DiscrepancyCommand, type DiscrepancyForm } from '../discrepancies.schema';

type Source = Pick<InventoryStock, 'id' | 'warehouseId' | 'productId' | 'slotId' | 'lotId'> & { version?: string | null };
export function useDiscrepancyComposer(source: Source, report?: Discrepancy, onReported?: (id: string) => void) {
  const context = useInventoryReportContext(source);
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draftVersion, setDraftVersion] = useState<string | undefined>();
  const [discard, setDiscard] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frozen, setFrozen] = useState(false);
  const lock = useRef(false);
  const active = useRef<(() => void) | null>(null);
  const command = useRef<DiscrepancyCommand | null>(null);
  const evidenceAttempt = useRef<{ ids: readonly string[]; version: string } | null>(null);
  useEffect(() => () => { active.current = null; }, []);
  const assert = () => {
    if (!active.current) throw new Error('Phiên báo cáo đã đóng. Vui lòng mở lại.');
    active.current();
  };
  const photos = useEvidencePhotos({ maxPhotos: 3, fileNamePrefix: 'chenh-lech',
    upload: (asset) => damageCasesApi.uploadEvidence(source.warehouseId, asset, assert) });
  const form = useForm<DiscrepancyForm>({ resolver: zodResolver(discrepancyFormSchema),
    defaultValues: { type: 'Shortage', quantity: '', description: '', correctSlotCode: '' } });
  const busy = sending || photos.isUploading;
  const draft = useFormDraft({ form, feature: 'discrepancy', documentId: source.id, version: draftVersion,
    enabled: open && !report && context.canReport, assertCurrent: assert });
  useExitProtection(() => ({ busy }));
  const close = useModalExit(() => {
    if (lock.current || photos.isUploading) return;
    active.current = null; photos.reset(); setOpen(false); setDiscard(false);
  });
  const requestClose = close;
  function begin() {
    try {
      context.assertCurrentContext(); active.current = context.assertCurrentContext;
      setDraftVersion(source.version ?? report?.version ?? undefined);
      command.current = null; evidenceAttempt.current = report ? { ids: [], version: report.version ?? '' } : null;
      photos.reset(); setFrozen(false); setError(null); setDiscard(false);
      form.reset({ type: 'Shortage', quantity: '', description: '', correctSlotCode: '' }); setOpen(true);
    } catch (failure) { toast.error(getApiErrorMessage(failure)); }
  }
  async function submit(values?: DiscrepancyForm) {
    if (lock.current || busy) return;
    lock.current = true; setSending(true); setError(null);
    try {
      assert();
      if (!photos.photos.length) throw new Error('Cần ít nhất một ảnh bằng chứng.');
      let resultId: string;
      if (report) {
        if (!evidenceAttempt.current?.ids.length) {
          if (!evidenceAttempt.current?.version || report.status !== 'EvidenceRequested') throw new Error('Báo cáo không còn yêu cầu ảnh. Vui lòng tải lại.');
          evidenceAttempt.current = { ids: photos.photos.map((photo) => photo.id), version: evidenceAttempt.current.version };
        }
        setFrozen(true);
        await discrepanciesApi.addEvidence(report.id, evidenceAttempt.current.ids, evidenceAttempt.current.version, assert);
        resultId = report.id;
      } else {
        if (!command.current) {
          const fields = discrepancyFormSchema.parse(values);
          let correctSlotId: string | undefined;
          if (fields.type === 'WrongLocation') {
            const match = await inventoryLookupApi.resolve(source.warehouseId, { kind: 'Location', code: fields.correctSlotCode });
            assert();
            const locations = match.matches.filter((item) => item.type === 'Slot');
            if (match.totalCount !== 1 || locations.length !== 1) throw new Error('Cần mã chính xác của một vị trí lưu hàng trong kho này.');
            correctSlotId = locations[0].id;
          }
          const amount = Number(fields.quantity.replace(',', '.'));
          command.current = discrepancyCommandSchema.parse({ warehouseId: source.warehouseId, productId: source.productId,
            slotId: source.slotId, ...(source.lotId ? { lotId: source.lotId } : {}), type: fields.type,
            observedDifference: fields.type === 'Shortage' ? -amount : amount, description: fields.description,
            evidenceIds: photos.photos.map((photo) => photo.id), commandId: Crypto.randomUUID(), ...(correctSlotId ? { correctSlotId } : {}) });
        }
        setFrozen(true);
        const sending = command.current;
        const commandId = sending.commandId;
        if (!commandId) throw new Error('Chưa có mã lệnh báo sai lệch.');
        resultId = await draft.execute({ operation: 'ReportDiscrepancy', commandId, content: JSON.stringify(sending),
          documentId: source.id, expectedVersion: draftVersion ?? '' }, () => discrepanciesApi.create(sending, assert),
        () => { command.current = null; setFrozen(false); });
      }
      assert();
      const selection = useWarehouseSelection.getState();
      void client.invalidateQueries({ queryKey: ['warehouse', selection.identity, selection.warehouseId, selection.revision, 'discrepancies'] });
      void client.invalidateQueries({ queryKey: ['notifications'] });
      void client.invalidateQueries({ queryKey: ['audit-logs'] });
      toast.success(report ? 'Đã bổ sung bằng chứng. Báo cáo chờ xem xét lại.' : 'Đã ghi nhận báo cáo sai lệch tồn kho để xem xét. Số lượng tồn chưa thay đổi.');
      if (!report) await draft.clear(true);
      active.current = null; photos.reset(); setOpen(false); onReported?.(resultId);
    } catch (failure) {
      logApiError(failure); setError(getApiErrorMessage(failure));
    } finally { draft.settled(); lock.current = false; setSending(false); }
  }
  return { ...context, open, discard, setDiscard, begin, close, requestClose, busy, frozen, error, photos, form,
    submit: report ? () => { void submit(); } : () => { void form.handleSubmit(submit)(); } };
}
