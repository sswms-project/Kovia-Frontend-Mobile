import { Phone } from 'lucide-react-native';
import { Linking } from 'react-native';

import { Button } from '@/components/ui/button';
import { DetailHeading, DetailScroll, InfoRow, Section } from '@/components/ui/detail-sections';
import { QueryBoundary } from '@/components/ui/query-boundary';
import { formatDisplayDate } from '@/lib/date-format';

import { useSupplierQuery } from '../hooks/use-suppliers';
import { SUPPLIER_STATUS_LABEL } from '../supplier.types';

interface SupplierDetailScreenProps {
  readonly supplierId: string;
}

export function SupplierDetailScreen({ supplierId }: SupplierDetailScreenProps) {
  const query = useSupplierQuery(supplierId);

  return (
    <QueryBoundary query={query} loadingMessage="Đang tải nhà cung cấp…">
      {(supplier) => (
        <DetailScroll isRefreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
          <DetailHeading
            title={supplier.supplierName}
            subtitle={`${supplier.supplierCode} · ${SUPPLIER_STATUS_LABEL[supplier.status] ?? supplier.status}`}
          />
          <Section title="Thông tin chung">
            <InfoRow label="Số điện thoại" value={supplier.phone} />
            <InfoRow label="Email" value={supplier.email} />
            <InfoRow label="Mã số thuế" value={supplier.taxCode} />
            <InfoRow label="Địa chỉ" value={supplier.address} />
            <InfoRow label="Ngày tạo" value={formatDisplayDate(new Date(supplier.createdAt))} />
          </Section>
          <Section title="Người liên hệ">
            <InfoRow
              label="Họ tên"
              value={[supplier.contactSalutation, supplier.contactName].filter(Boolean).join(' ') || null}
            />
            <InfoRow label="Di động" value={supplier.contactMobile} />
            <InfoRow label="Email" value={supplier.contactEmail} />
            <InfoRow label="Kênh liên hệ" value={supplier.contactChannelName} />
          </Section>
          {supplier.phone ? (
            <Button
              label="Gọi nhà cung cấp"
              variant="outline"
              renderIcon={(color) => <Phone size={18} color={color} />}
              onPress={() => void Linking.openURL(`tel:${supplier.phone}`)}
            />
          ) : null}
          {supplier.contactMobile ? (
            <Button
              label="Gọi người liên hệ"
              variant="outline"
              renderIcon={(color) => <Phone size={18} color={color} />}
              onPress={() => void Linking.openURL(`tel:${supplier.contactMobile}`)}
            />
          ) : null}
        </DetailScroll>
      )}
    </QueryBoundary>
  );
}
