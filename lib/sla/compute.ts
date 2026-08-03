export function computeSlaDeadlines(args: {
  now: Date;
  acknowledgeHrs: number;
  resolveHrs: number;
}): { slaAcknowledgeBy: Date; slaResolveBy: Date } {
  const ackMs = args.acknowledgeHrs * 60 * 60 * 1000;
  const resMs = args.resolveHrs * 60 * 60 * 1000;
  return {
    slaAcknowledgeBy: new Date(args.now.getTime() + ackMs),
    slaResolveBy: new Date(args.now.getTime() + resMs),
  };
}
