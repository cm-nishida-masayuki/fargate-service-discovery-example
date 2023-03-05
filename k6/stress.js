import { check } from "k6";
import http from "k6/http";

export default function () {
  const res = http.get(`http://${__ENV.HOST}`);
  check(res, {
    is_status_200: (r) => r.status === 200,
  });
}
