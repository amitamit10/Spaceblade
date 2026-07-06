import "./styles.css";
import { mountApp } from "./app/App";

const host = document.querySelector<HTMLElement>("#app");
if (!host) {
  throw new Error("Missing #app root element");
}

mountApp(host);
