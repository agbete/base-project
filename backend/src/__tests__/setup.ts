// ========================================
// CONFIGURATION DES TESTS
// ========================================

// Configuration de l'environnement de test
process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = 'test-jwt-secret-key-for-testing-only';
process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-key-for-testing-only';
process.env['DATABASE_URL'] = 'postgresql://test_user:test_password@localhost:5432/test_db';
process.env['REDIS_HOST'] = 'localhost';
process.env['REDIS_PORT'] = '6379';
process.env['REDIS_PASSWORD'] = '';
process.env['REDIS_DB'] = '1'; // Base de données Redis différente pour les tests

// Timeout global pour les tests
jest.setTimeout(10000);

// Mock des services externes si nécessaire
beforeAll(async () => {
  // Configuration globale avant tous les tests
});

afterAll(async () => {
  // Nettoyage après tous les tests
});

beforeEach(() => {
  // Configuration avant chaque test
});

afterEach(() => {
  // Nettoyage après chaque test
});

