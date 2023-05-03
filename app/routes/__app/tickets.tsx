import {ArrowLeftIcon, PlusIcon} from '@heroicons/react/24/solid'
import {
	Badge,
	Button,
	Group,
	Modal,
	NumberInput,
	Popover,
	Select,
	Text,
} from '@mantine/core'
import {useDisclosure} from '@mantine/hooks'
import type {Schedule, Zone} from '@prisma/client'
import {OrderStatus, PaymentStatus} from '@prisma/client'
import type {ActionFunction} from '@remix-run/node'
import {json} from '@remix-run/node'
import {Link, useFetcher} from '@remix-run/react'
import * as React from 'react'
import {z} from 'zod'
import {TailwindContainer} from '~/components/TailwindContainer'
import {createOrder} from '~/lib/order.server'
import {requireUserId} from '~/session.server'
import {useAppData} from '~/utils/hooks'
import {
	formatCurrency,
	formatDate,
	formatList,
	formatTime,
	orderStatusLookup,
	titleCase,
} from '~/utils/misc'
import {badRequest} from '~/utils/misc.server'
import type {inferErrors} from '~/utils/validation'
import {validateAction} from '~/utils/validation'

const CreateOrderSchema = z.object({
	fixtureId: z.string().min(1, 'Fixture is required'),
	zoneId: z.string().min(1, 'Zone is required'),
	noOfTickets: z.preprocess(
		Number,
		z.number().min(1, 'No of tickets is required')
	),
})

interface ActionData {
	success: boolean
	fieldErrors?: inferErrors<typeof CreateOrderSchema>
}

export const action: ActionFunction = async ({request}) => {
	const audienceId = await requireUserId(request)
	const {fields, fieldErrors} = await validateAction(request, CreateOrderSchema)

	if (fieldErrors) {
		return badRequest<ActionData>({success: false, fieldErrors})
	}

	return createOrder({
		audienceId,
		zoneId: fields.zoneId,
		fixtureId: fields.fixtureId,
		noOfTickets: fields.noOfTickets,
	})
		.then(() => json<ActionData>({success: true}))
		.catch(error => {
			console.error(error)
			return badRequest<ActionData>({success: false})
		})
}

