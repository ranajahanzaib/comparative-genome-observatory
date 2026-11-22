import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import Dashboard from "./Dashboard.jsx";
import "./styles.css";

function App() {
  useEffect(() => {
    import("./app.js");
  }, []);

  return <Dashboard />;
}

createRoot(document.getElementById("root")).render(<App />);
