// ========================================
// TESTS DE SANTÉ DE L'APPLICATION
// ========================================

import request from 'supertest';
import { app } from '../server';

describe('Health Checks', () => {
  describe('GET /health', () => {
    it('should return 200 and basic health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version');
    });
  });

  describe('GET /health/detailed', () => {
    it('should return 200 and detailed health status', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('services');
      
      // Vérifier la structure des services
      expect(response.body.services).toHaveProperty('database');
      expect(response.body.services).toHaveProperty('redis');
      expect(response.body.services).toHaveProperty('memory');
    });
  });
});

