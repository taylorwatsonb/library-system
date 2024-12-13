import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum('role', ['admin', 'librarian', 'user']);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  role: roleEnum("role").default('user').notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const authors = pgTable("authors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  bio: text("bio"),
});

export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  authorId: integer("author_id").references(() => authors.id),
  isbn: text("isbn").unique(),
  genre: text("genre"),
  quantity: integer("quantity").default(1),
  available: integer("available").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const checkouts = pgTable("checkouts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  bookId: integer("book_id").references(() => books.id),
  checkedOutAt: timestamp("checked_out_at").defaultNow(),
  dueDate: timestamp("due_date").notNull(),
  returnedAt: timestamp("returned_at"),
});

export const booksRelations = relations(books, ({ one }) => ({
  author: one(authors, {
    fields: [books.authorId],
    references: [authors.id],
  }),
}));

export const checkoutsRelations = relations(checkouts, ({ one }) => ({
  user: one(users, {
    fields: [checkouts.userId],
    references: [users.id],
  }),
  book: one(books, {
    fields: [checkouts.bookId],
    references: [books.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Book = typeof books.$inferSelect;
export type InsertBook = typeof books.$inferInsert;
export type Author = typeof authors.$inferSelect;
export type InsertAuthor = typeof authors.$inferInsert;
export type Checkout = typeof checkouts.$inferSelect;
export type InsertCheckout = typeof checkouts.$inferInsert;

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertBookSchema = createInsertSchema(books);
export const selectBookSchema = createSelectSchema(books);
export const insertAuthorSchema = createInsertSchema(authors);
export const selectAuthorSchema = createSelectSchema(authors);
