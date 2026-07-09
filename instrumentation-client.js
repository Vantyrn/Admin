// Sentry (→ GlitchTip) init for the browser. Next.js loads this automatically.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.RELEASE_VERSION || 'dev',
    tracesSampleRate: 0,
    // No Session Replay for the pilot (keeps us within free-tier event budgets).
  });
}

// Capture client-side navigation errors (App Router).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
