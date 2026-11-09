import pytest


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


RANGES = [
    ("price_total_min", "price_total_max", "price_total_zl"),
    ("price_sqm_min", "price_sqm_max", "price_sqm_zl"),
    ("area_min", "area_max", "area"),
]


async def _ids(client, **params):
    response = await client.get("/listings/", params=params)
    assert response.status_code == 200, response.text
    return [item["listing_id"] for item in response.json()]


@pytest.mark.parametrize("min_name,max_name,field", RANGES)
async def test_range_filter_bounds_are_inclusive(client, make_listing, min_name, max_name, field):
    low = await make_listing(**{field: 100})
    mid = await make_listing(**{field: 200})
    high = await make_listing(**{field: 300})

    assert await _ids(client, **{min_name: 200}) == [mid.listing_id, high.listing_id]
    assert await _ids(client, **{max_name: 200}) == [low.listing_id, mid.listing_id]
    assert await _ids(client, **{min_name: 150, max_name: 300}) == [mid.listing_id, high.listing_id]
    assert await _ids(client, **{min_name: 200, max_name: 200}) == [mid.listing_id]


async def test_range_filters_combine(client, make_listing):
    match = await make_listing(price_total_zl=500000, area=50)
    await make_listing(price_total_zl=500000, area=90)
    await make_listing(price_total_zl=900000, area=50)

    ids = await _ids(client, price_total_max=600000, area_max=60)

    assert ids == [match.listing_id]


async def test_null_value_excluded_only_when_filter_active(client, make_listing):
    without_price = await make_listing(price_total_zl=None)
    with_price = await make_listing(price_total_zl=400000)

    assert await _ids(client) == [without_price.listing_id, with_price.listing_id]
    assert await _ids(client, price_total_min=0) == [with_price.listing_id]


@pytest.mark.parametrize("param", [name for pair in RANGES for name in pair[:2]])
async def test_negative_range_value_returns_422(client, param):
    response = await client.get("/listings/", params={param: -1})

    assert response.status_code == 422


@pytest.mark.parametrize("min_name,max_name,_field", RANGES)
async def test_min_greater_than_max_returns_422(client, min_name, max_name, _field):
    response = await client.get("/listings/", params={min_name: 10, max_name: 5})

    assert response.status_code == 422
    assert response.json()["detail"] == f"{min_name} must be <= {max_name}"


async def test_rooms_single_and_multi_select(client, make_listing):
    one = await make_listing(rooms=1)
    two = await make_listing(rooms=2)
    three = await make_listing(rooms=3)

    assert await _ids(client, rooms=2) == [two.listing_id]
    assert await _ids(client, rooms=[2, 3]) == [two.listing_id, three.listing_id]
    assert await _ids(client, rooms=[3, 1, 3]) == [one.listing_id, three.listing_id]


@pytest.mark.parametrize("rooms", [0, 21, -1])
async def test_rooms_out_of_range_returns_422(client, rooms):
    response = await client.get("/listings/", params={"rooms": rooms})

    assert response.status_code == 422


async def test_city_and_district_exact_match(client, make_listing):
    podgorze = await make_listing(city="Kraków", city_district="Podgórze")
    krowodrza = await make_listing(city="Kraków", city_district="Krowodrza")
    await make_listing(city="Łódź", city_district="Bałuty")

    assert await _ids(client, city="Kraków") == [podgorze.listing_id, krowodrza.listing_id]
    assert await _ids(client, city="Kraków", city_district="Podgórze") == [podgorze.listing_id]
    assert await _ids(client, city="Gdańsk") == []
    assert await _ids(client, city="  ") == await _ids(client)


async def test_location_filter_combines_with_ranges_and_rooms(client, make_listing):
    match = await make_listing(city="Łódź", rooms=2, price_total_zl=300000)
    await make_listing(city="Łódź", rooms=2, price_total_zl=700000)
    await make_listing(city="Łódź", rooms=3, price_total_zl=300000)
    await make_listing(city="Kraków", rooms=2, price_total_zl=300000)

    ids = await _ids(client, city="Łódź", rooms=2, price_total_max=500000)

    assert ids == [match.listing_id]


async def test_count_empty(client):
    response = await client.get("/listings/count")

    assert response.status_code == 200
    assert response.json() == {"count": 0}


async def test_count_matches_filtered_list_and_ignores_pagination(client, make_listing):
    for rooms, city in [(1, "Kraków"), (2, "Kraków"), (2, "Łódź"), (3, "Kraków")]:
        await make_listing(rooms=rooms, city=city, price_total_zl=100000 * rooms)
    params = {"city": "Kraków", "rooms": [2, 3], "price_total_min": 150000}

    count = (await client.get("/listings/count", params={**params, "limit": 1})).json()["count"]

    assert count == len(await _ids(client, **params, limit=500)) == 2


async def test_count_validates_filters(client):
    response = await client.get("/listings/count", params={"area_min": 80, "area_max": 40})

    assert response.status_code == 422
