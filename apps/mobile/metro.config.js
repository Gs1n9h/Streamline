const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add support for resolving packages from the monorepo
config.watchFolders = [
  path.resolve(__dirname, '../../packages'),
];

config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../../node_modules'),
];

// Ensure proper resolution of shared packages
config.resolver.alias = {
  '@streamline/shared-types': path.resolve(__dirname, '../../packages/shared-types/dist'),
};

module.exports = config;
