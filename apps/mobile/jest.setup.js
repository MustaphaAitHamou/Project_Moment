/* global jest */
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
// Les polices d'icônes ne sont pas chargées dans les tests.
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
