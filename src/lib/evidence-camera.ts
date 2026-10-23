import * as ImagePicker from 'expo-image-picker';

export async function captureEvidence(options: ImagePicker.ImagePickerOptions) {
  try { return await ImagePicker.launchCameraAsync(options); }
  catch { throw new Error('Không mở được ứng dụng chụp ảnh trên thiết bị này. Hãy chọn ảnh có sẵn hoặc thử camera trên điện thoại.'); }
}
