import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { and, eq } from "drizzle-orm";
import { projects } from "../drizzle/schema";

/**
 * Production Documents Router
 * Automatically generates legal paperwork for film productions:
 * - Talent Release Forms (for cast members)
 * - Location Release Forms (for filming locations)
 * - Crew Agreements (for key crew)
 * - Equipment Rental Agreements
 */

export const productionDocumentsRouter = router({
  // ── Talent Release Forms ────────────────────────────────────────────────────
  talentRelease: router({
    generate: protectedProcedure
      .input(
        z.object({
          projectId: z.number().int(),
          castMemberId: z.number().int(),
          castMemberName: z.string(),
          castMemberRole: z.string(),
          productionTitle: z.string(),
          productionFormat: z.enum(["Feature", "Short", "Series", "Documentary", "Commercial"]),
          releaseScope: z.enum(["theatrical", "streaming", "broadcast", "festival", "all_rights"]).default("all_rights"),
          compensationAmount: z.number().optional(),
          compensationCurrency: z.string().default("AUD"),
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

        // Generate HTML document
        const html = generateTalentReleaseHTML({
          castMemberName: input.castMemberName,
          castMemberRole: input.castMemberRole,
          productionTitle: input.productionTitle,
          productionFormat: input.productionFormat,
          releaseScope: input.releaseScope,
          compensationAmount: input.compensationAmount,
          compensationCurrency: input.compensationCurrency,
          productionCompany: "Virelle Studios",
          generatedDate: new Date().toLocaleDateString("en-AU"),
        });

        return {
          documentType: "talent_release",
          html,
          filename: `${input.projectId}_talent_release_${input.castMemberId}.html`,
          castMemberId: input.castMemberId,
        };
      }),

    list: protectedProcedure
      .input(z.object({ projectId: z.number().int() }))
      .query(async ({ input, ctx }) => {
        // Return list of generated talent releases for a project
        // This would typically be stored in a database table
        return [];
      }),
  }),

  // ── Location Release Forms ──────────────────────────────────────────────────
  locationRelease: router({
    generate: protectedProcedure
      .input(
        z.object({
          projectId: z.number().int(),
          locationName: z.string(),
          locationAddress: z.string(),
          locationOwnerName: z.string(),
          locationOwnerContact: z.string(),
          shootingDates: z.string(),
          productionTitle: z.string(),
          productionFormat: z.enum(["Feature", "Short", "Series", "Documentary", "Commercial"]),
          rentalFee: z.number().optional(),
          rentalCurrency: z.string().default("AUD"),
          insuranceRequired: z.boolean().default(true),
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

        // Generate HTML document
        const html = generateLocationReleaseHTML({
          locationName: input.locationName,
          locationAddress: input.locationAddress,
          locationOwnerName: input.locationOwnerName,
          locationOwnerContact: input.locationOwnerContact,
          shootingDates: input.shootingDates,
          productionTitle: input.productionTitle,
          productionFormat: input.productionFormat,
          rentalFee: input.rentalFee,
          rentalCurrency: input.rentalCurrency,
          insuranceRequired: input.insuranceRequired,
          productionCompany: "Virelle Studios",
          generatedDate: new Date().toLocaleDateString("en-AU"),
        });

        return {
          documentType: "location_release",
          html,
          filename: `${input.projectId}_location_release_${Date.now()}.html`,
        };
      }),
  }),

  // ── Crew Agreements ─────────────────────────────────────────────────────────
  crewAgreement: router({
    generate: protectedProcedure
      .input(
        z.object({
          projectId: z.number().int(),
          crewMemberName: z.string(),
          crewMemberRole: z.string(),
          crewMemberEmail: z.string().email(),
          productionTitle: z.string(),
          productionFormat: z.enum(["Feature", "Short", "Series", "Documentary", "Commercial"]),
          dailyRate: z.number(),
          currency: z.string().default("AUD"),
          startDate: z.string(),
          endDate: z.string(),
          responsibilities: z.string(),
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

        // Generate HTML document
        const html = generateCrewAgreementHTML({
          crewMemberName: input.crewMemberName,
          crewMemberRole: input.crewMemberRole,
          crewMemberEmail: input.crewMemberEmail,
          productionTitle: input.productionTitle,
          productionFormat: input.productionFormat,
          dailyRate: input.dailyRate,
          currency: input.currency,
          startDate: input.startDate,
          endDate: input.endDate,
          responsibilities: input.responsibilities,
          productionCompany: "Virelle Studios",
          generatedDate: new Date().toLocaleDateString("en-AU"),
        });

        return {
          documentType: "crew_agreement",
          html,
          filename: `${input.projectId}_crew_agreement_${Date.now()}.html`,
        };
      }),
  }),

  // ── Equipment Rental Agreements ─────────────────────────────────────────────
  equipmentRental: router({
    generate: protectedProcedure
      .input(
        z.object({
          projectId: z.number().int(),
          equipmentList: z.array(z.object({ name: z.string(), quantity: z.number(), dailyRate: z.number() })),
          rentalCompanyName: z.string(),
          rentalCompanyContact: z.string(),
          rentalStartDate: z.string(),
          rentalEndDate: z.string(),
          productionTitle: z.string(),
          currency: z.string().default("AUD"),
          insuranceRequired: z.boolean().default(true),
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

        // Calculate total rental cost
        const totalCost = input.equipmentList.reduce((sum, item) => sum + item.quantity * item.dailyRate, 0);
        const rentalDays = Math.ceil(
          (new Date(input.rentalEndDate).getTime() - new Date(input.rentalStartDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Generate HTML document
        const html = generateEquipmentRentalHTML({
          equipmentList: input.equipmentList,
          rentalCompanyName: input.rentalCompanyName,
          rentalCompanyContact: input.rentalCompanyContact,
          rentalStartDate: input.rentalStartDate,
          rentalEndDate: input.rentalEndDate,
          rentalDays,
          totalCost,
          productionTitle: input.productionTitle,
          currency: input.currency,
          insuranceRequired: input.insuranceRequired,
          productionCompany: "Virelle Studios",
          generatedDate: new Date().toLocaleDateString("en-AU"),
        });

        return {
          documentType: "equipment_rental",
          html,
          filename: `${input.projectId}_equipment_rental_${Date.now()}.html`,
          totalCost,
          rentalDays,
        };
      }),
  }),

  // ── Download/Export ─────────────────────────────────────────────────────────
  export: protectedProcedure
    .input(z.object({ html: z.string(), filename: z.string() }))
    .mutation(async ({ input }) => {
      // This would typically convert HTML to PDF using a service like WeasyPrint
      // For now, we return the HTML for client-side download
      return {
        success: true,
        data: input.html,
        filename: input.filename,
      };
    }),
});

// ── HTML Generation Functions ────────────────────────────────────────────────

function generateTalentReleaseHTML(data: any): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Talent Release Form</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { text-align: center; color: #1a1a1a; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .section { margin: 20px 0; }
    .section-title { font-weight: bold; font-size: 1.1em; margin-top: 15px; }
    .field { margin: 10px 0; }
    .field-label { font-weight: bold; }
    .signature-line { border-bottom: 1px solid #333; display: inline-block; width: 200px; margin-top: 20px; }
    .footer { font-size: 0.9em; color: #666; margin-top: 30px; text-align: center; }
  </style>
</head>
<body>
  <h1>TALENT RELEASE FORM</h1>
  
  <div class="section">
    <div class="field">
      <span class="field-label">Production Title:</span> ${data.productionTitle}
    </div>
    <div class="field">
      <span class="field-label">Format:</span> ${data.productionFormat}
    </div>
    <div class="field">
      <span class="field-label">Talent Name:</span> ${data.castMemberName}
    </div>
    <div class="field">
      <span class="field-label">Role/Character:</span> ${data.castMemberRole}
    </div>
  </div>

  <div class="section">
    <div class="section-title">GRANT OF RIGHTS</div>
    <p>
      The undersigned hereby grants to ${data.productionCompany} and its successors, licensees, and assigns, 
      the exclusive, perpetual, worldwide right to use the Talent's name, likeness, voice, and performance in connection with 
      the production titled "${data.productionTitle}" in all media now known or hereafter devised, including but not limited to:
    </p>
    <ul>
      <li>Theatrical exhibition</li>
      <li>Television broadcast</li>
      <li>Streaming and digital platforms</li>
      <li>Festival screenings</li>
      <li>Educational and promotional use</li>
    </ul>
  </div>

  <div class="section">
    <div class="section-title">COMPENSATION</div>
    <p>
      ${data.compensationAmount ? `The Talent shall receive compensation of ${data.compensationCurrency} ${data.compensationAmount}.` : "The Talent acknowledges this is a non-compensated appearance."}
    </p>
  </div>

  <div class="section">
    <div class="section-title">ACKNOWLEDGMENT</div>
    <p>
      The Talent acknowledges having read this agreement, understanding its terms, and agrees to be bound by its provisions.
    </p>
  </div>

  <div class="section">
    <p>
      <strong>Talent Name (Print):</strong> ___________________________________
    </p>
    <p>
      <strong>Talent Signature:</strong> ___________________________________
    </p>
    <p>
      <strong>Date:</strong> ___________________________________
    </p>
  </div>

  <div class="footer">
    <p>Generated by Virelle Studios on ${data.generatedDate}</p>
    <p>This document is legally binding. Please retain a signed copy for your records.</p>
  </div>
</body>
</html>
  `;
}

function generateLocationReleaseHTML(data: any): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Location Release Form</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { text-align: center; color: #1a1a1a; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .section { margin: 20px 0; }
    .section-title { font-weight: bold; font-size: 1.1em; margin-top: 15px; }
    .field { margin: 10px 0; }
    .field-label { font-weight: bold; }
    .footer { font-size: 0.9em; color: #666; margin-top: 30px; text-align: center; }
  </style>
</head>
<body>
  <h1>LOCATION RELEASE FORM</h1>
  
  <div class="section">
    <div class="field">
      <span class="field-label">Production Title:</span> ${data.productionTitle}
    </div>
    <div class="field">
      <span class="field-label">Location Name:</span> ${data.locationName}
    </div>
    <div class="field">
      <span class="field-label">Address:</span> ${data.locationAddress}
    </div>
    <div class="field">
      <span class="field-label">Shooting Dates:</span> ${data.shootingDates}
    </div>
  </div>

  <div class="section">
    <div class="section-title">LOCATION USE AGREEMENT</div>
    <p>
      The undersigned, as the owner/authorized representative of the location described above, hereby grants permission to 
      ${data.productionCompany} to film and record at the location on the dates specified.
    </p>
  </div>

  <div class="section">
    <div class="section-title">TERMS</div>
    <ul>
      <li>The production company shall use the location in a professional and respectful manner.</li>
      <li>The production company shall restore the location to its original condition upon completion of filming.</li>
      ${data.rentalFee ? `<li>Rental Fee: ${data.rentalCurrency} ${data.rentalFee}</li>` : ""}
      ${data.insuranceRequired ? `<li>Production company shall maintain appropriate liability insurance during filming.</li>` : ""}
    </ul>
  </div>

  <div class="section">
    <p>
      <strong>Location Owner Name (Print):</strong> ___________________________________
    </p>
    <p>
      <strong>Location Owner Signature:</strong> ___________________________________
    </p>
    <p>
      <strong>Contact Information:</strong> ${data.locationOwnerContact}
    </p>
    <p>
      <strong>Date:</strong> ___________________________________
    </p>
  </div>

  <div class="footer">
    <p>Generated by Virelle Studios on ${data.generatedDate}</p>
    <p>This document is legally binding. Please retain a signed copy for your records.</p>
  </div>
</body>
</html>
  `;
}

function generateCrewAgreementHTML(data: any): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Crew Agreement</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { text-align: center; color: #1a1a1a; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .section { margin: 20px 0; }
    .section-title { font-weight: bold; font-size: 1.1em; margin-top: 15px; }
    .field { margin: 10px 0; }
    .field-label { font-weight: bold; }
    .footer { font-size: 0.9em; color: #666; margin-top: 30px; text-align: center; }
  </style>
</head>
<body>
  <h1>CREW AGREEMENT</h1>
  
  <div class="section">
    <div class="field">
      <span class="field-label">Production Title:</span> ${data.productionTitle}
    </div>
    <div class="field">
      <span class="field-label">Crew Member Name:</span> ${data.crewMemberName}
    </div>
    <div class="field">
      <span class="field-label">Position:</span> ${data.crewMemberRole}
    </div>
    <div class="field">
      <span class="field-label">Email:</span> ${data.crewMemberEmail}
    </div>
  </div>

  <div class="section">
    <div class="section-title">EMPLOYMENT TERMS</div>
    <ul>
      <li>Start Date: ${data.startDate}</li>
      <li>End Date: ${data.endDate}</li>
      <li>Daily Rate: ${data.currency} ${data.dailyRate}</li>
      <li>Position: ${data.crewMemberRole}</li>
    </ul>
  </div>

  <div class="section">
    <div class="section-title">RESPONSIBILITIES</div>
    <p>${data.responsibilities}</p>
  </div>

  <div class="section">
    <div class="section-title">INTELLECTUAL PROPERTY</div>
    <p>
      The Crew Member acknowledges that all work product created during the production shall be the exclusive property of 
      ${data.productionCompany} and shall be subject to all applicable intellectual property protections.
    </p>
  </div>

  <div class="section">
    <p>
      <strong>Crew Member Signature:</strong> ___________________________________
    </p>
    <p>
      <strong>Date:</strong> ___________________________________
    </p>
  </div>

  <div class="footer">
    <p>Generated by Virelle Studios on ${data.generatedDate}</p>
    <p>This document is legally binding. Please retain a signed copy for your records.</p>
  </div>
</body>
</html>
  `;
}

function generateEquipmentRentalHTML(data: any): string {
  const equipmentRows = data.equipmentList
    .map(
      (item: any) =>
        `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${data.currency} ${item.dailyRate}</td><td>${data.currency} ${item.quantity * item.dailyRate * data.rentalDays}</td></tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Equipment Rental Agreement</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { text-align: center; color: #1a1a1a; border-bottom: 2px solid #333; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background-color: #f5f5f5; font-weight: bold; }
    .section { margin: 20px 0; }
    .section-title { font-weight: bold; font-size: 1.1em; margin-top: 15px; }
    .field { margin: 10px 0; }
    .field-label { font-weight: bold; }
    .total-row { font-weight: bold; background-color: #f5f5f5; }
    .footer { font-size: 0.9em; color: #666; margin-top: 30px; text-align: center; }
  </style>
</head>
<body>
  <h1>EQUIPMENT RENTAL AGREEMENT</h1>
  
  <div class="section">
    <div class="field">
      <span class="field-label">Production Title:</span> ${data.productionTitle}
    </div>
    <div class="field">
      <span class="field-label">Rental Company:</span> ${data.rentalCompanyName}
    </div>
    <div class="field">
      <span class="field-label">Contact:</span> ${data.rentalCompanyContact}
    </div>
    <div class="field">
      <span class="field-label">Rental Period:</span> ${data.rentalStartDate} to ${data.rentalEndDate} (${data.rentalDays} days)
    </div>
  </div>

  <div class="section">
    <div class="section-title">EQUIPMENT LIST</div>
    <table>
      <thead>
        <tr>
          <th>Equipment</th>
          <th>Quantity</th>
          <th>Daily Rate</th>
          <th>Total Cost</th>
        </tr>
      </thead>
      <tbody>
        ${equipmentRows}
        <tr class="total-row">
          <td colspan="3">TOTAL RENTAL COST:</td>
          <td>${data.currency} ${data.totalCost}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">TERMS & CONDITIONS</div>
    <ul>
      <li>Equipment shall be used in accordance with manufacturer specifications.</li>
      <li>Renter is responsible for all damage or loss to equipment.</li>
      ${data.insuranceRequired ? `<li>Renter shall maintain appropriate insurance coverage during rental period.</li>` : ""}
      <li>Equipment must be returned in the same condition as received.</li>
      <li>Payment is due upon completion of rental period.</li>
    </ul>
  </div>

  <div class="section">
    <p>
      <strong>Rental Company Signature:</strong> ___________________________________
    </p>
    <p>
      <strong>Production Company Signature:</strong> ___________________________________
    </p>
    <p>
      <strong>Date:</strong> ___________________________________
    </p>
  </div>

  <div class="footer">
    <p>Generated by Virelle Studios on ${data.generatedDate}</p>
    <p>This document is legally binding. Please retain a signed copy for your records.</p>
  </div>
</body>
</html>
  `;
}
