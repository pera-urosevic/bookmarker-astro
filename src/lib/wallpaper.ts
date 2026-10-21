import { readdir } from 'node:fs/promises'

/** Picks a random wallpaper from `wallpapers`, or `undefined` when the list is empty. */
export function pickWallpaper<T>(wallpapers: T[]): T | undefined {
	return wallpapers[Math.floor(Math.random() * wallpapers.length)]
}

/** Singleton that owns reading the wallpaper directory. */
let wallpapersPromise: Promise<string[]> | undefined

export const wallpapersSingleton = {
	getWallpapers(): Promise<string[]> {
		if (wallpapersPromise === undefined) {
			wallpapersPromise = readdir('./public/wallpapers')
		}
		return wallpapersPromise
	},
}
