import { Router } from "express";

import { markRoute } from "../middleware/request-logging.js";

export function createHealthRoutes(isReady: () => boolean): Router {
  const router = Router();

  router.get("/live", markRoute("health_live"), (_request, response) => {
    response.type("text/plain").status(200).send("ok");
  });
  router.get("/ready", markRoute("health_ready"), (_request, response) => {
    const ready = isReady();
    response
      .type("text/plain")
      .status(ready ? 200 : 503)
      .send(ready ? "ready" : "not ready");
  });

  return router;
}
