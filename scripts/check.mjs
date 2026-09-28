import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { evaluateD100Check, resolveDuration, resolveTalentMaximum } from '../src/formulas.js';
import TALENTS from '../src/data/talents.json' with { type: 'json' };
import SPELLS from '../src/data/spells.json' with { type: 'json' };

const bonuses = { ws: 4, bs: 4, s: 5, t: 4, i: 5, ag: 4, dex: 3, int: 6, wp: 7, fel: 5 };
const getBonus = (key) => bonuses[key] || 0;

assert.equal(resolveDuration('рСВ минут', getBonus), '7 минут');
assert.equal(resolveDuration('рСВ*2 раундов', getBonus), '14 раундов');
assert.equal(resolveDuration('[2 × РЕЙТИНГ СИЛЫ ВОЛИ] РАУНДОВ+', getBonus), '14 РАУНДОВ+');
assert.equal(resolveTalentMaximum('РИнт', getBonus).display, '6');
assert.equal(resolveTalentMaximum('РИнт + РСВ', getBonus).display, '13');
assert.equal(resolveTalentMaximum('Нет', getBonus).display, '∞');

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

console.log(`Проверено: ${TALENTS.length} талантов, ${SPELLS.length} заклинаний, формулы, d100, портрет, 6 силуэтов, шрифт и две темы.`);
