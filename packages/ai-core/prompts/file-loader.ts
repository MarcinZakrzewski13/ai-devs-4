import { createPromptAsset } from "./prompt-asset.ts";
import type { PromptAsset } from "./prompt-asset.ts";

/**
 * Loads a prompt asset from a .md file on disk.
 * The file content becomes the template; variables use {{varName}} syntax.
 *
 * @param id - Logical identifier for the asset
 * @param filePath - Absolute path to the .md template file
 */
export const loadPromptAsset = async <TVars extends Record<string, unknown>>(
  id: string,
  filePath: string
): Promise<PromptAsset<TVars>> => {
  const file = Bun.file(filePath);
  const template = await file.text();
  return createPromptAsset<TVars>(id, template);
};
