import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { SessionHousekeeper } from "@/components/auth/session-housekeeper";

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  noStore();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?expired=1");
  }

  return (
    <>
      <SessionHousekeeper />
      {children}
    </>
  );
}
