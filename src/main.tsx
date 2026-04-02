
  import { createRoot } from "react-dom/client";
  import * as Sentry from "@sentry/react";
  import App from "./app/App";
  import "./styles/index.css";

  const sentryDsn = (import.meta as any).env?.VITE_SENTRY_DSN as string | undefined;
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: (import.meta as any).env?.MODE || "development",
      tracesSampleRate: 0.1,
    });
  }

  createRoot(document.getElementById("root")!).render(<App />);
  