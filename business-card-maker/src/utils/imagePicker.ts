import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export interface PickedImage {
  uri: string;
  width: number;
  height: number;
}

/** Opens the gallery (with permission handling) and returns the chosen image. */
export async function pickFromGallery(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 1,
    exif: false,
  });
  if (result.canceled || !result.assets.length) return null;

  const asset = result.assets[0];
  return { uri: asset.uri, width: asset.width ?? 0, height: asset.height ?? 0 };
}

/** Takes a new photo with the camera. */
export async function pickFromCamera(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 1,
    exif: false,
  });
  if (result.canceled || !result.assets.length) return null;

  const asset = result.assets[0];
  return { uri: asset.uri, width: asset.width ?? 0, height: asset.height ?? 0 };
}

/** Crops the image to a centred square — the base for circular avatars. */
export async function cropToSquare(uri: string): Promise<string> {
  const info = await ImageManipulator.manipulateAsync(uri, [], {
    compress: 1,
    format: ImageManipulator.SaveFormat.PNG,
  });
  const size = Math.min(info.width, info.height);
  const originX = Math.round((info.width - size) / 2);
  const originY = Math.round((info.height - size) / 2);

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ crop: { originX, originY, width: size, height: size } }],
    { compress: 1, format: ImageManipulator.SaveFormat.PNG },
  );
  return result.uri;
}

export async function rotateImage(uri: string, degrees = 90): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(uri, [{ rotate: degrees }], {
    compress: 1,
    format: ImageManipulator.SaveFormat.PNG,
  });
  return result.uri;
}

/** Keeps very large photos from bloating the saved project. */
export async function downscale(uri: string, maxSize = 1600): Promise<string> {
  const info = await ImageManipulator.manipulateAsync(uri, [], {
    compress: 1,
    format: ImageManipulator.SaveFormat.PNG,
  });
  if (Math.max(info.width, info.height) <= maxSize) return uri;

  const resize =
    info.width >= info.height ? { width: maxSize } : { height: maxSize };
  const result = await ImageManipulator.manipulateAsync(uri, [{ resize }], {
    compress: 0.92,
    format: ImageManipulator.SaveFormat.PNG,
  });
  return result.uri;
}
