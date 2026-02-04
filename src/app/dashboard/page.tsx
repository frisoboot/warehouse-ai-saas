import Link from "next/link";
import {
  Package,
  Boxes,
  DollarSign,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wrench,
} from "lucide-react";
import { getDashboardStats } from "@/actions/inventory";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { MovementWithDetails } from "@/types/database";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function getMovementBadgeClass(type: string) {
  switch (type) {
    case "inbound":
      return "bg-green-100 text-green-800 border-green-200";
    case "outbound":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "transfer":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "adjustment":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "assembly":
      return "bg-purple-100 text-purple-800 border-purple-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export default async function DashboardPage() {
  let stats = {
    totalProducts: 0,
    totalItems: 0,
    totalValue: 0,
    totalRetailValue: 0,
    lowStockCount: 0,
    recentMovements: [] as MovementWithDetails[],
    lowStockItems: [] as unknown[],
  };

  try {
    stats = await getDashboardStats();
  } catch {
    // If Supabase is not configured or the query fails,
    // we continue with zeroed-out stats so the page still renders.
  }

  const statCards = [
    {
      title: "Total Products",
      value: stats.totalProducts.toLocaleString(),
      description: "Unique SKUs in catalog",
      icon: Package,
      iconColor: "text-green-600",
      iconBg: "bg-green-50",
    },
    {
      title: "Total Items",
      value: stats.totalItems.toLocaleString(),
      description: "Units across all locations",
      icon: Boxes,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
    },
    {
      title: "Inventory Value",
      value: formatCurrency(stats.totalValue),
      description: `Retail: ${formatCurrency(stats.totalRetailValue)}`,
      icon: DollarSign,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
    },
    {
      title: "Low Stock Alerts",
      value: stats.lowStockCount.toLocaleString(),
      description: "Items below reorder point",
      icon: AlertTriangle,
      iconColor: stats.lowStockCount > 0 ? "text-red-600" : "text-gray-400",
      iconBg: stats.lowStockCount > 0 ? "bg-red-50" : "bg-gray-50",
    },
  ];

  const quickActions = [
    {
      title: "New Inbound",
      description: "Receive stock into warehouse",
      href: "/dashboard/inbound",
      icon: ArrowDownToLine,
      color: "bg-green-600 hover:bg-green-700",
    },
    {
      title: "New Outbound",
      description: "Ship stock out of warehouse",
      href: "/dashboard/outbound",
      icon: ArrowUpFromLine,
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      title: "New Assembly",
      description: "Create a package assembly order",
      href: "/dashboard/assembly",
      icon: Wrench,
      color: "bg-purple-600 hover:bg-purple-700",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          EcoGiving Warehouse Management overview
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`rounded-md p-2 ${card.iconBg}`}>
                <card.icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <CardDescription className="mt-1">
                {card.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Movements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Movements</CardTitle>
            <CardDescription className="mt-1">
              Latest inventory transactions
            </CardDescription>
          </div>
          <Link
            href="/dashboard/movements"
            className="text-sm font-medium text-green-600 hover:text-green-700 hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {stats.recentMovements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Boxes className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                No movements recorded yet. Create your first inbound movement to
                get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      <Badge
                        className={getMovementBadgeClass(
                          movement.movement_type
                        )}
                      >
                        {movement.movement_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {movement.products?.name ?? "Unknown"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {movement.products?.sku ?? "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {movement.quantity}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {movement.reference_number || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(movement.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href}>
              <Card className="transition-shadow hover:shadow-md cursor-pointer">
                <CardContent className="flex items-center gap-4 p-6">
                  <div
                    className={`rounded-lg p-3 text-white ${action.color}`}
                  >
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{action.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
