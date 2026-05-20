-- 0037 — Vehicle / Vessel / Aircraft Locks (v6.37)
  -- Extends projectBackgrounds with a "backgroundType" field so directors can
  -- lock vehicles (cars, boats, aircraft) exactly like locations.
  -- A Ferrari in scene 1 stays a Ferrari in every subsequent scene.

  ALTER TABLE projectBackgrounds
    ADD COLUMN backgroundType   VARCHAR(32) NOT NULL DEFAULT 'location' AFTER name,
    ADD COLUMN vehicleMake      VARCHAR(128) NULL AFTER locationTags,
    ADD COLUMN vehicleModel     VARCHAR(128) NULL AFTER vehicleMake,
    ADD COLUMN vehicleYear      SMALLINT     NULL AFTER vehicleModel,
    ADD COLUMN vehicleColor     VARCHAR(128) NULL AFTER vehicleYear,
    ADD COLUMN vehicleInterior  TEXT         NULL AFTER vehicleColor,
    ADD COLUMN vehicleCondition VARCHAR(128) NULL AFTER vehicleInterior;
  -- backgroundType values: 'location' | 'vehicle' | 'vessel' | 'aircraft'
  -- Examples:
  --   location  → Jerry's Apartment, The Diner, Police Station
  --   vehicle   → 1987 Ferrari F40, Rosso Corsa red (keeps brand across scenes)
  --   vessel    → The Black Pearl, a weathered 60ft ketch
  --   aircraft  → Gulfstream G650 private jet, cream interior
  