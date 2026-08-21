import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

// Tailwind resolves its config from process.cwd() by default, which breaks when
// the dev server is launched from a parent directory. Pass the path explicitly.
const root = dirname(fileURLToPath(import.meta.url));

export default {
  plugins: [tailwindcss({ config: join(root, "tailwind.config.js") }), autoprefixer()],
};
