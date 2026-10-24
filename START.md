# START: читать первым (короткая память проекта)
Обновлено: 24 октября 2026. После каждой задачи обновлять этот файл. Не больше 60 строк. Длинное идёт в `docs/`.

## Что это
worthgoingout.com: сайт про затмения и метеорные потоки на английском («стоит ли выходить?»). Цель сейчас: хороший настоящий сайт для одобрения в партнёрских сетях (Viator напрямую, GetYourGuide через Travelpayouts, Unistellar на Awin). Постов пока нет. Black Friday не цель.

## Что работает
- Astro, статика. 20 страниц (24.10): `/eclipses/` (все затмения до 2030 и что видят 47 городов, `npm run calc` → `data/eclipses.json`, проверка с Википедией, Space.com, IGN, National Eclipse), страны 2027 `/eclipse-2027/spain|egypt|morocco/` (тексты в `data/eclipse-countries.json`), гайды `/guides/` (метеоры, очки для затмения, сияние и Kp; список в `src/lib/guides.ts`). Северное сияние `/aurora/` и 7 направлений (темнота по месяцам считает `scripts/calc-aurora.mjs`; магнитную широту НЕ публикуем: простая модель врёт на 3–5°). Фото (24.10): 21 фото с Wikimedia Commons, свободные лицензии, подпись и автор под каждым, список `/photo-credits/`. Как добавить фото: тема в `data/photo-queries.json` → push → workflow «Find photos» кладёт варианты и листы-превью на ветку `photos` → выбрать, вписать в `data/photos.json` (alt, подпись) → `PHOTOS_DIR=<папка с веткой photos> node scripts/place-photos.mjs`. Звёзды `/stargazing/` и 5 мест (`scripts/calc-stargazing.mjs`: тёмные безлунные недели, сезон Млечного Пути). Страницы под туры: `/aurora/tours/`, `/eclipse-2027/trip-planning/`, блоки «Booking…» на страницах мест. Партнёрки (24.10): `data/partners.json`, всё `enabled: false`; после одобрения: `enabled: true` и `url` у нужных ссылок → появится помеченная кнопка через `/go/<id>/` (в URL нет бренда, `/go/` закрыт от поиска). Pinterest: картинки `/pins/`, рисует `/pin/<id>/`, снимки `npm run build && npm run pins && npm run build` (локально, нужен Playwright); код подтверждения Pinterest вписать в `src/lib/site.ts` → `pinterestVerify`. SEO (24.10): у каждой страницы своя картинка для соцсетей (`photo` в Layout, `public/photos/<id>-og.jpg`), «хлебные крошки» и разметка schema.org; коды Google/Bing/Pinterest вписываются в `src/lib/site.ts`. Остальные: главная, `/eclipse-2027/`, `/eclipse-2027/where-to-watch/` (30 мест), `/meteor-showers/` (вердикты Go/Maybe/Skip), `/how-we-make-our-numbers/`, About, Editorial policy, Contact, Disclosure, Privacy, Terms, 404.
- Цифры затмения считает `npm run calc` (Astronomy Engine, поправка 3.1 с по точке EclipseWise, три проверочные точки). Луна по потокам сверена с IMO. Результат в `data/*.json`, коммитится.
- `npm run build`, потом `npm run check` (alt, ссылки, якоря, title/description/h1).
- Деплой: `.github/workflows/deploy.yml`, при push в main и раз в день 04:30 Богота (чтобы счётчик дней и список «ближайшее» обновлялись), Node 24: Astro 7 не идёт на Node 22.23.3. FTP-доступ открывается прямо в папке домена, поэтому файлы кладутся в корень (`./`), не в `public_html/`. Секреты FTP есть, сайт выложен 24.10.

## Подписка на почту (24.10)
- Форма `src/components/SignupForm.astro` (главная, затмение, метеоры, сияние, звёзды, все затмения) → `public/api/subscribe.php` на хостинге → файл `subscribers.csv` в ПРИВАТНОМ репозитории `alexbogota/worthgoingout-subscribers` (ключ: секрет `SUBSCRIBE_TOKEN`, при деплое пишется в `private/config.php`, папка `private/` закрыта .htaccess). Без ключа адреса копятся на хостинге в `private/pending.csv` и уйдут в GitHub при первой подписке после появления ключа. После каждого деплоя проверка пишет в Summary «Sign-up check» и что папка `private/` закрыта (если открыта, деплой красный). Адреса НИКОГДА не класть в публичный репозиторий.

## Что ждёт владельца
1. В File Manager удалить лишнюю папку `public_html` внутри папки домена (копия сайта от первого деплоя) и проверить, что за папка `github` там же.
2. Создать почту contact@worthgoingout.com (она на страницах).
3. Решить подпись автора на About: бренд (рекомендую) или имя. Сейчас написано нейтрально «одна небольшая команда».
4. Юридические страницы (Privacy, Terms) шаблонные, юристом не проверены.
5. Когда сайт откроется по домену: заявки в Viator, GetYourGuide, Awin.

## Срок годности данных
- Метеорные потоки в `data/showers.json` до Персеид (12 авг 2027): до мая 2027 добавить следующий год из календаря IMO и `npm run calc` (проверка `npm run check` предупредит за 90 дней). Фазы Луны считаются до февраля 2028, звёзды и затмения до 2030.

## Правила
- Цифры только из расчёта или из источника на странице; «самое длинное затмение века» НЕ писать (это неверно: 2009 год дольше).
- Правило вердиктов публичное (`src/lib/sky.ts` RULE и страница методологии должны совпадать).
- Ничего не публиковать в соцсети без «ок» владельца на точный текст.
- Партнёрские ссылки только через свои `/go/<имя>/`, помечены. Владельцу писать по-русски, просто.

## Дальше (этапы)
2: раздел Aurora (живой Kp с NOAA, CORS не проверен), страницы городов затмения, техника/телескопы. 3: партнёрские блоки, Sky this month. Подробнее в проекте «astro» на claude.ai (worthgoingout-site-concept, -blueprint, -decisions).
