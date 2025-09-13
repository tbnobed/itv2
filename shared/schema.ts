import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "user"] }).notNull().default("user"),
  isActive: text("is_active").notNull().default("true"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const streams = pgTable("streams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  thumbnail: text("thumbnail").notNull(),
  streamId: text("stream_id").notNull().unique(),
  url: text("url").notNull(),
  category: text("category").notNull(), // featured, overTheAir, liveFeeds
  studioId: text("studio_id"), // optional, for studio-specific feeds
});

export const studios = pgTable("studios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  thumbnail: text("thumbnail").notNull(),
  description: text("description").notNull(),
  status: text("status", { enum: ["online", "offline", "maintenance"] }).notNull(),
  feedCount: integer("feed_count").notNull().default(0),
});

// User schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

export const updateUserSchema = insertUserSchema.partial().extend({
  isActive: z.string().optional(),
});

export const createUserSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type User = typeof users.$inferSelect;

// User login schemas (for username/password auth)
export const userLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type UserLoginRequest = z.infer<typeof userLoginSchema>;

// Passcode authentication schemas
export const passcodeLoginSchema = z.object({
  code: z.string()
    .length(4, "Passcode must be exactly 4 digits")
    .regex(/^\d{4}$/, "Passcode must contain only numbers"),
});

export const passcodeLoginResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
});

export const passcodeErrorResponseSchema = z.object({
  error: z.string(),
  retryAfter: z.number().optional(),
});

export type PasscodeLoginRequest = z.infer<typeof passcodeLoginSchema>;
export type PasscodeLoginResponse = z.infer<typeof passcodeLoginResponseSchema>;
export type PasscodeErrorResponse = z.infer<typeof passcodeErrorResponseSchema>;

// Stream schemas
export const insertStreamSchema = createInsertSchema(streams).omit({
  id: true,
});

export const updateStreamSchema = insertStreamSchema.partial();

export type InsertStream = z.infer<typeof insertStreamSchema>;
export type Stream = typeof streams.$inferSelect;

// Studio schemas
export const insertStudioSchema = createInsertSchema(studios).omit({
  id: true,
});

export const updateStudioSchema = insertStudioSchema.partial();

export type InsertStudio = z.infer<typeof insertStudioSchema>;
export type Studio = typeof studios.$inferSelect;
