# Library Management System

A modern web application for managing library resources, including book tracking, user authentication, reservation system, and fine management.

## Features

- User Authentication (Login/Register)
- Book Management (Add, Search, Checkout, Return)
- Reservation System
- Fine Calculation for Late Returns
- Role-based Access Control (Admin, Librarian, User)

## Tech Stack

- Frontend: React with TypeScript
- Backend: Express.js
- Database: PostgreSQL with Drizzle ORM
- UI Components: Shadcn/ui
- State Management: TanStack Query
- Routing: Wouter
- Forms: React Hook Form + Zod

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)

## Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd library-management-system
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example` and configure your environment variables.

4. Push the database schema:
   ```bash
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`.

## Project Structure

```
├── client/              # Frontend React application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── hooks/      # Custom React hooks
│   │   ├── pages/      # Page components
│   │   └── types/      # TypeScript type definitions
├── db/                 # Database schema and configurations
├── server/            # Backend Express application
│   ├── routes.ts      # API routes
│   └── auth.ts        # Authentication setup
```

## License

MIT
