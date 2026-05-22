/**
 * unlock-marketplace-admin.ts
 * 
 * Unlocks all marketplace wardrobe items and collections for the admin account.
 * This script creates wardrobe leases for all public items so they're available
 * in the admin's project without needing to purchase them.
 */

import { drizzle } from "drizzle-orm/mysql2";
import { eq, isNotNull } from "drizzle-orm";
import mysql from "mysql2/promise";
import {
  users,
  wardrobeItems,
  designerCollections,
  wardrobeLeases,
} from "../drizzle/schema";

async function main() {
  // Get database connection
  const connection = await mysql.createConnection(process.env.DATABASE_URL || "");
  const db = drizzle(connection);

  try {
    console.log("🔓 Unlocking all marketplace items for admin account...\n");

    // Find admin user
    const adminUsers = await db
      .select()
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);

    if (!adminUsers.length) {
      console.error("❌ No admin user found in database");
      process.exit(1);
    }

    const adminUser = adminUsers[0];
    console.log(`✅ Found admin user: ${adminUser.email} (ID: ${adminUser.id})\n`);

    // Get all public wardrobe items
    const publicItems = await db
      .select()
      .from(wardrobeItems)
      .where(eq(wardrobeItems.visibility, "public"));

    console.log(`📦 Found ${publicItems.length} public wardrobe items\n`);

    // Get all public collections
    const publicCollections = await db
      .select()
      .from(designerCollections)
      .where(eq(designerCollections.visibility, "public"));

    console.log(`📚 Found ${publicCollections.length} public collections\n`);

    // Create leases for all items (if not already leased)
    let itemsLeased = 0;
    for (const item of publicItems) {
      const existingLease = await db
        .select()
        .from(wardrobeLeases)
        .where(
          eq(wardrobeLeases.userId, adminUser.id) &&
          eq(wardrobeLeases.wardrobeItemId, item.id)
        )
        .limit(1);

      if (!existingLease.length) {
        await db.insert(wardrobeLeases).values({
          userId: adminUser.id,
          designerProfileId: item.designerProfileId || 0,
          wardrobeItemId: item.id,
          leaseType: "item",
          amountPaidAud: 0,
          designerAmountAud: 0,
          platformFeeAud: 0,
          status: "active",
        });
        itemsLeased++;
        console.log(`  ✓ Leased item: ${item.name}`);
      }
    }

    console.log(`\n✅ Leased ${itemsLeased} wardrobe items\n`);

    // Create leases for all collections (if not already leased)
    let collectionsLeased = 0;
    for (const collection of publicCollections) {
      const existingLease = await db
        .select()
        .from(wardrobeLeases)
        .where(
          eq(wardrobeLeases.userId, adminUser.id) &&
          eq(wardrobeLeases.collectionId, collection.id)
        )
        .limit(1);

      if (!existingLease.length) {
        await db.insert(wardrobeLeases).values({
          userId: adminUser.id,
          designerProfileId: collection.designerProfileId || 0,
          collectionId: collection.id,
          leaseType: "collection",
          amountPaidAud: 0,
          designerAmountAud: 0,
          platformFeeAud: 0,
          status: "active",
        });
        collectionsLeased++;
        console.log(`  ✓ Leased collection: ${collection.name}`);
      }
    }

    console.log(`\n✅ Leased ${collectionsLeased} collections\n`);

    // Verify leases
    const totalLeases = await db
      .select()
      .from(wardrobeLeases)
      .where(eq(wardrobeLeases.userId, adminUser.id));

    console.log(`\n🎉 SUCCESS! Admin account now has access to ${totalLeases.length} marketplace items/collections`);
    console.log(`   - Items leased: ${itemsLeased}`);
    console.log(`   - Collections leased: ${collectionsLeased}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