export default function BuyTickets() {
	const fetcher = useFetcher<ActionData>()
	const {orders, fixtures} = useAppData()

	const [selectedFixtureId, setSelectedFixtureId] = React.useState<
		Schedule['id'] | null
	>(fixtures[0]?.id ?? null)

	const [selectedFixture, setSelectedFixture] =
		React.useState<typeof fixtures[number]>()
	const [noOfTickets, setNoOfTickets] = React.useState<number | undefined>(1)
	const [selectedZoneId, setSelectedZoneId] = React.useState<Zone['id'] | null>(
		null
	)

	const [isModalOpen, handleModal] = useDisclosure(false, {
		onClose: () => {
			setSelectedFixtureId(null)
			setNoOfTickets(1)
			setSelectedZoneId(null)
		},
	})

	const isSubmitting = fetcher.state !== 'idle'
	const totalPrice = React.useMemo(() => {
		if (!selectedFixture || !noOfTickets || !selectedZoneId) return 0

		const zone = selectedFixture.stadium.zones.find(
			z => z.id === selectedZoneId
		)

		if (!zone) return 0

		return zone.pricePerSeat * noOfTickets
	}, [selectedFixture, noOfTickets, selectedZoneId])

	const upcomingFixtures = React.useMemo(
		() =>
			fixtures.filter(fixture =>
				fixture.timeSlot?.date
					? new Date(fixture.timeSlot.date) > new Date()
					: false
			),
		[fixtures]
	)

	React.useEffect(() => {
		if (!selectedFixtureId) return
		setSelectedFixture(fixtures.find(f => f.id === selectedFixtureId))
	}, [selectedFixtureId, fixtures])

	React.useEffect(() => {
		if (fetcher.state !== 'idle' && fetcher.submission === undefined) {
			return
		}

		if (fetcher.data?.success) {
			handleModal.close()
		}
		// handleModal is not meemoized, so we don't need to add it to the dependency array
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fetcher.data?.success, fetcher.state, fetcher.submission])

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
								Manage Tickets
							</h1>
							<p className="mt-2 text-sm text-gray-700">
								A list of all the orders placed
							</p>
						</div>
						<div>
							<Button
								loading={isSubmitting}
								loaderPosition="left"
								onClick={() => handleModal.open()}
							>
								<PlusIcon className="h-4 w-4" />
								<span className="ml-2">Buy tickets</span>
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
												Ticket ID
											</th>

											<th
												scope="col"
												className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 md:pl-0"
											>
												Fixture
											</th>

											<th
												scope="col"
												className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 md:pl-0"
											>
												No of tickets
											</th>

											<th
												scope="col"
												className="hidden py-3.5 px-3 text-left text-sm font-semibold text-gray-900 sm:table-cell"
											>
												Amount
											</th>

											<th
												scope="col"
												className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
											>
												Payment Status
											</th>

											<th
												scope="col"
												className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
											>
												Order Status
											</th>

											<th
												scope="col"
												className="relative py-3.5 pl-3 pr-4 sm:pr-6 md:pr-0"
											></th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200">
										{orders.map(order => (
											<TicketRow order={order} key={order.id} />
										))}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>
			</TailwindContainer>

			<Modal
				opened={isModalOpen}
				onClose={() => handleModal.close()}
				title="Buy tickets"
				centered
				overlayBlur={1.2}
				overlayOpacity={0.6}
			>
				<fetcher.Form method="post" replace>
					<fieldset disabled={isSubmitting} className="flex flex-col gap-4">
						<Select
							name="fixtureId"
							label="Fixture"
							itemComponent={SelectItem}
							value={selectedFixtureId}
							onChange={e => setSelectedFixtureId(e)}
							data={upcomingFixtures.map(f => ({
								fixtureDate: f.timeSlot?.date,
								fixtureStartTime: f.timeSlot?.start,
								fixtureEndTime: f.timeSlot?.end,
								stadium: f.stadium?.name,
								teamOne: f.teamOne?.name,
								teamTwo: f.teamTwo?.name,
								label: `${f.teamOne?.name} vs ${f.teamTwo?.name}`,
								value: f.id,
							}))}
							error={fetcher.data?.fieldErrors?.fixtureId}
							required
						/>

						<NumberInput
							name="noOfTickets"
							label="No of tickets"
							value={noOfTickets}
							onChange={e => setNoOfTickets(e)}
							error={fetcher.data?.fieldErrors?.noOfTickets}
							min={1}
							required
						/>

						<Select
							name="zoneId"
							label="Zone"
							error={
								selectedFixture?.stadium.zones.length === 0
									? 'No zones'
									: fetcher.data?.fieldErrors?.zoneId
							}
							placeholder="Select a zone"
							defaultValue={selectedFixture?.stadium.zones?.[0].id ?? undefined}
							value={selectedZoneId}
							onChange={e => setSelectedZoneId(e)}
							data={
								selectedFixture?.stadium.zones.map(z => ({
									label: z.name,
									value: z.id,
								})) ?? []
							}
							required
						/>

						{/* <p className="text-sm">
							Available Seats:{' '}
							{selectedFixture?.stadium.size! - selectedFixtureTicketSales}
						</p> */}

						<p className="text-sm">
							{totalPrice ? `Total price: ${formatCurrency(totalPrice)}` : null}
						</p>

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
								Buy tickets
							</Button>
						</div>
					</fieldset>
				</fetcher.Form>
			</Modal>
		</>
	)
}

