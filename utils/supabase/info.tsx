/// <reference types="vite/client" />

// Supabase public config (Vite will inline import.meta.env.VITE_* at build time)
// Fill these in your `.env` file (see `.env.example`).

const env = import.meta.env as any;

export const projectId: string =
  env.VITE_SUPABASE_PROJECT_ID || "ztlrrovudbkmqqjaqhfu";

export const publicAnonKey: string =
  env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0bHJyb3Z1ZGJrbXFxamFxaGZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MDI0MTMsImV4cCI6MjA4ODI3ODQxM30.LaacmFC9WVUA4dx6zrJKQhs-p7tVM5xwos1Y6hE6kZc";

// Edge Function base path slug (the folder/name deployed to Supabase Functions)
export const functionSlug: string =
  env.VITE_SUPABASE_FUNCTION_SLUG || "make-server-1fc434d6";