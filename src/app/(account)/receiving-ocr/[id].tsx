import { useLocalSearchParams } from 'expo-router';

import { InboundDocumentImportScreen } from '@/features/inbound-document-import/screens/inbound-document-import-screen';

export default function ReceivingOcrRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <InboundDocumentImportScreen documentId={typeof id === 'string' ? id : ''} />;
}
