import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
};

// Wrap with Sentry. We do NOT upload source maps (GlitchTip + no SENTRY_AUTH_TOKEN),
// so disable that step to keep the build self-contained and CI-friendly.
export default withSentryConfig(nextConfig, {
  silent: true,
  sourcemaps: { disable: true },
  // Route browser SDK requests through the app to dodge ad-blockers.
  tunnelRoute: '/monitoring',
});
