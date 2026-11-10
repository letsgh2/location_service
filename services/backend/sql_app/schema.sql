-- =========================
-- SQLite Schema for Real Estate Database
-- =========================

-- =========================
-- TABLE: location
-- =========================
CREATE TABLE IF NOT EXISTS location (
    location_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    city            TEXT,
    locality        TEXT,
    city_district   TEXT,
    street          TEXT,
    full_address    TEXT,
    latitude        REAL,
    longitude       REAL,
    description     TEXT
);

-- =========================
-- TABLE: building
-- =========================
CREATE TABLE IF NOT EXISTS building (
    building_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    year_built      INTEGER,
    building_type   TEXT,
    floor           INTEGER
);

-- =========================
-- TABLE: owner
-- =========================
CREATE TABLE IF NOT EXISTS owner (
    owner_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_type      TEXT,
    contact_name    TEXT,
    contact_phone   TEXT,
    contact_email   TEXT
);

-- =========================
-- TABLE: features
-- =========================
CREATE TABLE IF NOT EXISTS features (
    features_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    has_basement    INTEGER,  -- SQLite uses INTEGER for BOOLEAN (0 or 1)
    has_parking     INTEGER,
    kitchen_type    TEXT,
    window_type     TEXT,
    ownership_type  TEXT,
    equipment       TEXT
);

-- =========================
-- TABLE: listing
-- =========================
CREATE TABLE IF NOT EXISTS listing (
    listing_id             INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id            INTEGER NOT NULL,
    building_id            INTEGER NOT NULL,
    owner_id               INTEGER NOT NULL,
    features_id            INTEGER NOT NULL,
    rooms                  INTEGER,
    area                   REAL,
    price_total_zl         REAL,
    price_sqm_zl           REAL,
    price_per_sqm_detailed REAL,
    date_posted            TEXT,  -- SQLite uses TEXT for DATE
    photo_count            INTEGER,
    url                    TEXT,
    image_url              TEXT,
    description_text       TEXT,

    CONSTRAINT fk_location
        FOREIGN KEY (location_id)
        REFERENCES location(location_id),

    CONSTRAINT fk_building
        FOREIGN KEY (building_id)
        REFERENCES building(building_id),

    CONSTRAINT fk_owner
        FOREIGN KEY (owner_id)
        REFERENCES owner(owner_id),

    CONSTRAINT fk_features
        FOREIGN KEY (features_id)
        REFERENCES features(features_id)
);

