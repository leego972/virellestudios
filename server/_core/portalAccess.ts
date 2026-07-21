import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { getDb } from "../db";

export type PortalKind = "studio" | "designer" | "admin";

export interface DeliveryAddressInput {
  label?: string | null;
  recipientName: string;
  phone?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  stateRegion: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

let commerceSchemaReady: Promise<void> | undefined;

async function execute(statement: any) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database is unavailable.");
  return dbConn.execute(statement);
}

async function addColumn(table: string, column: string, definition: string): Promise<void> {
  try {
    await execute(sql.raw(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`));
  } catch (error: any) {
    if (error?.code === "ER_DUP_FIELDNAME" || error?.errno === 1060 || String(error?.message).includes("Duplicate column")) return;
    throw error;
  }
}

async function addIndex(statement: string): Promise<void> {
  try {
    await execute(sql.raw(statement));
  } catch (error: any) {
    const message = String(error?.message ?? "");
    if (error?.code === "ER_DUP_KEYNAME" || error?.errno === 1061 || message.includes("Duplicate key name") || message.includes("already exists")) return;
    throw error;
  }
}

export async function ensurePortalCommerceSchema(): Promise<void> {
  if (!commerceSchemaReady) {
    commerceSchemaReady = (async () => {
      await execute(sql`
        CREATE TABLE IF NOT EXISTS userPortalAccounts (
          userId INT NOT NULL PRIMARY KEY,
          portal VARCHAR(16) NOT NULL DEFAULT 'studio',
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_portal (portal)
        )
      `);

      await execute(sql`
        CREATE TABLE IF NOT EXISTS savedDeliveryAddresses (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          userId INT NOT NULL,
          label VARCHAR(80) NULL,
          recipientName VARCHAR(255) NOT NULL,
          phone VARCHAR(64) NULL,
          addressLine1 VARCHAR(255) NOT NULL,
          addressLine2 VARCHAR(255) NULL,
          city VARCHAR(128) NOT NULL,
          stateRegion VARCHAR(128) NOT NULL,
          postalCode VARCHAR(32) NOT NULL,
          country VARCHAR(128) NOT NULL,
          isDefault TINYINT(1) NOT NULL DEFAULT 0,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_delivery_address_user (userId),
          INDEX idx_delivery_address_default (userId, isDefault)
        )
      `);

      await execute(sql`
        CREATE TABLE IF NOT EXISTS physicalItemOrders (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          leaseId INT NOT NULL,
          userId INT NOT NULL,
          designerProfileId INT NOT NULL,
          wardrobeItemId INT NOT NULL,
          shippingAddressId INT NULL,
          shippingAddressSnapshot JSON NOT NULL,
          stripeSessionId VARCHAR(255) NOT NULL,
          amountPaidAud INT NOT NULL,
          status VARCHAR(32) NOT NULL DEFAULT 'paid',
          trackingNumber VARCHAR(255) NULL,
          carrier VARCHAR(128) NULL,
          shippedAt TIMESTAMP NULL,
          deliveredAt TIMESTAMP NULL,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_physical_order_session (stripeSessionId),
          INDEX idx_physical_order_buyer (userId),
          INDEX idx_physical_order_designer (designerProfileId),
          INDEX idx_physical_order_lease (leaseId)
        )
      `);

      await addColumn("designerProfiles", "username", "VARCHAR(80) NULL");
      await addColumn("designerProfiles", "abn", "VARCHAR(32) NULL");
      await addColumn("designerProfiles", "businessAddressLine1", "VARCHAR(255) NULL");
      await addColumn("designerProfiles", "businessAddressLine2", "VARCHAR(255) NULL");
      await addColumn("designerProfiles", "businessCity", "VARCHAR(128) NULL");
      await addColumn("designerProfiles", "businessStateRegion", "VARCHAR(128) NULL");
      await addColumn("designerProfiles", "businessPostalCode", "VARCHAR(32) NULL");
      await addColumn("designerProfiles", "businessCountry", "VARCHAR(128) NULL");
      await addColumn("designerProfiles", "registrationCompleted", "TINYINT(1) NOT NULL DEFAULT 0");
      await addIndex("ALTER TABLE designerProfiles ADD UNIQUE INDEX uq_designer_username (username)");

      await addColumn("wardrobeItems", "physicalRetailPriceAud", "INT NULL");
      await addColumn("wardrobeItems", "isVirtualOnly", "TINYINT(1) NOT NULL DEFAULT 1");
      await addColumn("wardrobeItems", "virtualPriceRule", "VARCHAR(32) NULL");
      await addColumn("wardrobeItems", "virtualBadgeText", "VARCHAR(64) NULL DEFAULT 'Virtual item'");

      await addColumn("wardrobeLeases", "purchaseMode", "VARCHAR(16) NOT NULL DEFAULT 'virtual'");
      await addColumn("wardrobeLeases", "shippingAddressId", "INT NULL");
      await addColumn("wardrobeLeases", "shippingAddressSnapshot", "JSON NULL");
    })().catch((error) => {
      commerceSchemaReady = undefined;
      throw error;
    });
  }
  return commerceSchemaReady;
}

function rowsFrom(result: any): any[] {
  const rows = Array.isArray(result?.[0]) ? result[0] : result;
  return Array.isArray(rows) ? rows : [];
}

function firstRow(result: any): any | undefined {
  return rowsFrom(result)[0];
}

export async function getUserPortal(userId: number, role?: string | null): Promise<PortalKind> {
  if (role === "admin") return "admin";
  await ensurePortalCommerceSchema();
  const existing = firstRow(await execute(sql`SELECT portal FROM userPortalAccounts WHERE userId = ${userId} LIMIT 1`));
  return existing?.portal === "designer" ? "designer" : "studio";
}

export async function setUserPortal(userId: number, portal: Exclude<PortalKind, "admin">): Promise<void> {
  await ensurePortalCommerceSchema();
  await execute(sql`
    INSERT INTO userPortalAccounts (userId, portal)
    VALUES (${userId}, ${portal})
    ON DUPLICATE KEY UPDATE portal = VALUES(portal), updatedAt = CURRENT_TIMESTAMP
  `);
}

const DESIGNER_WARDROBE_MANAGEMENT_PATHS = new Set([
  "designerWardrobe.getMyProfile",
  "designerWardrobe.listWardrobeItems",
  "designerWardrobe.listCollections",
  "designerWardrobe.upsertProfile",
  "designerWardrobe.createCollection",
  "designerWardrobe.updateCollection",
  "designerWardrobe.deleteCollection",
  "designerWardrobe.createWardrobeItem",
  "designerWardrobe.updateWardrobeItem",
  "designerWardrobe.deleteWardrobeItem",
]);

export function isDesignerAllowedProtectedPath(path: string): boolean {
  if (DESIGNER_WARDROBE_MANAGEMENT_PATHS.has(path)) return true;
  return [
    "auth.",
    "system.",
    "wardrobeMarket.designer.",
    "wardrobeMarket.collection.",
    "wardrobeMarket.item.",
    "wardrobeMarket.marketplace.",
    "wardrobeMarket.catalog.",
    "wardrobeMarket.commerce.portal.",
    "wardrobeMarket.commerce.designer.",
    "wardrobeMarket.commerce.orders.",
    "notification.",
    "notifications.",
  ].some((prefix) => path.startsWith(prefix));
}

export function isStudioForbiddenDesignerPath(path: string): boolean {
  if (DESIGNER_WARDROBE_MANAGEMENT_PATHS.has(path) && ![
    "designerWardrobe.getMyProfile",
    "designerWardrobe.listWardrobeItems",
    "designerWardrobe.listCollections",
  ].includes(path)) return true;

  return [
    "wardrobeMarket.designer.",
    "wardrobeMarket.collection.",
    "wardrobeMarket.item.",
    "wardrobeMarket.commerce.designer.",
    "wardrobeMarket.commerce.orders.",
  ].some((prefix) => path.startsWith(prefix));
}

export async function saveDeliveryAddress(userId: number, input: DeliveryAddressInput, addressId?: number): Promise<number> {
  await ensurePortalCommerceSchema();
  const label = input.label?.trim() || "Delivery address";
  if (input.isDefault !== false) {
    await execute(sql`UPDATE savedDeliveryAddresses SET isDefault = 0 WHERE userId = ${userId}`);
  }

  if (addressId) {
    const result = await execute(sql`
      UPDATE savedDeliveryAddresses SET
        label = ${label}, recipientName = ${input.recipientName.trim()}, phone = ${input.phone?.trim() || null},
        addressLine1 = ${input.addressLine1.trim()}, addressLine2 = ${input.addressLine2?.trim() || null},
        city = ${input.city.trim()}, stateRegion = ${input.stateRegion.trim()}, postalCode = ${input.postalCode.trim()},
        country = ${input.country.trim()}, isDefault = ${input.isDefault === false ? 0 : 1}
      WHERE id = ${addressId} AND userId = ${userId}
    `);
    const meta: any = Array.isArray(result) ? result[0] : result;
    if (!meta || Number(meta.affectedRows ?? 0) < 1) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Delivery address not found." });
    }
    return addressId;
  }

  const result = await execute(sql`
    INSERT INTO savedDeliveryAddresses
      (userId, label, recipientName, phone, addressLine1, addressLine2, city, stateRegion, postalCode, country, isDefault)
    VALUES
      (${userId}, ${label}, ${input.recipientName.trim()}, ${input.phone?.trim() || null},
       ${input.addressLine1.trim()}, ${input.addressLine2?.trim() || null}, ${input.city.trim()},
       ${input.stateRegion.trim()}, ${input.postalCode.trim()}, ${input.country.trim()}, ${input.isDefault === false ? 0 : 1})
  `);
  const meta: any = Array.isArray(result) ? result[0] : result;
  return Number(meta?.insertId);
}

export async function listDeliveryAddresses(userId: number): Promise<any[]> {
  await ensurePortalCommerceSchema();
  return rowsFrom(await execute(sql`
    SELECT * FROM savedDeliveryAddresses
    WHERE userId = ${userId}
    ORDER BY isDefault DESC, updatedAt DESC, id DESC
  `));
}

export async function getSavedAddressById(userId: number, addressId: number): Promise<any> {
  await ensurePortalCommerceSchema();
  const address = firstRow(await execute(sql`
    SELECT * FROM savedDeliveryAddresses WHERE id = ${addressId} AND userId = ${userId} LIMIT 1
  `));
  if (!address) throw new TRPCError({ code: "NOT_FOUND", message: "Delivery address not found." });
  return address;
}

export async function deleteDeliveryAddress(userId: number, addressId: number): Promise<void> {
  await ensurePortalCommerceSchema();
  const result = await execute(sql`DELETE FROM savedDeliveryAddresses WHERE id = ${addressId} AND userId = ${userId}`);
  const meta: any = Array.isArray(result) ? result[0] : result;
  if (!meta || Number(meta.affectedRows ?? 0) < 1) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Delivery address not found." });
  }
  const remaining = await listDeliveryAddresses(userId);
  if (remaining.length && !remaining.some((row) => Boolean(row.isDefault))) {
    await execute(sql`UPDATE savedDeliveryAddresses SET isDefault = 1 WHERE id = ${remaining[0].id} AND userId = ${userId}`);
  }
}

export async function createPhysicalOrderFromSession(session: any, leaseId: number, userId: number): Promise<void> {
  await ensurePortalCommerceSchema();
  if (session?.metadata?.purchaseMode !== "physical") return;
  const addressId = Number(session.metadata.shippingAddressId);
  const wardrobeItemId = Number(session.metadata.itemOrCollectionId);
  const designerProfileId = Number(session.metadata.designerProfileId);
  if (!Number.isInteger(addressId) || !Number.isInteger(wardrobeItemId) || !Number.isInteger(designerProfileId)) {
    throw new Error("Physical wardrobe purchase metadata is incomplete.");
  }
  const address = await getSavedAddressById(userId, addressId);
  const amountPaidAud = Number(session.amount_total ?? 0);
  const snapshot = JSON.stringify({
    label: address.label,
    recipientName: address.recipientName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    city: address.city,
    stateRegion: address.stateRegion,
    postalCode: address.postalCode,
    country: address.country,
  });
  await execute(sql`
    INSERT IGNORE INTO physicalItemOrders
      (leaseId, userId, designerProfileId, wardrobeItemId, shippingAddressId, shippingAddressSnapshot, stripeSessionId, amountPaidAud, status)
    VALUES
      (${leaseId}, ${userId}, ${designerProfileId}, ${wardrobeItemId}, ${addressId}, CAST(${snapshot} AS JSON), ${session.id}, ${amountPaidAud}, 'paid')
  `);
  await execute(sql`
    UPDATE wardrobeLeases SET purchaseMode = 'physical', shippingAddressId = ${addressId}, shippingAddressSnapshot = CAST(${snapshot} AS JSON)
    WHERE id = ${leaseId} AND userId = ${userId}
  `);
}

export function isLamaloBrandName(name: unknown): boolean {
  const normalized = String(name ?? "").trim().toLowerCase();
  return normalized === "lamalo fashion" || normalized === "lamalo fashions" || normalized === "lamalo";
}
