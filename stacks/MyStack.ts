import {
  StackContext,
  Api,
  Table,
  EventBus,
  Queue,
  toCdkDuration,
} from "sst/constructs";
import { Auth } from "sst/constructs/future";
import { Config } from "sst/constructs";

export function API({ stack }: StackContext) {
  const spotify = Config.Secret.create(
    stack,
    "SPOTIFY_CLIENT_SECRET",
    "SPOTIFY_CLIENT_ID"
  );

  const table = new Table(stack, "table", {
    fields: {
      pk: "string",
      sk: "string",
      gsi1pk: "string",
      gsi1sk: "string",
      gsi2pk: "string",
      gsi2sk: "string",
    },
    primaryIndex: {
      partitionKey: "pk",
      sortKey: "sk",
    },
    globalIndexes: {
      gsi1: {
        partitionKey: "gsi1pk",
        sortKey: "gsi1sk",
      },
      gsi2: {
        partitionKey: "gsi2pk",
        sortKey: "gsi2sk",
      },
    },
  });

  const bus = new EventBus(stack, "bus");

  bus.addRules(stack, {
    "user.login": {
      pattern: {
        detailType: ["user.login"],
      },
      targets: {
        queue: new Queue(stack, "user-created-queue", {
          cdk: {
            queue: {
              visibilityTimeout: toCdkDuration("15 minutes"),
            },
          },
          consumer: {
            function: {
              handler: "packages/functions/src/events/user.login",
              timeout: "15 minutes",
              bind: [
                table,
                spotify.SPOTIFY_CLIENT_SECRET,
                spotify.SPOTIFY_CLIENT_ID,
              ],
            },
          },
        }),
      },
    },
  });

  const auth = new Auth(stack, "auth", {
    authenticator: {
      handler: "packages/functions/src/authenticator.handler",
      bind: [
        table,
        bus,
        spotify.SPOTIFY_CLIENT_ID,
        spotify.SPOTIFY_CLIENT_SECRET,
      ],
    },
  });

  const api = new Api(stack, "api", {
    defaults: {
      function: {
        bind: [bus, table, ...Object.values(spotify)],
      },
    },
    routes: {
      "GET /": "packages/functions/src/lambda.handler",
    },
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
    Bus: bus.eventBusArn,
    AuthUrl: auth.url,
  });
}
