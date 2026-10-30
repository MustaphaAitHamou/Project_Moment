const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      // Faux positifs avec les modules Expo (exports conditionnels) : TypeScript vérifie déjà ces imports.
      'import/namespace': 'off',
    },
  },
  globalIgnores(['dist-android/*', 'dist-ios/*', '.expo/*', 'coverage/*']),
]);
