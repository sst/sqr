import { Bus } from "@sqr/core/bus";
import { Spotify } from "@sqr/core/spotify";
import { User } from "@sqr/core/user";

export const login = Bus.subscribe("user.login", async (evt) => {
  const user = await User.fromID(evt.userID);
  if (!user) throw new Error(`User ${evt.userID} does not exist`);
  const client = await Spotify.client({
    access: user.accessToken,
    refresh: user.refreshToken,
  });

  await Spotify.sync(client);
});
