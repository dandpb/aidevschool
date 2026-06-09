import "./styles.css"
import { AppMountError, mountCodexDojo } from "./app"

const root = document.querySelector("#app")

if (!(root instanceof HTMLElement)) {
  throw new AppMountError("#app")
}

mountCodexDojo(root)
