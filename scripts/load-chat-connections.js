import ws from "k6/ws";
import { check } from "k6";

const websocketUrl = __ENV.ABLY_WEBSOCKET_URL;

export const options = {
  scenarios: {
    chat_connections: {
      executor: "constant-vus",
      vus: Number(__ENV.CHAT_CONNECTIONS || 10000),
      duration: __ENV.DURATION || "5m",
    },
  },
};

export default function connectChatClient() {
  if (!websocketUrl) throw new Error("ABLY_WEBSOCKET_URL is required");
  const response = ws.connect(websocketUrl, {}, (socket) => {
    socket.setTimeout(() => socket.close(), 4 * 60 * 1000);
  });
  check(response, {
    "chat websocket connects": (result) => result?.status === 101,
  });
}
