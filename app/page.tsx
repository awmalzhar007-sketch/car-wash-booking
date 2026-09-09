import { prisma } from "@/lib/prisma";
import HomeClient from "@/components/HomeClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    include: {
      brand: true,
      washBays: { where: { isActive: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return <HomeClient branches={branches} />;
}
