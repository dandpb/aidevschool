import "./styles.css"
import "./styles/osBridge.css"
import { AppMountError, mountCodexDojo } from "./app"

const root = document.querySelector("#app")

if (!(root instanceof HTMLElement)) {
  throw new AppMountError("Could not mount codexDojo. Missing element: #app")
}

mountCodexDojo(root)
