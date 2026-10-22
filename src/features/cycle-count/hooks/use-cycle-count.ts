import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { P } from '@/config/permission-codes';
import { useAuth } from '@/features/auth/auth.store';
import type { UserProfile } from '@/features/auth/auth.types';
import { taskScopeMatches, type TaskScope } from '@/features/my-tasks/my-tasks';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { profileQueryKey, warehouseSnapshot } from '@/features/warehouse-access/warehouse-access';
import { useWarehouseSelection } from '@/features/warehouse-access/warehouse-access.store';
import { getApiErrorMessage, logApiError } from '@/lib/api-error';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';
import { warehouseCommand, type WarehouseCommandMemory } from '@/lib/warehouse-command';

import { assertCountRecord, canRecordCountItem } from '../cycle-count';
import { cycleCountApi } from '../cycle-count.api';
import { countFormSchema, type CountForm, type CountItem } from '../cycle-count.schema';

interface Target { key: string; version: string; action: 'Start' | 'Record' | 'Submit'; itemId?: string; values?: CountForm }
interface Editor { key: string; version: string; item: CountItem }
export function useCycleCount(documentId: string) {
  const access = useWarehouseAccess(); const client = useQueryClient();
  const validId = nonEmptyDotNetGuidSchema('Mã kiểm kê không hợp lệ.').safeParse(documentId).success;
  const canView = access.ready && validId && !!access.profile.data?.permissions.includes(P.CYCLE_COUNTS_VIEW);
  const { identity, warehouseId, revision, signature } = access.selection;
  const scope: TaskScope | null = canView && identity && warehouseId && signature ? { identity, warehouseId, revision, signature } : null;
  const prefix = ['warehouse', identity, warehouseId, revision, 'cycle-count', documentId];
  const contextKey = JSON.stringify([...prefix, signature]); const userId = access.profile.data?.id ?? '';
  const detail = useQuery({ queryKey: [...prefix, 'detail'], enabled: !!scope, retry: false,
    queryFn: ({ signal }) => cycleCountApi.detail(documentId, scope!.warehouseId, userId, signal) });
  const actions = useQuery({ queryKey: [...prefix, 'actions'], enabled: !!scope && detail.isSuccess, retry: false,
    queryFn: ({ signal }) => cycleCountApi.actions(documentId, signal) });
  const [editor, setEditor] = useState<Editor | null>(null); const [target, setTarget] = useState<Target | null>(null);
  const [notice, setNotice] = useState<{ key: string; message: string } | null>(null);
  const [photos, setPhotos] = useState<{ key: string; version: string; itemId: string; files: { id: string; fileName: string }[] } | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false); const [discard, setDiscard] = useState(false);
  const lock = useRef(false); const command = useRef<WarehouseCommandMemory | null>(null);
  const form = useForm<CountForm>({ resolver: zodResolver(countFormSchema), defaultValues: { countedQuantity: Number.NaN,
    countedDamagedQuantity: 0, note: '', countMethod: 'Manual', scannedBarcode: '', damageReason: '', damageEvidenceIds: [] } });
  const allowed = (action: string) => canView && !!detail.data?.version && !detail.isError && !detail.isFetching &&
    !actions.isError && !actions.isFetching && actions.data?.currentVersion === detail.data.version && actions.data.allowedActions.includes(action);
  function assertAction(action: string, version: string) {
    const profile = client.getQueryData<UserProfile>(profileQueryKey); const snapshot = profile ? warehouseSnapshot(profile) : null;
    if (!scope || !taskScopeMatches(scope, useWarehouseSelection.getState()) || !useAuth.getState().signedIn ||
      !snapshot?.activeUser || !snapshot.compatible || snapshot.identity !== scope.identity || snapshot.signature !== scope.signature ||
      !snapshot.warehouses.some(warehouse => warehouse.id === scope.warehouseId) || !profile?.permissions.includes(P.CYCLE_COUNTS_VIEW) ||
      !profile.permissions.includes(P.CYCLE_COUNTS_RECORD) || !allowed(action) || detail.data?.version !== version)
      throw new Error('Kho, quyền, phân công hoặc phiên bản kiểm kê đã thay đổi. Vui lòng tải lại.');
  }
  const mutation = useMutation<unknown, Error, Target>({ retry: false, mutationFn: async original => {
    const assertCurrent = () => { if (original.key !== contextKey) throw new Error('Phiếu kiểm kê đã thay đổi.'); assertAction(original.action, original.version); };
    assertCurrent();
    const payload = { documentId, action: original.action, version: original.version, itemId: original.itemId, values: original.values };
    command.current = warehouseCommand(command.current, payload);
    const body = { expectedVersion: original.version, commandId: command.current.commandId };
    if (original.action !== 'Record') return cycleCountApi.execute(documentId, original.action === 'Start' ? 'start' : 'submit', body, assertCurrent);
    const values = countFormSchema.parse(original.values);
    const item = detail.data?.items.find(value => value.id === original.itemId);
    if (!detail.data || !item) throw new Error('Không tìm thấy dòng kiểm kê.');
    assertCountRecord(detail.data, item, values);
    if (values.countMethod === 'Scanned' && !allowed('Scan')) throw new Error('Gói dịch vụ hoặc quyền hiện tại chưa cho phép quét kiểm kê.');
    return cycleCountApi.record(documentId, item.id, values, body, assertCurrent);
  }, onError: logApiError, onSuccess: async (_, original) => {
    if (original.key !== contextKey) return;
    setEditor(null); setTarget(null); setPhotos(null); form.reset();
    setNotice({ key: contextKey, message: original.action === 'Start' ? 'Đã bắt đầu kiểm kê và chốt mốc tồn.'
      : original.action === 'Record' ? 'Đã ghi nhận số đếm. Số lượng tồn kho chưa thay đổi.' : 'Đã gửi kết quả kiểm kê để quản lý rà soát. Số lượng tồn kho chưa thay đổi.' });
    await client.invalidateQueries({ queryKey: ['warehouse', identity, warehouseId, revision] });
  } });
  function begin(action: 'Start' | 'Submit') {
    if (!detail.data?.version || !allowed(action) || lock.current) return;
    mutation.reset(); setNotice(null); setTarget({ key: contextKey, version: detail.data.version, action });
  }
  function beginRecord(item: CountItem, scannedBarcode?: string) {
    const currentItem = detail.data?.items.find((candidate) => candidate.id === item.id);
    if (!detail.data?.version || !currentItem || !allowed('Record') || !access.profile.data?.permissions.includes(P.CYCLE_COUNTS_RECORD) || !canRecordCountItem(detail.data, currentItem) || lock.current) return;
    if (scannedBarcode && (!allowed('Scan') || scannedBarcode.trim().length > 100 ||
      (scannedBarcode.trim().toLowerCase() !== currentItem.productSku.trim().toLowerCase() &&
      scannedBarcode.trim().toLowerCase() !== currentItem.productBarcode?.trim().toLowerCase()))) return;
    mutation.reset(); setNotice(null); setDiscard(false); setPhotos(null);
    form.reset({ countedQuantity: Number.NaN, countedDamagedQuantity: 0, note: '', countMethod: scannedBarcode ? 'Scanned' : 'Manual',
      scannedBarcode: scannedBarcode?.trim() ?? '', damageReason: '', damageEvidenceIds: [] });
    setEditor({ key: contextKey, version: detail.data.version, item: currentItem });
  }
  async function reviewRecord() {
    await form.handleSubmit(values => {
      if (!detail.data || editor?.key !== contextKey || lock.current) return;
      try { assertCountRecord(detail.data, editor.item, values); setTarget({ key: contextKey, version: editor.version, action: 'Record', itemId: editor.item.id, values }); }
      catch (error) { setNotice({ key: contextKey, message: getApiErrorMessage(error) }); }
    })();
  }
  async function addPhoto(source: 'camera' | 'library' = 'camera') {
    if (!editor || editor.key !== contextKey || lock.current || !scope) return;
    const currentFiles = photos?.key === contextKey && photos.itemId === editor.item.id && photos.version === editor.version ? photos.files : [];
    if (currentFiles.length + (editor.item.damageEvidence?.length ?? 0) >= 3) return;
    const assertCurrent = () => assertAction('Record', editor.version);
    lock.current = true; setPhotoBusy(true); setNotice(null);
    try {
      assertCurrent();
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        assertCurrent();
        if (!permission.granted) throw new Error('Cần quyền camera để chụp ảnh. Bạn có thể chọn ảnh có sẵn thay thế.');
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8, allowsEditing: false, exif: false, base64: false };
      const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      assertCurrent(); if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.mimeType || !['image/jpeg', 'image/png'].includes(asset.mimeType)) throw new Error('Vui lòng chọn ảnh JPG hoặc PNG.');
      if (asset.fileSize !== undefined && (asset.fileSize <= 0 || asset.fileSize > 10 * 1024 * 1024)) throw new Error('Ảnh phải có dữ liệu và không vượt quá 10 MB.');
      const evidence = await cycleCountApi.uploadEvidence(scope.warehouseId, { uri: asset.uri, mimeType: asset.mimeType,
        fileName: asset.fileName ?? `kiem-ke.${asset.mimeType === 'image/png' ? 'png' : 'jpg'}`, file: asset.file }, assertCurrent);
      const files = [...currentFiles, { id: evidence.id, fileName: evidence.fileName }];
      setPhotos({ key: contextKey, version: editor.version, itemId: editor.item.id, files });
      form.setValue('damageEvidenceIds', files.map(file => file.id), { shouldDirty: true, shouldValidate: true });
    } catch (error) { setNotice({ key: contextKey, message: getApiErrorMessage(error) }); }
    finally { lock.current = false; setPhotoBusy(false); }
  }
  async function confirm() {
    if (!target || target.key !== contextKey || lock.current) return;
    lock.current = true;
    try { await mutation.mutateAsync(target); } catch { /* The immutable confirmation and command remain available for explicit retry. */ }
    finally { lock.current = false; }
  }
  return { access, validId, canView, detail, actions, form, allowed, mutation, photoBusy, contextKey, discard, setDiscard,
    editor: editor?.key === contextKey ? editor : null, target: target?.key === contextKey ? target : null,
    notice: notice?.key === contextKey ? notice.message : null, files: photos?.key === contextKey && photos.version === editor?.version && photos.itemId === editor.item.id ? photos.files : [],
    begin, beginRecord, reviewRecord, addPhoto, confirm,
    refresh: async () => { await client.invalidateQueries({ queryKey: prefix }); },
    closeEditor: () => { if (!lock.current) { if (form.formState.isDirty) setDiscard(true); else setEditor(null); } },
    discardChanges: () => { if (!lock.current) { setEditor(null); setPhotos(null); setDiscard(false); form.reset(); } },
    cancelConfirmation: () => { if (!lock.current) setTarget(null); } };
}
