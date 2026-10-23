import { PostgresStore } from '@mastra/pg';

export const pStore = process.env.DATABASE_URL
  ? new PostgresStore({
      id: 'postmill-store',
      connectionString: process.env.DATABASE_URL,
    })
  : (null as unknown as PostgresStore);
