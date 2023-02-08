export * as Bus from "./bus";
import { EventBus } from "sst/node/event-bus";
import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { Handler } from "sst/context";

export interface Events {
  test: {
    foo: string;
  };
}

type EventTypes = keyof Events;

const client = new EventBridgeClient({});

export async function publish<Type extends EventTypes>(
  type: Type,
  properties: Events[Type]
) {
  console.log("Publishing event", type);
  await client.send(
    new PutEventsCommand({
      Entries: [
        {
          EventBusName: EventBus.bus.eventBusName,
          Source: "sqr",
          Detail: JSON.stringify({
            type,
            properties,
          }),
          DetailType: type,
        },
      ],
    })
  );
}

export function subscribe<Type extends EventTypes>(
  _type: Type,
  handler: (properties: Events[Type]) => Promise<void>
) {
  return Handler("sqs", async (evt) => {
    const failed: string[] = [];
    for (const record of evt.Records) {
      const { detail } = JSON.parse(record.body);
      try {
        await handler(detail.properties);
      } catch (err) {
        console.error(err);
        failed.push(record.messageId);
      }
    }

    return {
      batchItemFailures: failed.map((f) => ({
        itemIdentifier: f,
      })),
    };
  });
}
