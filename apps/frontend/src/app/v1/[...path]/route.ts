import { proxyBackendRequest } from "./backend-proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function handleBackendRequest(request: Request): Promise<Response> {
  return proxyBackendRequest(request);
}

export const GET = handleBackendRequest;
export const OPTIONS = handleBackendRequest;
export const POST = handleBackendRequest;
