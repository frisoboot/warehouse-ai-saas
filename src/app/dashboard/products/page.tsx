"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Product } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { ProductForm } from "@/components/forms/product-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Package,
  Puzzle,
} from "lucide-react";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "food", label: "Food" },
  { value: "tech", label: "Tech" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "packaging", label: "Packaging" },
] as const;

async function fetchProducts(search: string, category: string) {
  const response = await fetch(
    `/api/products?search=${search}&category=${category}`
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch products");
  }
  return data as Product[];
}

async function deleteProduct(id: string) {
  const response = await fetch(`/api/products?id=${id}`, {
    method: "DELETE",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to delete product");
  }
  return data;
}

function SustainabilityIndicators({ product }: { product: Product }) {
  const indicators = [];

  if (product.sustainability_local) {
    indicators.push(
      <span
        key="local"
        className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
        title="Locally Sourced"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        Local
      </span>
    );
  }
  if (product.sustainability_organic) {
    indicators.push(
      <span
        key="organic"
        className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"
        title="Organic"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Organic
      </span>
    );
  }
  if (product.sustainability_fairtrade) {
    indicators.push(
      <span
        key="fairtrade"
        className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
        title="Fairtrade"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
        Fairtrade
      </span>
    );
  }
  if (product.sustainability_recyclable) {
    indicators.push(
      <span
        key="recyclable"
        className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700"
        title="Recyclable"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
        Recyclable
      </span>
    );
  }

  if (indicators.length === 0) {
    return <span className="text-sm text-muted-foreground">--</span>;
  }

  return <div className="flex flex-wrap gap-1">{indicators}</div>;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-12 animate-pulse rounded bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export default function ProductsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(
    undefined
  );

  const {
    data: products,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["products", search, category],
    queryFn: () => fetchProducts(search, category),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Product deleted",
        description: "The product has been permanently removed.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Delete failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  function handleFormSuccess() {
    setDialogOpen(false);
    setEditingProduct(undefined);
    queryClient.invalidateQueries({ queryKey: ["products"] });
  }

  function openCreateDialog() {
    setEditingProduct(undefined);
    setDialogOpen(true);
  }

  function openEditDialog(product: Product) {
    setEditingProduct(product);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your product catalog, pricing, and sustainability data.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Edit Product" : "Add New Product"}
              </DialogTitle>
              <DialogDescription>
                {editingProduct
                  ? "Update the product details below."
                  : "Fill in the details to create a new product."}
              </DialogDescription>
            </DialogHeader>
            <ProductForm
              product={editingProduct}
              onSuccess={handleFormSuccess}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or SKU..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Product List
            {products && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({products.length} product{products.length !== 1 ? "s" : ""})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSkeleton />
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-destructive">
                Failed to load products. Please try again.
              </p>
            </div>
          ) : !products || products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground">
                No products found. Create your first product to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Retail</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Sustainability</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-sm">
                      {product.sku}
                    </TableCell>
                    <TableCell className="font-medium">
                      {product.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {product.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {product.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(product.cost_price)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(product.retail_price)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {product.is_component && (
                          <Badge
                            variant="outline"
                            className="gap-1 text-xs"
                          >
                            <Puzzle className="h-3 w-3" />
                            Component
                          </Badge>
                        )}
                        {product.is_finished_package && (
                          <Badge
                            variant="outline"
                            className="gap-1 text-xs"
                          >
                            <Package className="h-3 w-3" />
                            Package
                          </Badge>
                        )}
                        {!product.is_component &&
                          !product.is_finished_package && (
                            <span className="text-sm text-muted-foreground">
                              --
                            </span>
                          )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <SustainabilityIndicators product={product} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(product)}
                          title="Edit product"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete product"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete Product
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete{" "}
                                <span className="font-semibold">
                                  {product.name}
                                </span>
                                ? This action cannot be undone. All associated
                                inventory records may also be affected.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  deleteMutation.mutate(product.id)
                                }
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
