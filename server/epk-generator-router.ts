import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { eq, and } from "drizzle-orm";
import { projects } from "../drizzle/schema";

/**
 * EPK Generator Router
 * 
 * Generates professional Electronic Press Kits (EPKs) for completed films.
 * EPKs are used for festival submissions, distribution, and marketing.
 * 
 * Includes:
 * - Hosted EPK page (shareable URL)
 * - PDF press kit
 * - Social media assets
 * - Festival submission package
 */

export const epkGeneratorRouter = router({
  // ── Generate EPK ────────────────────────────────────────────────────────
  generate: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int(),
        includeTrailer: z.boolean().default(true),
        includePoster: z.boolean().default(true),
        includeSoundtrack: z.boolean().default(true),
        customBio: z.string().optional(),
        socialLinks: z.object({
          instagram: z.string().optional(),
          twitter: z.string().optional(),
          website: z.string().optional(),
          imdb: z.string().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Verify project ownership
      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)));
      if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "Project not found or not owned by you" });

      // Generate unique EPK slug
      const epkSlug = `epk-${(project as any).slug ?? String(project.id)}-${Date.now()}`;
      const epkUrl = `https://virelle.life/epk/${epkSlug}`;

      // Compile EPK data
      const epkData = {
        projectId: input.projectId,
        slug: epkSlug,
        url: epkUrl,
        title: project.title,
        description: project.description,
        genre: project.genre,
        rating: project.rating,
        duration: project.duration,
        releaseDate: (project as any).releaseDate ?? null,
        director: ctx.user.name,
        directorBio: input.customBio || `${ctx.user.name} is a filmmaker using Virelle Studios.`,
        socialLinks: input.socialLinks || {},
        includeTrailer: input.includeTrailer,
        includePoster: input.includePoster,
        includeSoundtrack: input.includeSoundtrack,
        generatedAt: new Date().toISOString(),
      };

      return {
        success: true,
        epkUrl,
        epkSlug,
        epkData,
        message: `EPK generated successfully. Share this link: ${epkUrl}`,
      };
    }),

  // ── Get EPK Data ────────────────────────────────────────────────────────
  getEPK: protectedProcedure
    .input(z.object({ projectId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Verify project ownership
      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)));
      if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "Project not found or not owned by you" });

      // Return EPK data
      return {
        projectId: input.projectId,
        title: project.title,
        description: project.description,
        genre: project.genre,
        rating: project.rating,
        duration: project.duration,
        director: ctx.user.name,
      };
    }),

  // ── Generate Festival Submission Package ────────────────────────────────
  generateFestivalPackage: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int(),
        festivalName: z.string(),
        festivalDeadline: z.string().optional(),
        includeStills: z.boolean().default(true),
        includeScreenplay: z.boolean().default(true),
        includeDirectorStatement: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Verify project ownership
      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)));
      if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "Project not found or not owned by you" });

      // Generate festival package
      const packageData = {
        festivalName: input.festivalName,
        festivalDeadline: input.festivalDeadline,
        projectTitle: project.title,
        director: ctx.user.name,
        duration: project.duration,
        genre: project.genre,
        synopsis: project.description,
        directorStatement: input.includeDirectorStatement || `${ctx.user.name}'s vision for "${project.title}"`,
        assets: {
          trailer: true,
          poster: input.includeStills,
          stills: input.includeStills,
          screenplay: input.includeScreenplay,
          pressKit: true,
        },
        submissionDate: new Date().toISOString(),
      };

      return {
        success: true,
        packageData,
        message: `Festival submission package prepared for ${input.festivalName}`,
      };
    }),

  // ── Generate Social Media Assets ────────────────────────────────────────
  generateSocialAssets: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int(),
        platforms: z.array(z.enum(["instagram", "twitter", "facebook", "tiktok", "linkedin"])).default(["instagram", "twitter"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Verify project ownership
      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)));
      if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "Project not found or not owned by you" });

      const assets: Record<string, string> = {};

      // Generate platform-specific content
      for (const platform of input.platforms) {
        assets[platform] = generateSocialPost(platform, {
          title: project.title,
          description: project.description,
          genre: project.genre,
          director: ctx.user.name,
        });
      }

      return {
        success: true,
        assets,
        message: `Social media assets generated for ${input.platforms.join(", ")}`,
      };
    }),

  // ── Generate PDF Press Kit ──────────────────────────────────────────────
  generatePDF: protectedProcedure
    .input(z.object({ projectId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Verify project ownership
      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)));
      if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "Project not found or not owned by you" });

      // Generate HTML for PDF conversion
      const html = generatePressKitHTML({
        title: project.title,
        description: project.description,
        genre: project.genre,
        rating: project.rating,
        duration: project.duration,
        director: ctx.user.name,
        releaseDate: (project as any).releaseDate ?? null,
      });

      return {
        success: true,
        html,
        filename: `${(project as any).slug ?? String(project.id)}_press_kit.html`,
        message: "Press kit HTML generated. Use manus-md-to-pdf to convert to PDF.",
      };
    }),

  // ── List Available EPKs ─────────────────────────────────────────────────
  list: protectedProcedure
    .input(z.object({ limit: z.number().default(10), offset: z.number().default(0) }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Get user's projects with EPK status
      const userProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, ctx.user.id))
        .limit(input.limit)
        .offset(input.offset);

      return {
        epks: userProjects.map((p) => ({
          projectId: p.id,
          title: p.title,
          genre: p.genre,
          duration: p.duration,
          epkUrl: `https://virelle.life/epk/${p.slug}`,
        })),
        total: userProjects.length,
      };
    }),
});

