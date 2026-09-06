import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/audit-project-workbench/",
  plugins: [react()],
  build: {
    manifest: true,
    rolldownOptions: {
      output: {
        // Keep the existing synchronous startup. Stable dependencies can be cached separately
        // without introducing on-demand network requests into an open customer workspace.
        codeSplitting: {
          includeDependenciesRecursively: false,
          groups: [
            { name: "vendor", test: /[\\/]node_modules[\\/]/, priority: 30 },
            { name: "workspace-core", test: /[\\/]dashboard[\\/](?:model|traditional|workspace-validation)\.js$/, priority: 20 },
            { name: "translations", test: /[\\/]dashboard[\\/]i18n\.jsx$/, priority: 10 },
          ],
        },
      },
    },
  },
});
