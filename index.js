exports.normalizeTitle = function normalizeTitle(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/(^|\s)\S/g, (character) => character.toUpperCase());
};
