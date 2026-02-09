// Creates this file to allow .gguf model loading
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('gguf');
config.resolver.assetExts.push('bin');
module.exports = config;
