import { writeFile, pathExists } from 'fs-extra';
import { logger } from '@storybook/node-logger';
import path from 'path';
import prompts from 'prompts';
import chalk from 'chalk';
import { JsPackageManagerFactory } from './js-package-manager';

export const generateStorybookBabelConfigInCWD = async () => {
  const target = process.cwd();
  return generateStorybookBabelConfig({ target });
};

export const getBabelPresets = ({ typescript, jsx }: { typescript: boolean; jsx: boolean }) => {
  const dependencies = ['@babel/preset-env'];

  if (typescript) {
    dependencies.push('@babel/preset-typescript');
  }

  if (jsx) {
    dependencies.push('@babel/preset-react');
  }

  return dependencies;
};

export const writeBabelConfigFile = async ({
  location,
  typescript,
  jsx,
}: {
  location?: string;
  typescript: boolean;
  jsx: boolean;
}) => {
  const fileLocation = location || path.join(process.cwd(), '.babelrc.json');

  const presets: (string | [string, any])[] = [['@babel/preset-env', { targets: { chrome: 100 } }]];

  if (typescript) {
    presets.push('@babel/preset-typescript');
  }

  if (jsx) {
    presets.push('@babel/preset-react');
  }

  const contents = JSON.stringify(
    {
      sourceType: 'unambiguous',
      presets,
      plugins: [],
    },
    null,
    2
  );

  await writeFile(fileLocation, contents);
};

export const generateStorybookBabelConfig = async ({ target }: { target: string }) => {
  logger.info(`Generating the storybook default babel config at ${target}`);

  const fileName = '.babelrc.json';
  const location = path.join(target, fileName);

  const exists = await pathExists(location);

  if (exists) {
    const { overwrite } = await prompts({
      type: 'confirm',
      initial: false,
      name: 'overwrite',
      message: `${fileName} already exists. Would you like overwrite it?`,
    });

    if (overwrite === false) {
      logger.warn(`Cancelled, babel config file was NOT written to file-system.`);
      return;
    }
  }

  logger.info(
    `The config will contain ${chalk.yellow(
      '@babel/preset-env'
    )} and you will be prompted for additional presets, if you wish to add them depending on your project needs.`
  );

  const { typescript, jsx } = await prompts([
    {
      type: 'confirm',
      initial: false,
      name: 'typescript',
      message: `Do you want to add the TypeScript preset?`,
    },
    {
      type: 'confirm',
      initial: false,
      name: 'jsx',
      message: `Do you want to add the React preset?`,
    },
  ]);

  const dependencies = getBabelPresets({ typescript, jsx });

  logger.info(`Writing file to ${location}`);
  await writeBabelConfigFile({ location, typescript, jsx });

  const { runInstall } = await prompts({
    type: 'confirm',
    initial: true,
    name: 'runInstall',
    message: `Shall we install the required dependencies now? (${dependencies.join(', ')})`,
  });

  if (runInstall) {
    logger.info(`Installing dependencies...`);

    const packageManager = JsPackageManagerFactory.getPackageManager();

    await packageManager.addDependencies({ installAsDevDependencies: true }, dependencies);
  } else {
    logger.info(
      `⚠️ Please remember to install the required dependencies yourself: (${dependencies.join(
        ', '
      )})`
    );
  }
};
