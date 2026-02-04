"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpFromLine, Loader2, PackageCheck } from "lucide-react";
import { processOutbound } from "@/actions/movements";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import type { Product, Location, InventoryWithDetails } from "@/types/database";

export default function OutboundPage() {
  const { toast } = useToast();

  const [productId, setProductId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: async () => {
      const res = await fetch("/api/locations");
      if (!res.ok) throw new Error("Failed to fetch locations");
      return res.json();
    },
  });

  // Fetch inventory for the selected product to show stock per location
  const { data: productInventory = [], isLoading: inventoryLoading } = useQuery<
    InventoryWithDetails[]
  >({
    queryKey: ["inventory", productId],
    queryFn: async () => {
      const res = await fetch(`/api/inventory?product_id=${productId}`);
      if (!res.ok) throw new Error("Failed to fetch inventory");
      return res.json();
    },
    enabled: !!productId,
  });

  // Build a map of location_id -> available quantity for the selected product
  const stockByLocation = productInventory.reduce<
    Record<string, { quantity: number; reserved: number; available: number }>
  >((acc, inv) => {
    const available = inv.quantity - inv.reserved_quantity;
    acc[inv.location_id] = {
      quantity: inv.quantity,
      reserved: inv.reserved_quantity,
      available,
    };
    return acc;
  }, {});

  // Locations that have stock for the selected product
  const locationsWithStock = locations.filter(
    (loc) => stockByLocation[loc.id] && stockByLocation[loc.id].available > 0
  );

  // Get available quantity for the selected location
  const selectedLocationStock = locationId ? stockByLocation[locationId] : null;

  const handleProductChange = (value: string) => {
    setProductId(value);
    // Reset location when product changes since stock availability changes
    setLocationId("");
    setQuantity("");
  };

  const resetForm = () => {
    setProductId("");
    setLocationId("");
    setQuantity("");
    setReferenceNumber("");
    setNotes("");
    setPerformedBy("");
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Client-side stock check
    if (selectedLocationStock) {
      const requestedQty = parseInt(quantity, 10);
      if (requestedQty > selectedLocationStock.available) {
        setErrors({
          quantity: [
            `Insufficient stock. Available: ${selectedLocationStock.available}, Requested: ${requestedQty}`,
          ],
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("product_id", productId);
      formData.append("location_id", locationId);
      formData.append("quantity", quantity);
      formData.append("reference_number", referenceNumber);
      formData.append("notes", notes);
      formData.append("performed_by", performedBy);

      const result = await processOutbound(formData);

      if (result.error) {
        setErrors(result.error as Record<string, string[]>);
        toast({
          title: "Validation error",
          description: "Please check the form for errors.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Outbound processed",
          description: `Successfully picked ${quantity} units from inventory.`,
        });
        resetForm();
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <ArrowUpFromLine className="h-7 w-7 text-blue-600" />
          <h1 className="text-3xl font-bold tracking-tight">Outbound Picking</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Pick and ship stock from the warehouse
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pick Stock</CardTitle>
          <CardDescription>
            Select a product and location to pick stock from for outbound shipment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Product */}
            <div className="space-y-2">
              <Label htmlFor="product_id">Product</Label>
              <Select value={productId} onValueChange={handleProductChange}>
                <SelectTrigger id="product_id">
                  <SelectValue placeholder={productsLoading ? "Loading products..." : "Select a product"} />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.sku} - {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.product_id && (
                <p className="text-sm text-destructive">{errors.product_id[0]}</p>
              )}
            </div>

            {/* Location (shows available quantity per location) */}
            <div className="space-y-2">
              <Label htmlFor="location_id">Location</Label>
              <Select
                value={locationId}
                onValueChange={setLocationId}
                disabled={!productId}
              >
                <SelectTrigger id="location_id">
                  <SelectValue
                    placeholder={
                      !productId
                        ? "Select a product first"
                        : inventoryLoading
                          ? "Loading stock levels..."
                          : locationsWithStock.length === 0
                            ? "No stock available for this product"
                            : "Select a location"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {locationsWithStock.map((location) => {
                    const stock = stockByLocation[location.id];
                    return (
                      <SelectItem key={location.id} value={location.id}>
                        {location.location_code} (Available: {stock.available})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {!productId && (
                <p className="text-sm text-muted-foreground">
                  Select a product to see locations with available stock.
                </p>
              )}
              {productId && !inventoryLoading && locationsWithStock.length === 0 && (
                <p className="text-sm text-destructive">
                  No stock available for this product at any location.
                </p>
              )}
              {errors.location_id && (
                <p className="text-sm text-destructive">{errors.location_id[0]}</p>
              )}
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={selectedLocationStock?.available || undefined}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity to pick"
              />
              {selectedLocationStock && (
                <p className="text-sm text-muted-foreground">
                  Available at this location: {selectedLocationStock.available} units
                  {selectedLocationStock.reserved > 0 &&
                    ` (${selectedLocationStock.reserved} reserved)`}
                </p>
              )}
              {errors.quantity && (
                <p className="text-sm text-destructive">{errors.quantity[0]}</p>
              )}
            </div>

            {/* Reference Number */}
            <div className="space-y-2">
              <Label htmlFor="reference_number">Reference Number</Label>
              <Input
                id="reference_number"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g., order number"
              />
              {errors.reference_number && (
                <p className="text-sm text-destructive">{errors.reference_number[0]}</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes about this outbound pick"
                rows={3}
              />
              {errors.notes && (
                <p className="text-sm text-destructive">{errors.notes[0]}</p>
              )}
            </div>

            {/* Performed By */}
            <div className="space-y-2">
              <Label htmlFor="performed_by">Performed By</Label>
              <Input
                id="performed_by"
                value={performedBy}
                onChange={(e) => setPerformedBy(e.target.value)}
                placeholder="Name of the person picking"
              />
              {errors.performed_by && (
                <p className="text-sm text-destructive">{errors.performed_by[0]}</p>
              )}
            </div>

            {/* Form-level errors */}
            {errors._form && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {errors._form[0]}
              </div>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <PackageCheck className="mr-2 h-4 w-4" />
                  Pick Stock
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
