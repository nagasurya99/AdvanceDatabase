import {CalendarDaysIcon, ClockIcon} from '@heroicons/react/24/outline'
import {ArrowLeftIcon, PlusIcon} from '@heroicons/react/24/solid'
import {Badge, Button, Modal, NativeSelect, Select, clsx} from '@mantine/core'
import {DatePicker, TimeInput} from '@mantine/dates'
import {useDisclosure} from '@mantine/hooks'
import type {Schedule, Stadium, Team} from '@prisma/client'
import {ScheduleStatus} from '@prisma/client'
import type {ActionFunction} from '@remix-run/node'
import {json} from '@remix-run/node'
import {Link, useFetcher} from '@remix-run/react'
import * as React from 'react'
import {TailwindContainer} from '~/components/TailwindContainer'
import {createOrUpdateFixture} from '~/lib/fixture.server'
import {ManageFixtureSchema} from '~/lib/zod.schema'
import {useAdminData} from '~/utils/hooks'
import {formatDate, formatTime, titleCase} from '~/utils/misc'
import {badRequest} from '~/utils/misc.server'
import type {inferErrors} from '~/utils/validation'
import {validateAction} from '~/utils/validation'

enum MODE {
	edit,
	add,
}

interface ActionData {
	success: boolean
	fieldErrors?: inferErrors<typeof ManageFixtureSchema>
}

export const action: ActionFunction = async ({request}) => {
	const {fields, fieldErrors} = await validateAction(
		request,
		ManageFixtureSchema
	)

	if (fieldErrors) {
		return badRequest<ActionData>({success: false, fieldErrors})
	}

	await createOrUpdateFixture(fields)
	return json<ActionData>({success: true})
}

