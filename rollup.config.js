import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';

export default {
  input: 'js/app.js',
  output: {
    file: 'dist/bundle.js',
    format: 'umd', // Universal Module Definition - compatible with browsers
    name: 'KeuanganRTModern',
    sourcemap: true,
    inlineDynamicImports: true // Bundle all dynamic imports into the main bundle
  },
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs(),
    copy({
      targets: [
        { src: 'index.html', dest: 'dist/' },
        { src: 'styles.css', dest: 'dist/' },
        { src: 'favicon.ico', dest: 'dist/' },
        { src: 'icons/**', dest: 'dist/icons/' },
        // Copy other static assets if needed
      ]
    })
  ],
  // External dependencies that should not be bundled
  external: [
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
  ]
};
