import { Phone } from 'lucide-react-native';
import { Linking } from 'react-native';

import { Button } from '@/components/ui/button';
import { DetailHeading, DetailScroll, InfoRow, Section } from '@/components/ui/detail-sections';
import { QueryBoundary } from '@/components/ui/query-boundary';
import { formatDisplayDate } from '@/lib/date-format';

import { useStockRecipientQuery } from '../hooks/use-stock-recipients';
import { RECIPIENT_STATUS_LABEL, RECIPIENT_TYPE_LABEL } from '../stock-recipients.types';

interface StockRecipientDetailScreenProps {
  readonly recipientId: string;
}

export function StockRecipientDetailScreen({ recipientId }: StockRecipientDetailScreenProps) {
  const query = useStockRecipientQuery(recipientId);

  return (
    <QueryBoundary query={query} loadingMessage="Đang tải đơn vị nhận hàng…">
      {(recipient) => (
        <DetailScroll isRefreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
          <DetailHeading
            title={recipient.recipientName}
            subtitle={`${recipient.recipientCode} · ${RECIPIENT_STATUS_LABEL[recipient.status] ?? recipient.status}`}
          />
          <Section title="Thông tin liên hệ">
            <InfoRow label="Loại" value={RECIPIENT_TYPE_LABEL[recipient.recipientType] ?? recipient.recipientType} />
            <InfoRow label="Mã số thuế" value={recipient.taxCode} />
            <InfoRow label="Số điện thoại" value={recipient.phone} />
            <InfoRow label="Email" value={recipient.email} />
            <InfoRow label="Địa chỉ" value={recipient.address} />
            <InfoRow label="Địa chỉ giao hàng" value={recipient.shippingAddress} />
            <InfoRow label="Ngày tạo" value={formatDisplayDate(new Date(recipient.createdAt))} />
          </Section>
          <Section title="Người liên hệ">
            <InfoRow
              label="Họ tên"
              value={[recipient.contactSalutation, recipient.contactName].filter(Boolean).join(' ') || null}
            />
            <InfoRow label="Di động" value={recipient.contactMobile} />
            <InfoRow label="Kênh liên hệ" value={recipient.contactChannelName} />
          </Section>
          {recipient.phone ? (
            <Button
              label="Gọi đơn vị nhận hàng"
              variant="outline"
              renderIcon={(color) => <Phone size={18} color={color} />}
              onPress={() => void Linking.openURL(`tel:${recipient.phone}`)}
            />
          ) : null}
        </DetailScroll>
      )}
    </QueryBoundary>
  );
}
