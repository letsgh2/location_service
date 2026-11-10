# User Stories - Modele danych (SQLAlchemy)

## Podsumowanie modeli

System zawiera 5 głównych modeli danych:

1. **Location** - informacje geograficzne i adresowe (9 pól, w tym opcjonalny opis `description`)
2. **Building** - informacje techniczne o budynku (4 pola)
3. **Owner** - dane kontaktowe właściciela (5 pól)
4. **Features** - cechy i wyposażenie nieruchomości (7 pól)
5. **Listing** - główna tabela ofert (17 pól + 4 relacje)

**Charakterystyka:**
- ✅ Wszystkie modele dziedziczą po `Base` (SQLAlchemy declarative base)
- ✅ Wszystkie klucze główne są zindeksowane
- ✅ Relacje są zdefiniowane dwukierunkowo
- ✅ Foreign keys zapewniają integralność danych
- ✅ Elastyczne wprowadzanie danych (większość pól opcjonalna)
- ✅ Wsparcie dla różnych typów danych (String, Integer, Float, Boolean, Date, Text)

**Relacje:**
- Listing jest centralnym modelem łączącym wszystkie pozostałe
- Każda oferta musi mieć powiązane: Location, Building, Owner i Features
- Jeden Location/Building/Owner/Features może mieć wiele ofert (Listing)

