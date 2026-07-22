import { sql } from "drizzle-orm";
import type { User } from "../../drizzle/schema";
import * as db from "../db";

export const PAID_MATURE_ACCESS_TIERS = [
  "indie",
  "amateur",
  "independent",
  "creator",
  "studio",
  "pro",
  "industry",
] as const;

export type MatureAccessProfileInput = {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  stateRegion: string;
  postcode: string;
  country: string;
  dateOfBirth: string;
  responsibilityAccepted: boolean;
  consentPolicyAccepted: boolean;
};

export type MatureAccessStatus = {
  paidMembership: boolean;
  profileComplete: boolean;
  adultAgeConfirmed: boolean;
  phoneVerified: boolean;
  identityVerified: boolean;
  cardNameMatched: boolean;
  responsibilityAccepted: boolean;
  consentPolicyAccepted: boolean;
  accessGranted: boolean;
  missing: string[];
  profile: null | {
    fullName: string;
    email: string;
    phone: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    stateRegion: string;
    postcode: string;
    country: string;
    dateOfBirth: string;
    accessStatus: string;
    rejectionReason: string | null;
  };
};

function rowsFromResult(result: any): any[] {
  if (Array.isArray(result?.[0])) return result[0];
  if (Array.isArray(result)) return result;
  return [];
}

export function normalizeLegalName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function legalNamesMatch(expected: string, supplied: string): boolean {
  const left = normalizeLegalName(expected);
  const right = normalizeLegalName(supplied);
  if (!left || !right) return false;
  if (left === right) return true;

  const leftParts = left.split(" ");
  const rightParts = right.split(" ");
  if (leftParts.length < 2 || rightParts.length < 2) return false;

  return leftParts[0] === rightParts[0]
    && leftParts[leftParts.length - 1] === rightParts[rightParts.length - 1];
}

