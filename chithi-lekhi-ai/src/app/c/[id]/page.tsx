import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ id: string }>
}

export default async function LegacySharedLetterPage({ params }: Props) {
  const { id } = await params
  redirect(`/read/${id}`)
}
