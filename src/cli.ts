import * as path from 'path'
import { defaultOptions } from './default-options'
import { BulmaCssVarsOptions, ColorCallSet } from './types'
import { getUsedVariables } from './find-used-vars'
import { ColorGenerator } from './color-updater'
import { strValFromColorDef, stringToHsl } from './bulma-color-tools'
import {
  getAbsoluteFileName,
  exists,
  fileStartsWith,
  writeFile,
} from './fs-helper'
import { compileSass } from './compile-sass'

const configFileName = 'bulma-css-vars.config.js'
const mainSassFileName = 'src/scss/app.scss'

const configFilePathAtCwd = (cwd: string) => path.join(cwd, configFileName)
const mainSassFilePathAtCwd = (cwd: string) => path.join(cwd, mainSassFileName)

async function validateOptions(cwd: string) {
  const configFilePath = configFilePathAtCwd(cwd)

  let loadedOptions = {}
  try {
    loadedOptions = require(configFilePath)
  } catch (err) {
    throw new Error(
      `Required config file '${configFileName}' was not found at ${configFilePath}`
    )
  }

  const options: BulmaCssVarsOptions = {
    ...defaultOptions,
    ...loadedOptions,
  }

  if (options.sassEntryFile === null) {
    throw new Error(
      '[Bulma CSS Vars] cannot create definitions, entry sass file does not exist in config'
    )
  }

  // sass output file
  const sassOutputFile = getAbsoluteFileName(options.sassOutputFile, cwd)

  // theme output file
  const themeFile = getAbsoluteFileName(options.themeFile, cwd)

  // entry sass file
  const sassEntryFile = getAbsoluteFileName(options.sassEntryFile, cwd)

  if (!(await exists(sassEntryFile))) {
    throw new Error(
      `[Bulma CSS Vars] cannot create definitions, entry sass file does not exist in file system at ${sassEntryFile}`
    )
  }

  return {
    options,
    sassOutputFile,
    themeFile,
    sassEntryFile,
  }
}

export async function runCli(cwd: string) {
  const { options, sassEntryFile, sassOutputFile, themeFile } = await validateOptions(cwd)

  // colorDefs
  const colorDefs = options.colorDefs
  const colorCallSetFromColorDef: ColorCallSet = Object.assign(
    {} as ColorCallSet,
    ...Object.entries(colorDefs).map(([colorName, _colorCallDef]) => {
      return {
        [colorName]: {
          calls: [],
        },
      }
    })
  )

  const provisionalUpdater = new ColorGenerator(colorCallSetFromColorDef)
  const sassVarsContentBase = provisionalUpdater.createWritableSassFileOnlySassBaseVariables()

  // create empty sass vars output file if it does not exist yet
  if (!(await exists(sassOutputFile)) || !(await fileStartsWith(sassOutputFile, sassVarsContentBase))) {
    await writeFile(sassOutputFile, sassVarsContentBase)
  }

  // create empty theme file if it does not exist yet
  if (!(await exists(themeFile))) {
    await writeFile(themeFile, `#{":root"}`)
  }

  // render sass
  const renderedCss = compileSass(sassEntryFile)

  // run find-used-vars to get used vars
  const colorNames = Object.keys(colorDefs)
  const usedVars = getUsedVariables(renderedCss, colorNames)
  const usedVarsWithColors = Object.assign(
    {} as ColorCallSet,
    ...Object.entries(usedVars).map(([colorName, colorDef]) => {
      const value = stringToHsl(
        strValFromColorDef(colorDefs[colorName], colorName)
      )
      return { [colorName]: { ...colorDef, value } }
    })
  )
  // run generate-vars to have sass information
  const generator = new ColorGenerator(usedVarsWithColors)
  const sassVarsContent = generator.createWritableSassFile()

  // write sass vars output file
  await writeFile(themeFile, sassVarsContent)
  console.log(`Updated ${sassOutputFile}`)
}

const defaultConfigContent = `const appColors = {
  primary: '#5229fa',
}

module.exports = {
  sassEntryFile: 'src/scss/app.scss',
  sassOutputFile: 'src/scss/theme.sass',
  colorDefs: appColors,
}

`

const defaultMainScssContent = `@import './scss/theme.sass';
@import 'bulma-css-vars/bulma-cv-lib';

`

export async function runCliInit(cwd: string) {
  const configFileNamePath = configFilePathAtCwd(cwd)
  if (await exists(configFileNamePath)) {
    console.log(
      `bulma-css-vars Config file already exists at ${configFileNamePath}, exiting.`
    )
    process.exit(1)
  }
  await writeFile(configFileNamePath, defaultConfigContent)

  const mainSassFilePath = mainSassFilePathAtCwd(cwd)

  if (!(await exists(mainSassFilePath))) {
    await writeFile(mainSassFilePath, defaultMainScssContent)
  }
}
