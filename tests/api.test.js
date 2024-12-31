const request = require("supertest");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const app = require("../api");

jest.mock("axios");
jest.mock("fs");

describe("API Endpoints", () => {
  const mockToken = "mock.jwt.token";
  const mockAdminToken = "mock.admin.jwt.token";
  const SECRET_KEY = "your_secret_key";

  beforeEach(() => {
    jest.clearAllMocks();
    fs.readFileSync.mockImplementation((path) => {
      if (path.includes("blacklistedTokens.json")) return "[]";
      if (path.includes("users.json"))
        return JSON.stringify([
          { username: "admin@mail.com", password: "admin123" },
        ]);
      if (path.includes("workTimes.json"))
        return JSON.stringify({ testuser: {} });
    });
    jest.mock("jsonwebtoken", () => ({
      sign: jest.fn((payload, secret) => mockToken),
      verify: jest.fn((token, secret, callback) => {
        if (token === mockToken) {
          callback(null, { username: "testuser", isAdmin: false }); // Mock valid token payload
        } else {
          callback(new Error("Invalid token")); // Mock invalid token behavior
        }
      }),
    }));
    jest.mock("jsonwebtoken", () => ({
      sign: jest.fn((payload, secret) => mockAdminToken),
      verify: jest.fn((token, secret, callback) => {
        if (token === mockAdminToken) {
          callback(null, { username: "adminuser", isAdmin: true }); // Mock valid token payload
        } else {
          callback(new Error("Invalid token")); // Mock invalid token behavior
        }
      }),
    }));
  });

  describe("GET /time/germany", () => {
    it("should fetch time successfully", async () => {
      const mockDateTime = "2024-01-01T12:00:00.000Z";
      axios.get.mockResolvedValueOnce({ data: { datetime: mockDateTime } });

      const response = await request(app).get("/time/germany");
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ datetime: mockDateTime });
    });

    it("should handle API failure with retries", async () => {
      axios.get.mockRejectedValue(new Error("API Error"));

      const response = await request(app).get("/time/germany");
      expect(response.status).toBe(500);
      expect(response.text).toBe("Failed to fetch time after retries");
    });
  });

  describe("POST /login", () => {
    it("should login admin successfully", async () => {
      const response = await request(app)
        .post("/login")
        .send({ username: "admin@mail.com", password: "admin123" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(response.body.isAdmin).toBe(true);
    });

    it("should reject invalid credentials", async () => {
      const response = await request(app)
        .post("/login")
        .send({ username: "wrong@mail.com", password: "wrong" });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Invalid credentials");
    });
  });

  describe("Work Time Endpoints", () => {
    const mockDateTime = "2024-01-01 12:00";

    beforeEach(() => {
      axios.get.mockResolvedValue({ data: { datetime: mockDateTime } });
    });

    describe("POST /work-time/start", () => {
      it("should set start time for user", async () => {
        const response = await request(app)
          .post("/work-time/start")
          .set("Authorization", `Bearer ${mockToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveProperty("startTime");
      });
    });

    describe("POST /work-time/end", () => {
      it("should set end time for user", async () => {
        const response = await request(app)
          .post("/work-time/end")
          .set("Authorization", `Bearer ${mockToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveProperty("endTime");
      });
    });

    describe("GET /work-time/all", () => {
      it("should return all work times for admin", async () => {
        const response = await request(app)
          .get("/work-time/all")
          .set("Authorization", `Bearer ${mockAdminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("data");
      });

      it("should reject non-admin users", async () => {
        const mockUserToken = jwt.sign(
          { username: "user@mail.com", isAdmin: false },
          SECRET_KEY
        );

        const response = await request(app)
          .get("/work-time/all")
          .set("Authorization", `Bearer ${mockUserToken}`);

        expect(response.status).toBe(403);
      });
    });

    describe("PUT /work-time/edit/:username", () => {
      it("should allow admin to edit work times", async () => {
        const response = await request(app)
          .put("/work-time/edit/testuser")
          .set("Authorization", `Bearer ${mockAdminToken}`)
          .send({
            startTime: "2024-01-01 09:00",
            endTime: "2024-01-01 17:00",
          });

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveProperty("startTime");
        expect(response.body.data).toHaveProperty("endTime");
      });

      it("should reject invalid work time data", async () => {
        const response = await request(app)
          .put("/work-time/edit/testuser")
          .set("Authorization", `Bearer ${mockAdminToken}`)
          .send({
            startTime: "2024-01-01 09:00",
          });

        expect(response.status).toBe(400);
      });
    });
  });
});
