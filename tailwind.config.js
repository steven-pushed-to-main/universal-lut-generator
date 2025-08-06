/**
 * Tailwind CSS configuration.
 *
 * This configuration tells Tailwind where to find the template files so
 * unused styles can be purged in production.  The default theme is
 * extended via `extend`, but we leave it unchanged for now.  You can
 * customise this file to adjust colours, spacing, breakpoints and
 * more.  See https://tailwindcss.com/docs/configuration for details.
 */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};