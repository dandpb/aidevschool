export type JsonValue = null | boolean | number | string | JsonValue[] | { readonly [key: string]: JsonValue };

export interface EntryView {
  key: string;
  value: JsonValue;
  ttlSeconds: number | null;
  expiresAt: string | null;
}

export interface Pair {
  key: string;
  value: JsonValue;
}
