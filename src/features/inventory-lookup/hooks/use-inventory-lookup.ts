import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AppState, Platform } from 'react-native';

import { P } from '@/config/permission-codes';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { warehouseQueryKey } from '@/features/warehouse-access/warehouse-access';
import { useWarehouseSelection } from '@/features/warehouse-access/warehouse-access.store';

import { createScanGate } from '../inventory-lookup';
import { inventoryLookupApi } from '../inventory-lookup.api';
import { lookupInputSchema, type BarcodeMatch, type LookupInput } from '../inventory-lookup.schema';

export function useInventoryLookup(initialInput?: LookupInput) {
  const access = useWarehouseAccess();
  const canView = access.ready && !!access.profile.data?.permissions.includes(P.INVENTORY_VIEW);
  const warehouseId = access.warehouse?.id ?? '';
  const [request, setRequest] = useState<{ input: LookupInput; attempt: number } | null>(() => {
    const parsed = lookupInputSchema.safeParse(initialInput);
    return parsed.success ? { input: parsed.data, attempt: 1 } : null;
  });
  const [match, setMatch] = useState<BarcodeMatch | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [permission, requestPermission] = useCameraPermissions();
  const scanGate = useRef(createScanGate());
  const focusGeneration = useRef(0);
  const permissionLock = useRef(false);
  const form = useForm<LookupInput>({ resolver: zodResolver(lookupInputSchema), defaultValues: initialInput ?? { kind: 'Product', code: '' } });
  useFocusEffect(useCallback(() => {
    focusGeneration.current += 1;
    setFocused(true);
    return () => { focusGeneration.current += 1; setFocused(false); setCameraOpen(false); scanGate.current.close(); };
  }, []));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setActive(state === 'active');
      if (state !== 'active') { setCameraOpen(false); scanGate.current.close(); }
    });
    return () => subscription.remove();
  }, []);
  const lookup = useQuery({
    queryKey: canView ? warehouseQueryKey('barcode-lookup', request) : ['inventory-lookup', 'blocked'],
    queryFn: ({ signal }) => inventoryLookupApi.resolve(warehouseId, request!.input, signal),
    enabled: canView && !!request, retry: false, staleTime: Infinity,
  });
  const resolved = match ?? (lookup.isSuccess && lookup.data.totalCount === 1 ? lookup.data.matches[0] ?? null : null);
  const awaitingSelection = !!request && (!lookup.isSuccess || !resolved);
  const inventory = useQuery({
    queryKey: canView ? warehouseQueryKey('inventory-lookup-stock', { match: resolved, pageNumber }) : ['inventory-stock', 'blocked'],
    queryFn: ({ signal }) => inventoryLookupApi.list(warehouseId, resolved, pageNumber, signal),
    enabled: canView && !awaitingSelection, retry: false, staleTime: 15_000,
  });
  function submit(input: LookupInput) {
    setMatch(null); setPageNumber(1);
    setRequest((previous) => ({ input, attempt: (previous?.attempt ?? 0) + 1 }));
  }
  async function search() { await form.handleSubmit(submit)(); }
  async function openCamera() {
    if (permissionLock.current || !canView) return;
    permissionLock.current = true;
    setCameraError(null);
    const generation = focusGeneration.current;
    const originalSelection = access.selection;
    try {
      const result = permission?.granted ? permission : await requestPermission();
      const currentSelection = useWarehouseSelection.getState();
      if (focusGeneration.current !== generation || currentSelection.identity !== originalSelection.identity ||
        currentSelection.signature !== originalSelection.signature || currentSelection.revision !== originalSelection.revision ||
        currentSelection.warehouseId !== originalSelection.warehouseId) return;
      if (!result.granted) {
        setCameraError(result.canAskAgain ? 'Chưa có quyền camera. Bạn có thể nhập mã bằng tay.'
          : 'Camera đã bị từ chối. Cho phép camera trong cài đặt ứng dụng hoặc nhập mã bằng tay.');
        return;
      }
      scanGate.current.arm(); setCameraOpen(true);
    } catch { setCameraError('Không thể mở camera. Vui lòng nhập mã bằng tay.'); }
    finally { permissionLock.current = false; }
  }
  function onScan(code: string) {
    if (!focused || !active || !canView || !scanGate.current.take()) return;
    setCameraOpen(false);
    form.setValue('code', code, { shouldValidate: true });
    const parsed = lookupInputSchema.safeParse({ kind: form.getValues('kind'), code });
    if (parsed.success) submit(parsed.data);
    if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => {
      setCameraError('Đã đọc mã; thiết bị không hỗ trợ phản hồi rung.');
    });
  }
  function clear() {
    setRequest(null); setMatch(null); setPageNumber(1); form.reset({ kind: 'Product', code: '' });
  }
  const select = useCallback((value: BarcodeMatch) => { setMatch(value); setPageNumber(1); }, []);
  return { access, canView, form, lookup, inventory, request, resolved, pageNumber, setPageNumber,
    search, clear, select,
    cameraVisible: cameraOpen && focused && active && canView && !!permission?.granted,
    cameraError, openCamera, onScan, closeCamera: () => { setCameraOpen(false); scanGate.current.close(); },
    failCamera: () => { setCameraOpen(false); scanGate.current.close(); setCameraError('Không thể sử dụng camera. Vui lòng nhập mã bằng tay.'); } };
}
