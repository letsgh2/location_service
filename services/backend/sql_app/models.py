from sqlalchemy import Boolean, Column, Date, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "user"

    user_id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class Location(Base):
    __tablename__ = "location"

    location_id = Column(Integer, primary_key=True, index=True)
    city = Column(String(255))
    locality = Column(String(255))
    city_district = Column(String(255))
    street = Column(String(255))
    full_address = Column(String(500))
    latitude = Column(Float)
    longitude = Column(Float)

    # Relationship
    listings = relationship("Listing", back_populates="location")


class Building(Base):
    __tablename__ = "building"

    building_id = Column(Integer, primary_key=True, index=True)
    year_built = Column(Integer)
    building_type = Column(String(100))
    floor = Column(Integer)

    # Relationship
    listings = relationship("Listing", back_populates="building")


class Owner(Base):
    __tablename__ = "owner"

    owner_id = Column(Integer, primary_key=True, index=True)
    owner_type = Column(String(50))
    contact_name = Column(String(255))
    contact_phone = Column(String(50))
    contact_email = Column(String(255))

    # Relationship
    listings = relationship("Listing", back_populates="owner")


class Features(Base):
    __tablename__ = "features"

    features_id = Column(Integer, primary_key=True, index=True)
    has_basement = Column(Boolean)
    has_parking = Column(Boolean)
    kitchen_type = Column(String(100))
    window_type = Column(String(100))
    ownership_type = Column(String(100))
    equipment = Column(Text)

    # Relationship
    listings = relationship("Listing", back_populates="features")


class Listing(Base):
    __tablename__ = "listing"

    listing_id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("location.location_id"), nullable=False)
    building_id = Column(Integer, ForeignKey("building.building_id"), nullable=False)
    owner_id = Column(Integer, ForeignKey("owner.owner_id"), nullable=False)
    features_id = Column(Integer, ForeignKey("features.features_id"), nullable=False)
    rooms = Column(Integer)
    area = Column(Float)
    price_total_zl = Column(Float)
    price_sqm_zl = Column(Float)
    price_per_sqm_detailed = Column(Float)
    date_posted = Column(Date)
    photo_count = Column(Integer)
    url = Column(Text)
    image_url = Column(Text)
    description_text = Column(Text)

    # Relationships
    location = relationship("Location", back_populates="listings")
    building = relationship("Building", back_populates="listings")
    owner = relationship("Owner", back_populates="listings")
    features = relationship("Features", back_populates="listings")
