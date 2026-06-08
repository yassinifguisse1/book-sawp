import http from "k6/http";
import { check } from "k6";

const baseUrl = __ENV.BASE_URL;
const authCookie = __ENV.AUTH_COOKIE;
const trpcPath = __ENV.WRITE_TRPC_PATH;
const body = __ENV.WRITE_TRPC_BODY;

export const options = {
  scenarios: {
    marketplace_writes: {
      executor: "constant-arrival-rate",
      rate: Number(__ENV.WRITE_RPS || 200),
      timeUnit: "1s",
      duration: __ENV.DURATION || "2m",
      preAllocatedVUs: 100,
      maxVUs: 800,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1000"],
  },
};

export default function writeMarketplaceFixture() {
  if (!baseUrl || !authCookie || !trpcPath || !body) {
    throw new Error("BASE_URL, AUTH_COOKIE, WRITE_TRPC_PATH, and WRITE_TRPC_BODY are required");
  }
  const response = http.post(`${baseUrl}${trpcPath}`, body, {
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookie,
    },
  });
  check(response, {
    "write returns success": (result) => result.status >= 200 && result.status < 300,
  });
}
