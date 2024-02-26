import http from "http";
import Koa from "koa";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApitallyClient } from "../../src/common/client.js";
import { mockApitallyHub } from "../utils.js";
import { getAppWithKoaRoute, getAppWithKoaRouter } from "./app.js";

const testCases = [
  {
    name: "Middleware for Koa with koa-router",
    router: "koa-router",
    getApp: getAppWithKoaRouter,
  },
  {
    name: "Middleware for Koa with koa-route",
    router: "koa-route",
    getApp: getAppWithKoaRoute,
  },
];

testCases.forEach(({ name, router, getApp }) => {
  describe(name, () => {
    let app: Koa;
    let appTest: request.SuperTest<request.Test>;
    let client: ApitallyClient;

    beforeEach(async () => {
      mockApitallyHub();
      app = getApp();
      const server = http.createServer(app.callback());
      appTest = request(server);
      client = ApitallyClient.getInstance();

      // Wait for 0.2 seconds for app info to be set
      await new Promise((resolve) => setTimeout(resolve, 200));
    });

    it("Request logger", async () => {
      await appTest.get("/hello?name=John&age=20").expect(200);
      await appTest.post("/hello").send({ name: "John", age: 20 }).expect(200);

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      await appTest.get("/error").expect(500);
      consoleSpy.mockRestore();

      const requests = client.requestCounter.getAndResetRequests();
      expect(requests.length).toBe(3);
      expect(
        requests.some(
          (r) =>
            r.method === "GET" &&
            r.path === "/hello" &&
            r.status_code === 200 &&
            r.request_size_sum == 0 &&
            r.response_size_sum > 0,
        ),
      ).toBe(true);
      expect(
        requests.some(
          (r) =>
            r.method === "POST" &&
            r.path === "/hello" &&
            r.status_code === 200 &&
            r.request_size_sum > 0 &&
            r.response_size_sum > 0,
        ),
      ).toBe(true);
      expect(requests.some((r) => r.status_code === 500)).toBe(true);
    });

    if (router === "koa-router") {
      it("List endpoints", async () => {
        expect(client.appInfo?.paths).toEqual([
          {
            method: "GET",
            path: "/hello",
          },
          {
            method: "GET",
            path: "/hello/:id",
          },
          {
            method: "POST",
            path: "/hello",
          },
          {
            method: "GET",
            path: "/error",
          },
        ]);
      });
    }

    afterEach(async () => {
      if (client) {
        await client.handleShutdown();
      }
    });
  });
});
