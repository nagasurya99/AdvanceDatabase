import {PrismaClient} from '@prisma/client'
import {createPasswordHash} from '~/utils/misc.server'

const db = new PrismaClient()
/**
 * Cricket teams and stadiums are seeded from the data in the seed.ts file.
 */
async function seed() {
	await db.admin.deleteMany()
	await db.audience.deleteMany()
	await db.timeSlot.deleteMany()
	await db.stadium.deleteMany()
	await db.team.deleteMany()
	await db.zone.deleteMany()
	await db.ticket.deleteMany()

	const [] = await Promise.all([
		db.admin.create({
			data: {
				name: 'Michelle',
				email: 'admin@app.com',
				password: await createPasswordHash('password'),
			},
		}),
		db.audience.create({
			data: {
				name: 'John Doe',
				email: 'audience@app.com',
				password: await createPasswordHash('password'),
			},
		}),
		db.team.create({
			data: {
				name: 'Brazil',
				abbr: 'BRA',
			},
		}),
		db.team.create({
			data: {
				name: 'Argentina',
				abbr: 'ARG',
			},
		}),
		db.stadium.create({
			data: {
				name: 'Wembley',
				abbr: 'wembley',
				zones: {
					createMany: {
						data: [
							{
								name: 'Zone A',
								pricePerSeat: 100,
								size: 1000,
							},
							{
								name: 'Zone B',
								pricePerSeat: 200,
								size: 2000,
							},
						],
					},
				},
			},
		}),
	])

	await db.team.createMany({
		data: seedTeams,
	})

	await db.stadium.create({
		data: {
			name: 'Camp Nou',
			abbr: 'camp-nou',
			zones: {
				createMany: {
					data: [
						{
							name: 'Zone A',
							pricePerSeat: 100,
							size: 1000,
						},
						{
							name: 'Zone B',
							pricePerSeat: 200,
							size: 2000,
						},
					],
				},
			},
		},
	})

	console.log(`Database has been seeded. 🌱`)
}

seed()
	.catch(e => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await db.$disconnect()
	})

const seedTeams = [
	{
		name: 'Spain',
		abbr: 'ESP',
	},
	{
		name: 'Germany',
		abbr: 'GER',
	},
	{
		name: 'France',
		abbr: 'FRA',
	},
	{
		name: 'Italy',
		abbr: 'ITA',
	},
]
