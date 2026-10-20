import { KeyRound, SearchX, ServerCrash, ShieldAlert, TriangleAlert, WifiOff } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorKind, getApiErrorMessage, type ApiErrorKind } from '@/lib/api-error';

import { StateContainer } from './state-container';

interface Presentation {
  readonly icon: LucideIcon;
  readonly title: string;
  /** Null means "show the server message", used when nothing more specific is known. */
  readonly message: string | null;
}

const PRESENTATIONS: Record<ApiErrorKind, Presentation> = {
  network: {
    icon: WifiOff,
    title: 'Không có kết nối mạng',
    message: 'Kiểm tra kết nối của bạn rồi thử lại.',
  },
  unauthorized: {
    icon: KeyRound,
    title: 'Phiên đăng nhập đã hết hạn',
    message: 'Vui lòng đăng nhập lại để tiếp tục.',
  },
  forbidden: {
    icon: ShieldAlert,
    title: 'Bạn không có quyền truy cập',
    message: 'Tài khoản của bạn chưa được cấp quyền xem nội dung này. Liên hệ quản lý kho nếu cần.',
  },
  notFound: {
    icon: SearchX,
    title: 'Không tìm thấy dữ liệu',
    message: 'Dữ liệu có thể đã bị xóa hoặc không còn tồn tại.',
  },
  server: {
    icon: ServerCrash,
    title: 'Máy chủ đang gặp sự cố',
    message: 'Vui lòng thử lại sau ít phút.',
  },
  unknown: { icon: TriangleAlert, title: 'Đã xảy ra lỗi', message: null },
};

// Retrying cannot grant a permission or restore an expired session.
const NON_RETRYABLE_KINDS: readonly ApiErrorKind[] = ['forbidden', 'unauthorized'];

interface ErrorStateProps {
  /** Typically the `error` from a query. The kind (network, 403, 5xx...) picks the wording. */
  readonly error?: unknown;
  /** Forces a presentation, e.g. `forbidden` for a UI-only permission check with no request. */
  readonly kind?: ApiErrorKind;
  readonly onRetry?: () => void;
  readonly secondaryLabel?: string;
  readonly onSecondary?: () => void;
  readonly fullScreen?: boolean;
}

export function ErrorState({
  error,
  kind,
  onRetry,
  secondaryLabel,
  onSecondary,
  fullScreen = false,
}: ErrorStateProps) {
  const theme = useTheme();
  const resolvedKind = kind ?? getApiErrorKind(error);
  const { icon: Icon, title, message } = PRESENTATIONS[resolvedKind];
  const description = message ?? getApiErrorMessage(error);
  const canRetry = onRetry !== undefined && !NON_RETRYABLE_KINDS.includes(resolvedKind);

  return (
    <StateContainer fullScreen={fullScreen}>
      <View style={[styles.badge, { backgroundColor: theme.errorContainer }]}>
        <Icon size={32} color={theme.error} />
      </View>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
        {title}
      </Text>
      <Text accessibilityLiveRegion="polite" style={[styles.description, { color: theme.textSecondary }]}>
        {description}
      </Text>
      <View style={styles.actions}>
        {canRetry ? <Button label="Thử lại" onPress={onRetry} /> : null}
        {secondaryLabel && onSecondary ? (
          <Button variant="outline" label={secondaryLabel} onPress={onSecondary} />
        ) : null}
      </View>
    </StateContainer>
  );
}

const styles = StyleSheet.create({
  badge: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', borderRadius: 36 },
  title: { fontFamily: FontFamily.semibold, fontSize: 18, lineHeight: 26, textAlign: 'center' },
  description: {
    maxWidth: 320,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  actions: { alignSelf: 'stretch', maxWidth: 320, gap: 12, marginTop: 8 },
});
