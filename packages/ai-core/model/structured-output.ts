import type { JsonSchema } from "./types.ts";

/**
 * Builds a strict JSON schema object for OpenAI Structured Output.
 * Wraps a raw JSON Schema with the required `name` and `strict: true` envelope.
 */
export const buildStrictSchema = (
  name: string,
  schema: JsonSchema
): { name: string; strict: true; schema: JsonSchema } => ({
  name,
  strict: true,
  schema,
});

/**
 * Creates a simple object schema with given properties for use in generateStructured.
 */
export const objectSchema = (
  properties: Record<string, JsonSchema>,
  required?: string[]
): JsonSchema => ({
  type: "object",
  additionalProperties: false,
  properties,
  required: required ?? Object.keys(properties),
});

/**
 * Creates an array schema wrapping the given item schema.
 */
export const arraySchema = (items: JsonSchema, description?: string): JsonSchema => ({
  type: "array",
  ...(description ? { description } : {}),
  items,
});

/**
 * Creates an enum string schema from a list of literal values.
 */
export const enumSchema = <T extends string>(values: T[]): JsonSchema => ({
  type: "string",
  enum: values,
});
