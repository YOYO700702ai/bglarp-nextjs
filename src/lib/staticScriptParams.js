// Windows cannot materialize prerender paths containing reserved file-name
// characters. Such routes remain available through dynamicParams + ISR.
// Linux CI continues to prerender every script. Never change public route keys.
export function staticScriptParams(scripts, platform = process.platform) {
  return scripts
    .map(script => ({ name: script.slug || script.name }))
    .filter(({ name }) => platform !== 'win32' || (
      !/[<>:"/\\|?*]/.test(name) && ![...name].some(char => char.charCodeAt(0) < 32)
    ));
}
