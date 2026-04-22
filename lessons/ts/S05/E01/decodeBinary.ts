const IMAGE_SIZE_LIMIT = 2 * 1024 * 1024;

export const decodeBase64Text = (b64: string): string =>
  Buffer.from(b64, "base64").toString("utf8");

export const decodeBase64Bytes = (b64: string): Buffer =>
  Buffer.from(b64, "base64");

export const previewBytes = (b64: string, n = 500): string => {
  const buf = Buffer.from(b64, "base64");
  return buf.slice(0, n).toString("utf8").replace(/[^\x20-\x7E\n\r\t]/g, ".");
};

export const toDataUrl = (b64: string, mime: string): string =>
  `data:${mime};base64,${b64}`;

export const isImageSmall = (filesize?: number): boolean =>
  filesize !== undefined && filesize < IMAGE_SIZE_LIMIT;
