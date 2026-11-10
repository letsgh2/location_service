from sql_app import models


async def test_cities_empty(client):
    response = await client.get("/listings/cities")

    assert response.status_code == 200
    assert response.json() == []


async def test_cities_prefix_is_case_insensitive_and_distinct(client, make_listing):
    await make_listing(city="Kraków")
    await make_listing(city="Kraków")
    await make_listing(city="Katowice")
    await make_listing(city="Warszawa")

    response = await client.get("/listings/cities", params={"q": "kra"})

    assert response.json() == ["Kraków"]
    assert (await client.get("/listings/cities", params={"q": "K"})).json() == [
        "Katowice",
        "Kraków",
    ]


async def test_cities_without_listings_are_not_suggested(client, make_listing, db):
    db.add(models.Location(city="Gdańsk"))
    await db.commit()
    await make_listing(city="Gdynia")

    assert (await client.get("/listings/cities", params={"q": "G"})).json() == [
        "Gdynia"
    ]


async def test_cities_wildcards_in_query_are_literal(client, make_listing):
    await make_listing(city="Kraków")

    assert (await client.get("/listings/cities", params={"q": "%"})).json() == []
    assert (await client.get("/listings/cities", params={"q": "_raków"})).json() == []


async def test_cities_limit_and_sorting(client, make_listing):
    for city in ["Poznań", "Opole", "Lublin"]:
        await make_listing(city=city)

    response = await client.get("/listings/cities", params={"limit": 2})

    assert response.json() == ["Lublin", "Opole"]
    assert (
        await client.get("/listings/cities", params={"limit": 51})
    ).status_code == 422
    assert (
        await client.get("/listings/cities", params={"limit": 0})
    ).status_code == 422


async def test_districts_narrowed_by_city(client, make_listing):
    await make_listing(city="Kraków", city_district="Podgórze")
    await make_listing(city="Kraków", city_district="Prądnik Biały")
    await make_listing(city="Warszawa", city_district="Praga-Południe")
    await make_listing(city="Warszawa", city_district=None)

    all_p = (await client.get("/listings/districts", params={"q": "p"})).json()
    krakow_p = (
        await client.get("/listings/districts", params={"q": "p", "city": "Kraków"})
    ).json()

    assert all_p == ["Podgórze", "Praga-Południe", "Prądnik Biały"]
    assert krakow_p == ["Podgórze", "Prądnik Biały"]
