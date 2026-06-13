import { getDb } from './db';
import { characters } from '../drizzle/schema';
import { eq, sql } from 'drizzle-orm';

const SIGNATURE_CAST = [
  { name: "Julian Vance", role: "Male Lead", storyImportance: "lead", screenTime: "heavy", description: "The Charismatic Rogue. Mixed European/Mediterranean, sharp jawline, olive skin.", nationality: "Mixed European/Mediterranean", castingNotes: "HARD-LOCK: Exact facial symmetry, olive skin, sharp taper cut.", isAiActor: true, aiActorId: "M-L01" },
  { name: "Elena Rostova", role: "Female Lead", storyImportance: "lead", screenTime: "heavy", description: "The Elegant Mastermind. Eastern European/Slavic, pale skin, green eyes.", nationality: "Eastern European/Slavic", castingNotes: "HARD-LOCK: Pale skin, green eyes, sleek straight hair.", isAiActor: true, aiActorId: "F-L01" },
  { name: "Kofi Adebayo", role: "Male Lead", storyImportance: "lead", screenTime: "heavy", description: "The Driven Professional. West African, deep warm brown skin, strong brow.", nationality: "West African", castingNotes: "HARD-LOCK: Deep warm brown skin, strong brow, clean short fade.", isAiActor: true, aiActorId: "M-L02" },
  { name: "Tariq Hassan", role: "Male Character Actor", storyImportance: "supporting", screenTime: "moderate", description: "The World-Weary Veteran. Middle Eastern, salt-and-pepper beard, deep-set eyes.", nationality: "Middle Eastern/North African", castingNotes: "HARD-LOCK: Salt-and-pepper beard, weathered skin texture.", isAiActor: true, aiActorId: "M-C02" },
  { name: "Chloe Chen", role: "Comedic Woman", storyImportance: "supporting", screenTime: "moderate", description: "The Deadpan Cynic. East Asian, sharp bob cut, minimal expression.", nationality: "East Asian", castingNotes: "HARD-LOCK: Sharp black bob cut, deadpan expression.", isAiActor: true, aiActorId: "F-X01" },
];

const DIVERSE_CAST_EXPANSION = [
  { name: "Zaid Al-Farsi", role: "Male Character Actor", storyImportance: "supporting", screenTime: "moderate", description: "The Stoic Intellectual. Arab/Middle Eastern, groomed short beard.", nationality: "Arab", castingNotes: "HARD-LOCK: Groomed short beard, deep brown eyes.", isAiActor: true, aiActorId: "M-C03" },
  { name: "Aisha Mbeki", role: "Female Lead", storyImportance: "lead", screenTime: "heavy", description: "The Resourceful Leader. Black/West African, glowing skin, natural braids.", nationality: "Black/West African", castingNotes: "HARD-LOCK: Natural braids, glowing deep brown skin.", isAiActor: true, aiActorId: "F-L05" },
  { name: "Toby 'Small' Miller", role: "Male Character Actor", storyImportance: "supporting", screenTime: "moderate", description: "The Clever Observer. Little Person, sharp blue eyes.", nationality: "White", castingNotes: "HARD-LOCK: Little person features, blue eyes.", isAiActor: true, aiActorId: "M-LP01" },
  { name: "Magnus 'Giant' Sorensen", role: "Male Character Actor", storyImportance: "supporting", screenTime: "moderate", description: "The Gentle Giant. Extremely tall, Nordic features, long blonde hair and beard.", nationality: "White/Nordic", castingNotes: "HARD-LOCK: 7ft2 height, rugged Nordic features, long blonde hair and beard.", isAiActor: true, aiActorId: "M-G01" },
  { name: "Mei Ling", role: "Female Character Actor", storyImportance: "supporting", screenTime: "moderate", description: "The Tech Savant. East Asian, sharp bob cut, focused gaze.", nationality: "Asian", castingNotes: "HARD-LOCK: Sharp black bob cut, focused gaze.", isAiActor: true, aiActorId: "F-C03" },
];

type CastMember = typeof SIGNATURE_CAST[0];

async function insertCast(db: NonNullable<Awaited<ReturnType<typeof import('./db').getDb>>>, userId: number, cast: CastMember) {
  const existing = await db.select({ id: characters.id }).from(characters).where(eq(characters.name, cast.name)).limit(1);
  if (existing.length > 0) return;
  await db.execute(sql`
    INSERT IGNORE INTO characters
      (userId, name, role, storyImportance, screenTime, description,
       nationality, castingNotes, isAIActor, aiActorId, isNonHuman)
    VALUES
      (${userId}, ${cast.name}, ${cast.role}, ${cast.storyImportance}, ${cast.screenTime},
       ${cast.description}, ${cast.nationality}, ${cast.castingNotes},
       ${cast.isAiActor ? 1 : 0}, ${cast.aiActorId}, ${0})
  `);
}

export async function runSignatureCastSeed(userId: number) {
  const db = (await getDb())!;
  for (const cast of SIGNATURE_CAST) { await insertCast(db, userId, cast); }
}

export async function runDiverseCastSeed(userId: number) {
  const db = (await getDb())!;
  for (const cast of DIVERSE_CAST_EXPANSION) { await insertCast(db, userId, cast); }
}