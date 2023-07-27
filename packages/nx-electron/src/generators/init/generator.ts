import {
  addDependenciesToPackageJson,
  formatFiles,
  GeneratorCallback,
  Tree,
  updateJson,
} from '@nx/devkit';
import { Schema } from './schema';
import {
  nxElectronVersion,
  electronVersion,
  exitZeroVersion,
} from '../../utils/versions';
import { jestInitGenerator } from '@nx/jest';

function addDependencies(tree: Tree) {
  return addDependenciesToPackageJson(
    tree,
    {},
    {
      'nx-electron': nxElectronVersion,
      electron: electronVersion,
      exitzero: exitZeroVersion,
    }
  );
}

function moveDependency(tree: Tree) {
  return updateJson(tree, 'package.json', (json) => {
    json.dependencies = json.dependencies || {};

    delete json.dependencies['nx-electron'];
    delete json.dependencies['electron'];

    return json;
  });
}

function addScripts(tree: Tree) {
  return updateJson(tree, 'package.json', (json) => {
    json.scripts = json.scripts || {};

    const postinstall = json.scripts['postinstall'];
    json.scripts['postinstall'] =
      postinstall && postinstall !== ''
        ? `${postinstall} && exitzero electron-builder install-app-deps`
        : 'exitzero electron-builder install-app-deps';

    return json;
  });
}

function normalizeOptions(schema: Schema) {
  return {
    ...schema,
    unitTestRunner: schema.unitTestRunner ?? 'jest',
  };
}

export async function generator(tree: Tree, schema: Schema) {
  const options = normalizeOptions(schema);

  let jestInstall: GeneratorCallback;
  if (options.unitTestRunner === 'jest') {
    jestInstall = await jestInitGenerator(tree, {});
  }

  const installTask = await addDependencies(tree);

  if (!options.skipFormat) {
    await formatFiles(tree);
  }

  return async () => {
    if (jestInstall) {
      await jestInstall();
    }

    await addScripts(tree);
    await installTask();
    await moveDependency(tree);
  };
}

export default generator;
