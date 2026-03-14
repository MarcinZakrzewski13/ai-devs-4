/**
 * A reusable prompt template with typed variables.
 * Call render(vars) to produce the final prompt string.
 */
export type PromptAsset<TVars = Record<string, unknown>> = {
  id: string;
  template: string;
  render(vars: TVars): string;
};

/**
 * Creates a PromptAsset from a template string.
 * Variables are interpolated using {{varName}} syntax.
 */
export const createPromptAsset = <TVars extends Record<string, unknown>>(
  id: string,
  template: string
): PromptAsset<TVars> => ({
  id,
  template,
  render(vars: TVars): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
      const val = vars[key as keyof TVars];
      return val !== undefined ? String(val) : `{{${key}}}`;
    });
  },
});
