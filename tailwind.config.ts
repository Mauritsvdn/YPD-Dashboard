import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ypd: {
          purple: "#7B3FA0",
          pink: "#E8547A",
          orange: "#E8823A",
          yellow: "#F5A623",
        },
      },
      backgroundImage: {
        "ypd-gradient": "linear-gradient(135deg, #7B3FA0 0%, #E8823A 60%, #F5A623 100%)",
        "ypd-cat-gradient": "linear-gradient(90deg, #E8547A, #9B59B6)",
      },
    },
  },
  plugins: [],
};
export default config;
