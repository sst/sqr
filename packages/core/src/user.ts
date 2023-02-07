import { Entity } from "electrodb";
import { Dynamo } from "./dynamo";
export * as User from "./user";

const UserEntity = new Entity(
  {
    model: {
      entity: "user",
      version: "1",
      service: "sqr",
    },
    attributes: {
      userID: {
        type: "string",
        required: true,
      },
      spotifyID: {
        type: "string",
        required: true,
      },
      refreshToken: {
        type: "string",
        required: true,
      },
      accessToken: {
        type: "string",
      },
    },
    indexes: {
      primary: {
        pk: {
          field: "pk",
          composite: ["userID"],
        },
        sk: {
          field: "sk",
          composite: [],
        },
      },
      bySpotifyID: {
        index: "gsi1",
        pk: {
          field: "gsi1pk",
          composite: ["spotifyID"],
        },
        sk: {
          field: "gsi1sk",
          composite: [],
        },
      },
    },
  },
  Dynamo.Service
);

import Spotify from "spotify-api.js";
import { Config } from "sst/node/config";
import crypto from "crypto";

export async function fromToken(input: { access: string; refresh: string }) {
  const client = await Spotify.Client.create({
    token: {
      token: input.access,
      refreshToken: input.refresh,
      clientID: Config.SPOTIFY_CLIENT_ID,
      clientSecret: Config.SPOTIFY_CLIENT_SECRET,
    },
    userAuthorizedToken: true,
  });

  const existing = await UserEntity.query
    .bySpotifyID({
      spotifyID: client.user.id,
    })
    .go();
  if (!existing.data[0]) {
    const user = await UserEntity.create({
      userID: crypto.randomUUID(),
      spotifyID: client.user.id,
      refreshToken: input.refresh,
      accessToken: input.access,
    }).go();
    return user.data;
  }

  return UserEntity.update({
    userID: existing.data[0].userID,
  })
    .set({
      refreshToken: input.refresh,
      accessToken: input.access,
    })
    .go({
      response: "all_new",
    });
}
