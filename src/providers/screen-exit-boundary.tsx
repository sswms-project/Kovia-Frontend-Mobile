import { useNavigation, usePathname } from 'expo-router';
import { CommonActions, useIsFocused, usePreventRemove } from 'expo-router/react-navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, View, StyleSheet } from 'react-native';
import { toast } from 'sonner-native';
import { useQueryClient } from '@tanstack/react-query';

import { NavigationIcon, WorkScreenHeader } from '@/components/work-screen-header';
import { useAuth } from '@/features/auth/auth.store';
import { getAllowedTabs } from '@/features/auth/auth.permissions';
import type { UserProfile } from '@/features/auth/auth.types';
import { profileQueryKey } from '@/features/warehouse-access/warehouse-access';
import { useWarehouseSelection } from '@/features/warehouse-access/warehouse-access.store';
import { ScreenExitContext, type ExitProtection } from '@/hooks/use-screen-exit';
import { getApiErrorMessage } from '@/lib/api-error';
import { homeNavigationState } from '@/lib/screen-navigation';

const TITLES: Readonly<Record<string, string>> = {
  receiving: 'Nhận hàng', putaway: 'Cất hàng', 'stock-issue': 'Thực hiện xuất hàng', 'cycle-count': 'Kiểm kê',
  relocation: 'Di chuyển hàng', 'transfer-pick': 'Lấy hàng điều chuyển', 'transfer-receipt': 'Nhận hàng điều chuyển',
  'transfer-putaway': 'Cất hàng điều chuyển', 'receiving-review': 'Rà soát phiếu nhận', 'smart-allocation': 'Phân bổ hàng', security: 'Bảo mật',
};
type Choice = 'cancel' | 'discard' | 'keep' | 'leave';
function ask(destination: string, guards: readonly ExitProtection[]): Promise<Choice> {
  if (guards.some(guard => guard.busy)) { Alert.alert('Đang xử lý', 'Vui lòng chờ thao tác hiện tại có kết quả trước khi rời màn hình.'); return Promise.resolve('cancel'); }
  const pending = guards.some(guard => guard.pending);
  const dirty = guards.some(guard => guard.dirty);
  const photos = guards.some(guard => guard.photos);
  if (!pending && !dirty && !photos) return Promise.resolve('leave');
  return new Promise(resolve => {
    const choices: { text: string; style?: 'cancel' | 'destructive'; onPress: () => void }[] = [
      { text: 'Tiếp tục ở lại', style: 'cancel', onPress: () => resolve('cancel') },
    ];
    if (pending) choices.push({ text: `Tiếp tục ${destination}`, onPress: () => resolve('leave') });
    else {
      choices.push({ text: `Bỏ thay đổi và ${destination}`, style: 'destructive', onPress: () => resolve('discard') });
      if (dirty && guards.filter(guard => guard.dirty).every(guard => !!guard.keep))
        choices.push({ text: 'Giữ nháp trên máy và về', onPress: () => resolve('keep') });
    }
    Alert.alert(pending ? 'Cần kiểm tra kết quả' : 'Dữ liệu chưa lưu', pending
      ? 'Chưa xác định được kết quả gửi. App giữ thông tin đối soát; khi mở lại cần kiểm tra chứng từ trước khi gửi tiếp.'
      : `Bạn có nội dung chưa lưu.${photos ? ' Có ảnh chưa được BE xác nhận gắn vào chứng từ.' : ''} Nháp trên máy chỉ giữ nội dung nhập; cần thêm lại ảnh và quét lại mã khi mở lại.`,
    choices, { cancelable: true, onDismiss: () => resolve('cancel') });
  });
}

