// Picks a profile photo and returns it as a small JPEG data URI. Embedding a
// downscaled copy (instead of keeping the picker's temporary file path) means
// the photo survives app restarts on every platform, including web.

import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

const PHOTO_WIDTH = 720;

export type PhotoSource = 'camera' | 'library';

// Returns null when the user cancels; throws a readable Error on permission
// problems so the UI can show it.
export async function pickPhoto(source: PhotoSource): Promise<string | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error(
      source === 'camera'
        ? 'Allow camera access in Settings to take a photo.'
        : 'Allow photo access in Settings to choose a photo.',
    );
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [3, 4],
    quality: 0.8,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled || result.assets.length === 0) return null;

  const resized = await ImageManipulator.manipulate(result.assets[0].uri)
    .resize({ width: PHOTO_WIDTH })
    .renderAsync();
  const saved = await resized.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });

  if (!saved.base64) throw new Error('Could not read the selected photo.');
  return `data:image/jpeg;base64,${saved.base64}`;
}
