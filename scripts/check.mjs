import assert from 'node:assert/strict';
import { resolveDuration, resolveTalentMaximum } from '../src/formulas.js';
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

console.log(`Проверено: ${TALENTS.length} талантов, ${SPELLS.length} заклинаний, формулы характеристик.`);
