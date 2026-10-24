// Expo Go opens projects as exp://host:port/--/<path>; an empty path arrives as "/--/".
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return path.replace(/^\/?--(\/|$)/, '/') || '/';
}
