const request = require('supertest');
const app = require('./server'); // Assuming server.js exports the app instance

describe('Feedback API', () => {
  it('should save feedback successfully', async () => {
    const response = await request(app)
      .post('/api/feedback')
      .send({ feedback: 'Test feedback message' });
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should return error for missing feedback', async () => {
    const response = await request(app)
      .post('/api/feedback')
      .send({});
    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should retrieve feedbacks successfully', async () => {
    const response = await request(app)
      .get('/api/feedback');
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.feedbacks)).toBe(true);
  });
});
