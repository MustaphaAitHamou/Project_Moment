// Monorepo pnpm : la configuration par défaut d'Expo détecte l'espace de travail
// (dossiers surveillés et résolution des node_modules à la racine).
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
