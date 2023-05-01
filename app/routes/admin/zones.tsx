import {ArrowLeftIcon, PlusIcon} from '@heroicons/react/24/solid'
import {
	Button,
	Modal,
	NumberInput,
	Select,
	TextInput,
	clsx,
} from '@mantine/core'
import {useDisclosure} from '@mantine/hooks'
import type {Stadium, Zone} from '@prisma/client'
import type {ActionFunction} from '@remix-run/node'
import {json} from '@remix-run/node'
import {Link, useFetcher} from '@remix-run/react'
import {ObjectId} from 'bson'
import * as React from 'react'
import {z} from 'zod'
import {TailwindContainer} from '~/components/TailwindContainer'
import {db} from '~/db.server'
import {useAdminData} from '~/utils/hooks'
import {formatCurrency} from '~/utils/misc'
import {badRequest} from '~/utils/misc.server'
import type {inferErrors} from '~/utils/validation'
import {validateAction} from '~/utils/validation'

enum MODE {
	edit,
	add,
}

const ManageZonesSchema = z.object({
	zoneId: z.string().optional(),
	stadiumId: z.string().min(1, 'Stadium is required'),
	name: z.string().min(1, 'Name is required'),
	pricePerSeat: z.preprocess(
		Number,
		z.number().min(0, 'Price per ticket must be at least 0')
	),
	size: z.preprocess(Number, z.number().min(1, 'Size must be at least 1')),
})

interface ActionData {
	success: boolean
	fieldErrors?: inferErrors<typeof ManageZonesSchema>
}

export const action: ActionFunction = async ({request}) => {
	const {fields, fieldErrors} = await validateAction(request, ManageZonesSchema)

	if (fieldErrors) {
		return badRequest<ActionData>({success: false, fieldErrors})
	}

	const id = new ObjectId().toString()
	await db.zone.upsert({
		where: {
			id: fields.zoneId || id,
			stadiumId: fields.stadiumId,
		},
		update: {
			name: fields.name,
			pricePerSeat: fields.pricePerSeat,
			size: fields.size,
		},
		create: {
			id,
			name: fields.name,
			pricePerSeat: fields.pricePerSeat,
			size: fields.size,
			stadiumId: fields.stadiumId,
		},
	})

	return json<ActionData>({success: true})
}

