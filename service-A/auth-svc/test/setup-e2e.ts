// this file runs before all tests
// set environment variables that modules need during initialization
process.env.JWT_SECRET = "test-jwt-secret-key-for-e2e-tests";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
