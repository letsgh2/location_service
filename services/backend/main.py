import jwt
from dataclasses import dataclass
from sqlalchemy import select, delete, func
from sqlalchemy.orm import selectinload
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from sql_app.database import get_db
from sql_app import models, schemas
from sql_app.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)

app = FastAPI()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

INVALID_CREDENTIALS = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> models.User:
    try:
        user_id = decode_access_token(token)
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = await db.get(models.User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


@app.get("/")
async def root():
    return {"message": "API is running"}


# Auth endpoints
@app.post("/auth/register", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
async def register(
    data: schemas.UserCreate,
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(models.User).where(models.User.email == data.email)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = models.User(email=data.email, password_hash=hash_password(data.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@app.post("/auth/login", response_model=schemas.Token)
async def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    # OAuth2PasswordRequestForm wymaga pola "username" — traktujemy je jako email.
    result = await db.execute(
        select(models.User).where(models.User.email == form.username)
    )
    user = result.scalar_one_or_none()
    if user is None or not verify_password(form.password, user.password_hash):
        raise INVALID_CREDENTIALS
    if not user.is_active:
        raise INVALID_CREDENTIALS
    return schemas.Token(access_token=create_access_token(user.user_id))


@app.get("/auth/me", response_model=schemas.User)
async def read_me(current_user: models.User = Depends(get_current_user)):
    return current_user


# Location endpoints
@app.post("/locations/", response_model=schemas.Location)
async def create_location(
    location: schemas.LocationCreate,
    db: AsyncSession = Depends(get_db),
    _user: models.User = Depends(get_current_user),
):
    db_location = models.Location(**location.model_dump())
    db.add(db_location)
    await db.commit()
    await db.refresh(db_location)
    return db_location


@app.get("/locations/", response_model=List[schemas.Location])
async def read_locations(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(models.Location).offset(skip).limit(limit)
    )
    return result.scalars().all()


@app.get("/locations/{location_id}", response_model=schemas.Location)
async def read_location(
    location_id: int,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(models.Location).where(models.Location.location_id == location_id)
    )
    location = result.scalar_one_or_none()
    if location is None:
        raise HTTPException(status_code=404, detail="Location not found")
    return location


@app.patch("/locations/{location_id}", response_model=schemas.Location)
async def update_location(
    location_id: int,
    location_update: schemas.LocationUpdate,
    db: AsyncSession = Depends(get_db),
    _user: models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(models.Location).where(models.Location.location_id == location_id)
    )
    location = result.scalar_one_or_none()
    if location is None:
        raise HTTPException(status_code=404, detail="Location not found")

    for field, value in location_update.model_dump(exclude_unset=True).items():
        setattr(location, field, value)

    await db.commit()
    await db.refresh(location)
    return location


@app.delete("/locations/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location(
    location_id: int,
    db: AsyncSession = Depends(get_db),
    _user: models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(models.Location).where(models.Location.location_id == location_id)
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Location not found")

    listings_count = await db.scalar(
        select(func.count())
        .select_from(models.Listing)
        .where(models.Listing.location_id == location_id)
    )
    if listings_count:
        raise HTTPException(
            status_code=409,
            detail="Location is used by existing listings and cannot be deleted",
        )

    await db.execute(
        delete(models.Location).where(models.Location.location_id == location_id)
    )
    await db.commit()


# Listing endpoints
@dataclass
class ListingFilters:
    price_total_min: Optional[float] = None
    price_total_max: Optional[float] = None
    price_sqm_min: Optional[float] = None
    price_sqm_max: Optional[float] = None
    area_min: Optional[float] = None
    area_max: Optional[float] = None


# (nazwa parametru min, nazwa parametru max, kolumna)
RANGE_FILTERS = (
    ("price_total_min", "price_total_max", models.Listing.price_total_zl),
    ("price_sqm_min", "price_sqm_max", models.Listing.price_sqm_zl),
    ("area_min", "area_max", models.Listing.area),
)


def listing_filters(
    price_total_min: Optional[float] = Query(None, ge=0),
    price_total_max: Optional[float] = Query(None, ge=0),
    price_sqm_min: Optional[float] = Query(None, ge=0),
    price_sqm_max: Optional[float] = Query(None, ge=0),
    area_min: Optional[float] = Query(None, ge=0),
    area_max: Optional[float] = Query(None, ge=0),
) -> ListingFilters:
    # FastAPI 0.104 nie obsługuje modeli parametrów Query, stąd zależność-funkcja.
    f = ListingFilters(
        price_total_min=price_total_min,
        price_total_max=price_total_max,
        price_sqm_min=price_sqm_min,
        price_sqm_max=price_sqm_max,
        area_min=area_min,
        area_max=area_max,
    )
    for min_name, max_name, _column in RANGE_FILTERS:
        low, high = getattr(f, min_name), getattr(f, max_name)
        if low is not None and high is not None and low > high:
            raise HTTPException(
                status_code=422, detail=f"{min_name} must be <= {max_name}"
            )
    return f


def apply_listing_filters(stmt, f: ListingFilters):
    # Rekordy z NULL w filtrowanej kolumnie odpadają, gdy filtr jest aktywny.
    for min_name, max_name, column in RANGE_FILTERS:
        low, high = getattr(f, min_name), getattr(f, max_name)
        if low is not None:
            stmt = stmt.where(column >= low)
        if high is not None:
            stmt = stmt.where(column <= high)
    return stmt


@app.get("/listings/", response_model=List[schemas.ListingSummary])
async def read_listings(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    f: ListingFilters = Depends(listing_filters),
    db: AsyncSession = Depends(get_db),
):
    # selectinload: bez niego serializacja listing.location w sesji async rzuca MissingGreenlet
    stmt = apply_listing_filters(select(models.Listing), f)
    stmt = (
        stmt
        .options(selectinload(models.Listing.location))
        .order_by(models.Listing.listing_id)
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return result.scalars().all()
