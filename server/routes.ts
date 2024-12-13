import { Express } from "express";
import { setupAuth } from "./auth";
import { db } from "../db";
import { books, authors, checkouts, reservations } from "@db/schema";
import { eq, like, and, gt, isNull } from "drizzle-orm";
import { addDays, addHours } from "date-fns";

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
            eq(checkouts.returnedAt, undefined)
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

  // Authors API endpoints
  app.get("/api/authors", async (req, res) => {
    try {
      const results = await db.query.authors.findMany();
      res.json(results);
    } catch (error) {
      res.status(500).send("Error fetching authors");
    }
  });

  app.post("/api/authors", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    if (req.user?.role !== 'admin' && req.user?.role !== 'librarian') {
      return res.status(403).send("Not authorized");
    }

    try {
      const [author] = await db.insert(authors)
        .values({
          name: req.body.name,
          bio: req.body.bio,
        })
        .returning();

      res.status(201).json(author);
    } catch (error) {
      res.status(500).send("Error creating author");
    }
  });

  // Get author by ID with their books
  app.get("/api/authors/:id", async (req, res) => {
    try {
      const authorId = parseInt(req.params.id);
      const [author] = await db.query.authors.findMany({
        where: eq(authors.id, authorId),
        with: {
          books: true,
        },
      });

      if (!author) {
        return res.status(404).send("Author not found");
      }

      res.json(author);
    } catch (error) {
      res.status(500).send("Error fetching author");
    }
  });

  // Reserve a book
  app.post("/api/books/:id/reserve", async (req, res) => {
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

      // Check if user already has an active reservation for this book
      const [existingReservation] = await db
        .select()
        .from(reservations)
        .where(
          and(
            eq(reservations.bookId, bookId),
            eq(reservations.userId, req.user!.id),
            eq(reservations.status, 'pending')
          )
        )
        .limit(1);

      if (existingReservation) {
        return res.status(400).send("You already have an active reservation for this book");
      }

      // Create new reservation
      const [reservation] = await db
        .insert(reservations)
        .values({
          userId: req.user!.id,
          bookId,
          expiresAt: addHours(new Date(), 48),
        })
        .returning();

      res.status(201).json(reservation);
    } catch (error) {
      res.status(500).send("Error creating reservation");
    }
  });

  // Cancel a reservation
  app.post("/api/reservations/:id/cancel", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const reservationId = parseInt(req.params.id);
      const [reservation] = await db
        .select()
        .from(reservations)
        .where(
          and(
            eq(reservations.id, reservationId),
            eq(reservations.userId, req.user!.id)
          )
        )
        .limit(1);

      if (!reservation) {
        return res.status(404).send("Reservation not found");
      }

      if (reservation.status !== 'pending') {
        return res.status(400).send("Reservation cannot be cancelled");
      }

      await db
        .update(reservations)
        .set({ status: 'cancelled' })
        .where(eq(reservations.id, reservationId));

      res.json({ message: "Reservation cancelled successfully" });
    } catch (error) {
      res.status(500).send("Error cancelling reservation");
    }
  });

  // Get user's reservations
  app.get("/api/reservations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const userReservations = await db.query.reservations.findMany({
        where: eq(reservations.userId, req.user!.id),
        with: {
          book: {
            with: {
              author: true,
            },
          },
        },
      });

      res.json(userReservations);
    } catch (error) {
      res.status(500).send("Error fetching reservations");
    }
  });
}
