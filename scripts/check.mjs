import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { calculateAutomaticTalentEffects, calculateWounds, evaluateD100Check, resolveDuration, resolveTalentMaximum } from '../src/formulas.js';
import TALENTS from '../src/data/talents.json' with { type: 'json' };
import SPELLS from '../src/data/spells.json' with { type: 'json' };

const bonuses = { ws: 4, bs: 4, s: 5, t: 4, i: 5, ag: 4, dex: 3, int: 6, wp: 7, fel: 5 };
const getBonus = (key) => bonuses[key] || 0;

assert.equal(resolveDuration('рСВ минут', getBonus), '7 минут');
assert.equal(resolveDuration('Рейтинг СВ минут', getBonus), '7 минут');
assert.equal(resolveDuration('Бонус силы воли раундов', getBonus), '7 раундов');
assert.equal(resolveDuration('[сила воли] минут', getBonus), '7 минут');
assert.equal(resolveDuration('рСВ*2 раундов', getBonus), '14 раундов');
assert.equal(resolveDuration('[2 × РЕЙТИНГ СИЛЫ ВОЛИ] РАУНДОВ+', getBonus), '14 РАУНДОВ+');
assert.equal(resolveTalentMaximum('РИнт', getBonus).display, '6');
assert.equal(resolveTalentMaximum('РИнт + РСВ', getBonus).display, '13');
assert.equal(resolveTalentMaximum('Нет', getBonus).display, '∞');

const automaticEffects = calculateAutomaticTalentEffects([
  { name: 'Здоровяк', taken: 2 },
  { name: 'Хладнокровный', taken: 1 },
  { name: 'Молниеносные рефлексы', taken: 1 },
  { name: 'Смекалка', taken: 2 },
  { name: 'Силач', taken: 0 },
]);
assert.equal(automaticEffects.hardyRanks, 2, 'Здоровяк должен учитывать все взятые уровни');
assert.equal(automaticEffects.characteristicBonuses.wp, 5, 'Старое имя «Хладнокровный» должно давать +5 СВ');
assert.equal(automaticEffects.characteristicBonuses.ag, 5, 'Старое имя «Молниеносные рефлексы» должно давать +5 Лов');
assert.equal(automaticEffects.characteristicBonuses.int, 5, 'Талант с максимумом 1 не должен умножать +5 на ошибочное число взятий');
assert.equal(automaticEffects.characteristicBonuses.s, undefined, 'Талант с 0 взятий не должен давать бонус');

const woundResult = calculateWounds((key) => ({ s: 28, t: 33, wp: 69 })[key], [{ name: 'Здоровяк', taken: 2 }]);
assert.equal(woundResult.value, 20, 'Здоровяк 2 должен добавить 2×БВын к максимуму ран');
assert.equal(woundResult.hardyBonus, 6);

const crossedTen = evaluateD100Check(67, 59);
assert.equal(crossedTen.success, true);
assert.equal(crossedTen.successes, 1, '59 против 67 должно давать 1 успех');
assert.equal(crossedTen.successLevel, 1);
assert.equal(evaluateD100Check(67, 63).successes, 0, 'В одном десятке нет дополнительных успехов');
const naturalOne = evaluateD100Check(67, 1);
assert.equal(naturalOne.criticalSuccess, true);
assert.equal(naturalOne.successes, 7, 'Единица добавляет 1 успех');
assert.equal(evaluateD100Check(67, 55).criticalSuccess, true, 'Успешный дубль — критический успех');
assert.equal(evaluateD100Check(67, 77).criticalFailure, true, 'Неудачный дубль — критический провал');
assert.equal(evaluateD100Check(100, 100).criticalFailure, true, '100 всегда остаётся критическим провалом');

const alterEgo = TALENTS.find((talent) => talent.name.toLocaleLowerCase('ru-RU') === 'альтер эго');
assert.ok(alterEgo, 'В справочнике отсутствует талант «Альтер эго»');
assert.equal(alterEgo.maximum, 'РИнт');
assert.ok(alterEgo.description.length > 250, 'Описание «Альтер эго» выглядит неполным');

const wanderingShadow = SPELLS.find((spell) => spell.name === 'Блуждающая тень');
assert.ok(wanderingShadow, 'В справочнике отсутствует «Блуждающая тень»');
assert.equal(wanderingShadow.duration, 'рСВ минут');
assert.ok(wanderingShadow.description.length > 200, 'Описание «Блуждающей тени» выглядит неполным');

assert.equal(TALENTS.length, 202, 'Неожиданное количество талантов');
assert.ok(new Set(SPELLS.map((spell) => spell.school)).size >= 20, 'Слишком мало школ магии');

for (const species of ['human', 'dwarf', 'halfling', 'elf', 'gnome', 'ogre']) {
  const path = fileURLToPath(new URL(`../public/assets/silhouettes/${species}.png`, import.meta.url));
  assert.ok(existsSync(path), `Отсутствует силуэт: ${species}`);
}

const fontPath = fileURLToPath(new URL('../public/assets/fonts/Metamorphous.ttf', import.meta.url));
assert.ok(existsSync(fontPath), 'Отсутствует шрифт Metamorphous');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
assert.equal((html.match(/data-theme-toggle/g) || []).length, 2, 'Переключатели темы не найдены');
assert.ok(styles.includes("html[data-theme='dark'] .sheet"), 'Стили ночной темы не найдены');
assert.ok(main.includes("THEME_STORAGE_KEY='wfrp4-theme-v1'"), 'Сохранение темы не подключено');
assert.ok(html.includes('id="portrait-file"') && html.includes('id="portrait-crop-dialog"'), 'Редактор портрета не подключён');
assert.ok(html.includes('id="dice-result-avatar"'), 'Миниатюра в результате броска не найдена');
assert.ok(main.includes("attachment://character-portrait.png"), 'Портрет не включён в Discord-бросок');
assert.ok(styles.includes('.schema-skills .data-head'), 'Ширина таблицы специализированных навыков не настроена');
assert.ok(html.includes('id="spell-add-grimoire"'), 'Переключатель гримуара не подключён');
assert.ok(main.includes("grimoire:Boolean(row.grimoire)"), 'Флаг гримуара не мигрирует между версиями JSON');
assert.ok(styles.includes('.spell-entry.is-grimoire'), 'Оформление заклинаний из гримуара не найдено');
assert.equal((html.match(/data-sheet-list-search=/g) || []).length, 3, 'Поиск должен быть у умений, талантов и заклинаний');
assert.ok(main.includes('function filterSheetList(type)'), 'Фильтрация списков не подключена');
assert.ok(styles.includes('.sheet-list-viewport{') && styles.includes('max-height:430px'), 'Прокрутка длинных списков не настроена');

console.log(`Проверено: ${TALENTS.length} талантов, ${SPELLS.length} заклинаний, автоэффекты талантов, формулы, d100, поиск и прокрутка списков, гримуар, портрет, 6 силуэтов, шрифт и две темы.`);
