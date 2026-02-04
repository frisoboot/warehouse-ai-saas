"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";
import {
  createAssemblyOrder,
  startAssemblyOrder,
  completeAssemblyOrder,
  cancelAssemblyOrder,
  addAssemblyComponent,
  removeAssemblyComponent,
} from "@/actions/assembly";
import type { Product, AssemblyOrderWithDetails, AssemblyWithDetails, Location } from "@/types/database";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog";
import {
  Wrench,
  Plus,
  Play,
  CheckCircle,
  XCircle,
  Trash2,
  Loader2,
  Package,
  ClipboardList,
} from "lucide-react";

// ─── Assembly Orders Tab ────────────────────────────────────────────────────

function AssemblyOrdersTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [targetLocationId, setTargetLocationId] = useState("");
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch package products for the create form
  const { data: packageProducts = [] } = useQuery<Product[]>({
    queryKey: ["products", "packages"],
    queryFn: async () => {
      const res = await fetch("/api/products?is_finished_package=true");
      if (!res.ok) throw new Error("Failed to fetch package products");
      return res.json();
    },
  });

  // Fetch assembly orders
  const {
    data: orders = [],
    isLoading: ordersLoading,
  } = useQuery<AssemblyOrderWithDetails[]>({
    queryKey: ["assembly-orders", statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/assembly/orders?status=${statusFilter}`);
      if (!res.ok) throw new Error("Failed to fetch assembly orders");
      return res.json();
    },
  });

  // Fetch locations for the complete dialog
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: async () => {
      const res = await fetch("/api/locations");
      if (!res.ok) throw new Error("Failed to fetch locations");
      return res.json();
    },
  });

  async function handleCreateOrder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      const result = await createAssemblyOrder(formData) as Record<string, unknown>;
      if (result.error) {
        const err = result.error;
        const errMsg =
          typeof err === "object" && err !== null && "_form" in (err as Record<string, unknown>)
            ? ((err as Record<string, string[]>)._form).join(", ")
            : typeof err === "string"
            ? err
            : "Validation failed. Check form fields.";
        toast({ title: "Error", description: errMsg, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Assembly order created successfully." });
        setCreateOpen(false);
        queryClient.invalidateQueries({ queryKey: ["assembly-orders"] });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create order",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleStart(orderId: string) {
    setActionLoading(orderId);
    try {
      await startAssemblyOrder(orderId);
      toast({ title: "Success", description: "Assembly order started." });
      queryClient.invalidateQueries({ queryKey: ["assembly-orders"] });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to start order",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleComplete() {
    if (!selectedOrderId || !targetLocationId) return;
    setActionLoading(selectedOrderId);
    try {
      await completeAssemblyOrder(selectedOrderId, targetLocationId);
      toast({ title: "Success", description: "Assembly order completed. Inventory updated." });
      setCompleteOpen(false);
      setSelectedOrderId(null);
      setTargetLocationId("");
      queryClient.invalidateQueries({ queryKey: ["assembly-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to complete order",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel() {
    if (!selectedOrderId) return;
    setActionLoading(selectedOrderId);
    try {
      await cancelAssemblyOrder(selectedOrderId);
      toast({ title: "Success", description: "Assembly order cancelled." });
      setCancelOpen(false);
      setSelectedOrderId(null);
      queryClient.invalidateQueries({ queryKey: ["assembly-orders"] });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to cancel order",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">In Progress</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5" />
            Assembly Orders
          </CardTitle>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Assembly Order
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Status Filter */}
        <div className="mb-4 flex items-center gap-2">
          <Label>Filter by Status:</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Orders Table */}
        {ordersLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="mb-2 h-10 w-10" />
            <p>No assembly orders found.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    {order.products?.name ?? "Unknown"}
                  </TableCell>
                  <TableCell>{order.quantity_to_assemble}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>{order.assigned_to || "-"}</TableCell>
                  <TableCell>{formatDate(order.created_at)}</TableCell>
                  <TableCell>
                    {order.started_at ? formatDate(order.started_at) : "-"}
                  </TableCell>
                  <TableCell>
                    {order.completed_at ? formatDate(order.completed_at) : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {order.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStart(order.id)}
                            disabled={actionLoading === order.id}
                          >
                            {actionLoading === order.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="mr-1 h-4 w-4" />
                            )}
                            Start
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedOrderId(order.id);
                              setCancelOpen(true);
                            }}
                            disabled={actionLoading === order.id}
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            Cancel
                          </Button>
                        </>
                      )}
                      {order.status === "in_progress" && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            setSelectedOrderId(order.id);
                            setTargetLocationId("");
                            setCompleteOpen(true);
                          }}
                          disabled={actionLoading === order.id}
                        >
                          {actionLoading === order.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="mr-1 h-4 w-4" />
                          )}
                          Complete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create Assembly Order Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Assembly Order</DialogTitle>
            <DialogDescription>
              Create a new assembly order for a package product. Component availability will be checked.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateOrder}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="package_product_id">Package Product</Label>
                <Select name="package_product_id" required>
                  <SelectTrigger id="package_product_id">
                    <SelectValue placeholder="Select a package product" />
                  </SelectTrigger>
                  <SelectContent>
                    {packageProducts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quantity_to_assemble">Quantity to Assemble</Label>
                <Input
                  id="quantity_to_assemble"
                  name="quantity_to_assemble"
                  type="number"
                  min={1}
                  required
                  placeholder="Enter quantity"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assigned_to">Assigned To</Label>
                <Input
                  id="assigned_to"
                  name="assigned_to"
                  placeholder="Enter assignee name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Complete Order Dialog - Select Target Location */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Assembly Order</DialogTitle>
            <DialogDescription>
              Select the target location where the finished packages will be stored.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="target_location">Target Location</Label>
              <Select value={targetLocationId} onValueChange={setTargetLocationId}>
                <SelectTrigger id="target_location">
                  <SelectValue placeholder="Select target location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.location_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleComplete}
              disabled={!targetLocationId || actionLoading !== null}
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Confirmation */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Assembly Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this assembly order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedOrderId(null)}>
              No, Keep Order
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleCancel}
            >
              Yes, Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ─── Bill of Materials Tab ──────────────────────────────────────────────────

function BillOfMaterialsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [addComponentOpen, setAddComponentOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  // Fetch package products
  const { data: packageProducts = [] } = useQuery<Product[]>({
    queryKey: ["products", "packages"],
    queryFn: async () => {
      const res = await fetch("/api/products?is_finished_package=true");
      if (!res.ok) throw new Error("Failed to fetch package products");
      return res.json();
    },
  });

  // Fetch component products
  const { data: componentProducts = [] } = useQuery<Product[]>({
    queryKey: ["products", "components"],
    queryFn: async () => {
      const res = await fetch("/api/products?is_component=true");
      if (!res.ok) throw new Error("Failed to fetch component products");
      return res.json();
    },
  });

  // Fetch BOM for selected package
  const {
    data: bomItems = [],
    isLoading: bomLoading,
  } = useQuery<AssemblyWithDetails[]>({
    queryKey: ["assembly-bom", selectedPackageId],
    queryFn: async () => {
      const res = await fetch(`/api/assembly?package_product_id=${selectedPackageId}`);
      if (!res.ok) throw new Error("Failed to fetch BOM");
      return res.json();
    },
    enabled: !!selectedPackageId,
  });

  async function handleAddComponent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAdding(true);
    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      const componentProductId = formData.get("component_product_id") as string;
      const quantityNeeded = parseInt(formData.get("quantity_needed") as string, 10);

      const result = await addAssemblyComponent(selectedPackageId, componentProductId, quantityNeeded);
      if ("error" in result && result.error) {
        toast({
          title: "Error",
          description: typeof result.error === "string" ? result.error : "Failed to add component",
          variant: "destructive",
        });
      } else {
        toast({ title: "Success", description: "Component added to bill of materials." });
        setAddComponentOpen(false);
        queryClient.invalidateQueries({ queryKey: ["assembly-bom", selectedPackageId] });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add component",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveComponent(id: string) {
    setRemoving(id);
    try {
      await removeAssemblyComponent(id);
      toast({ title: "Success", description: "Component removed from bill of materials." });
      queryClient.invalidateQueries({ queryKey: ["assembly-bom", selectedPackageId] });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to remove component",
        variant: "destructive",
      });
    } finally {
      setRemoving(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="h-5 w-5" />
          Bill of Materials
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Package Selector */}
        <div className="mb-6 flex items-end gap-4">
          <div className="grid gap-2 flex-1 max-w-sm">
            <Label>Select Package Product</Label>
            <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a package product" />
              </SelectTrigger>
              <SelectContent>
                {packageProducts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedPackageId && (
            <Button onClick={() => setAddComponentOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Component
            </Button>
          )}
        </div>

        {/* BOM Table */}
        {!selectedPackageId ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="mb-2 h-10 w-10" />
            <p>Select a package product to view its bill of materials.</p>
          </div>
        ) : bomLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : bomItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ClipboardList className="mb-2 h-10 w-10" />
            <p>No components defined for this package yet.</p>
            <p className="text-sm">Click &quot;Add Component&quot; to define the bill of materials.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Quantity Needed</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bomItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.component_product?.name ?? "Unknown"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.component_product?.sku ?? "-"}
                  </TableCell>
                  <TableCell>{item.quantity_needed}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemoveComponent(item.id)}
                      disabled={removing === item.id}
                    >
                      {removing === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-1 h-4 w-4" />
                      )}
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add Component Dialog */}
      <Dialog open={addComponentOpen} onOpenChange={setAddComponentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Component</DialogTitle>
            <DialogDescription>
              Add a component product to the bill of materials for this package.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddComponent}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="component_product_id">Component Product</Label>
                <Select name="component_product_id" required>
                  <SelectTrigger id="component_product_id">
                    <SelectValue placeholder="Select a component" />
                  </SelectTrigger>
                  <SelectContent>
                    {componentProducts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quantity_needed">Quantity Needed</Label>
                <Input
                  id="quantity_needed"
                  name="quantity_needed"
                  type="number"
                  min={1}
                  required
                  placeholder="Enter quantity per package"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddComponentOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={adding}>
                {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Component
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AssemblyPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Wrench className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assembly Management</h1>
          <p className="text-muted-foreground">
            Manage assembly orders and bill of materials for package products.
          </p>
        </div>
      </div>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Assembly Orders</TabsTrigger>
          <TabsTrigger value="bom">Bill of Materials</TabsTrigger>
        </TabsList>
        <TabsContent value="orders">
          <AssemblyOrdersTab />
        </TabsContent>
        <TabsContent value="bom">
          <BillOfMaterialsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
