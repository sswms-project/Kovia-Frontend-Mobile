import { useCallback } from 'react';

import { useEvidencePhotos, type EvidencePhoto } from '@/hooks/use-evidence-photos';

import { cycleCountApi } from '../cycle-count.api';
import { MAX_DAMAGE_PHOTOS } from '../cycle-count.labels';

export type DamagePhoto = EvidencePhoto;

/** Photos for the cycle-count line being edited; uploads go to the cycle-count evidence endpoint. */
export function useDamagePhotos(warehouseId: string | undefined, savedCount: number) {
  const upload = useCallback(
    (asset: Parameters<typeof cycleCountApi.uploadEvidence>[1]) => {
      if (!warehouseId) return Promise.reject(new Error('Chưa xác định kho của phiếu kiểm kê.'));
      return cycleCountApi.uploadEvidence(warehouseId, asset);
    },
    [warehouseId],
  );
  return useEvidencePhotos({
    upload,
    maxPhotos: MAX_DAMAGE_PHOTOS,
    savedCount,
    fileNamePrefix: 'kiem-ke',
  });
}