function TicketRow({
	order,
}: {
	order: ReturnType<typeof useAppData>['orders'][0]
}) {
	const fetcher = useFetcher()

	const [showSeats, handleShowSeats] = useDisclosure(false)

	const seats = order.tickets.map(t => t.seatNo)
	const isOrderCompleted = order.status === OrderStatus.SUCCESS
	const isSubmitting = fetcher.state !== 'idle'

	return (
		<tr key={order.id}>
			<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
				{order.scheduleId.slice(0, 8).toUpperCase()}
			</td>

			<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
				<div className="flex flex-col">
					<div className="font-medium text-gray-900">
						{order.schedule.teamOne.name} vs {order.schedule.teamTwo.name}
					</div>
					<div className="font-medium text-gray-500">
						{order.schedule.stadium.name}
					</div>
					<div className="font-medium text-gray-500">
						{formatDate(order.schedule.timeSlot?.date ?? new Date())}
					</div>
					<div className="text-gray-500">
						{formatTime(order.schedule.timeSlot?.start ?? new Date())} -{' '}
						{formatTime(order.schedule.timeSlot?.end ?? new Date())}
					</div>
				</div>
			</td>

			<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
				{order.noOfTickets}
			</td>

			<td className="whitespace-nowrap py-4 px-3 text-sm text-gray-500">
				{formatCurrency(order.payment?.amount ?? 0)}
			</td>

			<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
				<Badge
					className="max-w-min"
					variant="outline"
					fullWidth={false}
					color={
						order.payment?.status === PaymentStatus.PAID
							? 'green'
							: PaymentStatus.REFUNDED
							? 'red'
							: 'blue'
					}
				>
					{titleCase(order.payment?.status ?? '')}
				</Badge>
			</td>

			<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
				<Badge
					className="max-w-min"
					variant="dot"
					fullWidth={false}
					color={order.status === OrderStatus.SUCCESS ? 'green' : 'red'}
				>
					{orderStatusLookup(order.status)}
				</Badge>
			</td>

			<td className="relative space-x-4 whitespace-nowrap py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6 md:pr-0">
				<Popover
					width={200}
					position="bottom-start"
					withArrow
					shadow="md"
					opened={showSeats}
					disabled={!isOrderCompleted}
				>
					<Popover.Target>
						<Button
							onMouseEnter={() => handleShowSeats.open()}
							onMouseLeave={() => handleShowSeats.close()}
							variant="white"
							compact
							disabled={!isOrderCompleted}
						>
							View Seats
						</Button>
					</Popover.Target>
					<Popover.Dropdown
						sx={{pointerEvents: 'none'}}
						className="whitespace-normal break-words"
					>
						{formatList(seats)}
					</Popover.Dropdown>
				</Popover>

				<Button
					variant="white"
					compact
					color="red"
					loaderPosition="right"
					loading={isSubmitting}
					disabled={!isOrderCompleted}
					onClick={() =>
						fetcher.submit(
							{
								orderId: order.id,
								intent: 'cancel-order',
							},
							{
								method: 'post',
								replace: true,
								action: '/api/cancel-order',
							}
						)
					}
				>
					Cancel Order
				</Button>
			</td>
		</tr>
	)
}

interface ItemProps extends React.ComponentPropsWithoutRef<'div'> {
	fixtureDate: string
	fixtureStartTime: string
	fixtureEndTime: string
	teamOne: string
	teamTwo: string
	stadium: string
	label: string
}

const SelectItem = React.forwardRef<HTMLDivElement, ItemProps>(
	(props: ItemProps, ref) => {
		const {
			teamOne,
			teamTwo,
			fixtureDate,
			fixtureStartTime,
			fixtureEndTime,
			stadium,
			...others
		} = props
		return (
			<div ref={ref} {...others}>
				<Group noWrap>
					<div>
						<Text size="sm">
							{teamOne} vs {teamTwo}
						</Text>
						<Text size="xs" opacity={0.65}>
							{stadium}
						</Text>
						<Text size="xs" opacity={0.65}>
							{formatDate(fixtureDate)} ({formatTime(fixtureStartTime)} -{' '}
							{formatTime(fixtureEndTime)})
						</Text>
					</div>
				</Group>
			</div>
		)
	}
)
