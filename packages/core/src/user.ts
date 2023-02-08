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
        required: true,
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

import crypto from "crypto";
import { Bus } from "./bus";
import { Spotify } from "./spotify";

declare module "./bus" {
  export interface Events {
    "user.login": {
      userID: string;
    };
  }
}

export async function fromID(userID: string) {
  const result = await UserEntity.get({
    userID,
  }).go();
  return result.data;
}

export async function login(input: Spotify.Credentials) {
  const client = await Spotify.client(input);

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
    await Bus.publish("user.login", {
      userID: user.data.userID,
    });
    return user.data;
  }

  const result = await UserEntity.update({
    userID: existing.data[0].userID,
  })
    .set({
      refreshToken: input.refresh,
      accessToken: input.access,
    })
    .go({
      response: "all_new",
    });
  await Bus.publish("user.login", {
    userID: result.data!.userID!,
  });

  return result.data!;
}
