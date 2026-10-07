import { ValueTransformer } from 'typeorm';

// PostgreSQL returns `numeric` columns as strings (to avoid losing precision). This converts them
// to JavaScript numbers, which is safe for the quantities stored in this app.
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value === null || value === undefined ? value : Number(value)),
};
