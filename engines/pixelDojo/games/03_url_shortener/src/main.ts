import "./styles.css"
import { SlugLauncherScene } from "./game/scene"

const app = document.querySelector<HTMLDivElement>("#app")

if (app === null) {
  throw new Error("Missing #app root")
}

const scene = new SlugLauncherScene(app)
scene.start()

// HMR-friendly teardown on full reload.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    scene.dispose()
  })
}
