// src/lib/pictures.ts
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

export type PickedImage = { uri: string; mimeType: string; base64: string };

// Opens the camera or photo library and returns the picked image,
// or null if the user cancelled.
export async function pickImage(source: 'camera' | 'library'): Promise<PickedImage | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (permission.status !== 'granted') {
    throw new Error(
      source === 'camera' ? 'Camera permission is required.' : 'Photo library permission is required.'
    );
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: true,
    aspect: [1, 1],
    base64: true,
  };

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled || result.assets.length === 0) return null;

  const asset = result.assets[0];
  if (!asset.base64) {
    throw new Error('Could not read the selected image.');
  }
  return { uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg', base64: asset.base64 };
}

// Uploads a picked image to Storage and records it in public.pictures.
// pictureTypeId comes from the picture_types lookup table (see lookups.ts).
async function uploadPicture(userId: string, pictureTypeId: number, image: PickedImage) {
  const ext = image.mimeType.split('/')[1] ?? 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;

  const arrayBuffer = decode(image.base64);

  const { error: uploadError } = await supabase.storage
    .from('pictures')
    .upload(path, arrayBuffer, { contentType: image.mimeType, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error: insertError } = await supabase
    .from('pictures')
    .insert({ user_id: userId, picture_type_id: pictureTypeId, storage_path: path })
    .select()
    .single();
  if (insertError) throw insertError;

  return data as { id: string; storage_path: string };
}

// Profile picture is 1-per-user: replaces any existing one (deletes the
// old storage file + row first) rather than accumulating duplicates.
export async function replaceProfilePicture(userId: string, pictureTypeId: number, image: PickedImage) {
  const { data: existing, error: fetchError } = await supabase
    .from('pictures')
    .select('id, storage_path')
    .eq('user_id', userId)
    .eq('picture_type_id', pictureTypeId);
  if (fetchError) throw fetchError;

  if (existing && existing.length > 0) {
    await supabase.storage.from('pictures').remove(existing.map((p) => p.storage_path));
    await supabase
      .from('pictures')
      .delete()
      .in('id', existing.map((p) => p.id));
  }

  return uploadPicture(userId, pictureTypeId, image);
}

// Gallery photos accumulate — just adds a new one.
export async function addGalleryPicture(userId: string, pictureTypeId: number, image: PickedImage) {
  return uploadPicture(userId, pictureTypeId, image);
}

export async function removePicture(pictureId: string, storagePath: string) {
  const { error: storageError } = await supabase.storage.from('pictures').remove([storagePath]);
  if (storageError) throw storageError;

  const { error: dbError } = await supabase.from('pictures').delete().eq('id', pictureId);
  if (dbError) throw dbError;
}

export function getPictureUrl(storagePath: string): string {
  return supabase.storage.from('pictures').getPublicUrl(storagePath).data.publicUrl;
}