export default function ManageFixtures() {
	const fetcher = useFetcher<ActionData>()
	const {fixtures, stadiums, teams} = useAdminData()
	const [isModalOpen, handleModal] = useDisclosure(false)

	const [selectedFixtureId, setSelectedFixtureId] = React.useState<
		Schedule['id'] | null
	>(null)
	const [selectedFixture, setSelectedFixture] = React.useState<
		typeof fixtures[number] | null
	>(null)
	const [mode, setMode] = React.useState<MODE>(MODE.edit)
	const [stadiumId, setStadiumId] = React.useState<Stadium['id']>()
	const [teamOneId, setTeamOneId] = React.useState<Team['id'] | null>(null)
	const [teamTwoId, setTeamTwoId] = React.useState<Team['id'] | null>(null)
	const [fixtureDate, setFixtureDate] = React.useState<Date | null>(null)
	const [fixtureStartTime, setFixtureStartTime] = React.useState<Date | null>(
		null
	)
	const [fixtureEndTime, setFixtureEndTime] = React.useState<Date | null>(null)

	const [enableSubmit, setEnableSubmit] = React.useState(false)
	const [error, setError] = React.useState<string | null>(null)

	const isSubmitting = fetcher.state !== 'idle'

	React.useEffect(() => {
		if (!teamOneId || !teamTwoId) return

		if (teamOneId === teamTwoId) {
			setTeamTwoId(null)
		}
	}, [teamOneId, teamTwoId])

	React.useEffect(() => {
		if (fetcher.state !== 'idle' && fetcher.submission === undefined) {
			return
		}

		if (fetcher.data?.success) {
			setSelectedFixtureId(null)
			handleModal.close()
		}
		// handleModal is not meemoized, so we don't need to add it to the dependency array
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fetcher.data?.success, fetcher.state, fetcher.submission])

	React.useEffect(() => {
		if (!selectedFixtureId) {
			setSelectedFixture(null)
			setTeamOneId(null)
			setTeamTwoId(null)
			setFixtureDate(null)
			setFixtureStartTime(null)
			setFixtureEndTime(null)
			setStadiumId(stadiums[0].id)
			return
		}

		const fixture = fixtures.find(schedule => schedule.id === selectedFixtureId)
		if (!fixture) return

		setSelectedFixture(fixture)
		setTeamOneId(fixture.teamOneId)
		setTeamTwoId(fixture.teamTwoId)
		setFixtureDate(new Date(fixture.timeSlot?.date ?? ''))
		setFixtureStartTime(new Date(fixture.timeSlot?.start ?? ''))
		setFixtureEndTime(new Date(fixture.timeSlot?.end ?? ''))
		setStadiumId(fixture.stadiumId)

		handleModal.open()
		// handleModal is not meemoized, so we don't need to add it to the dependency array
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fixtures, selectedFixtureId])

	React.useEffect(() => {
		setEnableSubmit(false)
		setError(null)

		if (!fixtureDate || !fixtureStartTime || !fixtureEndTime) {
			return
		}

		if (!teamOneId && !teamTwoId && !stadiumId) {
			return
		}

		if (fixtureStartTime.getTime() >= fixtureEndTime.getTime()) {
			setError('Fixture start-time must be before end-time')
			return
		}

		const isConflict = (teamId: Team['id']) => {
			const teamFixtures = fixtures.filter(
				fixture =>
					fixture.timeSlot?.date === fixtureDate.toISOString() &&
					fixture.id !== selectedFixtureId &&
					(fixture.teamOneId === teamId || fixture.teamTwoId === teamId) &&
					fixture.status !== ScheduleStatus.CANCELLED
			)

			const isTeamFixtureClashing = teamFixtures.some(fixture => {
				const startTime = new Date(fixture.timeSlot?.start ?? '')
				const endTime = new Date(fixture.timeSlot?.end ?? '')

				return (
					(startTime.getTime() >= fixtureStartTime.getTime() &&
						startTime.getTime() < fixtureEndTime.getTime()) ||
					(endTime.getTime() > fixtureStartTime.getTime() &&
						endTime.getTime() <= fixtureEndTime.getTime()) ||
					(startTime.getTime() <= fixtureStartTime.getTime() &&
						endTime.getTime() >= fixtureEndTime.getTime())
				)
			})

			return isTeamFixtureClashing
		}

		if (stadiumId) {
			const stadiumFixtures = fixtures.filter(
				fixture =>
					fixture.timeSlot?.date === fixtureDate.toISOString() &&
					fixture.id !== selectedFixtureId &&
					stadiumId === fixture.stadiumId &&
					fixture.status !== ScheduleStatus.CANCELLED
			)

			const isStadiumFixtureClashing = stadiumFixtures.some(fixture => {
				const startTime = new Date(fixture.timeSlot?.start ?? '')
				const endTime = new Date(fixture.timeSlot?.end ?? '')

				return (
					(startTime.getTime() >= fixtureStartTime.getTime() &&
						startTime.getTime() < fixtureEndTime.getTime()) ||
					(endTime.getTime() > fixtureStartTime.getTime() &&
						endTime.getTime() <= fixtureEndTime.getTime()) ||
					(startTime.getTime() <= fixtureStartTime.getTime() &&
						endTime.getTime() >= fixtureEndTime.getTime())
				)
			})

			if (isStadiumFixtureClashing) {
				setError('Stadium has a fixture at the same time')
				return
			}
		}

		if (teamOneId) {
			const isTeamOneClashing = isConflict(teamOneId)
			if (isTeamOneClashing) {
				setError('Team One has another fixture on the same date and time')
				return
			}
		}

		if (teamTwoId) {
			const isTeamTwoClashing = isConflict(teamTwoId)
			if (isTeamTwoClashing) {
				setError('Team Two has another fixture on the same date and time')
				return
			}
		}

		setEnableSubmit(true)
	}, [
		fixtureDate,
		fixtureEndTime,
		fixtureStartTime,
		fixtures,
		selectedFixtureId,
		stadiumId,
		teamOneId,
		teamTwoId,
	])

	return (
		<>
			<TailwindContainer className="rounded-md bg-white">
				<div className="mt-8 px-4 py-10 sm:px-6 lg:px-8">
					<div className="sm:flex sm:flex-auto sm:items-center sm:justify-between">
						<div>
							<Button
								leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
								variant="white"
								size="md"
								component={Link}
								to=".."
								pl={0}
								mb={20}
								color="gray"
							>
								Back
							</Button>
							<h1 className="text-3xl font-semibold text-gray-900">
								Manage Fixtures
							</h1>
							<p className="mt-2 text-sm text-gray-700">
								A list of all the fixtures scheduled in the system
							</p>
						</div>
						<div>
							<Button
								loading={isSubmitting}
								loaderPosition="left"
								onClick={() => {
									setMode(MODE.add)
									handleModal.open()
								}}
							>
								<PlusIcon className="h-4 w-4" />
								<span className="ml-2">Add Fixture</span>
							</Button>
						</div>
					</div>
					<div className="mt-8 flex flex-col">
						<div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
							<div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
								<table className="min-w-full divide-y divide-gray-300">
									<thead>
										<tr>
											<th
												scope="col"
												className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 md:pl-0"
											>
												Fixture
											</th>

											<th
												scope="col"
												className="hidden py-3.5 px-3 text-left text-sm font-semibold text-gray-900 sm:table-cell"
											>
												Details
											</th>

											<th
												scope="col"
												className="hidden py-3.5 px-3 text-left text-sm font-semibold text-gray-900 sm:table-cell"
											>
												Match Status
											</th>
											<th
												scope="col"
												className="relative py-3.5 pl-3 pr-4 sm:pr-6 md:pr-0"
											></th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200">
										{fixtures.map(fixture => {
											const isCancelled =
												fixture.status === ScheduleStatus.CANCELLED

											return (
												<tr key={fixture.id}>
													<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
														<div className="flex flex-col">
															<div className="font-medium text-gray-900">
																{fixture.teamOne.name} vs {fixture.teamTwo.name}
															</div>
															<div className="font-medium text-gray-500">
																{fixture.stadium.name}
															</div>
														</div>
													</td>

													<td className="whitespace-nowrap py-4 px-3 text-sm font-medium text-gray-900">
														<div className="flex flex-col">
															<div className="font-medium text-gray-900">
																{formatDate(
																	fixture.timeSlot?.date ?? new Date()
																)}
															</div>
															<div className="text-gray-500">
																{formatTime(
																	fixture.timeSlot?.start ?? new Date()
																)}{' '}
																-{' '}
																{formatTime(
																	fixture.timeSlot?.end ?? new Date()
																)}
															</div>
														</div>
													</td>

													<td className="whitespace-nowrap py-4 px-3 text-sm text-gray-500">
														<Badge
															className="max-w-min"
															variant="dot"
															fullWidth={false}
															color={
																fixture.status === ScheduleStatus.CONFIRMED
																	? 'green'
																	: 'red'
															}
														>
															{titleCase(fixture.status)}
														</Badge>
													</td>

													<td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-sm font-medium sm:pr-8">
														<div className="flex items-center justify-end gap-4">
															<Button
																loading={isSubmitting}
																variant="white"
																compact
																loaderPosition="right"
																disabled={isCancelled}
																onClick={() => {
																	setSelectedFixtureId(fixture.id)
																	setMode(MODE.edit)
																}}
															>
																Edit
															</Button>

															<Button
																variant="white"
																compact
																color="red"
																loaderPosition="right"
																loading={isSubmitting}
																disabled={isCancelled}
																onClick={() =>
																	fetcher.submit(
																		{
																			fixtureId: fixture.id,
																		},
																		{
																			method: 'post',
																			replace: true,
																			action: '/api/cancel-fixture',
																		}
																	)
																}
															>
																Cancel Fixture
															</Button>
														</div>
													</td>
												</tr>
											)
										})}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>
			</TailwindContainer>

			<Modal
				opened={isModalOpen}
				onClose={() => {
					setSelectedFixtureId(null)
					handleModal.close()
				}}
				title={clsx({
					'Edit fixture': mode === MODE.edit,
					'Add fixture': mode === MODE.add,
				})}
				centered
				overlayBlur={1.2}
				overlayOpacity={0.6}
			>
				<fetcher.Form method="post" replace>
					<fieldset disabled={isSubmitting} className="flex flex-col gap-4">
						<input hidden name="fixtureId" value={selectedFixture?.id} />

						<NativeSelect
							name="stadiumId"
							label="Stadium"
							value={stadiumId}
							placeholder="Select stadium"
							onChange={e => setStadiumId(e.target.value)}
							error={fetcher.data?.fieldErrors?.stadiumId}
							data={stadiums.map(stadium => ({
								label: stadium.name,
								value: stadium.id,
							}))}
							required
						/>

						<Select
							name="teamOneId"
							label="Team One"
							value={teamOneId}
							onChange={e => setTeamOneId(e)}
							error={fetcher.data?.fieldErrors?.teamOneId}
							data={teams.map(team => ({
								label: team.name,
								value: team.id,
							}))}
							required
						/>

						<Select
							name="teamTwoId"
							label="Team Two"
							value={teamTwoId}
							onChange={e => setTeamTwoId(e)}
							error={fetcher.data?.fieldErrors?.teamTwoId}
							disabled={!teamOneId}
							data={teams.map(team => ({
								label: team.name,
								value: team.id,
								disabled: team.id === teamOneId,
							}))}
							required
						/>

						<DatePicker
							label="Date"
							name="fixtureDate"
							value={fixtureDate}
							placeholder="Select date"
							onChange={setFixtureDate}
							minDate={new Date(new Date().getTime() + 24 * 60 * 60 * 1000)}
							icon={<CalendarDaysIcon className="h-4 w-4" />}
							error={fetcher.data?.fieldErrors?.fixtureDate}
							hideOutsideDates
							withAsterisk
						/>
						<div className="grid grid-cols-2 gap-4">
							<TimeInput
								icon={<ClockIcon className="h-4 w-4" />}
								label="Start Time"
								format="12"
								withAsterisk
								value={fixtureStartTime}
								onChange={setFixtureStartTime}
								error={fetcher.data?.fieldErrors?.fixtureStartTime}
								placeholder="Select start time"
							/>
							<input
								hidden
								name="fixtureStartTime"
								value={fixtureStartTime?.toISOString()}
							/>

							<TimeInput
								icon={<ClockIcon className="h-4 w-4" />}
								label="End Time"
								format="12"
								value={fixtureEndTime}
								onChange={setFixtureEndTime}
								error={fetcher.data?.fieldErrors?.fixtureEndTime}
								placeholder="Select end time"
								withAsterisk
							/>
							<input
								hidden
								name="fixtureEndTime"
								value={fixtureEndTime?.toISOString()}
							/>
						</div>

						<p className="text-sm text-red-500">{error}</p>

						<div className="mt-1 flex items-center justify-end gap-4">
							<Button
								variant="subtle"
								disabled={isSubmitting}
								onClick={() => {
									setSelectedFixture(null)
									handleModal.close()
								}}
								color="red"
							>
								Cancel
							</Button>
							<Button
								type="submit"
								loading={isSubmitting}
								loaderPosition="right"
								disabled={!enableSubmit}
							>
								{mode === MODE.edit ? 'Save changes' : 'Add fixture'}
							</Button>
						</div>
					</fieldset>
				</fetcher.Form>
			</Modal>
		</>
	)
}
