import http from "k6/http";
import { check } from "k6";

const baseUrl = __ENV.BASE_URL || "http://localhost:3000";

export const options = {
  scenarios: {
    public_reads: {
      executor: "constant-arrival-rate",
      rate: Number(__ENV.READ_RPS || 1000),
      timeUnit: "1s",
      duration: __ENV.DURATION || "2m",
      preAllocatedVUs: 200,
      maxVUs: 1500,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<750"],
  },
};

export default function readMarketplaceFeed() {
  const response = http.get(`${baseUrl}/api/trpc/book.list?batch=1&input=${encodeURIComponent('{"0":{"json":{"sort":"recent","limit":20,"offset":0}}}')}`);
  check(response, {
    "public feed returns 200": (result) => result.status === 200,
  });
}
