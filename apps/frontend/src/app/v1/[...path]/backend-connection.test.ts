import { describe, expect, it } from "vitest";

import {
  BackendConnectionConfigurationError,
  resolveBackendConnection,
} from "./backend-connection";

describe("backend connection configuration", () => {
  it.each(["127.0.0.1", "localhost", "[::1]"])(
    "allows explicit unauthenticated loopback %s on the canonical local port",
    (hostname) => {
      expect(
        resolveBackendConnection({
          authAudience: "",
          authMode: "local",
          backendOrigin: `http://${hostname}:3001`,
        }),
      ).toEqual({
        authMode: "local",
        origin: `http://${hostname}:3001`,
      });
    },
  );

  it("requires the stable backend run.app origin as the OIDC audience", () => {
    expect(
      resolveBackendConnection({
        authAudience: "https://screenpilot-backend-123.region.run.app",
        authMode: "google-cloud-oidc",
        backendOrigin: "https://screenpilot-backend-123.region.run.app",
      }),
    ).toEqual({
      audience: "https://screenpilot-backend-123.region.run.app",
      authMode: "google-cloud-oidc",
      origin: "https://screenpilot-backend-123.region.run.app",
    });
  });

  it.each([
    {
      authMode: undefined,
      backendOrigin: "http://127.0.0.1:3001",
    },
    {
      authAudience: "https://backend.example",
      authMode: "local",
      backendOrigin: "http://127.0.0.1:3001",
    },
    {
      authMode: "local",
      backendOrigin: "http://192.0.2.10:3001",
    },
    {
      authMode: "local",
      backendOrigin: "http://127.0.0.1:3002",
    },
    {
      authAudience: "https://different.region.run.app",
      authMode: "google-cloud-oidc",
      backendOrigin: "https://backend.region.run.app",
    },
    {
      authAudience: "https://backend.example",
      authMode: "google-cloud-oidc",
      backendOrigin: "https://backend.example",
    },
  ])("fails closed for invalid configuration %#", (configuration) => {
    expect(() => resolveBackendConnection(configuration)).toThrow(
      BackendConnectionConfigurationError,
    );
  });
});
