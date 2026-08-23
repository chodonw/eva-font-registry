import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const registryUsers = sqliteTable('registry_users', {
  id: text('id').primaryKey(),
  role: text('role').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const registrySessions = sqliteTable('registry_sessions', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id').notNull().references(() => registryUsers.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [index('idx_registry_sessions_user').on(table.userId), index('idx_registry_sessions_expiry').on(table.expiresAt)]);

export const fontAssets = sqliteTable('font_assets', {
  id: text('id').primaryKey(), sha256: text('sha256').notNull(), sourcePath: text('source_path').notNull(),
  family: text('family').notNull(), subfamily: text('subfamily'), postscriptName: text('postscript_name'),
  format: text('format').notNull(), faceIndex: integer('face_index').notNull().default(0), fileSize: integer('file_size').notNull(),
  licenseStatus: text('license_status').notNull().default('review'), publishStatus: text('publish_status').notNull().default('raw'),
  licenseText: text('license_text'), licenseUrl: text('license_url'), rawKey: text('raw_key').notNull(), publicKey: text('public_key'),
  updatedBy: text('updated_by').references(() => registryUsers.id), createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(),
}, (table) => [index('idx_font_assets_family').on(table.family), index('idx_font_assets_license_status').on(table.licenseStatus), index('idx_font_assets_publish_status').on(table.publishStatus)]);

export const auditEvents = sqliteTable('audit_events', {
  id: text('id').primaryKey(), actorId: text('actor_id').references(() => registryUsers.id), action: text('action').notNull(),
  subjectId: text('subject_id'), detail: text('detail'), createdAt: integer('created_at').notNull(),
}, (table) => [index('idx_audit_events_created').on(table.createdAt), index('idx_audit_events_actor').on(table.actorId)]);
