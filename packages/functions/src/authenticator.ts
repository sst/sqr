import { AuthHandler, OauthAdapter } from "sst/node/future/auth";
import { Config } from "sst/node/config";
import { Issuer } from "openid-client";
import { User } from "@sqr/core/user";

declare module "sst/node/future/auth" {
  interface SessionTypes {
    user: {
      userID: string;
    };
  }
}

export const handler = AuthHandler({
  clients: async () => {
    return {
      local: "http://localhost",
    };
  },
  providers: {
    spotify: OauthAdapter({
      clientID: Config.SPOTIFY_CLIENT_ID,
      clientSecret: Config.SPOTIFY_CLIENT_SECRET,
      scope:
        "playlist-read-private user-read-email user-library-read playlist-modify-private",
      issuer: new Issuer({
        issuer: "https://accounts.spotify.com",
        authorization_endpoint: "https://accounts.spotify.com/authorize",
        token_endpoint: "https://accounts.spotify.com/api/token",
      }),
    }),
  },
  onSuccess: async (result) => {
    if (result.provider === "spotify") {
      const user = await User.login({
        access: result.tokenset.access_token!,
        refresh: result.tokenset.refresh_token!,
      });

      return {
        type: "user",
        properties: {
          userID: user.userID!,
        },
      };
    }

    return {
      type: "public",
      properties: {},
    };
  },
  onError: async () => {
    return {
      statusCode: 500,
      body: "something went wrong",
    };
  },
});
