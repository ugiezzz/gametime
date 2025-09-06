// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Simple React alias to ensure consistent resolution
config.resolver = config.resolver || {};
config.resolver.alias = {
  ...(config.resolver.alias || {}),
  react: path.resolve(__dirname, 'node_modules', 'react'),
};

module.exports = withNativeWind(config, {
  input: './global.css',
});
