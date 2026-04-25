-- v6.77 — Designer Wardrobe section. Adds four tables that let fashion
-- designers, costume designers, stylists, brands, wardrobe departments,
-- and production designers upload wardrobe / costume / shopfront assets,
-- and let directors browse those assets and attach them to characters
-- and scenes for use as prompt context during generation.
--
-- The tables are read-only by the generation engine — buildScenePrompt
-- consumes a precomputed wardrobeContext block. The engine itself is not
-- altered. New tables complement (do NOT replace) the existing free-text
-- characters.wardrobe and scenes.wardrobe columns.

CREATE TABLE IF NOT EXISTS designerProfiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  brandName VARCHAR(255) NOT NULL,
  displayName VARCHAR(255) NULL,
  profileType VARCHAR(64) NOT NULL DEFAULT 'designer',
  bio TEXT NULL,
  website VARCHAR(512) NULL,
  instagram VARCHAR(255) NULL,
  contactEmail VARCHAR(320) NULL,
  logoUrl TEXT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  visibility VARCHAR(32) NOT NULL DEFAULT 'public',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_designer_profiles_user (userId),
  INDEX idx_designer_profiles_visibility (visibility)
);

CREATE TABLE IF NOT EXISTS designerCollections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  designerProfileId INT NOT NULL,
  userId INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  collectionType VARCHAR(64) NOT NULL DEFAULT 'wardrobe',
  season VARCHAR(128) NULL,
  year INT NULL,
  styleTags JSON NULL,
  coverImageUrl TEXT NULL,
  visibility VARCHAR(32) NOT NULL DEFAULT 'public',
  licenseType VARCHAR(64) NOT NULL DEFAULT 'reference_only',
  licenseNotes TEXT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_designer_collections_profile (designerProfileId),
  INDEX idx_designer_collections_user (userId),
  INDEX idx_designer_collections_visibility (visibility)
);

CREATE TABLE IF NOT EXISTS wardrobeItems (
  id INT AUTO_INCREMENT PRIMARY KEY,
  collectionId INT NULL,
  userId INT NOT NULL,
  designerProfileId INT NULL,
  projectId INT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  category VARCHAR(64) NULL,
  subcategory VARCHAR(128) NULL,
  wardrobeType VARCHAR(64) NOT NULL DEFAULT 'wardrobe',
  genderFit VARCHAR(64) NULL,
  sizeRange VARCHAR(128) NULL,
  era VARCHAR(128) NULL,
  colors JSON NULL,
  materials JSON NULL,
  styleTags JSON NULL,
  imageUrls JSON NULL,
  primaryImageUrl TEXT NULL,
  referencePrompt TEXT NULL,
  brandPlacementAllowed BOOLEAN NOT NULL DEFAULT FALSE,
  shopfrontPlacementAllowed BOOLEAN NOT NULL DEFAULT TRUE,
  characterWardrobeAllowed BOOLEAN NOT NULL DEFAULT TRUE,
  costumeUseAllowed BOOLEAN NOT NULL DEFAULT TRUE,
  commercialUseAllowed BOOLEAN NOT NULL DEFAULT FALSE,
  licenseType VARCHAR(64) NOT NULL DEFAULT 'reference_only',
  licenseNotes TEXT NULL,
  visibility VARCHAR(32) NOT NULL DEFAULT 'public',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_wardrobe_items_collection (collectionId),
  INDEX idx_wardrobe_items_user (userId),
  INDEX idx_wardrobe_items_designer (designerProfileId),
  INDEX idx_wardrobe_items_project (projectId),
  INDEX idx_wardrobe_items_visibility (visibility),
  INDEX idx_wardrobe_items_type (wardrobeType)
);

CREATE TABLE IF NOT EXISTS wardrobeAssignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  projectId INT NOT NULL,
  wardrobeItemId INT NOT NULL,
  assignmentType VARCHAR(64) NOT NULL,
  characterId INT NULL,
  sceneId INT NULL,
  usageMode VARCHAR(64) NOT NULL DEFAULT 'reference',
  placementNotes TEXT NULL,
  promptWeight INT NOT NULL DEFAULT 50,
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_wardrobe_assign_project (projectId),
  INDEX idx_wardrobe_assign_user (userId),
  INDEX idx_wardrobe_assign_item (wardrobeItemId),
  INDEX idx_wardrobe_assign_character (characterId),
  INDEX idx_wardrobe_assign_scene (sceneId)
);
