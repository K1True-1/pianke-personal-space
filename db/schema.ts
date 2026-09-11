import { sqliteTable, text, integer, index, primaryKey } from "drizzle-orm/sqlite-core";

export const items = sqliteTable("items", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  filename: text("filename").notNull(),
  objectKey: text("object_key").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  language: text("language").notNull().default(""),
  createdAt: text("created_at").notNull(),
  previewKey: text("preview_key"),
}, table => [index("idx_items_owner_created").on(table.ownerId, table.createdAt)]);

export const activity = sqliteTable("activity", {
  ownerId: text("owner_id").notNull(),
  day: text("day").notNull(),
  visits: integer("visits").notNull().default(0),
  uploads: integer("uploads").notNull().default(0),
}, table => [primaryKey({columns:[table.ownerId,table.day]})]);

export const uploads = sqliteTable("uploads", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull().default("photo"),
  ownerId: text("owner_id").notNull(),
  uploadId: text("upload_id").notNull(),
  objectKey: text("object_key").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  filename: text("filename").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  partSize: integer("part_size").notNull(),
  createdAt: text("created_at").notNull(),
}, table => [index("idx_uploads_owner_created").on(table.ownerId,table.createdAt)]);
