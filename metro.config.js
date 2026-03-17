// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Ignorar carpetas que quieras excluir
config.resolver.blockList = [
  /.*[\/]types[\/].*/, 
];

module.exports = withNativeWind(config, { input: './global.css' });
