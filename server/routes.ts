import { Express } from "express";
import { setupAuth } from "./auth";
import { db } from "../db";
import { books, authors, checkouts } from "@db/schema";
import { eq, like, and, gt } from "drizzle-orm";
import { addDays } from "date-fns";

export function registerRoutes(app: Express) {
  setupAuth(app);

  // Get books with optional search params
  app.get("/api/books", async (req, res) => {
    try {
      const { query, genre, available } = req.query;
      let conditions = [];
      
      if (query) {
        conditions.push(like(books.title, `%${query as string}%`));
      }
      
      if (genre) {
        conditions.push(eq(books.genre, genre as string));
      }
      
      if (available === 'true') {
        conditions.push(gt(books.available || 0, 0));
      }

      const results = await db.query.books.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          author: true,
        },
      });

      res.json(results);
    } catch (error) {
      res.status(500).send("Error fetching books");
    }
  });

  // Checkout a book
  app.post("/api/books/:id/checkout", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const bookId = parseInt(req.params.id);
      const [book] = await db
        .select()
        .from(books)
        .where(eq(books.id, bookId))
        .limit(1);

      if (!book) {
        return res.status(404).send("Book not found");
      }

      if ((book.available || 0) <= 0) {
        return res.status(400).send("Book not available");
      }

      await db.transaction(async (tx) => {
        await tx
          .update(books)
          .set({ available: (book.available || 0) - 1 })
          .where(eq(books.id, bookId));

        await tx.insert(checkouts).values({
          userId: req.user!.id,
          bookId,
          dueDate: addDays(new Date(), 14),
        });
      });

      res.json({ message: "Book checked out successfully" });
    } catch (error) {
      res.status(500).send("Error checking out book");
    }
  });

  // Return a book
  app.post("/api/books/:id/return", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const bookId = parseInt(req.params.id);
      const [book] = await db
        .select()
        .from(books)
        .where(eq(books.id, bookId))
        .limit(1);

      if (!book) {
        return res.status(404).send("Book not found");
      }

      const [checkout] = await db
        .select()
        .from(checkouts)
        .where(
          and(
            eq(checkouts.bookId, bookId),
            eq(checkouts.userId, req.user!.id),
            eq(checkouts.returnedAt, null)
          )
        )
        .limit(1);

      if (!checkout) {
        return res.status(400).send("No active checkout found");
      }

      await db.transaction(async (tx) => {
        await tx
          .update(books)
          .set({ available: (book.available || 0) + 1 })
          .where(eq(books.id, bookId));

        await tx
          .update(checkouts)
          .set({ returnedAt: new Date() })
          .where(eq(checkouts.id, checkout.id));
      });

      res.json({ message: "Book returned successfully" });
    } catch (error) {
      res.status(500).send("Error returning book");
    }
  });
}
