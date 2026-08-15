# PartsProvider

Каталог запчастей нужен для сценария:

`диагностика → необходимые работы + необходимые запчасти → estimate`

Mini App не подключает TecDoc, supplier API и платные базы. Доступ идёт через `PartsProvider`.

## ENV

`PARTS_PROVIDER=local` — LocalPartsProvider, demo catalog в SQLite.

`PARTS_PROVIDER=external` — ExternalPartsProvider stub, `501 PARTS_NOT_CONFIGURED`.

Выбор реализации — composition layer, не `if` в application services.

## Methods

```ts
searchParts(query?: string, category?: string): Part[]
getCompatibleParts(vehicle, filters?: { query?: string; category?: string }): Part[]
getPart(id: number): Part | undefined
getPrice(id: number): number | undefined
getAvailability?(id: number): { available: boolean; qty?: number }
```

`getCompatibleParts` фильтрует по `VehiclePartFitment` (make/model/year/engine → variant → part).

Admin UI показывает только совместимые детали выбранного автомобиля. Текстовый поиск и фильтр категории достаточны для MVP.

## Local catalog

Демо-набор: ~24 модификации автомобилей, 50–100 деталей, связи fitment, категория, бренд, артикул, цена, optional OEM.

Это не рынок запчастей и не склад. Нет остатков, закупок, аналогов и поставщиков.

## Future adapters

Позже, без смены UI:

- TecDoc
- supplier API
- ERP / 1C
- proprietary catalog заказчика

Адаптер реализует тот же `PartsProvider`. Не встраивать vendor SDK в routes или React.
