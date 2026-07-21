import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { getDb } from "./db";

export type PortalAccountType = "studio" | "designer";

export interface ShippingAddressInput {
  label?: string;
  recipientName: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  suburb?: string;
  city: string;
  stateRegion: string;
  postalCode: string;
  countryCode: string;
  isDefault?: boolean;
}

let schemaReady: Promise<void> | undefined;

function rowsFrom(result: any): any[] {
  if (Array.isArray(result?.[0])) return result[0];
  if (Array.isArray(result)) return result;
  return [];
}

export async function ensureDesignerCommerceSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const dbConn = await getDb();
      if (!dbConn) throw new Error("Database is unavailable.");

      const alters = [
        "ALTER TABLE `users` ADD COLUMN `accountType` VARCHAR(32) NOT NULL DEFAULT 'studio'",
        "ALTER TABLE `designerProfiles` ADD COLUMN `username` VARCHAR(64) NULL",
        "ALTER TABLE `designerProfiles` ADD COLUMN `abn` VARCHAR(32) NULL",
        "ALTER TABLE `designerProfiles` ADD COLUMN `businessAddressLine1` VARCHAR(255) NULL",
        "ALTER TABLE `designerProfiles` ADD COLUMN `businessAddressLine2` VARCHAR(255) NULL",
        "ALTER TABLE `designerProfiles` ADD COLUMN `businessCity` VARCHAR(128) NULL",
        "ALTER TABLE `designerProfiles` ADD COLUMN `businessState` VARCHAR(128) NULL",
        "ALTER TABLE `designerProfiles` ADD COLUMN `businessPostcode` VARCHAR(32) NULL",
        "ALTER TABLE `designerProfiles` ADD COLUMN `businessCountry` VARCHAR(64) NULL",
        "ALTER TABLE `wardrobeItems` ADD COLUMN `physicalRetailPriceAud` INT NULL",
        "ALTER TABLE `wardrobeItems` ADD COLUMN `virtualOnly` TINYINT(1) NOT NULL DEFAULT 1",
        "ALTER TABLE `wardrobeItems` ADD COLUMN `virtualPricePercent` INT NOT NULL DEFAULT 3",
      ];

      for (const statement of alters) {
        try {
          await dbConn.execute(sql.raw(statement));
        } catch (error: any) {
          if (
            error?.code === "ER_DUP_FIELDNAME" ||
            error?.errno === 1060 ||
            String(error?.message || "").includes("Duplicate column")
          ) {
            continue;
          }
          throw error;
        }
      }

      await dbConn.execute(sql`
        CREATE TABLE IF NOT EXISTS userShippingAddresses (
          id INT NOT NULL AUTO_INCREMENT,
          userId INT NOT NULL,
          label VARCHAR(64) NOT NULL DEFAULT 'Delivery address',
          recipientName VARCHAR(255) NOT NULL,
          phone VARCHAR(64) NULL,
          addressLine1 VARCHAR(255) NOT NULL,
          addressLine2 VARCHAR(255) NULL,
          suburb VARCHAR(128) NULL,
          city VARCHAR(128) NOT NULL,
          stateRegion VARCHAR(128) NOT NULL,
          postalCode VARCHAR(32) NOT NULL,
          countryCode VARCHAR(64) NOT NULL,
          isDefault TINYINT(1) NOT NULL DEFAULT 0,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          INDEX idx_shipping_user (userId),
          INDEX idx_shipping_user_default (userId, isDefault)
        )
      `);

      await dbConn.execute(sql`
        CREATE TABLE IF NOT EXISTS wardrobePhysicalOrders (
          id INT NOT NULL AUTO_INCREMENT,
          userId INT NOT NULL,
          designerProfileId INT NOT NULL,
          wardrobeItemId INT NOT NULL,
          shippingAddressId INT NULL,
          shippingSnapshot JSON NOT NULL,
          stripeCheckoutSessionId VARCHAR(255) NOT NULL,
          stripePaymentIntentId VARCHAR(255) NULL,
          amountPaidAud INT NOT NULL,
          designerAmountAud INT NOT NULL,
          platformFeeAud INT NOT NULL,
          status VARCHAR(32) NOT NULL DEFAULT 'paid',
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_physical_order_session (stripeCheckoutSessionId),
          INDEX idx_physical_order_user (userId),
          INDEX idx_physical_order_designer (designerProfileId),
          INDEX idx_physical_order_item (wardrobeItemId)
        )
      `);

      try {
        await dbConn.execute(sql.raw(
          "ALTER TABLE `designerProfiles` ADD UNIQUE INDEX `uq_designer_username` (`username`)"
        ));
      } catch (error: any) {
        if (
          error?.code !== "ER_DUP_KEYNAME" &&
          error?.errno !== 1061 &&
          !String(error?.message || "").includes("Duplicate key name")
        ) {
          throw error;
        }
      }

      await dbConn.execute(sql`
        UPDATE users u
        INNER JOIN designerProfiles d ON d.userId = u.id
        SET u.accountType = 'designer'
        WHERE u.role <> 'admin' AND COALESCE(u.accountType, 'studio') <> 'designer'
      `);
    })().catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  }
  return schemaReady;
}

