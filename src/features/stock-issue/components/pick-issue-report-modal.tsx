import { router } from 'expo-router';
import { Controller } from 'react-hook-form';
import { AlertBanner } from '@/components/ui/alert-banner';
import { TextField } from '@/components/ui/text-field';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { FieldActionModal } from '@/features/warehouse-task/components/field-action-modal';
import type { usePickIssueReport } from '../hooks/use-pick-issue-report';

export function PickIssueReportModal({ state }: { readonly state: ReturnType<typeof usePickIssueReport> }) {
  const busy = state.mutation.isPending;
  return <>
    <FieldActionModal visible={state.active && (!state.target || state.uncertain)} title="Báo sự cố khi lấy hàng" busy={busy}
      error={state.error ?? state.attempt.error} reviewDisabled={state.uncertain || !state.attempt.isSuccess || state.attempt.isFetching}
      onReview={() => { void state.review(); }} onClose={state.close}>
      <AlertBanner title="Thông báo cho người lập phiếu" description="Ghi rõ SKU, vị trí/lô và tình trạng thực tế. Báo cáo này không tự đổi lô, điều chỉnh tồn hoặc đánh dấu hàng hỏng." />
      <Controller name="reason" control={state.form.control} render={({ field, fieldState }) => <TextField label="Mô tả sự cố" multiline
        maxLength={500} value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} editable={!busy && !state.uncertain} />} />
      {state.uncertain && <>
        <AlertBanner title="Cần đối chiếu lần gửi trước" description="Chưa có phản hồi chắc chắn từ máy chủ. Không gửi lại ngay vì API hiện tại có thể tạo báo cáo trùng." />
        {state.canReadAudit && <Button label="Mở nhật ký hoạt động" variant="outline" disabled={busy} onPress={() => { state.closeToAudit(); router.push('/catalog/audit-logs'); }} />}
        <Button label="Đã đối chiếu, lập báo cáo mới" variant="outline" disabled={busy} onPress={state.acknowledge} />
      </>}
    </FieldActionModal>
    <ConfirmationModal visible={!!state.target && !state.uncertain} title="Gửi báo cáo sự cố?" description={`${state.target?.reason ?? ''}\nTồn kho chưa thay đổi. Quản lý/người lập phiếu tiếp tục xử lý trên web.`}
      busy={busy} error={state.mutation.error} onConfirm={() => { void state.confirm(); }} onCancel={state.cancel} />
  </>;
}
