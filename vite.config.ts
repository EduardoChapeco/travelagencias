// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

const pwaPlugins = VitePWA({
  registerType: "autoUpdate",
  injectRegister: "script-defer",
  manifest: false, // Usando API dinâmica
  workbox: {
    globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
    cleanupOutdatedCaches: true,
  },
});

const wrapHook = (hook: any) => {
  if (!hook) return undefined;
  if (typeof hook === "function") {
    return function (this: any, ...args: any[]) {
      if (this._isSsr) return;
      return hook.apply(this, args);
    };
  }
  if (typeof hook === "object" && typeof hook.handler === "function") {
    const handler = hook.handler;
    return {
      ...hook,
      handler(this: any, ...args: any[]) {
        if (this._isSsr) return;
        return handler.apply(this, args);
      },
    };
  }
  return hook;
};

const safePwaPlugins = (Array.isArray(pwaPlugins) ? pwaPlugins : [pwaPlugins]).map((p: any) => {
  if (!p) return p;
  return {
    ...p,
    configResolved(config: any) {
      this._isSsr = !!config.build?.ssr;
      return p.configResolved?.call(this, config);
    },
    closeBundle: wrapHook(p.closeBundle),
    writeBundle: wrapHook(p.writeBundle),
    generateBundle: wrapHook(p.generateBundle),
  };
});

export default defineConfig({
  nitro: {
    preset: "cloudflare-pages",
    // @ts-expect-error: minify is supported by Nitro config
    minify: false,
    // @ts-ignore: custom property for error handler
    errorHandler: "./src/nitro-error-handler.ts",
  },
  plugins: safePwaPlugins,
  tanstackStart: {
    server: { entry: "server" },
  },
});
