import { FileBarChart } from 'lucide-react-native';
import { useState } from 'react';

import { AlertBanner } from '@/components/ui/alert-banner';
import { ListCard } from '@/components/ui/list-card';
import { PagedList } from '@/components/ui/paged-list';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatDisplayDateTime } from '@/lib/date-format';

import { useReportCatalogQuery, useReportQuery } from '../hooks/use-reports';
import type { ReportColumn, ReportRow } from '../reports.types';

const SEARCH_DEBOUNCE_MS = 350;
const MAX_DETAIL_LINES = 10;

function formatCell(value: unknown, column: ReportColumn): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  if (typeof value === 'number') return value.toLocaleString('vi-VN', { maximumFractionDigits: 3 });
  if (column.dataType === 'datetime' && typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : formatDisplayDateTime(date);
  }
  return typeof value === 'string' ? value : null;
}

interface ReportViewScreenProps {
  readonly reportType: string;
}

/** Renders any report generically from the catalog's column list, so new report types need no app change. */
export function ReportViewScreen({ reportType }: ReportViewScreenProps) {
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebouncedValue(searchText.trim(), SEARCH_DEBOUNCE_MS);
  const catalog = useReportCatalogQuery();
  const query = useReportQuery(reportType, debouncedSearch || undefined);
  const definition = catalog.data?.find((report) => report.type === reportType);
  const columns = definition?.columns ?? [];

  function renderRow(row: ReportRow) {
    const cells = columns
      .map((column) => ({ label: column.label, text: formatCell(row[column.key], column) }))
      .filter((cell): cell is { label: string; text: string } => cell.text !== null);
    const [first, second, ...rest] = cells;
    return (
      <ListCard
        title={first?.text ?? '—'}
        subtitle={second?.text}
        lines={rest.slice(0, MAX_DETAIL_LINES).map((cell) => `${cell.label}: ${cell.text}`)}
      />
    );
  }

  return (
    <PagedList
      query={query}
      keyExtractor={(row) => String(row.id ?? JSON.stringify(row))}
      renderItem={renderRow}
      loadingMessage="Đang tải báo cáo…"
      emptyIcon={FileBarChart}
      emptyTitle="Báo cáo chưa có dữ liệu"
      emptyDescription="Thử đổi từ khóa tìm kiếm."
      searchText={searchText}
      onSearchChange={setSearchText}
      searchPlaceholder="Tìm trong báo cáo"
      header={
        definition ? (
          <AlertBanner title={definition.name} description={definition.description} />
        ) : undefined
      }
    />
  );
}
