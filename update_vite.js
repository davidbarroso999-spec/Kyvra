const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf8');
code = code.replace(/server:\s*\{[^}]+\},/g, `server: {
      hmr: process.env.DISABLE_HMR !== "true",
      proxy: {
        "/cdn/frames": {
          target: "https://raw.githubusercontent.com/davidbarroso999-spec/Aleatoriedades/main",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\\/cdn\\/frames/, ""),
        },
      },
    },`);
fs.writeFileSync('vite.config.ts', code);
