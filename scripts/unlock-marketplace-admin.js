/**
 * unlock-marketplace-admin.js
 * 
 * Unlocks all marketplace wardrobe items and collections for the admin account.
 */

const mysql = require("mysql2/promise");

async function main() {
  let connection;
  try {
    console.log("🔓 Unlocking all marketplace items for admin account...\n");

    // Get database connection
    connection = await mysql.createConnection(process.env.DATABASE_URL || "");

    // Find admin user
    const [adminUsers] = await connection.execute(
      "SELECT id, email FROM users WHERE role = 'admin' LIMIT 1"
    );

    if (!adminUsers.length) {
      console.error("❌ No admin user found in database");
      process.exit(1);
    }

    const adminUser = adminUsers[0];
    console.log(`✅ Found admin user: ${adminUser.email} (ID: ${adminUser.id})\n`);

    // Get all public wardrobe items
    const [publicItems] = await connection.execute(
      "SELECT id, name, designerProfileId FROM wardrobeItems WHERE visibility = 'public'"
    );

    console.log(`📦 Found ${publicItems.length} public wardrobe items\n`);

    // Get all public collections
    const [publicCollections] = await connection.execute(
      "SELECT id, name, designerProfileId FROM designerCollections WHERE visibility = 'public'"
    );

    console.log(`📚 Found ${publicCollections.length} public collections\n`);

    // Create leases for all items (if not already leased)
    let itemsLeased = 0;
    for (const item of publicItems) {
      const [existingLease] = await connection.execute(
        "SELECT id FROM wardrobeLeases WHERE userId = ? AND wardrobeItemId = ?",
        [adminUser.id, item.id]
      );

      if (!existingLease.length) {
        await connection.execute(
          `INSERT INTO wardrobeLeases 
           (userId, designerProfileId, wardrobeItemId, leaseType, amountPaidAud, designerAmountAud, platformFeeAud, status, createdAt, updatedAt)
           VALUES (?, ?, ?, 'item', 0, 0, 0, 'active', NOW(), NOW())`,
          [adminUser.id, item.designerProfileId || 0, item.id]
        );
        itemsLeased++;
        console.log(`  ✓ Leased item: ${item.name}`);
      }
    }

    console.log(`\n✅ Leased ${itemsLeased} wardrobe items\n`);

    // Create leases for all collections (if not already leased)
    let collectionsLeased = 0;
    for (const collection of publicCollections) {
      const [existingLease] = await connection.execute(
        "SELECT id FROM wardrobeLeases WHERE userId = ? AND collectionId = ?",
        [adminUser.id, collection.id]
      );

      if (!existingLease.length) {
        await connection.execute(
          `INSERT INTO wardrobeLeases 
           (userId, designerProfileId, collectionId, leaseType, amountPaidAud, designerAmountAud, platformFeeAud, status, createdAt, updatedAt)
           VALUES (?, ?, ?, 'collection', 0, 0, 0, 'active', NOW(), NOW())`,
          [adminUser.id, collection.designerProfileId || 0, collection.id]
        );
        collectionsLeased++;
        console.log(`  ✓ Leased collection: ${collection.name}`);
      }
    }

    console.log(`\n✅ Leased ${collectionsLeased} collections\n`);

    // Verify leases
    const [totalLeases] = await connection.execute(
      "SELECT COUNT(*) as count FROM wardrobeLeases WHERE userId = ?",
      [adminUser.id]
    );

    const leaseCount = totalLeases[0].count;
    console.log(`\n🎉 SUCCESS! Admin account now has access to ${leaseCount} marketplace items/collections`);
    console.log(`   - Items leased: ${itemsLeased}`);
    console.log(`   - Collections leased: ${collectionsLeased}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
