import { existsSync } from 'node:fs';
import { DataSource } from 'typeorm';
import { schemaOptions } from './schema.js';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

export default new DataSource(
  schemaOptions({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  }),
);
