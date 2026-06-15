/**
   * SEO Router v4 — tRPC endpoints for the autonomous SEO engine
   * Exposes both v3 (core) and v4 (GEO/programmatic) capabilities.
   */

  import { z } from "zod";
  import { adminProcedure, publicProcedure } from "./_core/trpc";
  import { router } from "./_core/trpc";
  import {
    analyzeSeoHealth,
    analyzeKeywords,
    analyzeInternalLinks,
    optimizeMetaTags,
    generateSeoReport,
    generateStructuredData,
    getOpenGraphTags,
    getPublicPages,
    getCachedReport,
    getLastOptimizationRun,
    runScheduledSeoOptimization,
    triggerSeoKillSwitch,
    resetSeoKillSwitch,
    isSeoKilled,
    getWebVitalsSummary,
    getRedirects,
    submitToIndexNow,
    getSeoEventLog,
    generateContentBriefs,
    analyzeCompetitors,
    optimizeBlogPostSeo,
  } from "./seo-engine";
  import {
    getAllProgrammaticPages,
    getTopicClusters,
    getFeaturedSnippetTargets,
    analyzeContentFreshness,
    analyzeContentGaps,
    getSemanticKeywordClusters,
    getSearchIntentMappings,
    generateEnhancedStructuredData,
    generateEEATStructuredData,
    generateLlmsTxt,
    generateLlmsFullTxt,
    generateAiCitationMeta,
    generateSitemapIndex,
    submitBatchToGoogleIndexing,
  } from "./seo-engine-v4";

  export const seoRouter = router({
    // ── Core v3 ──────────────────────────────────────────────────────────────

    getHealthScore: adminProcedure.query(async () => analyzeSeoHealth()),

    getKeywords: adminProcedure.query(async () => analyzeKeywords()),

    getMetaOptimizations: adminProcedure.query(async () => optimizeMetaTags()),

    getReport: adminProcedure.query(async () => {
      const cached = getCachedReport();
      if (cached && Date.now() - cached.generatedAt < 3600_000) return cached;
      return generateSeoReport();
    }),

    runOptimization: adminProcedure.mutation(async () => runScheduledSeoOptimization()),

    getStructuredData: adminProcedure.query(async () => generateStructuredData()),

    getOpenGraph: adminProcedure
      .input(z.object({ path: z.string() }))
      .query(async ({ input }) => getOpenGraphTags(input.path)),

    getPublicPages: adminProcedure.query(async () => getPublicPages()),

    getLastOptimizationRun: adminProcedure.query(async () => getLastOptimizationRun()),

    getWebVitals: adminProcedure.query(async () => getWebVitalsSummary()),

    getRedirects: adminProcedure.query(async () => getRedirects()),

    submitToIndexNow: adminProcedure
      .input(z.object({ urls: z.array(z.string()) }))
      .mutation(async ({ input }) => submitToIndexNow(input.urls)),

    getSeoEventLog: adminProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => getSeoEventLog(input.limit)),

    getInternalLinks: adminProcedure.query(async () => analyzeInternalLinks()),

    getCompetitorAnalysis: adminProcedure.query(async () => analyzeCompetitors()),

    getContentBriefs: adminProcedure
      .input(z.object({ count: z.number().default(5) }))
      .query(async ({ input }) => generateContentBriefs(input.count)),

    optimizeBlogPost: adminProcedure
      .input(z.object({ slug: z.string() }))
      .mutation(async ({ input }) => optimizeBlogPostSeo(input.slug)),

    killSwitch: adminProcedure
      .input(z.object({ code: z.string() }))
      .mutation(async ({ input }) => triggerSeoKillSwitch(input.code)),

    resetKillSwitch: adminProcedure
      .input(z.object({ code: z.string() }))
      .mutation(async ({ input }) => resetSeoKillSwitch(input.code)),

    isKilled: adminProcedure.query(async () => isSeoKilled()),

    // ── v4: Generative Engine Optimisation (GEO) ─────────────────────────────

    getLlmsTxt: publicProcedure.query(async () => ({
      llmsTxt: generateLlmsTxt(),
      llmsFullTxt: generateLlmsFullTxt(),
    })),

    getAiCitationMeta: adminProcedure
      .input(z.object({ title: z.string(), description: z.string(), path: z.string() }))
      .query(async ({ input }) => generateAiCitationMeta(input)),

    // ── v4: Programmatic SEO ─────────────────────────────────────────────────

    getProgrammaticPages: adminProcedure.query(async () => getAllProgrammaticPages()),

    getTopicClusters: adminProcedure.query(async () => getTopicClusters()),

    getFeaturedSnippetTargets: adminProcedure.query(async () => getFeaturedSnippetTargets()),

    getSearchIntentMappings: adminProcedure.query(async () => getSearchIntentMappings()),

    getSemanticKeywordClusters: adminProcedure.query(async () => getSemanticKeywordClusters()),

    // ── v4: Content Analysis ─────────────────────────────────────────────────

    getContentFreshness: adminProcedure.query(async () => analyzeContentFreshness()),

    getContentGaps: adminProcedure.query(async () => analyzeContentGaps()),

    // ── v4: Enhanced Structured Data ─────────────────────────────────────────

    getEnhancedStructuredData: adminProcedure.query(async () => generateEnhancedStructuredData()),

    getEEATStructuredData: adminProcedure.query(async () => generateEEATStructuredData()),

    getSitemapIndex: adminProcedure.query(async () => generateSitemapIndex()),

    // ── v4: Google Search Console Instant Indexing ────────────────────────────

    submitToGoogleIndexing: adminProcedure
      .input(z.object({ urls: z.array(z.string().url()) }))
      .mutation(async ({ input }) => submitBatchToGoogleIndexing(input.urls)),
  });
  