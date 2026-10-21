/** Picks a random wallpaper from `wallpapers`, or `undefined` when the list is empty. */
export function pickWallpaper<T>(wallpapers: T[]): T | undefined {
	return wallpapers[Math.floor(Math.random() * wallpapers.length)]
}
