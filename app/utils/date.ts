const MS_PER_DAY = 1000 * 60 * 60 * 24

// a and b are javascript Date objects
export function dateDiffInDays(a: Date, b: Date) {
	// Discard the time and time-zone information.
	const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
	const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())

	return Math.abs(Math.floor((utc2 - utc1) / MS_PER_DAY))
}
