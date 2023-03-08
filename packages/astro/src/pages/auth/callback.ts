import type { APIRoute } from "astro";
import { Auth } from "sst/node/future/auth";

export const get: APIRoute = async (ctx) => {
  const code = ctx.url.searchParams.get("code");
  if (!code) {
    throw new Error("Code missing");
  }
  const response = await fetch(Auth.auth.url + "/token", {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: "local",
      code,
      redirect_uri: `${ctx.url.origin}${ctx.url.pathname}`,
    }),
  }).then((r) => r.json());
  ctx.cookies.set("sst_auth_token", response.access_token, {
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return ctx.redirect("/", 302);
};
