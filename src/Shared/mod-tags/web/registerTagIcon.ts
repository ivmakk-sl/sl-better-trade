// Library copy of shared/mod-tags 1.1.0. Do not edit: see src/Shared/mod-tags/VERSION.
// The icon registry of the mod tags in the storage window. The page calls tagIconSvg of its setup state with the
// IconKey of each tag. Each mod gives the icon of its own key here. The game function is wrapped once for all mods:
// the library copies of two mods are two closures, so the registry is a property on the shared function object.
// The name __slModTagIcons and its shape (a map of key to svg text) are a contract that no library version changes.

type IconFn = ((icon: string) => string) & { __slModTagIcons?: Record<string, string> };

// Adds the svg for the key. host is the setup state that the mod finds. False, with no change, when it has no
// tagIconSvg function.
export function registerTagIcon(host: { tagIconSvg?: unknown }, key: string, svg: string): boolean {
  const current = host.tagIconSvg as IconFn | undefined;
  if (typeof current !== 'function') return false;
  if (current.__slModTagIcons) {
    current.__slModTagIcons[key] = svg;
    return true;
  }
  const icons: Record<string, string> = { [key]: svg };
  const wrapped: IconFn = (icon: string) => (Object.prototype.hasOwnProperty.call(icons, icon) ? icons[icon] : current(icon));
  wrapped.__slModTagIcons = icons;
  host.tagIconSvg = wrapped;
  return true;
}
