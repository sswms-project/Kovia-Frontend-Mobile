import { useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontFamily } from '@/constants/theme';
import { REJECT_REASON_MAX_LENGTH, rejectReasonSchema } from '@/features/approvals/approvals.schema';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

type Decision = 'approve' | 'reject';

interface ApprovalActionsProps {
  /** Lower-case document noun used in titles, e.g. "yêu cầu trả hàng". */
  readonly subject: string;
  readonly canApprove: boolean;
  readonly canReject: boolean;
  readonly approveDescription: string;
  /** BE demands an explicit acknowledgement when the viewer made/submitted the document. */
  readonly selfApprovalRequired?: boolean;
  readonly busy: boolean;
  readonly error: Error | null;
  /** Resolve true when the command succeeded so the dialog can close; false keeps it open. */
  readonly onApprove: (selfApprovalAcknowledged: boolean) => Promise<boolean>;
  readonly onReject: (reason: string, selfApprovalAcknowledged: boolean) => Promise<boolean>;
  readonly onDismiss: () => void;
}

export function ApprovalActions({
  subject, canApprove, canReject, approveDescription, selfApprovalRequired = false, busy, error, onApprove, onReject, onDismiss,
}: ApprovalActionsProps) {
  const theme = useTheme();
  const lock = useRef(false);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string>();
  const [acknowledged, setAcknowledged] = useState(false);

  if (!canApprove && !canReject && decision === null) return null;

  const close = () => {
    if (lock.current) return;
    setDecision(null); setReason(''); setReasonError(undefined); setAcknowledged(false); onDismiss();
  };
  const open = (next: Decision) => { onDismiss(); setReason(''); setReasonError(undefined); setAcknowledged(false); setDecision(next); };

  async function confirm() {
    if (lock.current || !decision) return;
    let parsedReason = '';
    if (decision === 'reject') {
      const parsed = rejectReasonSchema.safeParse(reason);
      if (!parsed.success) { setReasonError(parsed.error.issues[0]?.message); return; }
      parsedReason = parsed.data;
    }
    lock.current = true;
    try {
      const done = decision === 'approve' ? await onApprove(acknowledged) : await onReject(parsedReason, acknowledged);
      if (done) { setDecision(null); setReason(''); setAcknowledged(false); }
    } finally { lock.current = false; }
  }

  const rejecting = decision === 'reject';
  const needsAcknowledgement = selfApprovalRequired && decision !== null;

  return (
    <>
      <View style={styles.actions}>
        {canApprove && <Button label="Duyệt" disabled={busy} onPress={() => open('approve')} />}
        {canReject && <Button label="Từ chối" variant="outline" disabled={busy} onPress={() => open('reject')} />}
      </View>
      <Modal visible={decision !== null} animationType="slide" onRequestClose={busy ? undefined : close}>
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
              {rejecting ? `Từ chối ${subject}?` : `Duyệt ${subject}?`}
            </Text>
            <Text style={[styles.text, { color: theme.textSecondary }]}>
              {rejecting ? 'Nêu rõ lý do để người lập chứng từ biết cần chỉnh sửa gì.' : approveDescription}
            </Text>
            {rejecting && (
              <TextField
                label="Lý do từ chối"
                value={reason}
                onChangeText={(value) => { setReason(value); setReasonError(undefined); }}
                error={reasonError}
                maxLength={REJECT_REASON_MAX_LENGTH}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!busy}
              />
            )}
            {needsAcknowledgement && (
              <View style={styles.acknowledge}>
                <Switch value={acknowledged} onValueChange={setAcknowledged} disabled={busy} accessibilityLabel="Xác nhận tự xử lý chứng từ" />
                <Text style={[styles.acknowledgeText, { color: theme.text }]}>
                  {rejecting
                    ? 'Tôi xác nhận đang tự từ chối chứng từ do chính mình lập hoặc gửi.'
                    : 'Tôi xác nhận đang tự phê duyệt chứng từ do chính mình lập hoặc gửi.'}
                </Text>
              </View>
            )}
            {error && <AlertBanner variant="destructive" title="Chưa thể ghi nhận" description={getApiErrorMessage(error)} />}
            <Button
              label={rejecting ? 'Xác nhận từ chối' : 'Xác nhận duyệt'}
              loading={busy}
              disabled={needsAcknowledgement && !acknowledged}
              onPress={() => { void confirm(); }}
            />
            <Button label="Quay lại" variant="outline" disabled={busy} onPress={close} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 12 },
  root: { flex: 1 },
  content: { padding: 20, gap: 18, maxWidth: 640, width: '100%', alignSelf: 'center' },
  title: { fontFamily: FontFamily.bold, fontSize: 24, lineHeight: 32 },
  text: { fontFamily: FontFamily.regular, fontSize: 16, lineHeight: 24 },
  acknowledge: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  acknowledgeText: { flex: 1, fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 22 },
});