export function isLamaloBrandName(value: unknown): boolean {
  return ["lamalo fashion", "lamalo fashions", "lamalo"]
    .includes(String(value || "").trim().toLowerCase());
}

export function calculateVirtualPriceCents(physicalRetailPriceCents: number): number {
  if (!Number.isInteger(physicalRetailPriceCents) || physicalRetailPriceCents <= 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Retail price must be a positive whole-cent amount." });
  }
  const calculated = Math.round(physicalRetailPriceCents * 0.03);
  if (calculated < 50) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Retail price must be at least A$16.67 so the 3% virtual item price meets Stripe's minimum charge.",
    });
  }
  return calculated;
}

export async function getAccountTypeByUserId(userId: number): Promise<PortalAccountType> {
  await ensureDesignerCommerceSchema();
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database is unavailable.");
  const result = await dbConn.execute(sql`
    SELECT accountType FROM users WHERE id = ${userId} LIMIT 1
  `);
  const row = rowsFrom(result)[0];
  return row?.accountType === "designer" ? "designer" : "studio";
}

export async function getAccountTypeByEmail(email: string): Promise<PortalAccountType | null> {
  await ensureDesignerCommerceSchema();
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database is unavailable.");
  const result = await dbConn.execute(sql`
    SELECT accountType FROM users WHERE LOWER(email) = ${email.trim().toLowerCase()} LIMIT 1
  `);
  const row = rowsFrom(result)[0];
  if (!row) return null;
  return row.accountType === "designer" ? "designer" : "studio";
}

export async function assertDesignerAccount(userId: number): Promise<void> {
  if ((await getAccountTypeByUserId(userId)) !== "designer") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This account does not have access to the Designer Portal.",
    });
  }
}

export async function assertStudioAccount(userId: number): Promise<void> {
  if ((await getAccountTypeByUserId(userId)) !== "studio") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Designer accounts can only access the Designer Portal.",
    });
  }
}

export function isDesignerOnlyRpcPath(path: string): boolean {
  return (
    path.startsWith("wardrobeMarket.designer.") ||
    path.startsWith("designerWardrobe.") ||
    path.startsWith("designerCommerce.profile.") ||
    path.startsWith("designerCommerce.listings.") ||
    path.startsWith("designerCommerce.orders.") ||
    path.startsWith("designerCommerce.upload")
  );
}

export function isAllowedDesignerRpcPath(path: string): boolean {
  return (
    path.startsWith("auth.") ||
    path.startsWith("system.") ||
    path.startsWith("designerCommerce.") ||
    path.startsWith("wardrobeMarket.designer.") ||
    path.startsWith("wardrobeMarket.marketplace.") ||
    path.startsWith("wardrobeMarket.catalog.") ||
    path.startsWith("designerWardrobe.")
  );
}

export async function listShippingAddresses(userId: number): Promise<any[]> {
  await ensureDesignerCommerceSchema();
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database is unavailable.");
  const result = await dbConn.execute(sql`
    SELECT id, userId, label, recipientName, phone, addressLine1, addressLine2,
           suburb, city, stateRegion, postalCode, countryCode, isDefault,
           createdAt, updatedAt
    FROM userShippingAddresses
    WHERE userId = ${userId}
    ORDER BY isDefault DESC, updatedAt DESC, id DESC
  `);
  return rowsFrom(result).map((row) => ({ ...row, isDefault: Boolean(row.isDefault) }));
}

export async function getShippingAddress(userId: number, addressId: number): Promise<any | null> {
  await ensureDesignerCommerceSchema();
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database is unavailable.");
  const result = await dbConn.execute(sql`
    SELECT id, userId, label, recipientName, phone, addressLine1, addressLine2,
           suburb, city, stateRegion, postalCode, countryCode, isDefault,
           createdAt, updatedAt
    FROM userShippingAddresses
    WHERE id = ${addressId} AND userId = ${userId}
    LIMIT 1
  `);
  const row = rowsFrom(result)[0];
  return row ? { ...row, isDefault: Boolean(row.isDefault) } : null;
}

function validateAddress(input: ShippingAddressInput): void {
  const required = [
    input.recipientName,
    input.addressLine1,
    input.city,
    input.stateRegion,
    input.postalCode,
    input.countryCode,
  ];
  if (required.some((value) => !String(value || "").trim())) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Recipient, street address, city, state/region, postcode and country are required.",
    });
  }
}

