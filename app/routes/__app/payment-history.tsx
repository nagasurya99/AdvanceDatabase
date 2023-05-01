import {ShoppingBagIcon} from '@heroicons/react/24/outline'
import {ArrowLeftIcon} from '@heroicons/react/24/solid'
import {Badge, Button, CheckIcon} from '@mantine/core'
import {PaymentStatus} from '@prisma/client'
import {Link} from '@remix-run/react'
import {TailwindContainer} from '~/components/TailwindContainer'
import {useAppData} from '~/utils/hooks'
import {formatDate, formatTime, titleCase} from '~/utils/misc'

export default function OrderHistory() {
	const {payments} = useAppData()

	return (
		<>
			<div className="flex flex-col gap-4 p-4">
				<div className="bg-white">
					<TailwindContainer>
						<div className="py-16 px-4 sm:py-20 sm:px-4">
							<div className="max-w-xl">
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
								<h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
									Payment history
								</h1>
								<p className="mt-2 text-sm text-gray-500">
									All of your payments are listed below.
								</p>
							</div>

							<div className="mt-16">
								<h2 className="sr-only">Recent orders</h2>

								<div className="flex flex-col gap-20">
									{payments.length > 0 ? (
										<ul className="flex flex-col gap-8">
											{payments.map(payment => (
												<li key={payment.id} className="rounded border">
													<div className="flex justify-between p-4">
														<div>
															<p className="truncate text-sm font-medium text-blue-600">
																{payment.order.schedule.teamOne.name} vs{' '}
																{payment.order.schedule.teamTwo.name}
															</p>
															<p className="flex items-center text-sm text-gray-500">
																{payment.order.schedule.stadium.name}
															</p>
															<p className="flex items-center text-sm text-gray-500">
																{formatDate(
																	payment.order.schedule.timeSlot?.date ??
																		new Date('2021-01-01')
																)}{' '}
																(
																{formatTime(
																	payment.order.schedule.timeSlot?.start ?? ''
																)}{' '}
																-{' '}
																{formatTime(
																	payment.order.schedule.timeSlot?.end ?? ''
																)}
																)
															</p>
														</div>

														<div className="truncate text-sm text-gray-500">
															<Badge
																variant="filled"
																color={
																	payment.status === PaymentStatus.PAID
																		? 'green'
																		: 'red'
																}
															>
																{titleCase(payment.status)}
															</Badge>
														</div>

														<div className="hidden md:block">
															<p className="text-sm text-gray-900">
																<span>Total amount -</span>
																<span className="ml-1 font-semibold">
																	${payment.amount.toFixed(2)}
																</span>
															</p>

															<p className="mt-2 flex items-center text-sm text-gray-500">
																<span>Payment date -</span>
																<span className="ml-1 font-semibold">
																	{formatDate(payment.createdAt)}
																</span>
															</p>
														</div>

														<CheckIcon
															className="h-8 w-8 flex-shrink-0 text-green-600"
															aria-hidden="true"
														/>
													</div>
												</li>
											))}
										</ul>
									) : (
										<EmptyState />
									)}
								</div>
							</div>
						</div>
					</TailwindContainer>
				</div>
			</div>
		</>
	)
}

function EmptyState() {
	return (
		<div className="relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
			<ShoppingBagIcon className="mx-auto h-9 w-9 text-gray-500" />
			<span className="mt-4 block text-sm font-medium text-gray-500">
				No previous orders
			</span>
		</div>
	)
}
