// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Ignorar carpetas que quieras excluir
config.resolver.blockList = [
  /.*[\/]types[\/].*/,
];

module.exports = config;
