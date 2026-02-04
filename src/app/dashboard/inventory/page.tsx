"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Papa from "papaparse";
import {
  Boxes,
  AlertTriangle,
  Download,
  Loader2,
  PackageOpen,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Product, Location, InventoryWithDetails } from "@/types/database";

export default function InventoryPage() {
  const [productFilter, setProductFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isExporting, setIsExporting] = useState(false);

  const { data: products } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: async () => {
      const res = await fetch("/api/locations");
      if (!res.ok) throw new Error("Failed to fetch locations");
      return res.json();
    },
  });

  const {
    data: inventory,
    isLoading,
    error,
  } = useQuery<InventoryWithDetails[]>({
    queryKey: ["inventory", productFilter, locationFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (productFilter !== "all") params.set("product_id", productFilter);
      if (locationFilter !== "all") params.set("location_id", locationFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/inventory?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch inventory");
      return res.json();
    },
  });

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/inventory");
      if (!res.ok) throw new Error("Failed to fetch inventory for export");
      const data: InventoryWithDetails[] = await res.json();

      const csvData = data.map((item) => ({
        SKU: item.products?.sku || "",
        "Product Name": item.products?.name || "",
        Category: item.products?.category || "",
        Location: item.locations?.location_code || "",
        Quantity: item.quantity,
        Reserved: item.reserved_quantity,
        Status: item.status,
      }));

      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().split("T")[0];
      link.href = url;
      link.setAttribute("download", `inventory-export-${date}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
            Available
          </Badge>
        );
      case "reserved":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200">
            Reserved
          </Badge>
        );
      case "assembly_pending":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">
            Assembly Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isLowStock = (item: InventoryWithDetails) => {
    return item.quantity < (item.products?.min_order_quantity || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Boxes className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Inventory Overview
            </h1>
            <p className="text-sm text-muted-foreground">
              Track and manage warehouse inventory across all locations
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleExportCSV}
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export to CSV
        </Button>
      </div>

      <Separator />

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>
            Narrow down inventory by product, location, or status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Product</label>
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products?.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations?.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.location_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="assembly_pending">
                    Assembly Pending
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table / Content */}
      <Card>
        <CardContent className="p-0 sm:p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-4 w-[200px] animate-pulse rounded bg-muted" />
                  <div className="h-4 w-[120px] animate-pulse rounded bg-muted" />
                  <div className="h-4 w-[80px] animate-pulse rounded bg-muted" />
                  <div className="h-4 w-[80px] animate-pulse rounded bg-muted" />
                  <div className="h-4 w-[80px] animate-pulse rounded bg-muted" />
                  <div className="h-4 w-[100px] animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
              <p className="text-sm text-muted-foreground">
                Failed to load inventory data. Please try again.
              </p>
            </div>
          ) : !inventory || inventory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <PackageOpen className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold">No inventory found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                No inventory items match your current filters. Try adjusting
                your filter criteria.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Reserved</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {item.products?.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.products?.sku}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {item.locations?.location_code}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.reserved_quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity - item.reserved_quantity}
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>
                          {isLowStock(item) && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
                {inventory.map((item) => (
                  <Card key={item.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{item.products?.name}</p>
                          {isLowStock(item) && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.products?.sku}
                        </p>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>
                    <Separator className="my-3" />
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Location</p>
                        <p className="font-mono">
                          {item.locations?.location_code}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Quantity</p>
                        <p className="font-medium">{item.quantity}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Reserved</p>
                        <p className="font-medium">{item.reserved_quantity}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Available</p>
                        <p className="font-medium">
                          {item.quantity - item.reserved_quantity}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
