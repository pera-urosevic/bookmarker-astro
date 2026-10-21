import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pickWallpaper, wallpapersSingleton } from './wallpaper.ts'

test('pickWallpaper returns undefined when there are no wallpapers', () => {
	assert.equal(pickWallpaper([]), undefined)
})

test('pickWallpaper returns the only wallpaper', () => {
	assert.equal(pickWallpaper(['/src/assets/wallpapers/only.jpg']), '/src/assets/wallpapers/only.jpg')
})

test('pickWallpaper returns a wallpaper from the list', () => {
	const wallpapers = ['a.jpg', 'b.png', 'c.webp']
	const picked = pickWallpaper(wallpapers)

	assert.ok(picked !== undefined && wallpapers.includes(picked))
})

test('wallpapersSingleton exposes a reader that returns strings', async () => {
	const wallpapers = await wallpapersSingleton.getWallpapers()

	assert.ok(Array.isArray(wallpapers))
	assert.ok(wallpapers.every((wallpaper) => typeof wallpaper === 'string'))
})
