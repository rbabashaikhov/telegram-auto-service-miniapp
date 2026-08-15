# CRM integration contract

Mini App не является CRM. Application layer зависит от provider interfaces. Когда появится partner CRM, реализуется набор CRM providers. UI и use cases не переписываются.

Сейчас `DATA_MODE=crm` включает typed stub: любой вызов возвращает HTTP `501` с кодом `CRM_NOT_CONFIGURED`.

## Source of truth

**LOCAL (`DATA_MODE=local`)**

```text
Mini App → Application → Local Providers → SQLite
```

**CRM-backed (контракт)**

```text
Mini App → Application → CRM Providers → Partner CRM
```

CRM authoritative для customers, vehicles, catalog, specialists, resources, availability, appointments, service requests, inspections, estimates, history.

Local SQLite в CRM-режиме может остаться только для technical state, ID mapping и optional cache. Не делать Mini App second source of truth.

## Expected CRM resources

- customers
- vehicles
- services
- specialists
- resources
- availability
- appointments
- service requests
- inspections
- estimates
- service history

## Expected methods

```http
GET    /customers/{externalId}
POST   /customers
GET    /vehicles?customerId=
POST   /vehicles
PATCH  /vehicles/{id}
GET    /services
GET    /specialists?serviceId=
GET    /resources
GET    /availability?serviceId=&date=&specialistId=
POST   /appointments
PATCH  /appointments/{id}/cancel
PATCH  /appointments/{id}/reschedule
GET    /appointments/{id}
GET    /appointments/{id}/status
POST   /service-requests
POST   /service-requests/{id}/convert
GET    /inspections?appointmentId=
PUT    /inspections
GET    /estimates?appointmentId=
POST   /estimates
POST   /estimates/{id}/approve
POST   /estimates/{id}/reject
GET    /history?vehicleId=
```

Семантика, которую CRM должна сохранить:

- availability учитывает specialist schedule, specialist_service, appointments, blocked slots, required resource type и resource occupancy;
- assignment специалиста и resource атомарно;
- double booking запрещён;
- estimate total = сумма labor + parts;
- incompatible part по fitment отклоняется;
- status transitions ограничены (нельзя `completed → diagnosing`).

## What Mini App will not become

Не реализовывать в Mini App: склад, закупки, бухгалтерию, кассу, полноценный заказ-наряд, payroll, multi-location ERP. Для этого нужен CRM/1C adapter, а не разрастание Telegram-приложения.
