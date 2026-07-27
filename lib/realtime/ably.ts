import Ably from "ably";

let client: Ably.Realtime | null = null;

function getAblyClient(): Ably.Realtime | null {
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) return null;
  if (!client) {
    client = new Ably.Realtime({ key: apiKey });
  }
  return client;
}

export async function publishToChannel(args: {
  channelName: string;
  eventName: string;
  data: Record<string, unknown>;
}): Promise<boolean> {
  const ably = getAblyClient();
  if (!ably) return false;

  try {
    const channel = ably.channels.get(args.channelName);
    await channel.publish(args.eventName, args.data);
    return true;
  } catch {
    return false;
  }
}

export async function publishAssignmentNotification(args: {
  technicianId: string;
  complaintId: string;
  adminName: string;
}): Promise<boolean> {
  return publishToChannel({
    channelName: `user:${args.technicianId}`,
    eventName: "assignment",
    data: {
      complaintId: args.complaintId,
      message: `${args.adminName} assigned this complaint to you`,
    },
  });
}
