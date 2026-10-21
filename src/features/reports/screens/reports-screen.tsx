import { useRouter } from 'expo-router';
import { FileBarChart } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ListCard } from '@/components/ui/list-card';
import { LoadingState } from '@/components/ui/loading-state';
import { useTheme } from '@/hooks/use-theme';

import { useReportCatalogQuery } from '../hooks/use-reports';
import { PHONE_REPORT_TYPES } from '../reports.types';

export function ReportsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const query = useReportCatalogQuery();

  if (query.isPending) return <LoadingState fullScreen message="Đang tải danh sách báo cáo…" />;
  if (query.isError) return <ErrorState fullScreen error={query.error} onRetry={() => void query.refetch()} />;

  const reports = query.data.filter((report) => PHONE_REPORT_TYPES.includes(report.type));
  if (reports.length === 0) {
    return <EmptyState fullScreen icon={FileBarChart} title="Chưa có báo cáo nào dành cho bạn" />;
  }

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      {reports.map((report) => (
        <View key={report.type}>
          <ListCard
            title={report.name}
            subtitle={report.group}
            lines={[report.description]}
            onPress={() =>
              router.push({ pathname: '/catalog/reports/[reportType]', params: { reportType: report.type } })
            }
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { gap: 12, padding: 20 } });
