// Build metadata only. No game code is imported by the Angular application.
export const games = [
  {
    slug: "lost-in-orbit",
    name: "Lost in Orbit",
    port: 5174,
    codeBudget: 450 * 1024,
    totalBudget: 6 * 1024 * 1024,
  },
  {
    slug: "last-light",
    name: "Last Light",
    port: 5175,
    // Physics ships as a separate streamed .wasm, so JS + CSS stay small.
    codeBudget: 500 * 1024,
    // Full and lite music, ten short voice clips, WebP textures and art.
    // Story assets load only for the current chapter.
    totalBudget: 18 * 1024 * 1024,
  },
];
