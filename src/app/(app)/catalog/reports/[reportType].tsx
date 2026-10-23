import { useLocalSearchParams } from 'expo-router';

import { ReportViewScreen } from '@/features/reports/screens/report-view-screen';

export default function ReportViewRoute() {
  const { reportType } = useLocalSearchParams<{ reportType: string }>();
  return <ReportViewScreen reportType={reportType} />;
}
