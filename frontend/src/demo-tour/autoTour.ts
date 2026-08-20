import type { DemoTourDefinition } from './types';

export const AUTO_DEMO_TOUR_STORAGE_KEY = 'autoservice.salesDemoTour.v1';

export const autoDemoTour: DemoTourDefinition = {
  id: 'auto-service-sales-demo',
  storageKey: AUTO_DEMO_TOUR_STORAGE_KEY,
  intro: {
    title: 'Посмотреть клиентский портал автосервиса?',
    lead: 'Это живой интерфейс, не слайды. Тур ничего не записывает и не меняет данные.',
    bullets: [
      'автомобиль на главном экране',
      'заявка, если непонятно, что сломалось',
      'диагностика, смета и согласование',
      'история и повтор обслуживания',
    ],
    startLabel: 'Начать тур',
    skipLabel: 'Пропустить',
  },
  finish: {
    title: 'Портал готов к CRM, а не привязан к SQLite',
    lead: 'Mini App уже отделён от storage. Для пилота с CRM нужен адаптер, а не переписывание интерфейса.',
    bullets: [
      'автомобиль как точка входа',
      'заявка и плановая запись',
      'resource-aware слоты',
      'диагностика и смета с запчастями',
      'локальный PartsProvider без TecDoc',
    ],
    adminLabel: 'Кабинет администратора',
    continueLabel: 'Продолжить как клиент',
  },
  steps: [
    {
      id: 'vehicle',
      target: 'vehicle-card',
      route: '/',
      title: 'Главная — автомобиль',
      description: 'Клиент сразу видит машину, пробег и последнее обслуживание. Не каталог услуг.',
    },
    {
      id: 'problem',
      target: 'problem-cta',
      route: '/',
      title: 'Что случилось с автомобилем?',
      description: 'Если клиент не знает услугу, он описывает симптом вместо выбора из прайса.',
    },
    {
      id: 'symptom',
      target: 'problem-form',
      route: '/problem',
      title: 'Описание симптома',
      description: 'Категория и свободный текст. Заявка уходит в сервис, запись ещё не создаётся.',
    },
    {
      id: 'diagnostics-booking',
      target: 'service-diagnostics',
      route: '/booking/services',
      title: 'Запись на диагностику',
      description: 'Плановая услуга: клиент выбирает только услугу и время. Пост назначает backend.',
      action: 'prepare-booking',
    },
    {
      id: 'status',
      target: 'status-timeline',
      title: 'Статус автомобиля',
      description: 'Клиент видит понятный timeline: записан → принят → диагностика → согласование → в работе.',
      action: 'open-status',
    },
    {
      id: 'inspection',
      target: 'inspection-card',
      title: 'Результат диагностики',
      description: 'После осмотра сервис фиксирует выводы понятным языком, не внутренним статусом CRM.',
      action: 'open-status',
    },
    {
      id: 'estimate',
      target: 'estimate-card',
      title: 'Смета работ и запчастей',
      description: 'Работы и детали из локального каталога, отфильтрованного по автомобилю.',
      action: 'open-estimate',
    },
    {
      id: 'approval',
      target: 'estimate-actions',
      title: 'Согласование',
      description: 'Клиент согласует или отклоняет смету. После согласия можно начинать работы.',
      action: 'open-estimate',
    },
    {
      id: 'history',
      target: 'visit-history',
      route: '/history',
      title: 'История обслуживания',
      description: 'Завершённые визиты с пробегом и стоимостью. Не заказ-наряд ERP, а клиентская история.',
      action: 'open-history',
    },
    {
      id: 'repeat',
      target: 'repeat-booking',
      route: '/',
      title: 'Повторить обслуживание',
      description: 'Повтор открывает черновик записи с тем же автомобилем и услугой. Appointment не создаётся сам.',
    },
  ],
};
