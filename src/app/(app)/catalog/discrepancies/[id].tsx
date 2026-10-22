import { useLocalSearchParams } from 'expo-router';
import { DiscrepancyDetailScreen } from '@/features/discrepancies/screens/discrepancy-detail-screen';
export default function DiscrepancyDetailRoute() { const { id } = useLocalSearchParams<{ id: string }>(); return <DiscrepancyDetailScreen id={id} />; }
