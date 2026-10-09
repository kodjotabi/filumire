import { GET } from "./apps/learner/app/api/learning/route.ts";

const request = new Request(
  "http://localhost/api/learning?sessionId=session-security-boundary-002",
  {
    headers: {
      "x-filumire-learner-id":
        "learner-security-attacker-002",
    },
  },
);

const response = await GET(request);

const body = await response.json();

console.log({
  expectedStatus: 401,
  actualStatus: response.status,
  response: body,
  result:
    response.status === 401
      ? "PASS"
      : "FAIL",
});

process.exit(
  response.status === 401 ? 0 : 1,
);