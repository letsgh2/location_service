from datetime import datetime, timedelta, timezone

import jwt

from config import settings
from sql_app.security import ALGORITHM, create_access_token

USER = {"email": "anna@example.com", "password": "bezpieczne-haslo"}


def login_data(email=USER["email"], password=USER["password"]):
    return {"username": email, "password": password}


async def test_register_creates_user_without_exposing_password(client):
    response = await client.post("/auth/register", json=USER)

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == USER["email"]
    assert body["is_active"] is True
    assert "password" not in body and "password_hash" not in body


async def test_register_duplicate_email_returns_409(client):
    await client.post("/auth/register", json=USER)

    response = await client.post("/auth/register", json=USER)

    assert response.status_code == 409


async def test_register_rejects_short_password(client):
    response = await client.post(
        "/auth/register", json={"email": USER["email"], "password": "krotkie"}
    )

    assert response.status_code == 422


async def test_register_rejects_invalid_email(client):
    response = await client.post(
        "/auth/register", json={"email": "to-nie-email", "password": "bezpieczne-haslo"}
    )

    assert response.status_code == 422


async def test_password_is_stored_hashed(client, db):
    from sqlalchemy import select

    from sql_app import models

    await client.post("/auth/register", json=USER)

    user = (await db.execute(select(models.User))).scalar_one()
    assert user.password_hash != USER["password"]
    assert user.password_hash.startswith("$2")  # prefiks bcrypt


async def test_login_returns_bearer_token(client):
    await client.post("/auth/register", json=USER)

    response = await client.post("/auth/login", data=login_data())

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


async def test_login_wrong_password_returns_401(client):
    await client.post("/auth/register", json=USER)

    response = await client.post("/auth/login", data=login_data(password="zle-haslo"))

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


async def test_login_unknown_email_returns_same_401(client):
    response = await client.post(
        "/auth/login", data=login_data(email="nikt@example.com")
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


async def test_me_returns_current_user_with_valid_token(client):
    await client.post("/auth/register", json=USER)
    token = (await client.post("/auth/login", data=login_data())).json()["access_token"]

    response = await client.get(
        "/auth/me", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    assert response.json()["email"] == USER["email"]


async def test_me_without_token_returns_401(client):
    response = await client.get("/auth/me")

    assert response.status_code == 401


async def test_me_with_garbage_token_returns_401(client):
    response = await client.get("/auth/me", headers={"Authorization": "Bearer nie-jwt"})

    assert response.status_code == 401


async def test_me_with_expired_token_returns_401(client):
    await client.post("/auth/register", json=USER)
    expired = jwt.encode(
        {"sub": "1", "exp": datetime.now(timezone.utc) - timedelta(seconds=1)},
        settings.secret_key,
        algorithm=ALGORITHM,
    )

    response = await client.get(
        "/auth/me", headers={"Authorization": f"Bearer {expired}"}
    )

    assert response.status_code == 401


async def test_me_with_token_signed_by_other_key_returns_401(client):
    await client.post("/auth/register", json=USER)
    forged = jwt.encode(
        {"sub": "1", "exp": datetime.now(timezone.utc) + timedelta(minutes=5)},
        "inny-klucz",
        algorithm=ALGORITHM,
    )

    response = await client.get(
        "/auth/me", headers={"Authorization": f"Bearer {forged}"}
    )

    assert response.status_code == 401


async def test_me_with_token_for_missing_user_returns_401(client):
    token = create_access_token(user_id=999)

    response = await client.get(
        "/auth/me", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 401


async def test_locations_write_requires_auth(client):
    location = {"city": "Gdańsk"}

    assert (await client.post("/locations/", json=location)).status_code == 401
    assert (await client.patch("/locations/1", json=location)).status_code == 401
    assert (await client.delete("/locations/1")).status_code == 401


async def test_locations_read_is_public(client):
    response = await client.get("/locations/")

    assert response.status_code == 200
