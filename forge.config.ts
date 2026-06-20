import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const config: ForgeConfig = {
  // Dossier de sortie du packaging. Surchageable via `FORGE_OUT_DIR` (utile si
  // le dossier `out/` par défaut est verrouillé par un handle système Windows).
  outDir: process.env.FORGE_OUT_DIR ?? 'out',
  packagerConfig: {
    asar: true,
    // Le plugin Vite force par défaut `ignore` à tout exclure sauf `/.vite`,
    // ce qui laisse `node_modules` HORS du package. Or `better-sqlite3` est
    // natif (non bundlé, marqué `external`) : il doit être présent au runtime,
    // avec son arbre de deps prod (bindings, prebuild-install…). On fournit donc
    // notre propre `ignore` (respecté par le plugin) qui garde `.vite`, le
    // manifeste et `node_modules` ; `prune: true` (défaut) retire les
    // devDependencies. `auto-unpack-natives` sort ensuite le binaire .node de
    // l'asar (sinon Electron lève « Cannot find module 'better-sqlite3' »).
    ignore: (file: string) => {
      if (!file) return false;
      if (file.startsWith('/.vite')) return false;
      if (file === '/package.json') return false;
      if (file.startsWith('/node_modules')) return false;
      return true;
    },
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    // Dépaquète les modules natifs (.node, ex. `better-sqlite3`) hors de
    // l'app.asar vers app.asar.unpacked/ — sinon Electron ne peut pas charger
    // le binaire et lève « Cannot find module » dans le main au démarrage.
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.mts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
