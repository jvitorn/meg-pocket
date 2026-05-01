import { redirect } from "next/navigation";

export default async function EditarCampanhaRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/campanhas/escudo/${id}`);
}
