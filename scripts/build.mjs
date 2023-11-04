// @ts-check

import * as esbuild from "esbuild";
import {
  clean,
  copyAssets,
  typeCheck,
  updateManifestWithPackageVersions,
} from "./utils.mjs";
import { extBuildOptions } from "./esbuild.config.mjs";

export const build = async () => {
  clean();
  const isTypeCheckOk = typeCheck();
  if (!isTypeCheckOk) process.exit(1);

  // await esbuild.build(appBuildOptions);
  await esbuild.build(extBuildOptions);

  copyAssets();
  updateManifestWithPackageVersions();
};

await build();
