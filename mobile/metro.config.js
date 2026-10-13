// Metro : l'app mobile réutilise les règles métier pures du site web
// (src/lib/files.ts, plans.ts, folder-tree.ts, types) : une seule source de vérité.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, "../src/lib")];
// Les modules partagés n'importent aucun paquet : on ne résout que dans mobile/node_modules.
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")];

module.exports = config;
