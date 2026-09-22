import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A0A0A",
        panel: "#131313",
        line: "#242424",
        orange: "#FF5500",
        lime: "#C9FF03",
      },
      fontFamily: {
        display: ["var(--font-orbitron)"],
        body: ["var(--font-poppins)"],
      },
    },
  },
  plugins: [],
};
export default config;
