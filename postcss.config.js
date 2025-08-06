/**
 * PostCSS configuration for Tailwind CSS and Autoprefixer.
 *
 * This file instructs PostCSS to use Tailwind and Autoprefixer when
 * building your CSS.  The `export default` syntax is used because
 * Vite automatically transpiles this config when running in an
 * ECMAScript module environment.  See
 * https://vitejs.dev/guide/features.html#postcss for further
 * information.
 */
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};