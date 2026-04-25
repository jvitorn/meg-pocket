import { revalidatePath, revalidateTag } from "next/cache";

export function revalidateCampanhasData() {
  revalidateTag("campanhas", "max");
  revalidatePath("/");
  revalidatePath("/campanhas");
  revalidatePath("/dashboard");
  revalidatePath("/fichas");
}
