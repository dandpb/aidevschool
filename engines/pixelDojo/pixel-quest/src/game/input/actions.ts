import type { Direction } from "../simulation/types"

export type InputAction =
  | {
      readonly kind: "move"
      readonly direction: Direction
    }
  | {
      readonly kind: "confirm"
    }
  | {
      readonly kind: "cancel"
    }
  | {
      readonly kind: "journal"
    }
  | {
      readonly kind: "help"
    }
  | {
      readonly kind: "orbit"
    }
  | {
      readonly kind: "admit"
    }
  | {
      readonly kind: "reject"
    }

export function actionFromKey(key: string): InputAction | undefined {
  const normalized = key.toLowerCase()
  if (normalized === "arrowup" || normalized === "w" || normalized === "keyw") {
    return { kind: "move", direction: "north" }
  }
  if (normalized === "arrowdown" || normalized === "s" || normalized === "keys") {
    return { kind: "move", direction: "south" }
  }
  if (normalized === "arrowright" || normalized === "d" || normalized === "keyd") {
    return { kind: "move", direction: "east" }
  }
  if (normalized === "arrowleft" || normalized === "a" || normalized === "keya") {
    return { kind: "move", direction: "west" }
  }
  if (normalized === "enter" || normalized === "e" || normalized === "keye" || normalized === " ") {
    return { kind: "confirm" }
  }
  if (normalized === "escape") {
    return { kind: "cancel" }
  }
  if (normalized === "j" || normalized === "keyj") {
    return { kind: "journal" }
  }
  if (normalized === "h" || normalized === "keyh") {
    return { kind: "help" }
  }
  if (normalized === "o" || normalized === "keyo") {
    return { kind: "orbit" }
  }
  if (normalized === "z" || normalized === "keyz") {
    return { kind: "admit" }
  }
  if (normalized === "x" || normalized === "keyx") {
    return { kind: "reject" }
  }
  return undefined
}
