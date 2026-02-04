"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, Loader2, ScanBarcode, X } from "lucide-react";
import { processInbound } from "@/actions/movements";
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
import type { Product, Location } from "@/types/database";

export default function InboundPage() {
  const { toast } = useToast();

  const [productId, setProductId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const scannerRef = useRef<{ clear: () => Promise<void> } | null>(null);

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const { data: locations = [], isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: async () => {
      const res = await fetch("/api/locations");
      if (!res.ok) throw new Error("Failed to fetch locations");
      return res.json();
    },
  });

  const handleBarcodeScan = useCallback(
    (decodedText: string) => {
      const matchedProduct = products.find(
        (p) => p.sku.toLowerCase() === decodedText.toLowerCase()
      );
      if (matchedProduct) {
        setProductId(matchedProduct.id);
        toast({
          title: "Product found",
          description: `Matched SKU: ${matchedProduct.sku} - ${matchedProduct.name}`,
        });
      } else {
        toast({
          title: "Product not found",
          description: `No product matches barcode: ${decodedText}`,
          variant: "destructive",
        });
      }
      setScannerOpen(false);
    },
    [products, toast]
  );

  useEffect(() => {
    if (!scannerOpen) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
      return;
    }

    let mounted = true;

    const initScanner = async () => {
      const { Html5QrcodeScanner } = await import("html5-qrcode");

      if (!mounted) return;

      const scanner = new Html5QrcodeScanner(
        "barcode-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(
        (decodedText: string) => {
          handleBarcodeScan(decodedText);
        },
        () => {
          // Scan error - ignore, user is still scanning
        }
      );

      scannerRef.current = scanner;
    };

    initScanner();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [scannerOpen, handleBarcodeScan]);

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
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("product_id", productId);
      formData.append("location_id", locationId);
      formData.append("quantity", quantity);
      formData.append("reference_number", referenceNumber);
      formData.append("notes", notes);
      formData.append("performed_by", performedBy);

      const result = await processInbound(formData);

      if (result.error) {
        setErrors(result.error as Record<string, string[]>);
        toast({
          title: "Validation error",
          description: "Please check the form for errors.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Inbound received",
          description: `Successfully received ${quantity} units into inventory.`,
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
          <ArrowDownToLine className="h-7 w-7 text-green-600" />
          <h1 className="text-3xl font-bold tracking-tight">Inbound Receiving</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Receive new stock into the warehouse
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Receive Stock</CardTitle>
          <CardDescription>
            Fill in the details below to receive inventory into a warehouse location.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Barcode Scanner Toggle */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={scannerOpen ? "destructive" : "outline"}
                onClick={() => setScannerOpen(!scannerOpen)}
              >
                {scannerOpen ? (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    Close Scanner
                  </>
                ) : (
                  <>
                    <ScanBarcode className="mr-2 h-4 w-4" />
                    Scan Barcode
                  </>
                )}
              </Button>
              {scannerOpen && (
                <span className="text-sm text-muted-foreground">
                  Point your camera at a barcode to auto-select a product by SKU.
                </span>
              )}
            </div>

            {scannerOpen && (
              <div className="rounded-md border p-4">
                <div id="barcode-reader" />
              </div>
            )}

            {/* Product */}
            <div className="space-y-2">
              <Label htmlFor="product_id">Product</Label>
              <Select value={productId} onValueChange={setProductId}>
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

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location_id">Location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger id="location_id">
                  <SelectValue placeholder={locationsLoading ? "Loading locations..." : "Select a location"} />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.location_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
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
                placeholder="e.g., supplier invoice number"
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
                placeholder="Optional notes about this inbound shipment"
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
                placeholder="Name of the person receiving"
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
                  Receiving...
                </>
              ) : (
                <>
                  <ArrowDownToLine className="mr-2 h-4 w-4" />
                  Receive Stock
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
