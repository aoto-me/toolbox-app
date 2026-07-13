import { index, integer, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  email: text('email').notNull().unique(),
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  password: text('password').notNull(),
});

export const memos = pgTable('memos', {
  content: varchar('content', { length: 1000 }).default('').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  id: serial('id').primaryKey(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  userId: integer('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const files = pgTable(
  'files',
  {
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    filename: text('filename').notNull(),
    id: serial('id').primaryKey(),
    mimeType: text('mime_type').notNull(),
    s3Key: text('s3_key').notNull().unique(),
    size: integer('size').notNull(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [index('files_user_id_idx').on(table.userId)]
);
