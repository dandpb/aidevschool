/** Relógio como função pura — sem classe, sem interface. */
export type Clock = () => Date;

export const systemClock: Clock = () => new Date();
