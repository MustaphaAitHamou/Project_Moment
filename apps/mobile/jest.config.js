/** Tests unitaires et de composants (jest-expo). */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['./jest.setup.js'],
  testMatch: ['<rootDir>/__tests__/**/*.test.ts?(x)'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  // Paquets publiés en ESM (use-intl et ses dépendances) : à transformer comme React Native.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg|use-intl|intl-messageformat|icu-minify|@formatjs/.*|@schummar/.*)',
  ],
};
