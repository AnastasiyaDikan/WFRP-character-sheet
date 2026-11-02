const TALENT_BONUS_CODES = new Map([
  ['рбб', 'ws'], ['рдб', 'bs'], ['рс', 's'], ['рв', 't'], ['ри', 'i'],
  ['рл', 'ag'], ['рпр', 'dex'], ['ринт', 'int'], ['рсв', 'wp'], ['рх', 'fel'],
]);

const DURATION_BONUS_CODES = new Map([
  ['бб', 'ws'], ['дб', 'bs'], ['с', 's'], ['в', 't'], ['и', 'i'],
  ['л', 'ag'], ['пр', 'dex'], ['инт', 'int'], ['св', 'wp'], ['х', 'fel'],
]);

const CHARACTERISTIC_NAMES = new Map([
  ['навык рукопашной', 'ws'], ['ближний бой', 'ws'],
  ['навык стрельбы', 'bs'], ['дальний бой', 'bs'],
  ['сила', 's'], ['силы', 's'], ['выносливость', 't'], ['выносливости', 't'],
  ['инициатива', 'i'], ['инициативы', 'i'], ['ловкость', 'ag'], ['ловкости', 'ag'],
  ['проворство', 'dex'], ['проворства', 'dex'], ['интеллект', 'int'], ['интеллекта', 'int'],
  ['сила воли', 'wp'], ['силы воли', 'wp'],
  ['общительность', 'fel'], ['общительности', 'fel'], ['харизма', 'fel'], ['харизмы', 'fel'],
]);

const normalize = (value) => String(value || '')
  .trim()
  .toLocaleLowerCase('ru-RU')
  .replace(/ё/g, 'е')
  .replace(/\s+/g, ' ');

const AUTOMATIC_TALENT_ALIASES = new Map([
  ['hardy', 'здоровяк'],
  ['стойкий', 'здоровяк'],
  ['хладнокровный', 'самообладание'],
  ['молниеносные рефлексы', 'молниеносная реакция'],
  ['very resilient', 'закалка'],
  ['nimble fingered', 'ловкие пальцы'],
  ['marksman', 'меткость'],
  ['lightning reflexes', 'молниеносная реакция'],
  ['warrior born', 'прирожденный воин'],
  ['sharp', 'проницательность'],
  ['coolheaded', 'самообладание'],
  ['very strong', 'силач'],
  ['savvy', 'смекалка'],
  ['suave', 'учтивость'],
]);

const CHARACTERISTIC_TALENT_EFFECTS = new Map([
  ['закалка', { characteristic: 't', label: 'Закалка' }],
  ['ловкие пальцы', { characteristic: 'dex', label: 'Ловкие пальцы' }],
  ['меткость', { characteristic: 'bs', label: 'Меткость' }],
  ['молниеносная реакция', { characteristic: 'ag', label: 'Молниеносная реакция' }],
  ['прирожденный воин', { characteristic: 'ws', label: 'Прирождённый воин' }],
  ['проницательность', { characteristic: 'i', label: 'Проницательность' }],
  ['самообладание', { characteristic: 'wp', label: 'Самообладание' }],
  ['силач', { characteristic: 's', label: 'Силач' }],
  ['смекалка', { characteristic: 'int', label: 'Смекалка' }],
  ['учтивость', { characteristic: 'fel', label: 'Учтивость' }],
]);

function automaticTalentKey(name) {
  const key = normalize(name);
  return AUTOMATIC_TALENT_ALIASES.get(key) || key;
}

export function calculateAutomaticTalentEffects(talents = []) {
  const characteristicBonuses = {};
  const characteristicSources = {};
  const applied = new Set();
  let hardyRanks = 0;

  for (const talent of talents) {
    const ranks = Math.max(0, Math.trunc(Number(talent?.taken ?? 1) || 0));
    if (!ranks) continue;
    const key = automaticTalentKey(talent?.name);
    if (key === 'здоровяк') {
      hardyRanks = Math.max(hardyRanks, ranks);
      continue;
    }
    const effect = CHARACTERISTIC_TALENT_EFFECTS.get(key);
    if (!effect || applied.has(key)) continue;
    applied.add(key);
    characteristicBonuses[effect.characteristic] = (characteristicBonuses[effect.characteristic] || 0) + 5;
    characteristicSources[effect.characteristic] = effect.label;
  }

  return { characteristicBonuses, characteristicSources, hardyRanks };
}

