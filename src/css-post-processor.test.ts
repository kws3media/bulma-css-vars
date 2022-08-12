import { getCssFallbacks } from './css-post-processor'

describe('css post processor', () => {
  test('finds variables and creates according css', () => {
    const css = `
      html {
        color: var(--black);
        background-color: var(--black--color-invert);
      }
      html:hover {
        color: var(--green);
      }
      @media (max-width: 600px) {
        html {
          background-color: var(--green--42deg--adjusthue)
        }
        body {
          color: blue;
        }
      }
      @document {
        #some-id {
          background: url("http://var(--black)");
        }
      }
      body {
        margin: 0;
      }
    `
    const usedVars = [
      { name: '--black', value: 'rgba(0, 0, 0, 0)' },
      { name: '--black--color-invert', value: '#fff' },
      { name: '--green', value: '#00ff00ff' },
      { name: '--green--42deg--adjusthue', value: 'hsl(42, 42%, 42%)' },
    ]
    const fallbacks = getCssFallbacks(css, usedVars)

    expect(fallbacks).toMatchInlineSnapshot(`
      "html {
        color: rgba(0, 0, 0, 0);
        background-color: #fff;
      }

      html:hover {
        color: #00ff00ff;
      }

      @media (max-width: 600px) {
        html {
          background-color: hsl(42, 42%, 42%);
        }
      }"
    `)
  })
})
