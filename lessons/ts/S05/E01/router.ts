import type { ListenResponse, RouterDecision, RouterKind } from "./types.ts";
import { isImageSmall } from "./decodeBinary.ts";

const NOISE_MIN_LEN = 15;

export const classify = (raw: ListenResponse): RouterDecision => {
  if (raw.code !== 100) {
    return { kind: "end" };
  }

  if (raw.transcription !== undefined) {
    const text = raw.transcription.trim();
    if (text.length < NOISE_MIN_LEN) {
      return { kind: "noise" };
    }
    return { kind: "text" };
  }

  if (raw.attachment && raw.meta) {
    const mime = raw.meta.toLowerCase();
    const filesize = raw.filesize;

    if (mime === "application/json") {
      return { kind: "binary-json", mimeType: mime, filesizeBytes: filesize };
    }
    if (mime.startsWith("text/")) {
      return { kind: "binary-text", mimeType: mime, filesizeBytes: filesize };
    }
    if (mime.startsWith("image/")) {
      const kind: RouterKind = isImageSmall(filesize)
        ? "binary-image-small"
        : "binary-image-large";
      return { kind, mimeType: mime, filesizeBytes: filesize };
    }
    if (mime.startsWith("audio/")) {
      return { kind: "binary-audio", mimeType: mime, filesizeBytes: filesize };
    }
    return { kind: "binary-other", mimeType: mime, filesizeBytes: filesize };
  }

  return { kind: "noise" };
};
