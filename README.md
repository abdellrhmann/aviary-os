# AviaryOS

AviaryOS is a personal bird-aviary management application built with Next.js (App Router), TypeScript, Tailwind CSS, and Supabase.

## Requirements

- Node.js 20 or higher
- npm 10 or higher

## Getting Started

### 1. Environment Configuration

Copy the example environment configuration file to create your local environment file:

```bash
cp .env.example .env.local
```

Open `.env.local` and provide your Supabase project credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Note: Only public anon keys are used in client and server routes. Service-role keys must never be used.

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Development Server

```bash
npm run dev
```

The application is served at `http://localhost:3000`.

### 4. Running Tests

Run the test suite using Vitest:

```bash
npm test
```

### 5. Running the Linter

Run ESLint to check for code style and syntax issues:

```bash
npm run lint
```

### 6. Production Build

To build and run the optimized production bundle:

```bash
npm run build
npm run start
```

## Architecture and Structure

- `app/(app)/`: Authenticated application pages (Dashboard, Birds) wrapped in the responsive layout shell.
- `app/login/`: Email and password authentication page.
- `app/logout/`: Sign-out handling and confirmation page.
- `components/`: Responsive layout shell, desktop sidebar navigation, and mobile bottom navigation.
- `lib/supabase/`: Supabase client helpers for browser, server components, and middleware using `@supabase/ssr`.
- `middleware.ts`: Route protection guard redirecting unauthenticated traffic to `/login`.
