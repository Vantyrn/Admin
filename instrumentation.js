// Next.js instrumentation hook — boots Sentry per runtime + forwards server
// request errors to GlitchTip. Workflow §4.5.
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// App Router server-side error capture (Next 15+).
export const onRequestError = Sentry.captureRequestError;
