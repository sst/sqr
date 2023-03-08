export * as Spotify from "./spotify";

import Spotify from "spotify-api.js";
import { Config } from "sst/node/config";

export interface Credentials {
  access: string;
  refresh: string;
}

export function client(input: Credentials) {
  return Spotify.Client.create({
    token: {
      token: input.access,
      refreshToken: input.refresh,
      clientID: Config.SPOTIFY_CLIENT_ID,
      clientSecret: Config.SPOTIFY_CLIENT_SECRET,
    },
    userAuthorizedToken: true,
  });
}

export async function sync(client: Spotify.Client) {
  const playlists = Object.fromEntries(
    await client.user
      .getPlaylists({}, true)
      .then((r) => r.map((p) => [p.name, p]))
  );
  await Promise.all(
    Object.values(playlists).map(async (p) => {
      playlists[p.name].tracks = await client.playlists.getTracks(p.id);
    })
  );
  const pending = new Map<string, Set<string>>();
  for await (const track of tracks(client)) {
    const added = new Date(track.addedAt);
    const quarter = Math.floor(added.getUTCMonth() / 3) + 1;
    const playlist = `${added.getUTCFullYear()} Q${quarter}`;
    let existing = playlists[playlist];
    if (!existing) {
      console.log("Creating playlist", playlist);
      const result = await client.user.createPlaylist({
        name: playlist,
        description: "Created by Spotify Quarterly Report",
        public: false,
      });
      playlists[playlist] = existing = result!;
    }
    if (existing.tracks?.some((t) => t.track?.id === track.item.id)) continue;
    let batch = pending.get(existing.id);
    if (!batch) pending.set(existing.id, (batch = new Set()));
    batch.add(track.item.uri);
  }

  for (const [id, batch] of pending) {
    console.log("Adding", batch.size, "tracks to playlist", id);
    await client.playlists.addItems(id, [...batch]);
  }
}

export async function* tracks(client: Spotify.Client) {
  console.log("fetching tracks");
  let offset = 0;
  while (true) {
    const tracks = await client.user.getSavedTracks({
      offset,
    });
    for (const track of tracks) {
      yield track;
    }
    console.log("fetched", tracks.length, "tracks from offset", offset);
    if (tracks.length === 0) break;
    offset += tracks.length;
  }
}
