import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    {
      name: "smallbiz-cashier-shift-entry",
      transform(code, id) {
        if (!id.endsWith("/main.jsx")) return null;
        if (code.includes('"./cashier-shift.jsx"')) return null;
        return {
          code: `import "./cashier-shift.css";\nimport "./cashier-shift.jsx";\n${code}`,
          map: null,
        };
      },
    },
  ],
});
