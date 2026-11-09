async def test_list_listings_empty(client):
    response = await client.get("/listings/")

    assert response.status_code == 200
    assert response.json() == []


async def test_list_listings_returns_summary_with_location(client, make_listing):
    await make_listing(
        city="Kraków",
        city_district="Podgórze",
        rooms=2,
        area=48.5,
        price_total_zl=650000,
        price_sqm_zl=13402,
        url="https://example.com/1",
        description_text="Opis",
    )

    response = await client.get("/listings/")

    assert response.status_code == 200
    [item] = response.json()
    assert item["rooms"] == 2
    assert item["area"] == 48.5
    assert item["price_total_zl"] == 650000
    assert item["price_sqm_zl"] == 13402
    assert item["location"] == {"city": "Kraków", "city_district": "Podgórze"}
    assert "url" not in item
    assert "description_text" not in item


async def test_list_listings_pagination(client, make_listing):
    for rooms in (1, 2, 3):
        await make_listing(rooms=rooms)

    response = await client.get("/listings/", params={"skip": 1, "limit": 1})

    assert response.status_code == 200
    assert [item["rooms"] for item in response.json()] == [2]


async def test_list_listings_rejects_invalid_pagination(client):
    assert (await client.get("/listings/", params={"limit": 501})).status_code == 422
    assert (await client.get("/listings/", params={"skip": -1})).status_code == 422
