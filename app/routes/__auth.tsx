import type {LoaderFunction} from '@remix-run/node'
import {redirect} from '@remix-run/node'
import {Outlet} from '@remix-run/react'
import {getUser} from '~/session.server'

export const loader: LoaderFunction = async ({request}) => {
	const user = await getUser(request)
	if (user) return redirect('/')

	return null
}

export default function AuthLayout() {
	return (
		<>
			<div className="flex min-h-full bg-gray-200">
				<div className="flex w-full items-center justify-center">
					<div className="mx-auto w-full max-w-md place-items-center rounded-md border bg-white px-12 py-12">
						<Outlet />
					</div>
				</div>
			</div>
		</>
	)
}
