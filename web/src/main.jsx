import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/base.css";
import "./styles/animaciones.css";
import "./styles/elevacion.css";
import "./styles/sitio.css";
import "./styles/aurora.css";
import "./styles/navidad.css";
import "./styles/panel.css";

if (!document.documentElement.dataset.modo) document.documentElement.dataset.modo = "claro";
createRoot(document.getElementById("root")).render(<App />);