export function calculateAge(dateOfBirth: string | Date, now = new Date()): number {
  const dob = dateOfBirth instanceof Date ? dateOfBirth : new Date(`${dateOfBirth}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) return -1;
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDifference = now.getUTCMonth() - dob.getUTCMonth();
  if (monthDifference < 0 || (monthDifference === 0 && now.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}

export function isPaidMatureAccessUser(user: Pick<User, "role" | "subscriptionTier" | "subscriptionStatus">): boolean {
  if (user.role === "admin") return true;
  const active = user.subscriptionStatus === "active" || user.subscriptionStatus === "trialing";
  return active && PAID_MATURE_ACCESS_TIERS.includes(String(user.subscriptionTier) as any);
}

export async function ensureMatureAccessTable(dbConn: any): Promise<void> {
  await dbConn.execute(sql`
    CREATE TABLE IF NOT EXISTS mature_access_profiles (
      userId INT NOT NULL PRIMARY KEY,
      fullName VARCHAR(255) NOT NULL,
      email VARCHAR(320) NOT NULL,
      phone VARCHAR(64) NOT NULL,
      addressLine1 VARCHAR(255) NOT NULL,
      addressLine2 VARCHAR(255) NULL,
      city VARCHAR(128) NOT NULL,
      stateRegion VARCHAR(128) NOT NULL,
      postcode VARCHAR(32) NOT NULL,
      country VARCHAR(128) NOT NULL,
      dateOfBirth DATE NOT NULL,
      responsibilityAcceptedAt DATETIME NULL,
      consentPolicyAcceptedAt DATETIME NULL,
      phoneVerifiedAt DATETIME NULL,
      identityVerificationSessionId VARCHAR(255) NULL,
      identityVerifiedAt DATETIME NULL,
      cardVerificationSessionId VARCHAR(255) NULL,
      cardholderName VARCHAR(255) NULL,
      cardNameMatchedAt DATETIME NULL,
      accessStatus VARCHAR(32) NOT NULL DEFAULT 'pending',
      rejectionReason TEXT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_mature_access_status (accessStatus),
      INDEX idx_mature_access_phone (phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

export async function getMatureAccessProfile(dbConn: any, userId: number): Promise<any | null> {
  await ensureMatureAccessTable(dbConn);
  const result = await dbConn.execute(sql`
    SELECT * FROM mature_access_profiles WHERE userId = ${userId} LIMIT 1
  `);
  return rowsFromResult(result)[0] ?? null;
}

export async function upsertMatureAccessProfile(
  dbConn: any,
  user: Pick<User, "id" | "email">,
  input: MatureAccessProfileInput,
): Promise<void> {
  await ensureMatureAccessTable(dbConn);
  const acceptedAt = new Date();
  await dbConn.execute(sql`
    INSERT INTO mature_access_profiles (
      userId, fullName, email, phone, addressLine1, addressLine2, city,
      stateRegion, postcode, country, dateOfBirth, responsibilityAcceptedAt,
      consentPolicyAcceptedAt, accessStatus, rejectionReason
    ) VALUES (
      ${user.id}, ${input.fullName.trim()}, ${(user.email || input.email).trim().toLowerCase()},
      ${input.phone.trim()}, ${input.addressLine1.trim()}, ${input.addressLine2?.trim() || null},
      ${input.city.trim()}, ${input.stateRegion.trim()}, ${input.postcode.trim()},
      ${input.country.trim()}, ${input.dateOfBirth},
      ${input.responsibilityAccepted ? acceptedAt : null},
      ${input.consentPolicyAccepted ? acceptedAt : null}, 'pending', NULL
    )
    ON DUPLICATE KEY UPDATE
      fullName = VALUES(fullName),
      email = VALUES(email),
      phone = VALUES(phone),
      addressLine1 = VALUES(addressLine1),
      addressLine2 = VALUES(addressLine2),
      city = VALUES(city),
      stateRegion = VALUES(stateRegion),
      postcode = VALUES(postcode),
      country = VALUES(country),
      dateOfBirth = VALUES(dateOfBirth),
      responsibilityAcceptedAt = VALUES(responsibilityAcceptedAt),
      consentPolicyAcceptedAt = VALUES(consentPolicyAcceptedAt),
      phoneVerifiedAt = IF(phone = VALUES(phone), phoneVerifiedAt, NULL),
      cardNameMatchedAt = IF(fullName = VALUES(fullName), cardNameMatchedAt, NULL),
      identityVerifiedAt = IF(fullName = VALUES(fullName) AND dateOfBirth = VALUES(dateOfBirth), identityVerifiedAt, NULL),
      accessStatus = 'pending',
      rejectionReason = NULL,
      updatedAt = NOW()
  `);
  await db.updateUser(user.id, { isAdultVerified: false } as any);
}

export async function recordPhoneVerified(dbConn: any, userId: number): Promise<void> {
  await ensureMatureAccessTable(dbConn);
  await dbConn.execute(sql`
    UPDATE mature_access_profiles SET phoneVerifiedAt = NOW(), updatedAt = NOW()
    WHERE userId = ${userId}
  `);
}

export async function recordIdentitySession(dbConn: any, userId: number, sessionId: string): Promise<void> {
  await ensureMatureAccessTable(dbConn);
  await dbConn.execute(sql`
    UPDATE mature_access_profiles
    SET identityVerificationSessionId = ${sessionId}, identityVerifiedAt = NULL,
        accessStatus = 'pending', updatedAt = NOW()
    WHERE userId = ${userId}
  `);
}

export async function recordIdentityVerified(dbConn: any, userId: number): Promise<void> {
  await ensureMatureAccessTable(dbConn);
  await dbConn.execute(sql`
    UPDATE mature_access_profiles SET identityVerifiedAt = NOW(), updatedAt = NOW()
    WHERE userId = ${userId}
  `);
}

export async function recordCardSession(dbConn: any, userId: number, sessionId: string): Promise<void> {
  await ensureMatureAccessTable(dbConn);
  await dbConn.execute(sql`
    UPDATE mature_access_profiles
    SET cardVerificationSessionId = ${sessionId}, cardholderName = NULL,
        cardNameMatchedAt = NULL, accessStatus = 'pending', updatedAt = NOW()
    WHERE userId = ${userId}
  `);
}

export async function recordCardNameResult(
  dbConn: any,
  userId: number,
  cardholderName: string,
  matched: boolean,
): Promise<void> {
  await ensureMatureAccessTable(dbConn);
  await dbConn.execute(sql`
    UPDATE mature_access_profiles
    SET cardholderName = ${cardholderName},
        cardNameMatchedAt = ${matched ? new Date() : null},
        rejectionReason = ${matched ? null : "Cardholder name did not match the registered legal name."},
        accessStatus = ${matched ? "pending" : "rejected"},
        updatedAt = NOW()
    WHERE userId = ${userId}
  `);
}

export async function getMatureAccessStatus(
  dbConn: any,
  user: Pick<User, "id" | "role" | "subscriptionTier" | "subscriptionStatus">,
): Promise<MatureAccessStatus> {
  const profile = await getMatureAccessProfile(dbConn, user.id);
  const paidMembership = isPaidMatureAccessUser(user as any);
  const profileComplete = Boolean(profile
    && profile.fullName
    && profile.email
    && profile.phone
    && profile.addressLine1
    && profile.city
    && profile.stateRegion
    && profile.postcode
    && profile.country
    && profile.dateOfBirth);
  const adultAgeConfirmed = Boolean(profile?.dateOfBirth && calculateAge(String(profile.dateOfBirth).slice(0, 10)) >= 18);
  const phoneVerified = Boolean(profile?.phoneVerifiedAt);
  const identityVerified = Boolean(profile?.identityVerifiedAt);
  const cardNameMatched = Boolean(profile?.cardNameMatchedAt);
  const responsibilityAccepted = Boolean(profile?.responsibilityAcceptedAt);
  const consentPolicyAccepted = Boolean(profile?.consentPolicyAcceptedAt);
  const accessGranted = paidMembership
    && profileComplete
    && adultAgeConfirmed
    && phoneVerified
    && identityVerified
    && cardNameMatched
    && responsibilityAccepted
    && consentPolicyAccepted;

  const missing: string[] = [];
  if (!paidMembership) missing.push("active paid Virelle membership");
  if (!profileComplete) missing.push("complete legal identity and address profile");
  if (!adultAgeConfirmed) missing.push("verified age of 18 or older");
  if (!phoneVerified) missing.push("phone two-factor verification");
  if (!identityVerified) missing.push("government identity verification");
  if (!cardNameMatched) missing.push("matching cardholder name");
  if (!responsibilityAccepted) missing.push("account responsibility declaration");
  if (!consentPolicyAccepted) missing.push("likeness and consent policy acceptance");

  if (profile) {
    await dbConn.execute(sql`
      UPDATE mature_access_profiles
      SET accessStatus = ${accessGranted ? "verified" : profile.accessStatus === "rejected" ? "rejected" : "pending"},
          updatedAt = NOW()
      WHERE userId = ${user.id}
    `);
  }
  await db.updateUser(user.id, { isAdultVerified: accessGranted } as any);

  return {
    paidMembership,
    profileComplete,
    adultAgeConfirmed,
    phoneVerified,
    identityVerified,
    cardNameMatched,
    responsibilityAccepted,
    consentPolicyAccepted,
    accessGranted,
    missing,
    profile: profile ? {
      fullName: String(profile.fullName || ""),
      email: String(profile.email || ""),
      phone: String(profile.phone || ""),
      addressLine1: String(profile.addressLine1 || ""),
      addressLine2: profile.addressLine2 ? String(profile.addressLine2) : null,
      city: String(profile.city || ""),
      stateRegion: String(profile.stateRegion || ""),
      postcode: String(profile.postcode || ""),
      country: String(profile.country || ""),
      dateOfBirth: String(profile.dateOfBirth || "").slice(0, 10),
      accessStatus: String(profile.accessStatus || "pending"),
      rejectionReason: profile.rejectionReason ? String(profile.rejectionReason) : null,
    } : null,
  };
}