export function calculateWounds(getCharacteristic, talents = []) {
  const strengthBonus = Math.floor((Number(getCharacteristic('s')) || 0) / 10);
  const toughnessBonus = Math.floor((Number(getCharacteristic('t')) || 0) / 10);
  const willpowerBonus = Math.floor((Number(getCharacteristic('wp')) || 0) / 10);
  const { hardyRanks } = calculateAutomaticTalentEffects(talents);
  const hardyBonus = hardyRanks * toughnessBonus;
  return {
    value: strengthBonus + 2 * toughnessBonus + willpowerBonus + hardyBonus,
    strengthBonus,
    toughnessBonus,
    willpowerBonus,
    hardyRanks,
    hardyBonus,
  };
}

export function resolveTalentMaximum(formula, getBonus) {
  const source = String(formula || '').trim();
  if (!source) return { display: '—', value: null };
  if (normalize(source) === 'нет') return { display: '∞', value: Infinity };
  if (/^\d+$/.test(source)) {
    const value = Number(source);
    return { display: String(value), value };
  }

  let total = 0;
  let recognized = true;
  for (const part of source.split('+')) {
    const characteristic = TALENT_BONUS_CODES.get(normalize(part).replace(/\s/g, ''));
    if (!characteristic) {
      recognized = false;
      break;
    }
    total += Number(getBonus(characteristic)) || 0;
  }
  return recognized ? { display: String(total), value: total } : { display: source, value: null };
}

export function resolveDuration(duration, getBonus) {
  const source = String(duration || '').trim();
  if (!source) return '';
  let changed = false;

  let result = source.replace(
    /\[\s*(?:(\d+)\s*[xх×*]\s*)?(?:РЕЙТИНГ\s+)?([^\]]+?)\s*\]/giu,
    (match, multiplier, characteristicName) => {
      const characteristic = CHARACTERISTIC_NAMES.get(normalize(characteristicName));
      if (!characteristic) return match;
      changed = true;
      return String((Number(multiplier) || 1) * (Number(getBonus(characteristic)) || 0));
    },
  );

  result = result.replace(
    /(?<![\p{L}\p{N}])(?:рейтинг|бонус)\s+(СВ|ББ|ДБ|Инт|Пр|С|В|И|Л|Х|сил(?:а|ы)\s+воли|навыка?\s+рукопашной|навыка?\s+стрельбы|силы|выносливости|инициативы|ловкости|проворства|интеллекта|общительности|харизмы)(?![\p{L}\p{N}])/giu,
    (match, characteristicName) => {
      const characteristic = DURATION_BONUS_CODES.get(normalize(characteristicName))
        || CHARACTERISTIC_NAMES.get(normalize(characteristicName));
      if (!characteristic) return match;
      changed = true;
      return String(Number(getBonus(characteristic)) || 0);
    },
  );

  result = result.replace(
    /(?<![\p{L}\p{N}])р?(Инт|Пр|СВ|ББ|ДБ|С|В|И|Л|Х)(?![\p{L}\p{N}])(?:\s*[xх×*]\s*(\d+)(?![\p{L}\p{N}]))?/giu,
    (match, code, multiplier) => {
      const characteristic = DURATION_BONUS_CODES.get(normalize(code));
      if (!characteristic) return match;
      changed = true;
      return String((Number(getBonus(characteristic)) || 0) * (Number(multiplier) || 1));
    },
  );

  return changed ? result.replace(/\*/g, '×') : '';
}

export function evaluateD100Check(threshold, roll) {
  const target = Math.max(0, Math.trunc(Number(threshold) || 0));
  const value = Math.max(1, Math.min(100, Math.trunc(Number(roll) || 1)));
  const success = value === 1 || (value !== 100 && value <= target);
  const successLevel = Math.floor(target / 10) - Math.floor(value / 10);
  const isDouble = value === 100 || (value >= 11 && value <= 99 && value % 11 === 0);
  const criticalSuccess = success && (value === 1 || isDouble);
  const criticalFailure = !success && isDouble;
  const successes = success ? Math.max(0, successLevel) + (value === 1 ? 1 : 0) : 0;
  const failures = success ? 0 : Math.max(0, -successLevel);

  return {
    target,
    roll: value,
    success,
    successLevel,
    successes,
    failures,
    isDouble,
    criticalSuccess,
    criticalFailure,
  };
}
