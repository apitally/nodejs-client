import { Test } from "@nestjs/testing";

import { useApitally } from "../../src/nestjs";
import { CLIENT_ID, ENV } from "../utils";
import { AppModule } from "./app.module";

export async function getApp() {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
    providers: [],
  }).compile();
  const app = moduleFixture.createNestApplication();
  const expressInstance = app.getHttpAdapter().getInstance();

  useApitally(expressInstance, {
    clientId: CLIENT_ID,
    env: ENV,
    syncApiKeys: true,
    appVersion: "1.2.3",
  });

  await app.init();
  return app;
}