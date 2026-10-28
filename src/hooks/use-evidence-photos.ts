import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getApiErrorMessage } from '@/lib/api-error';
import { captureEvidence } from '@/lib/evidence-camera';
import { useExitProtection } from './use-screen-exit';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

export interface EvidencePhoto {
  readonly id: string;
  readonly fileName: string;
}

export interface EvidenceAsset {
  readonly uri: string;
  readonly mimeType: string;
  readonly fileName: string;
  readonly file?: File;
}

interface UseEvidencePhotosOptions {
  readonly upload: (asset: EvidenceAsset) => Promise<EvidencePhoto>;
  readonly maxPhotos: number;
  /** Photos already stored on the server for the same line; they count against `maxPhotos`. */
  readonly savedCount?: number;
  readonly fileNamePrefix?: string;
}

/**
 * Camera photos uploaded as evidence. An upload only counts once its id is sent with the owning
 * request, so callers `reset` whenever they start a different line or form.
 */
export function useEvidencePhotos({
  upload,
  maxPhotos,
  savedCount = 0,
  fileNamePrefix = 'bang-chung',
}: UseEvidencePhotosOptions) {
  const [photos, setPhotos] = useState<readonly EvidencePhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lockRef = useRef(false);
  const generation = useRef(0);
  useEffect(() => () => { generation.current += 1; }, []);

  const reset = useCallback(() => {
    generation.current += 1;
    setPhotos([]);
    setError(null);
  }, []);
  useExitProtection(() => ({ busy: isUploading, photos: photos.length > 0, discard: async () => { reset(); } }));

  const remove = useCallback((id: string) => {
    setPhotos((current) => current.filter((photo) => photo.id !== id));
  }, []);

  const add = useCallback(async (source: 'camera' | 'library') => {
    if (lockRef.current) return;
    if (savedCount + photos.length >= maxPhotos) {
      setError(`Tối đa ${maxPhotos} ảnh.`);
      return;
    }

    lockRef.current = true;
    const attempt = generation.current;
    setIsUploading(true);
    setError(null);
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (attempt !== generation.current) return;
        if (!permission.granted) {
          setError('Cần quyền camera để chụp ảnh bằng chứng. Bạn có thể chọn ảnh có sẵn.');
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, exif: false };
      const result = source === 'camera' ? await captureEvidence(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (attempt !== generation.current || result.canceled) return;

      const image = result.assets[0];
      if (!image) return;
      const mimeType = image.mimeType ?? 'image/jpeg';
      if (!ALLOWED_TYPES.includes(mimeType)) {
        setError('Chỉ nhận ảnh JPG hoặc PNG.');
        return;
      }
      if (image.fileSize !== undefined && image.fileSize > MAX_PHOTO_BYTES) {
        setError('Ảnh không được vượt quá 5 MB.');
        return;
      }

      const evidence = await upload({
        uri: image.uri,
        mimeType,
        fileName: image.fileName ?? `${fileNamePrefix}.${mimeType === 'image/png' ? 'png' : 'jpg'}`,
        file: image.file,
      });
      if (attempt === generation.current) setPhotos((current) => [...current, evidence]);
    } catch (failure) {
      if (attempt === generation.current) setError(getApiErrorMessage(failure, 'Không tải được ảnh. Vui lòng thử lại.'));
    } finally {
      lockRef.current = false;
      setIsUploading(false);
    }
  }, [upload, maxPhotos, savedCount, photos.length, fileNamePrefix]);

  return { photos, isUploading, error, add: () => add('camera'), choose: () => add('library'), remove, reset };
}
