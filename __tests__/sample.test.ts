import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createClient } from "@/lib/supabase/client";

describe("Supabase Client Helper", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("throws a clear error naming the missing variable when env vars are missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(() => createClient()).toThrowError("NEXT_PUBLIC_SUPABASE_URL");

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(() => createClient()).toThrowError("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });

  it("creates the client when both variables are set", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "example-anon-key";

    const client = createClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });
});

describe("Route Guard", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("redirects protected routes to /login and allows public routes without network call when env is missing", async () => {
    const { updateSession } = await import("@/lib/supabase/middleware");
    const { NextRequest } = await import("next/server");

    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const protectedReq = new NextRequest("http://localhost:3000/birds");
    const protectedRes = await updateSession(protectedReq);
    expect(protectedRes.status).toBe(307);
    expect(protectedRes.headers.get("location")).toBe(
      "http://localhost:3000/login"
    );

    const rootReq = new NextRequest("http://localhost:3000/");
    const rootRes = await updateSession(rootReq);
    expect(rootRes.status).toBe(307);
    expect(rootRes.headers.get("location")).toBe(
      "http://localhost:3000/login"
    );

    const publicReq = new NextRequest("http://localhost:3000/login");
    const publicRes = await updateSession(publicReq);
    expect(publicRes.status).toBe(200);
  });
});

