import passport from "passport";
import { Strategy as GitHubStrategy, type Profile } from "passport-github2";
import { env } from "./env.js";
import { upsertGithubUser } from "../modules/auth/auth.service.js";

passport.use(
  new GitHubStrategy(
    {
      clientID: env.github.clientId,
      clientSecret: env.github.clientSecret,
      callbackURL: env.github.callbackUrl,
      // `repo` grants webhook admin on repos the user can access (public + private)
      scope: ["read:user", "repo"],
    },
    (accessToken: string, _refreshToken: string, profile: Profile, done: (err: Error | null, user?: unknown) => void) => {
      upsertGithubUser(profile, accessToken)
        .then((user) => done(null, user))
        .catch((err) => done(err as Error));
    },
  ),
);

export default passport;