export async function saveShippingAddress(
  userId: number,
  input: ShippingAddressInput,
  addressId?: number,
): Promise<any> {
  validateAddress(input);
  await ensureDesignerCommerceSchema();
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database is unavailable.");

  const existing = addressId ? await getShippingAddress(userId, addressId) : null;
  if (addressId && !existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Delivery address not found." });
  }

  const existingAddresses = await listShippingAddresses(userId);
  const makeDefault = input.isDefault === true || (!addressId && existingAddresses.length === 0);
  if (makeDefault) {
    await dbConn.execute(sql`
      UPDATE userShippingAddresses SET isDefault = 0 WHERE userId = ${userId}
    `);
  }

  if (addressId) {
    await dbConn.execute(sql`
      UPDATE userShippingAddresses
      SET label = ${String(input.label || "Delivery address").trim().slice(0, 64)},
          recipientName = ${input.recipientName.trim()},
          phone = ${input.phone?.trim() || null},
          addressLine1 = ${input.addressLine1.trim()},
          addressLine2 = ${input.addressLine2?.trim() || null},
          suburb = ${input.suburb?.trim() || null},
          city = ${input.city.trim()},
          stateRegion = ${input.stateRegion.trim()},
          postalCode = ${input.postalCode.trim()},
          countryCode = ${input.countryCode.trim()},
          isDefault = ${makeDefault ? 1 : 0}
      WHERE id = ${addressId} AND userId = ${userId}
    `);
    return getShippingAddress(userId, addressId);
  }

  const inserted: any = await dbConn.execute(sql`
    INSERT INTO userShippingAddresses
      (userId, label, recipientName, phone, addressLine1, addressLine2, suburb,
       city, stateRegion, postalCode, countryCode, isDefault)
    VALUES
      (${userId}, ${String(input.label || "Delivery address").trim().slice(0, 64)},
       ${input.recipientName.trim()}, ${input.phone?.trim() || null},
       ${input.addressLine1.trim()}, ${input.addressLine2?.trim() || null},
       ${input.suburb?.trim() || null}, ${input.city.trim()},
       ${input.stateRegion.trim()}, ${input.postalCode.trim()},
       ${input.countryCode.trim()}, ${makeDefault ? 1 : 0})
  `);
  const insertId = Number(inserted?.[0]?.insertId ?? inserted?.insertId);
  return getShippingAddress(userId, insertId);
}

export async function deleteShippingAddress(userId: number, addressId: number): Promise<void> {
  await ensureDesignerCommerceSchema();
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database is unavailable.");
  const existing = await getShippingAddress(userId, addressId);
  if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Delivery address not found." });

  await dbConn.execute(sql`
    DELETE FROM userShippingAddresses WHERE id = ${addressId} AND userId = ${userId}
  `);

  if (existing.isDefault) {
    await dbConn.execute(sql`
      UPDATE userShippingAddresses
      SET isDefault = 1
      WHERE userId = ${userId}
      ORDER BY updatedAt DESC, id DESC
      LIMIT 1
    `);
  }
}

export async function createPhysicalOrder(params: {
  userId: number;
  designerProfileId: number;
  wardrobeItemId: number;
  shippingAddressId: number;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId?: string | null;
  amountPaidAud: number;
  designerAmountAud: number;
  platformFeeAud: number;
}): Promise<any> {
  await ensureDesignerCommerceSchema();
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database is unavailable.");
  const address = await getShippingAddress(params.userId, params.shippingAddressId);
  if (!address) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "The selected delivery address no longer exists." });
  }

  await dbConn.execute(sql`
    INSERT INTO wardrobePhysicalOrders
      (userId, designerProfileId, wardrobeItemId, shippingAddressId, shippingSnapshot,
       stripeCheckoutSessionId, stripePaymentIntentId, amountPaidAud,
       designerAmountAud, platformFeeAud, status)
    VALUES
      (${params.userId}, ${params.designerProfileId}, ${params.wardrobeItemId},
       ${params.shippingAddressId}, ${JSON.stringify(address)},
       ${params.stripeCheckoutSessionId}, ${params.stripePaymentIntentId || null},
       ${params.amountPaidAud}, ${params.designerAmountAud},
       ${params.platformFeeAud}, 'paid')
    ON DUPLICATE KEY UPDATE
      stripePaymentIntentId = VALUES(stripePaymentIntentId),
      status = 'paid'
  `);

  const result = await dbConn.execute(sql`
    SELECT * FROM wardrobePhysicalOrders
    WHERE stripeCheckoutSessionId = ${params.stripeCheckoutSessionId}
    LIMIT 1
  `);
  return rowsFrom(result)[0] ?? null;
}

export async function listPhysicalOrdersForDesigner(userId: number): Promise<any[]> {
  await assertDesignerAccount(userId);
  await ensureDesignerCommerceSchema();
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database is unavailable.");
  const result = await dbConn.execute(sql`
    SELECT o.*, w.name AS itemName, w.primaryImageUrl, d.brandName
    FROM wardrobePhysicalOrders o
    INNER JOIN designerProfiles d ON d.id = o.designerProfileId
    INNER JOIN wardrobeItems w ON w.id = o.wardrobeItemId
    WHERE d.userId = ${userId}
    ORDER BY o.createdAt DESC
  `);
  return rowsFrom(result).map((row) => ({
    ...row,
    shippingSnapshot:
      typeof row.shippingSnapshot === "string"
        ? JSON.parse(row.shippingSnapshot)
        : row.shippingSnapshot,
  }));
}