// ── Helper Functions ────────────────────────────────────────────────────────

function generateSocialPost(platform: string, data: any): string {
  const posts: Record<string, string> = {
    instagram: `🎬 "${data.title}" is here! 🎉

${data.description}

Genre: ${data.genre}
Director: ${data.director}

Link in bio to watch now! 🎥✨

#FilmProduction #IndieFilm #${data.genre} #Filmmaking #VireleStudios`,

    twitter: `🎬 NEW FILM: "${data.title}" 

${data.description?.substring(0, 100)}...

Directed by ${data.director}
Genre: ${data.genre}

Watch now: [link]

#IndieFilm #Filmmaking #${data.genre}`,

    facebook: `🎬 We're thrilled to present: "${data.title}" 🎉

${data.description}

Directed by ${data.director}
Genre: ${data.genre}

Watch the full film and explore behind-the-scenes content. Share with your friends!

[Watch Now]`,

    tiktok: `POV: You're about to watch an amazing film 🎬✨

"${data.title}" - Directed by ${data.director}

Genre: ${data.genre}

Link in bio! 🎥

#FilmTok #IndieFilm #Filmmaking #NewRelease`,

    linkedin: `Excited to announce the completion of "${data.title}" 🎬

This ${data.genre} film, directed by ${data.director}, represents months of creative work and innovative production techniques.

${data.description}

Available now on Virelle Studios. 

#FilmProduction #Filmmaking #IndieFilm #CreativeWork`,
  };

  return posts[platform] || "";
}

function generatePressKitHTML(data: any): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title} - Press Kit</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 10px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }
    h1 {
      color: #667eea;
      border-bottom: 3px solid #667eea;
      padding-bottom: 15px;
      margin-bottom: 30px;
    }
    h2 {
      color: #764ba2;
      margin-top: 30px;
      margin-bottom: 15px;
    }
    .metadata {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      background: #f5f5f5;
      padding: 20px;
      border-radius: 5px;
      margin-bottom: 30px;
    }
    .metadata-item {
      display: flex;
      flex-direction: column;
    }
    .metadata-label {
      font-weight: bold;
      color: #667eea;
      font-size: 0.9em;
      text-transform: uppercase;
    }
    .metadata-value {
      font-size: 1.1em;
      color: #333;
    }
    .synopsis {
      background: #f9f9f9;
      padding: 20px;
      border-left: 4px solid #667eea;
      margin: 20px 0;
      line-height: 1.8;
    }
    .section {
      margin-bottom: 30px;
    }
    .footer {
      border-top: 2px solid #eee;
      margin-top: 40px;
      padding-top: 20px;
      text-align: center;
      color: #999;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${data.title}</h1>
    
    <div class="metadata">
      <div class="metadata-item">
        <span class="metadata-label">Director</span>
        <span class="metadata-value">${data.director}</span>
      </div>
      <div class="metadata-item">
        <span class="metadata-label">Genre</span>
        <span class="metadata-value">${data.genre}</span>
      </div>
      <div class="metadata-item">
        <span class="metadata-label">Duration</span>
        <span class="metadata-value">${data.duration} minutes</span>
      </div>
      <div class="metadata-item">
        <span class="metadata-label">Rating</span>
        <span class="metadata-value">${data.rating || "Not Rated"}</span>
      </div>
      <div class="metadata-item">
        <span class="metadata-label">Release Date</span>
        <span class="metadata-value">${data.releaseDate || "TBD"}</span>
      </div>
      <div class="metadata-item">
        <span class="metadata-label">Production</span>
        <span class="metadata-value">Virelle Studios</span>
      </div>
    </div>

    <div class="section">
      <h2>Synopsis</h2>
      <div class="synopsis">
        ${data.description}
      </div>
    </div>

    <div class="section">
      <h2>About the Director</h2>
      <p>
        ${data.director} is a filmmaker creating innovative content through Virelle Studios, 
        a platform that combines AI-assisted production with traditional filmmaking techniques.
      </p>
    </div>

    <div class="section">
      <h2>Production Details</h2>
      <ul>
        <li><strong>Production Company:</strong> Virelle Studios</li>
        <li><strong>Production Format:</strong> Digital Cinema</li>
        <li><strong>Distribution:</strong> Available on Virelle Studios Platform</li>
      </ul>
    </div>

    <div class="section">
      <h2>Festival & Screening Information</h2>
      <p>
        This film is available for festival submissions, theatrical screenings, and digital distribution.
        For screening inquiries, please contact the production team through Virelle Studios.
      </p>
    </div>

    <div class="footer">
      <p>Press Kit Generated by Virelle Studios | ${new Date().toLocaleDateString()}</p>
      <p>For more information, visit: https://virelle.life</p>
    </div>
  </div>
</body>
</html>
  `;
}
