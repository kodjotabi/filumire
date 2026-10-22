# FILUMIRE self-hosted fonts

These WOFF2 files are byte-for-byte copies of the Montserrat and Kalam files already emitted by this project's Google Fonts loader. src/app/fonts.css retains the original font faces, weights, Unicode ranges, swap display and fallback metrics; layout.tsx preloads the same three Latin files as before. All subsets are preserved. No files are downloaded during builds or by visitors from an external font service.

manifest.json records original cache names, file sizes and SHA-256 values for provenance. Cached data was decoded with the installed Next.js font parser before copying: Montserrat supports the requested 400/500/600/700/800 weights as a variable font, and Kalam has actual regular and bold faces.

Both families use SIL Open Font License 1.1; see OFL-Montserrat.txt and OFL-Kalam.txt. Embedded copyright notices are preserved. Upstream license sources: https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/OFL.txt and https://raw.githubusercontent.com/google/fonts/main/ofl/kalam/OFL.txt.
