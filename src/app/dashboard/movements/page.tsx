"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";
import Papa from "papaparse";
import type { Product, MovementWithDetails } from "@/types/database";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  History,
  Download,
  Loader2,
  ArrowDownUp,
  ChevronDown,
} from "lucide-react";

const MOVEMENT_TYPES = [
  { value: "all", label: "All Types" },
  { value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" },
  { value: "transfer", label: "Transfer" },
  { value: "adjustment", label: "Adjustment" },
  { value: "assembly", label: "Assembly" },
] as const;

const PAGE_SIZE = 50;

function getTypeBadge(type: string) {
  switch (type) {
    case "inbound":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Inbound</Badge>;
    case "outbound":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Outbound</Badge>;
    case "transfer":
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Transfer</Badge>;
    case "adjustment":
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Adjustment</Badge>;
    case "assembly":
      return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Assembly</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

export default function MovementsPage() {
  const { toast } = useToast();

  // Filter state
  const [typeFilter, setTypeFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [offset, setOffset] = useState(0);

  // Fetch products for filter dropdown
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  // Build query key/params from filters
  const buildParams = useCallback(
    (currentOffset: number) => {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (productFilter !== "all") params.set("product_id", productFilter);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(currentOffset));
      return params.toString();
    },
    [typeFilter, productFilter, dateFrom, dateTo]
  );

  // Fetch movements
  const {
    data: movements = [],
    isLoading,
    isFetching,
  } = useQuery<MovementWithDetails[]>({
    queryKey: ["movements", typeFilter, productFilter, dateFrom, dateTo, offset],
    queryFn: async () => {
      const res = await fetch(`/api/movements?${buildParams(offset)}`);
      if (!res.ok) throw new Error("Failed to fetch movements");
      return res.json();
    },
  });

  // Reset offset when filters change
  function handleFilterChange(
    setter: (value: string) => void,
    value: string
  ) {
    setter(value);
    setOffset(0);
  }

  // Export to CSV
  function handleExportCSV() {
    if (movements.length === 0) {
      toast({
        title: "No data",
        description: "There are no movements to export.",
        variant: "destructive",
      });
      return;
    }

    const csvData = movements.map((m) => ({
      Date: formatDate(m.created_at),
      Type: m.movement_type,
      Product: m.products?.name ?? "",
      SKU: m.products?.sku ?? "",
      Quantity: m.quantity,
      "From Location": m.from_location?.location_code ?? "",
      "To Location": m.to_location?.location_code ?? "",
      Reference: m.reference_number,
      "Performed By": m.performed_by,
      Notes: m.notes,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `movements-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: "Exported", description: `${csvData.length} movements exported to CSV.` });
  }

  const hasMore = movements.length === PAGE_SIZE;
  const hasPrevious = offset > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <History className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Movement History</h1>
          <p className="text-muted-foreground">
            Track all inventory movements, transfers, and adjustments.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select
                value={typeFilter}
                onValueChange={(v) => handleFilterChange(setTypeFilter, v)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  {MOVEMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Product</Label>
              <Select
                value={productFilter}
                onValueChange={(v) => handleFilterChange(setProductFilter, v)}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="date_from">Date From</Label>
              <Input
                id="date_from"
                type="date"
                value={dateFrom}
                onChange={(e) => handleFilterChange(setDateFrom, e.target.value)}
                className="w-[160px]"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="date_to">Date To</Label>
              <Input
                id="date_to"
                type="date"
                value={dateTo}
                onChange={(e) => handleFilterChange(setDateTo, e.target.value)}
                className="w-[160px]"
              />
            </div>

            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Movements Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ArrowDownUp className="h-5 w-5" />
              Movements
              {isFetching && !isLoading && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Showing {offset + 1}-{offset + movements.length} results
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ArrowDownUp className="mb-2 h-10 w-10" />
              <p>No movements found matching your filters.</p>
              <p className="text-sm">Try adjusting the filters above.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>From Location</TableHead>
                    <TableHead>To Location</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(movement.created_at)}
                      </TableCell>
                      <TableCell>{getTypeBadge(movement.movement_type)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{movement.products?.name ?? "Unknown"}</div>
                          <div className="text-xs text-muted-foreground">
                            {movement.products?.sku ?? ""}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{movement.quantity}</TableCell>
                      <TableCell>
                        {movement.from_location?.location_code ?? "-"}
                      </TableCell>
                      <TableCell>
                        {movement.to_location?.location_code ?? "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {movement.reference_number || "-"}
                      </TableCell>
                      <TableCell>{movement.performed_by || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {movement.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {Math.floor(offset / PAGE_SIZE) + 1}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                    disabled={!hasPrevious || isFetching}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                    disabled={!hasMore || isFetching}
                  >
                    Next
                    <ChevronDown className="ml-1 h-4 w-4 rotate-[-90deg]" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
