import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { HomeMarketing } from "./HomeMarketing";
import { clerkConfigured } from "@/lib/getUser";

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<Record<string, string | string[] | undefined>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await params;
  await searchParams;
  if (clerkConfigured) {
    const { userId } = await auth();
    if (userId) {
      redirect("/dashboard");
    }
  }

  return <HomeMarketing />;
}
