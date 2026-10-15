/**
 * WordSwap — Theme constants & bootstrap script.
 *
 * Plain (non-client) module so it can be imported by both the server
 * layout and client components. Inline script applies the persisted
 * theme before first paint to avoid a flash of the wrong theme.
 */

export const THEME_KEY = "wordswap:theme";

export type Theme = "light" | "dark";

export function themeBootstrapScript(): string {
  return `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;
}
