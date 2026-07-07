import { TerminalDashboard } from "@/components/TerminalDashboard";
import { getDashboardData } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getDashboardData();
  return <TerminalDashboard initialData={data} />;
}
