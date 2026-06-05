import { beforeAll, afterAll, beforeEach, describe, it, expect } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-1234567890-abcdefghij";
process.env.JWT_EXPIRES_IN = "1h";
process.env.ADMIN_USERNAME = "admin";
process.env.ADMIN_PASSWORD = "changeme";
process.env.MONGO_URI = "mongodb://placeholder/test";

import { createApp } from "../app";
import { seedAdmin } from "../seed";
import { Link } from "../models/Link";
import { User } from "../models/User";
import { resetConfigForTests } from "../config";

let mongo: MongoMemoryServer;
const app = (() => {
  resetConfigForTests();
  return createApp({ staticDir: null });
})();

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Link.deleteMany({});
  await seedAdmin("admin", "changeme");
});

async function loginAndGetToken(): Promise<string> {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ username: "admin", password: "changeme" });
  expect(res.status).toBe(200);
  return res.body.token as string;
}

describe("health", () => {
  it("GET /api/health → 200 ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("auth", () => {
  it("rejects wrong password with 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin", password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  it("issues a JWT on valid credentials", async () => {
    const token = await loginAndGetToken();
    expect(token).toBeTypeOf("string");
    expect(token.split(".")).toHaveLength(3);
  });
});

describe("links", () => {
  it("GET /api/links is public and starts empty", async () => {
    const res = await request(app).get("/api/links");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("rejects POST /api/links without a token", async () => {
    const res = await request(app)
      .post("/api/links")
      .send({ title: "Grafana", url: "https://grafana.example.com" });
    expect(res.status).toBe(401);
  });

  it("full CRUD lifecycle with admin token", async () => {
    const token = await loginAndGetToken();

    const created = await request(app)
      .post("/api/links")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Grafana",
        url: "https://grafana.example.com",
        icon: "lucide:bar-chart",
        sortOrder: 1,
      });
    expect(created.status).toBe(201);
    const id = created.body.id as string;
    expect(id).toBeTruthy();

    const list = await request(app).get("/api/links");
    expect(list.body).toHaveLength(1);

    const updated = await request(app)
      .put(`/api/links/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Grafana (Prod)" });
    expect(updated.status).toBe(200);
    expect(updated.body.title).toBe("Grafana (Prod)");

    const del = await request(app)
      .delete(`/api/links/${id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(204);

    const after = await request(app).get("/api/links");
    expect(after.body).toEqual([]);
  });

  it("rejects invalid URL", async () => {
    const token = await loginAndGetToken();
    const res = await request(app)
      .post("/api/links")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Bad", url: "not-a-url" });
    expect(res.status).toBe(400);
  });
});
