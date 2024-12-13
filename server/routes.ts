import { Express } from "express";
import { setupAuth } from "./auth";
import { db } from "../db";
import { books, authors, checkouts, reservations, fines } from "@db/schema";
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

      // If user is authenticated, check which books are checked out by them
      if (req.isAuthenticated()) {
        const userCheckouts = await db
          .select()
          .from(checkouts)
          .where(
            and(
              eq(checkouts.userId, req.user!.id),
              isNull(checkouts.returnedAt)
            )
          );

        const userCheckoutBookIds = new Set(userCheckouts.map(c => c.bookId));
        
        results.forEach(book => {
          (book as any).checkedOutByMe = userCheckoutBookIds.has(book.id);
        });
      }

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
          dueDate: addDays(new Date(), 0), // Set due date to now for testing
        });
      });

      res.json({ message: "Book checked out successfully" });
    } catch (error) {
      res.status(500).send("Error checking out book");
    }
  });

  // Helper function to calculate fine amount
  const calculateFineAmount = (dueDate: Date, returnDate: Date): number => {
    // For testing: Using minutes instead of days, $0.50 per minute
    const minutesLate = Math.max(0, Math.floor((returnDate.getTime() - dueDate.getTime()) / (1000 * 60)));
    return minutesLate * 50;
  };

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
            isNull(checkouts.returnedAt)
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

        const returnDate = new Date();
        await tx
          .update(checkouts)
          .set({ returnedAt: returnDate })
          .where(eq(checkouts.id, checkout.id));

        // Calculate and create fine if book is overdue
        const fineAmount = calculateFineAmount(checkout.dueDate, returnDate);
        if (fineAmount > 0) {
          await tx.insert(fines).values({
            userId: req.user!.id,
            checkoutId: checkout.id,
            amount: fineAmount,
          });
        }
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

  // Get user's fines
  app.get("/api/fines", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const userFines = await db.query.fines.findMany({
        where: eq(fines.userId, req.user!.id),
        with: {
          checkout: {
            with: {
              book: {
                with: {
                  author: true,
                },
              },
            },
          },
        },
        orderBy: (fines, { desc }) => [desc(fines.createdAt)],
      });

      res.json(userFines);
    } catch (error) {
      console.error('Error fetching fines:', error);
      res.status(500).send("Error fetching fines");
    }
  });

  // Pay a fine
  app.post("/api/fines/:id/pay", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const fineId = parseInt(req.params.id);
      const [fine] = await db
        .select()
        .from(fines)
        .where(
          and(
            eq(fines.id, fineId),
            eq(fines.userId, req.user!.id),
            eq(fines.status, 'pending')
          )
        )
        .limit(1);

      if (!fine) {
        return res.status(404).send("Fine not found or already paid");
      }

      await db
        .update(fines)
        .set({ 
          status: 'paid',
          paidAt: new Date(),
        })
        .where(eq(fines.id, fineId));

      res.json({ message: "Fine paid successfully" });
    } catch (error) {
      console.error('Error paying fine:', error);
      res.status(500).send("Error paying fine");
    }
  });

  // Analytics Endpoints
  app.get("/api/analytics/books", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const bookStats = await db
        .select({
          id: books.id,
          title: books.title,
          checkouts: db.count(checkouts.id).as('checkouts'),
          reservations: db.count(reservations.id).as('reservations'),
        })
        .from(books)
        .leftJoin(checkouts, eq(books.id, checkouts.bookId))
        .leftJoin(reservations, eq(books.id, reservations.bookId))
        .groupBy(books.id)
        .orderBy(db.desc(db.count(checkouts.id)))
        .limit(10);

      res.json(bookStats);
    } catch (error) {
      console.error('Error fetching book analytics:', error);
      res.status(500).send("Error fetching book analytics");
    }
  });

  app.get("/api/analytics/fines", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const [totalStats] = await db
        .select({
          totalAmount: db.sum(fines.amount).as('totalAmount'),
          paidAmount: db.sum(
            sql`CASE WHEN ${fines.status} = 'paid' THEN ${fines.amount} ELSE 0 END`
          ).as('paidAmount'),
          pendingAmount: db.sum(
            sql`CASE WHEN ${fines.status} = 'pending' THEN ${fines.amount} ELSE 0 END`
          ).as('pendingAmount'),
        })
        .from(fines);

      const monthlyStats = await db
        .select({
          month: sql`date_trunc('month', ${fines.createdAt})::text`,
          amount: db.sum(fines.amount).as('amount'),
        })
        .from(fines)
        .groupBy(sql`date_trunc('month', ${fines.createdAt})`)
        .orderBy(sql`date_trunc('month', ${fines.createdAt})`);

      res.json({
        ...totalStats,
        monthlyStats,
      });
    } catch (error) {
      console.error('Error fetching fine analytics:', error);
      res.status(500).send("Error fetching fine analytics");
    }
  });

  app.get("/api/analytics/activity", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const dailyActivity = await db
        .select({
          date: sql`date_trunc('day', ${checkouts.checkedOutAt})::text`,
          checkouts: db.count(checkouts.id).as('checkouts'),
          returns: db.count(
            sql`CASE WHEN ${checkouts.returnedAt} IS NOT NULL THEN 1 END`
          ).as('returns'),
          reservations: db.count(reservations.id).as('reservations'),
        })
        .from(checkouts)
        .leftJoin(reservations, sql`date_trunc('day', ${checkouts.checkedOutAt}) = date_trunc('day', ${reservations.reservedAt})`)
        .groupBy(sql`date_trunc('day', ${checkouts.checkedOutAt})`)
        .orderBy(sql`date_trunc('day', ${checkouts.checkedOutAt})`)
        .limit(30);

      res.json({ dailyActivity });
    } catch (error) {
      console.error('Error fetching activity analytics:', error);
      res.status(500).send("Error fetching activity analytics");
    }
  });
}