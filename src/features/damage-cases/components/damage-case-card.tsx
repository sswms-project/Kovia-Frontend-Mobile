import { memo, useState } from 'react';
import { View } from 'react-native';
import { EvidenceLinks } from '@/components/ui/evidence-preview';
import type { EvidenceFile } from '@/hooks/use-evidence-preview';

import { ListCard } from '@/components/ui/list-card';
import { formatDisplayDateTime } from '@/lib/date-format';

import {
  DAMAGE_ACTION_LABEL,
  DAMAGE_STATUS_LABEL,
  DISPOSITION_LABEL,
  type DamageCase,
} from '../damage-cases.types';

interface DamageCaseCardProps {
  readonly damageCase: DamageCase;
  readonly onOpenEvidence: (file: EvidenceFile) => void;
}

const formatQuantity = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 3 });

export const DamageCaseCard = memo(function DamageCaseCard({ damageCase, onOpenEvidence }: DamageCaseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const location = damageCase.isSystemDefaultSlot && damageCase.rackCode ? damageCase.rackCode : damageCase.slotCode;
  const quantityText = damageCase.isQuantityConfirmed
    ? `${formatQuantity(damageCase.resolvedQuantity)} / ${formatQuantity(damageCase.quantity)} ${damageCase.unitName ?? ''} · còn ${formatQuantity(damageCase.remainingQuantity)}`.trim()
    : 'Chờ xác nhận số lượng';
  const detailLines = expanded
    ? [
        damageCase.disposition ? `Xử lý: ${DISPOSITION_LABEL[damageCase.disposition] ?? damageCase.disposition}` : null,
        ...damageCase.evidence.map((file) => `Bằng chứng: ${file.fileName}`),
        ...damageCase.history.map(
          (entry) =>
            `${DAMAGE_ACTION_LABEL[entry.action] ?? entry.action} · ${entry.actorName} · ${formatDisplayDateTime(new Date(entry.createdAt))}${entry.reason ? ` · ${entry.reason}` : ''}`,
        ),
        'Chạm để thu gọn',
      ]
    : ['Chạm để xem lịch sử'];

  return (
    <View><ListCard
      title={damageCase.productName}
      subtitle={damageCase.sku}
      lines={[
        `${damageCase.warehouseName} · ${location}${damageCase.lotNumber ? ` · Lô ${damageCase.lotNumber}` : ''}`,
        quantityText,
        `Lý do: ${damageCase.reason}`,
        damageCase.relatedTaskType === 'CycleCount'
          ? `Từ phiếu kiểm kê ${damageCase.relatedTaskCode ?? ''}`.trim()
          : 'Báo thủ công',
        `${damageCase.reportedByName} · ${formatDisplayDateTime(new Date(damageCase.createdAt))}`,
        ...detailLines,
      ]}
      pill={{
        label: DAMAGE_STATUS_LABEL[damageCase.status] ?? damageCase.status,
        tone: damageCase.status === 'Open' ? 'warning' : 'success',
      }}
      onPress={() => setExpanded((value) => !value)}
    />{expanded && <EvidenceLinks files={damageCase.evidence} onOpen={onOpenEvidence} />}</View>
  );
});
