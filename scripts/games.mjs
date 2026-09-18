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
    codeBudget: 1200 * 1024,
    // Streamed music + ten short local voice clips and one compressed story still.
    // Code budget stays unchanged; story assets load only for the current chapter.
    totalBudget: 24 * 1024 * 1024,
  },
];
