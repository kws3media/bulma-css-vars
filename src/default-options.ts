import { BulmaCssVarsOptions } from './types'

export const defaultOptions: BulmaCssVarsOptions = {
  sassOutputFile: './generated-bulma-css-vars.scss',
  themeFile: './generated-bulma-css-vars-theme.scss',
  sassEntryFile: null,
  colorDefs: {},
  blockWrapper:":root",
  banner: `/**
 * This file has been auto-generated.
 * Any chnages to this file will be overwritten,
 * when this file is generated again.
 */`
}
