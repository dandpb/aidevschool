import "./styles.css"
import { PixelQuestApp } from "./app/PixelQuestApp"

const app = document.querySelector<HTMLDivElement>("#app")

if (app === null) {
  throw new Error("Missing #app root")
}

new PixelQuestApp(app).start()
