from pydantic import BaseModel, ConfigDict, EmailStr, Field
from datetime import date
from typing import List, Optional


# Location schemas
class LocationBase(BaseModel):
    city: Optional[str] = None
    locality: Optional[str] = None
    city_district: Optional[str] = None
    street: Optional[str] = None
    full_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None


class LocationCreate(LocationBase):
    pass


class LocationUpdate(LocationBase):
    pass


class Location(LocationBase):
    location_id: int

    model_config = ConfigDict(from_attributes=True)


# Building schemas
class BuildingBase(BaseModel):
    year_built: Optional[int] = None
    building_type: Optional[str] = None
    floor: Optional[int] = None


class BuildingCreate(BuildingBase):
    pass


class Building(BuildingBase):
    building_id: int

    model_config = ConfigDict(from_attributes=True)


# Owner schemas
class OwnerBase(BaseModel):
    owner_type: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None


class OwnerCreate(OwnerBase):
    pass


class Owner(OwnerBase):
    owner_id: int

    model_config = ConfigDict(from_attributes=True)


# Features schemas
class FeaturesBase(BaseModel):
    has_basement: Optional[bool] = None
    has_parking: Optional[bool] = None
    kitchen_type: Optional[str] = None
    window_type: Optional[str] = None
    ownership_type: Optional[str] = None
    equipment: Optional[str] = None


class FeaturesCreate(FeaturesBase):
    pass


class Features(FeaturesBase):
    features_id: int

    model_config = ConfigDict(from_attributes=True)


# Listing schemas
class ListingBase(BaseModel):
    location_id: int
    building_id: int
    owner_id: int
    features_id: int
    rooms: Optional[int] = None
    area: Optional[float] = None
    price_total_zl: Optional[float] = None
    price_sqm_zl: Optional[float] = None
    price_per_sqm_detailed: Optional[float] = None
    date_posted: Optional[date] = None
    photo_count: Optional[int] = None
    url: Optional[str] = None
    image_url: Optional[str] = None
    description_text: Optional[str] = None


class ListingCreate(ListingBase):
    pass


class Listing(ListingBase):
    listing_id: int

    model_config = ConfigDict(from_attributes=True)


# Listing with relationships
class ListingDetail(Listing):
    location: Optional[Location] = None
    building: Optional[Building] = None
    owner: Optional[Owner] = None
    features: Optional[Features] = None


# Short schemas for the listings list (no description, URLs or FKs).
class LocationSummary(BaseModel):
    city: Optional[str] = None
    city_district: Optional[str] = None
    street: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ListingSummary(BaseModel):
    listing_id: int
    rooms: Optional[int] = None
    area: Optional[float] = None
    price_total_zl: Optional[float] = None
    price_sqm_zl: Optional[float] = None
    location: LocationSummary

    model_config = ConfigDict(from_attributes=True)


class ListingPage(BaseModel):
    items: List[ListingSummary]
    total: int  # count after filters, independent of skip/limit
    skip: int
    limit: int


# Auth schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class User(BaseModel):
    user_id: int
    email: EmailStr
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
