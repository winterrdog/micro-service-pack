import { newDb } from "pg-mem";
import request from "supertest";
import { DataType } from "pg-mem";
import { ValidationPipe } from "@nestjs/common";
import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { AuthModule } from "../src/auth/auth.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { GlobalExceptionFilter } from "../src/common/filters/global.filter";

describe("AuthController (e2e)", () => {
    describe("POST /auth/register", () => {
        let app: INestApplication;

        beforeAll(async () => {
            const testApp = await createTestApp();
            app = testApp.app;
        });

        afterAll(async () => {
            if (app) await app.close();
        });

        it("should register a new user successfully", async () => {
            const response = await request(app.getHttpServer())
                .post("/auth/register")
                .send({
                    email: "test@example.com",
                    phone: "+12025551234",
                    password: "SecurePass123!",
                })
                .expect(201);

            expect(response.body).toMatchObject({
                success: true,
                message: expect.stringContaining("registered"),
                data: {
                    id: expect.any(String),
                    email: "test@example.com",
                    phone: "+12025551234",
                },
            });
            expect(response.body.data.password).toBeUndefined();
        });

        it("should return 409 if email already exists", async () => {
            const uniqueEmail = "duplicate@example.com";

            await request(app.getHttpServer())
                .post("/auth/register")
                .send({
                    email: uniqueEmail,
                    phone: "+12025551235",
                    password: "SecurePass123!",
                })
                .expect(201);

            const response = await request(app.getHttpServer())
                .post("/auth/register")
                .send({
                    email: uniqueEmail,
                    phone: "+12025551236",
                    password: "SecurePass123!",
                })
                .expect(409);

            expect(response.body).toMatchObject({
                success: false,
                message: expect.stringContaining("already exists"),
            });
        });

        it("should return 409 if phone already exists", async () => {
            const uniquePhone = "+12025551237";

            await request(app.getHttpServer())
                .post("/auth/register")
                .send({
                    email: "unique1@example.com",
                    phone: uniquePhone,
                    password: "SecurePass123!",
                })
                .expect(201);

            const response = await request(app.getHttpServer())
                .post("/auth/register")
                .send({
                    email: "unique2@example.com",
                    phone: uniquePhone,
                    password: "SecurePass123!",
                })
                .expect(409);

            expect(response.body).toMatchObject({
                success: false,
                message: expect.stringContaining("already exists"),
            });
        });

        it("should return 400 for invalid email", async () => {
            const response = await request(app.getHttpServer())
                .post("/auth/register")
                .send({
                    email: "invalid-email",
                    phone: "+12025551238",
                    password: "SecurePass123!",
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it("should return 400 for weak password", async () => {
            const response = await request(app.getHttpServer())
                .post("/auth/register")
                .send({
                    email: "test2@example.com",
                    phone: "+12025551239",
                    password: "weak",
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it("should return 400 for invalid phone number", async () => {
            const response = await request(app.getHttpServer())
                .post("/auth/register")
                .send({
                    email: "test3@example.com",
                    phone: "invalid-phone",
                    password: "SecurePass123!",
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe("POST /auth/login", () => {
        let app: INestApplication;

        beforeAll(async () => {
            const testApp = await createTestApp();
            app = testApp.app;

            // register a user for login tests
            await request(app.getHttpServer()).post("/auth/register").send({
                email: "login@example.com",
                phone: "+12025551240",
                password: "LoginPass123!",
            });
        });

        afterAll(async () => {
            if (app) await app.close();
        });

        it("should login with email successfully", async () => {
            const response = await request(app.getHttpServer())
                .post("/auth/login")
                .send({
                    identifier: "login@example.com",
                    password: "LoginPass123!",
                })
                .expect(201);

            expect(response.body).toMatchObject({
                success: true,
                message: expect.stringContaining("logged in"),
                data: {
                    accessToken: expect.any(String),
                    refreshToken: expect.any(String),
                },
            });
        });

        it("should login with phone successfully", async () => {
            const response = await request(app.getHttpServer())
                .post("/auth/login")
                .send({
                    identifier: "+12025551240",
                    password: "LoginPass123!",
                })
                .expect(201);

            expect(response.body).toMatchObject({
                success: true,
                message: expect.stringContaining("logged in"),
                data: {
                    accessToken: expect.any(String),
                    refreshToken: expect.any(String),
                },
            });
        });

        it("should return 401 for wrong password", async () => {
            const response = await request(app.getHttpServer())
                .post("/auth/login")
                .send({
                    identifier: "login@example.com",
                    password: "WrongPassword123!",
                })
                .expect(401);

            expect(response.body).toMatchObject({
                success: false,
                message: expect.stringContaining("Invalid credentials"),
            });
        });

        it("should return 401 for non-existent user", async () => {
            const response = await request(app.getHttpServer())
                .post("/auth/login")
                .send({
                    identifier: "nonexistent@example.com",
                    password: "SomePass123!",
                })
                .expect(401);

            expect(response.body).toMatchObject({
                success: false,
                message: expect.stringContaining("Invalid credentials"),
            });
        });

        it("should return 400 for invalid identifier format", async () => {
            const response = await request(app.getHttpServer())
                .post("/auth/login")
                .send({
                    identifier: "not-email-or-phone",
                    password: "SomePass123!",
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe("POST /auth/refresh-token", () => {
        let app: INestApplication;
        let validRefreshToken: string;

        beforeAll(async () => {
            const testApp = await createTestApp();
            app = testApp.app;

            // register and login to get a refresh token
            await request(app.getHttpServer()).post("/auth/register").send({
                email: "refresh@example.com",
                phone: "+12025551241",
                password: "RefreshPass123!",
            });

            const loginResponse = await request(app.getHttpServer()).post("/auth/login").send({
                identifier: "refresh@example.com",
                password: "RefreshPass123!",
            });

            validRefreshToken = loginResponse.body.data.refreshToken;
        });

        afterAll(async () => {
            if (app) await app.close();
        });

        it("should refresh tokens successfully", async () => {
            const response = await request(app.getHttpServer())
                .post("/auth/refresh-token")
                .send({
                    oldRefreshToken: validRefreshToken,
                })
                .expect(201);

            expect(response.body).toMatchObject({
                success: true,
                message: expect.stringContaining("renewed"),
                data: {
                    accessToken: expect.any(String),
                    refreshToken: expect.any(String),
                },
            });

            // New tokens should be different from old ones
            expect(response.body.data.refreshToken).not.toBe(validRefreshToken);
        });

        it("should return 401 for invalid refresh token", async () => {
            const response = await request(app.getHttpServer())
                .post("/auth/refresh-token")
                .send({
                    oldRefreshToken: "invalid.token.here",
                })
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain("Invalid refresh token");
        });

        it("should return 401 for already used refresh token", async () => {
            // Login to get a new token
            const loginResponse = await request(app.getHttpServer()).post("/auth/login").send({
                identifier: "refresh@example.com",
                password: "RefreshPass123!",
            });

            const token = loginResponse.body.data.refreshToken;

            // Use the token once
            await request(app.getHttpServer())
                .post("/auth/refresh-token")
                .send({
                    oldRefreshToken: token,
                })
                .expect(201);

            // Try to use it again - should fail
            const response = await request(app.getHttpServer())
                .post("/auth/refresh-token")
                .send({
                    oldRefreshToken: token,
                })
                .expect(401);

            expect(response.body).toMatchObject({
                success: false,
                message: expect.stringContaining("Invalid refresh token"),
            });
        });
    });

    describe("POST /auth/me", () => {
        let app: INestApplication;
        let accessToken: string;
        let userId: string;

        beforeAll(async () => {
            const testApp = await createTestApp();
            app = testApp.app;

            // Register and login to get an access token
            const registerResponse = await request(app.getHttpServer())
                .post("/auth/register")
                .send({
                    email: "me@example.com",
                    phone: "+12025551242",
                    password: "MePass123!",
                });

            userId = registerResponse.body.data.id;

            const loginResponse = await request(app.getHttpServer()).post("/auth/login").send({
                identifier: "me@example.com",
                password: "MePass123!",
            });

            accessToken = loginResponse.body.data.accessToken;
        });

        afterAll(async () => {
            if (app) await app.close();
        });

        it("should return user info with valid token", async () => {
            const response = await request(app.getHttpServer())
                .post("/auth/me")
                .set("Authorization", `Bearer ${accessToken}`)
                .expect(201);

            expect(response.body).toMatchObject({
                success: true,
                message: expect.stringContaining("Authenticated"),
                data: {
                    id: userId,
                    email: "me@example.com",
                    phone: "+12025551242",
                },
            });
            expect(response.body.data.password).toBeUndefined();
        });

        it("should return 401 without token", async () => {
            await request(app.getHttpServer()).post("/auth/me").expect(401);
        });

        it("should return 401 with invalid token", async () => {
            await request(app.getHttpServer())
                .post("/auth/me")
                .set("Authorization", "Bearer invalid.token.here")
                .expect(401);
        });

        it("should return 401 with malformed authorization header", async () => {
            await request(app.getHttpServer())
                .post("/auth/me")
                .set("Authorization", "InvalidFormat")
                .expect(401);
        });
    });

    describe("POST /auth/logout", () => {
        let app: INestApplication;

        beforeAll(async () => {
            const testApp = await createTestApp();
            app = testApp.app;
        });

        afterAll(async () => {
            if (app) await app.close();
        });

        it("should logout successfully", async () => {
            // Register and login
            const email = "logout@example.com";
            const phone = "+12025551243";

            await request(app.getHttpServer()).post("/auth/register").send({
                email,
                phone,
                password: "LogoutPass123!",
            });

            const loginResponse = await request(app.getHttpServer()).post("/auth/login").send({
                identifier: email,
                password: "LogoutPass123!",
            });

            const refreshToken = loginResponse.body.data.refreshToken;

            // Logout
            const response = await request(app.getHttpServer())
                .post("/auth/logout")
                .send({
                    refreshToken,
                })
                .expect(201);

            expect(response.body).toMatchObject({
                success: true,
                message: expect.stringContaining("Logged out"),
            });

            // Verify token is invalidated
            await request(app.getHttpServer())
                .post("/auth/refresh-token")
                .send({
                    oldRefreshToken: refreshToken,
                })
                .expect(401);
        });

        it("should return 400 for missing refresh token", async () => {
            const response = await request(app.getHttpServer())
                .post("/auth/logout")
                .send({})
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });
});

// ========
// HELPERS
// ========

// helper function to create a test app with isolated database
async function createTestApp() {
    const db = newDb({
        autoCreateForeignKeyIndices: true,
    });

    // Register uuid functions with unique IDs
    var idCounter = 0;
    const generateUUID = () => {
        idCounter++;
        // generate a valid UUID format with incrementing counter
        const hex = idCounter.toString(16).padStart(12, "0");
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4000-8000-${Date.now().toString(16).padStart(12, "0")}`;
    };

    db.public.registerFunction({
        name: "gen_random_uuid",
        returns: DataType.uuid,
        implementation: generateUUID,
    });

    db.public.registerFunction({
        name: "uuid_generate_v4",
        returns: DataType.uuid,
        implementation: generateUUID,
    });

    db.public.registerFunction({
        name: "now",
        returns: DataType.timestamp,
        implementation: () => new Date(),
    });

    // create tables without DEFAULT values - we'll handle them in the mock
    db.public.none(`
        CREATE TABLE "User" (
            "id" TEXT PRIMARY KEY,
            "email" TEXT UNIQUE NOT NULL,
            "phone" TEXT UNIQUE NOT NULL,
            "password" TEXT NOT NULL,
            "createdAt" TIMESTAMP NOT NULL
        );
    `);

    db.public.none(`
        CREATE TABLE "RefreshToken" (
            "id" TEXT PRIMARY KEY,
            "userId" TEXT NOT NULL,
            "token" TEXT UNIQUE NOT NULL,
            "expiresAt" TIMESTAMP NOT NULL,
            "createdAt" TIMESTAMP NOT NULL,
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
        );
    `);

    const { Pool } = db.adapters.createPg();
    const pool = new Pool();

    // mock Prisma service
    const mockPrismaService = {
        user: {
            findFirst: async (args: any) => {
                try {
                    const where = args?.where;
                    if (!where) return null;

                    let query = 'SELECT * FROM "User" WHERE ';
                    const conditions: string[] = [];
                    const values: any[] = [];
                    let paramIndex = 1;

                    if (where.OR) {
                        const orConditions: string[] = [];
                        for (const condition of where.OR) {
                            if (condition.email) {
                                orConditions.push(`"email" = $${paramIndex++}`);
                                values.push(condition.email);
                            }
                            if (condition.phone) {
                                orConditions.push(`"phone" = $${paramIndex++}`);
                                values.push(condition.phone);
                            }
                        }
                        if (orConditions.length > 0) {
                            conditions.push(`(${orConditions.join(" OR ")})`);
                        }
                    }

                    if (where.id) {
                        conditions.push(`"id" = $${paramIndex++}`);
                        values.push(where.id);
                    }

                    if (conditions.length === 0) return null;

                    query += conditions.join(" AND ");
                    const result = await pool.query(query, values);
                    return result.rows[0] || null;
                } catch (error) {
                    return null;
                }
            },
            create: async (args: any) => {
                try {
                    const { email, phone, password } = args.data;
                    const id = generateUUID();
                    const createdAt = new Date();
                    const result = await pool.query(
                        `INSERT INTO "User" ("id", "email", "phone", "password", "createdAt") VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                        [id, email, phone, password, createdAt],
                    );
                    return result.rows[0];
                } catch (error: any) {
                    // unique constraint violations
                    if (error.code === "23505" || error.message?.includes("unique")) {
                        throw { code: "P2002", meta: { target: ["email", "phone"] } };
                    }
                    throw error;
                }
            },
            findUnique: async (args: any) => {
                try {
                    const id = args?.where?.id;
                    if (!id) return null;
                    const result = await pool.query(`SELECT * FROM "User" WHERE "id" = $1`, [id]);
                    return result.rows[0] || null;
                } catch (error) {
                    return null;
                }
            },
        },
        refreshToken: {
            create: async (args: any) => {
                try {
                    const { userId, token, expiresAt } = args.data;
                    const id = generateUUID();
                    const createdAt = new Date();
                    const result = await pool.query(
                        `INSERT INTO "RefreshToken" ("id", "userId", "token", "expiresAt", "createdAt") VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                        [id, userId, token, expiresAt, createdAt],
                    );
                    return result.rows[0];
                } catch (error: any) {
                    console.error("refreshToken.create error:", error.message);
                    throw error;
                }
            },
            findFirst: async (args: any) => {
                try {
                    const where = args?.where;
                    if (!where || !where.token) return null;

                    let query = `SELECT rt.* FROM "RefreshToken" rt WHERE rt."token" = $1`;
                    const values: any[] = [where.token];

                    if (where.expiresAt?.gt) {
                        query += ` AND rt."expiresAt" > $2`;
                        values.push(where.expiresAt.gt);
                    }

                    const result = await pool.query(query, values);
                    if (!result.rows[0]) return null;

                    const row = result.rows[0];

                    // If include user, fetch user separately
                    if (args?.include?.user) {
                        const userResult = await pool.query(
                            `SELECT * FROM "User" WHERE "id" = $1`,
                            [row.userId],
                        );
                        return {
                            ...row,
                            user: userResult.rows[0] || null,
                        };
                    }

                    return row;
                } catch (error) {
                    return null;
                }
            },
            delete: async (args: any) => {
                try {
                    const token = args?.where?.token;
                    if (!token) return null;
                    const result = await pool.query(
                        `DELETE FROM "RefreshToken" WHERE "token" = $1 RETURNING *`,
                        [token],
                    );
                    return result.rows[0] || null;
                } catch (error) {
                    return null;
                }
            },
        },
        $connect: async () => {},
        $disconnect: async () => {},
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AuthModule],
    })
        .overrideProvider(PrismaService)
        .useValue(mockPrismaService as any)
        .compile();

    const app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());

    await app.init();

    return { app, db };
}
