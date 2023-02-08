import {
  StackContext,
  Api,
  Auth,
  Table,
  EventBus,
  Queue,
} from "sst/constructs";
import { Config } from "sst/constructs";

export function API({ stack }: StackContext) {
  const secrets = Config.Secret.create(
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
          consumer: {
            function: {
              handler: "packages/functions/src/events/user.login",
              timeout: "15 minutes",
              bind: [
                table,
                secrets.SPOTIFY_CLIENT_SECRET,
                secrets.SPOTIFY_CLIENT_ID,
              ],
            },
          },
        }),
      },
    },
  });

  const auth = new Auth(stack, "auth", {
    authenticator: "packages/functions/src/authenticator.handler",
  });

  const api = new Api(stack, "api", {
    defaults: {
      function: {
        bind: [bus, table, ...Object.values(secrets)],
      },
    },
    routes: {
      "GET /": "packages/functions/src/lambda.handler",
    },
  });

  auth.attach(stack, {
    api,
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
    Bus: bus.eventBusArn,
  });
}
