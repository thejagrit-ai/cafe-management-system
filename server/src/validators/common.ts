import { z } from 'zod';

/**
 * Boolean query parameter.
 *
 * `z.coerce.boolean()` is wrong for query strings: it applies JavaScript's
 * `Boolean(...)`, so the string "false" becomes `true` and every non-empty
 * value is truthy. This parses the literal strings instead and leaves an
 * absent parameter as `undefined` so callers can tell "not filtered" apart
 * from "filtered to false".
 */
export const booleanQueryParam = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true';
  });
