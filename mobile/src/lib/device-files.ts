import { Linking, Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { Directory, File, Paths } from "expo-file-system";
import { fileUrl, type Result } from "./api";
import type { PickedFile } from "./uploads";

// Fichiers du téléphone : photos, appareil photo, documents ; ouverture d'un
// fichier du Drive dans une autre application (« Ouvrir avec… », AirDrop,
// e-mail…) via la feuille de partage du système.

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}.${p(d.getMinutes())}.${p(d.getSeconds())}`;
}

function fromImageAsset(a: ImagePicker.ImagePickerAsset, i: number): PickedFile {
  const ext = a.mimeType?.split("/")[1]?.replace("jpeg", "jpg").replace("quicktime", "mov") ?? (a.type === "video" ? "mp4" : "jpg");
  const fallback = `${a.type === "video" ? "Vidéo" : "Photo"} ${stamp()}${i ? ` (${i})` : ""}.${ext}`;
  return { uri: a.uri, name: a.fileName || fallback, size: a.fileSize ?? null, mimeType: a.mimeType ?? null };
}

export async function pickFromLibrary(): Promise<PickedFile[]> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images", "videos"],
    allowsMultipleSelection: true,
    selectionLimit: 50,
    quality: 1,
    exif: false,
  });
  return res.canceled ? [] : res.assets.map(fromImageAsset);
}

export async function takePhoto(): Promise<PickedFile[] | "denied"> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return "denied";
  const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.9, exif: false });
  return res.canceled ? [] : res.assets.map(fromImageAsset);
}

export async function pickDocuments(): Promise<PickedFile[]> {
  const res = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
  if (res.canceled) return [];
  return res.assets.map((a) => ({ uri: a.uri, name: a.name, size: a.size ?? null, mimeType: a.mimeType ?? null }));
}

/** Télécharge le fichier dans le cache de l'app puis ouvre la feuille de partage. */
export async function openWith(documentId: string): Promise<Result> {
  const r = await fileUrl(documentId, true);
  if (!r.ok) return r;
  if (Platform.OS === "web") {
    await Linking.openURL(r.url);
    return { ok: true };
  }
  try {
    const dir = new Directory(Paths.cache, "partage", documentId);
    if (dir.exists) dir.delete();
    dir.create({ intermediates: true });
    const target = new File(dir, r.name.replace(/[/\\]/g, "-"));
    const file = await File.downloadFileAsync(r.url, target);
    if (!(await Sharing.isAvailableAsync())) return { ok: false, message: "Partage indisponible sur cet appareil." };
    await Sharing.shareAsync(file.uri, { mimeType: r.type ?? undefined, dialogTitle: r.name });
    return { ok: true };
  } catch {
    return { ok: false, message: "Téléchargement impossible. Vérifiez votre connexion." };
  }
}