export default function ManageZones() {
	const fetcher = useFetcher<ActionData>()
	const isSubmitting = fetcher.state !== 'idle'

	const {zones, stadiums} = useAdminData()
	const [isModalOpen, handleModal] = useDisclosure(false, {
		onClose: () => {
			setSelectedZoneId(null)
		},
	})

	const [selectedZoneId, setSelectedZoneId] = React.useState<Zone['id'] | null>(
		null
	)
	const [mode, setMode] = React.useState<MODE>(MODE.edit)
	const [stadiumId, setStadiumId] = React.useState<Stadium['id'] | null>(null)

	React.useEffect(() => {
		if (fetcher.state !== 'idle' && fetcher.submission === undefined) {
			return
		}

		if (fetcher.data?.success) {
			setSelectedZoneId(null)
			handleModal.close()
		}
		// handleModal is not meemoized, so we don't need to add it to the dependency array
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fetcher.data?.success, fetcher.state, fetcher.submission])

	const selectedStadium = React.useMemo(
		() => stadiums.find(stadium => stadium.id === stadiumId),
		[stadiumId, stadiums]
	)

	const selectedZone = React.useMemo(
		() => zones.find(zone => zone.id === selectedZoneId),
		[selectedZoneId, zones]
	)

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
								Manage Zones
							</h1>
							<p className="mt-2 text-sm text-gray-700">
								A list of all the zones for a specific stadium.
							</p>
						</div>
						<div className="flex items-end gap-4">
							<Select
								label="Stadium"
								value={stadiumId}
								onChange={setStadiumId}
								clearable
								placeholder="Select a stadium"
								data={stadiums.map(stadium => ({
									value: stadium.id,
									label: stadium.name,
								}))}
							/>

							<Button
								loading={isSubmitting}
								loaderPosition="left"
								disabled={!stadiumId}
								onClick={() => {
									setMode(MODE.add)
									handleModal.open()
								}}
							>
								<PlusIcon className="h-4 w-4" />
								<span className="ml-2">Add Zone</span>
							</Button>
						</div>
					</div>
					<div className="mt-8 flex flex-col">
						<div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
							<div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
								{stadiumId ? (
									<>
										<table className="min-w-full divide-y divide-gray-300">
											<thead>
												<tr>
													<th
														scope="col"
														className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 md:pl-0"
													>
														Name
													</th>

													<th
														scope="col"
														className="hidden py-3.5 px-3 text-left text-sm font-semibold text-gray-900 sm:table-cell"
													>
														Size
													</th>

													<th
														scope="col"
														className="hidden py-3.5 px-3 text-left text-sm font-semibold text-gray-900 sm:table-cell"
													>
														Price Per Seat
													</th>
													<th
														scope="col"
														className="relative py-3.5 pl-3 pr-4 sm:pr-6 md:pr-0"
													></th>
												</tr>
											</thead>
											<tbody className="divide-y divide-gray-200">
												{selectedStadium?.zones.map(zone => (
													<tr key={zone.id}>
														<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
															{zone.name}
														</td>

														<td className="whitespace-nowrap py-4 px-3 text-sm font-medium text-gray-900">
															{zone.size}
														</td>

														<td className="whitespace-nowrap py-4 px-3 text-sm font-medium text-gray-900">
															{formatCurrency(zone.pricePerSeat)}
														</td>

														<td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-sm font-medium sm:pr-8">
															<Button
																loading={isSubmitting}
																variant="white"
																compact
																loaderPosition="right"
																onClick={() => {
																	setSelectedZoneId(zone.id)
																	handleModal.open()
																	setMode(MODE.edit)
																}}
															>
																Edit
															</Button>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</>
								) : (
									<div className="flex flex-col items-center justify-center rounded border border-dashed py-12">
										<div className="text-sm font-medium italic text-gray-900">
											Please select a stadium to manage zones
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</TailwindContainer>

			<Modal
				opened={isModalOpen}
				onClose={() => {
					setSelectedZoneId(null)
					handleModal.close()
				}}
				title={clsx({
					'Edit zone': mode === MODE.edit,
					'Add zone': mode === MODE.add,
				})}
				centered
				overlayBlur={1.2}
				overlayOpacity={0.6}
			>
				<fetcher.Form method="post" replace>
					<fieldset disabled={isSubmitting} className="flex flex-col gap-4">
						<input hidden name="zoneId" value={selectedZone?.id} />
						<input hidden name="stadiumId" value={stadiumId ?? ''} />

						<TextInput
							name="name"
							label="Name"
							defaultValue={selectedZone?.name ?? ''}
							error={fetcher.data?.fieldErrors?.name}
							required
						/>

						<NumberInput
							name="size"
							label="Size"
							defaultValue={selectedZone?.size ?? 1}
							min={1}
							error={fetcher.data?.fieldErrors?.size}
							required
						/>

						<NumberInput
							name="pricePerSeat"
							label="Price Per Seat"
							icon="$"
							defaultValue={selectedZone?.pricePerSeat ?? 1}
							min={1}
							error={fetcher.data?.fieldErrors?.pricePerSeat}
							required
						/>

						<div className="mt-1 flex items-center justify-end gap-4">
							<Button
								variant="subtle"
								disabled={isSubmitting}
								onClick={() => handleModal.close()}
								color="red"
							>
								Cancel
							</Button>
							<Button
								type="submit"
								loading={isSubmitting}
								loaderPosition="right"
							>
								{mode === MODE.edit ? 'Save changes' : 'Add Zone'}
							</Button>
						</div>
					</fieldset>
				</fetcher.Form>
			</Modal>
		</>
	)
}
