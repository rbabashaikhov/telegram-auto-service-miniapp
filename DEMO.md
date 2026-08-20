# Demo: VIN и регламент ТО

Полные VIN / OEM-данные обслуживания подключаются через **external provider / API / CRM заказчика**. В этой сборке живой OEM-каталог **не подключён**.

- `VIN_PROVIDER=demo` (по умолчанию) — `DemoVinDecoderProvider`
- `VIN_PROVIDER=external` — stub, `501 VIN_NOT_CONFIGURED`
- `MAINTENANCE_PROVIDER=demo` (по умолчанию) — `DemoMaintenanceScheduleProvider`
- `MAINTENANCE_PROVIDER=external` — stub, `501 MAINTENANCE_NOT_CONFIGURED`

Демо-идентификация и демо-регламент **не являются** официальной базой производителя.

## Демо VIN

| VIN | Автомобиль |
|---|---|
| `WVGZZZ5NZKM012345` | Volkswagen Tiguan II, 2019, 2.0 TSI (seed) |
| `JT2BF22K3W0123456` | Toyota Camry XV70, 2021, 2.5 |
| `KNADM4A37A6123456` | Kia Rio IV, 2020, 1.6 |
| `WVWZZZ3CZJE123456` | Volkswagen Polo V, 2018, 1.6 |

Неизвестный VIN в demo-режиме не ломает поток: возвращается fallback по WMI (если узнаваем) или generic Demo/Unknown плюс явное сообщение, что это демо-данные.

## Что показывается отдельно

1. **Регламент ТО (демо)** — масло, фильтры, тормоза и ближайший milestone.
2. **Выполненные работы** — из истории / `vehicle_maintenance`.
3. **Рекомендации диагностики** — пункты осмотра `critical` / `recommendation`.

Эти три источника не смешиваются в одном списке.

## API

- `POST /api/vin/decode` — `{ vin, mileage? }`
- `GET /api/vehicles/:id/maintenance` — идентификация, регламент, история, рекомендации осмотра
