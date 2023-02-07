import { SSTConfig } from "sst";
import { API } from "./stacks/MyStack";
import { Api } from "sst/constructs";

export default {
  config(input) {
    const profile: Record<string, string> = {
      dev: "ironbay-dev",
      production: "ironbay-production",
    };
    return {
      name: "sqr",
      region: "us-east-1",
      profile: profile[input.stage || ""] || profile.dev,
    };
  },
  stacks(app) {
    app.stack(API);
  },
} satisfies SSTConfig;