export function ScreenExitBoundary({ children, standalone = false }: { readonly children: ReactNode; readonly standalone?: boolean }) {
  const navigation = useNavigation();
  const client = useQueryClient();
  const pathname = usePathname();
  const focused = useIsFocused();
  const signedIn = useAuth(state => state.signedIn);
  const selection = useWarehouseSelection();
  const { identity, warehouseId, revision, signature } = selection;
  const scope = JSON.stringify([signedIn, identity, warehouseId, revision, signature, pathname]);
  const sessionIsCurrent = useCallback(() => {
    const current = useWarehouseSelection.getState();
    return useAuth.getState().signedIn && current.identity === identity && current.warehouseId === warehouseId &&
      current.revision === revision && current.signature === signature;
  }, [identity, warehouseId, revision, signature]);
  const protections = useRef(new Map<symbol, () => ExitProtection>());
  const generation = useRef(0); const locked = useRef(false); const alive = useRef(true); const approving = useRef(false);
  const currentScope = useRef(scope);
  const [leavingScope, setLeavingScope] = useState<string | null>(null);
  const [subtitle, setSubtitle] = useState<string | undefined>(undefined);
  const leaving = focused && leavingScope === scope;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useLayoutEffect(() => { currentScope.current = scope; generation.current++; locked.current = false; }, [scope]);
  useEffect(() => navigation.addListener('focus', () => {
    locked.current = false; generation.current++; setLeavingScope(null);
  }), [navigation]);
  const register = useCallback((read: () => ExitProtection) => {
    const key = Symbol(); protections.current.set(key, read);
    return () => { protections.current.delete(key); };
  }, []);
  const capture = useCallback(() => {
    const original = generation.current; const originalScope = currentScope.current;
    return () => alive.current && navigation.isFocused() && sessionIsCurrent() && !locked.current && original === generation.current && originalScope === currentScope.current;
  }, [sessionIsCurrent, navigation]);
  const request = useCallback(async (action: () => void, destination = 'về trang chủ', stayOnRoute = false) => {
    if (locked.current || !alive.current || !navigation.isFocused()) return;
    locked.current = true; const original = ++generation.current; setLeavingScope(currentScope.current);
    const originalScope = currentScope.current;
    const valid = () => alive.current && sessionIsCurrent() && original === generation.current && originalScope === currentScope.current;
    let committed = false;
    try {
      const guards = [...protections.current.values()].map(read => read());
      const choice = await ask(destination, guards);
      if (!valid() || choice === 'cancel') return;
      // Re-read after a dialog: uploads, mutations and permissions may have changed.
      const current = [...protections.current.values()].map(read => read());
      if (current.some(guard => guard.busy)) throw new Error('Thao tác đang được xử lý. Vui lòng chờ kết quả.');
      if (current.some(guard => guard.pending) && !guards.some(guard => guard.pending))
        throw new Error('Kết quả gửi đã thay đổi trong lúc xác nhận. Vui lòng kiểm tra lại trước khi rời.');
      if (current.some(guard => guard.pending)) {
        for (const guard of current.filter(value => value.pending)) {
          if (!guard.preservePending) throw new Error('Chưa bảo toàn được thông tin đối soát. Vui lòng ở lại kiểm tra.');
          await guard.preservePending(); if (!valid()) return;
        }
      } else if (choice === 'keep' || choice === 'discard') {
        for (const guard of current.filter(value => value.dirty || (choice === 'discard' && value.photos))) {
          const operation = choice === 'keep' ? guard.keep : guard.discard;
          if (!operation) throw new Error('Form chưa hỗ trợ thao tác này an toàn.');
          await operation(); if (!valid()) return;
        }
      } else if (current.some(guard => guard.dirty || guard.photos)) throw new Error('Dữ liệu đã thay đổi. Vui lòng chọn cách rời màn hình lại.');
      if (valid()) {
        if (stayOnRoute) for (const guard of current) guard.prepareClose?.();
        approving.current = true; action(); committed = true;
      }
    } catch (failure) { if (valid()) toast.error(getApiErrorMessage(failure)); }
    finally {
      approving.current = false;
      if (valid() && (!committed || stayOnRoute)) {
        if (!committed) for (const read of protections.current.values()) read().resume?.();
        locked.current = false; generation.current++; setLeavingScope(null);
      }
    }
  }, [sessionIsCurrent, navigation]);
  const resetToTab = useCallback((target: 'index' | 'tasks') => {
    let root = navigation;
    while (root.getParent()) root = root.getParent()!;
    const state = root.getState();
    if (!state) throw new Error('Chưa xác định được điều hướng hiện tại. Vui lòng thử lại.');
    const profile = client.getQueryData<UserProfile>(profileQueryKey);
    const allowedTarget = target === 'tasks' && (!profile || !getAllowedTabs(profile).some(tab => tab.name === 'tasks')) ? 'index' : target;
    root.dispatch(CommonActions.reset(homeNavigationState(state, allowedTarget)));
  }, [navigation, client]);
  const navigateTab = useCallback((target: 'index' | 'tasks') => {
    void request(() => resetToTab(target), target === 'tasks' ? 'về công việc' : 'về trang chủ');
  }, [request, resetToTab]);
  const home = useCallback(() => navigateTab('index'), [navigateTab]);
  const tasks = useCallback(() => navigateTab('tasks'), [navigateTab]);
  const back = useCallback(() => { void request(() => {
    // Expo Router's imperative Back is queued; dispatch while this exact removal is approved.
    if (navigation.canGoBack()) navigation.dispatch(CommonActions.goBack());
    else {
      const profile = client.getQueryData<UserProfile>(profileQueryKey);
      resetToTab(profile && getAllowedTabs(profile).some(tab => tab.name === 'tasks') ? 'tasks' : 'index');
    }
  }, 'quay lại'); }, [request, client, navigation, resetToTab]);
  usePreventRemove(signedIn && focused, ({ data }) => {
    if (approving.current || !useAuth.getState().signedIn) navigation.dispatch(data.action);
    else void request(() => navigation.dispatch(data.action), 'quay lại');
  });
  useLayoutEffect(() => {
    if (!standalone) navigation.setOptions({
      headerRight: () => <NavigationIcon home onPress={home} disabled={leaving} />,
      headerLeft: () => <NavigationIcon onPress={back} disabled={leaving} />,
    });
  }, [standalone, navigation, home, back, leaving]);
  const context = useMemo(() => ({ register, request, home, tasks, back, capture, leaving, setSubtitle }), [register, request, home, tasks, back, capture, leaving]);
  const title = TITLES[pathname.split('/').filter(Boolean)[0]] ?? 'Chi tiết công việc';
  return <ScreenExitContext.Provider value={context}><View style={styles.root}>
    {standalone && <WorkScreenHeader title={title} subtitle={subtitle} />}{children}
  </View></ScreenExitContext.Provider>;
}
const styles = StyleSheet.create({ root: { flex: 1 } });
