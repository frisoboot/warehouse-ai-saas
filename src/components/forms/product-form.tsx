"use client";

import { useState } from "react";
import type { Product } from "@/types/database";
import { productSchema, type ProductFormData } from "@/lib/validations/product";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface ProductFormProps {
  product?: Product;
  onSuccess: () => void;
}

export function ProductForm({ product, onSuccess }: ProductFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<ProductFormData>({
    sku: product?.sku ?? "",
    name: product?.name ?? "",
    description: product?.description ?? "",
    category: product?.category ?? "food",
    unit: product?.unit ?? "piece",
    cost_price: product?.cost_price ?? 0,
    retail_price: product?.retail_price ?? 0,
    supplier_name: product?.supplier_name ?? "",
    supplier_lead_time_days: product?.supplier_lead_time_days ?? 0,
    min_order_quantity: product?.min_order_quantity ?? 1,
    is_component: product?.is_component ?? false,
    is_finished_package: product?.is_finished_package ?? false,
    assembly_time_mins: product?.assembly_time_mins ?? 0,
    sustainability_local: product?.sustainability_local ?? false,
    sustainability_organic: product?.sustainability_organic ?? false,
    sustainability_fairtrade: product?.sustainability_fairtrade ?? false,
    sustainability_co2_score: product?.sustainability_co2_score ?? 50,
    sustainability_recyclable: product?.sustainability_recyclable ?? false,
  });

  function updateField<K extends keyof ProductFormData>(
    field: K,
    value: ProductFormData[K]
  ) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const result = productSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (field && typeof field === "string") {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const url = product ? `/api/products` : `/api/products`;
      const method = product ? "PUT" : "POST";
      const body = product
        ? { ...result.data, id: product.id }
        : result.data;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors && typeof data.errors === "object") {
          setErrors(data.errors);
        } else {
          toast({
            title: "Error",
            description: data.error || "Something went wrong",
            variant: "destructive",
          });
        }
        return;
      }

      toast({
        title: product ? "Product updated" : "Product created",
        description: `${result.data.name} has been ${product ? "updated" : "created"} successfully.`,
      });

      onSuccess();
    } catch {
      toast({
        title: "Error",
        description: "Failed to save product. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Basic Info
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              placeholder="e.g. PROD-001"
              value={formData.sku}
              onChange={(e) => updateField("sku", e.target.value)}
            />
            {errors.sku && (
              <p className="text-sm text-destructive">{errors.sku}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Product name"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="col-span-2 space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Product description (optional)"
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) =>
                updateField(
                  "category",
                  value as ProductFormData["category"]
                )
              }
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="food">Food</SelectItem>
                <SelectItem value="tech">Tech</SelectItem>
                <SelectItem value="lifestyle">Lifestyle</SelectItem>
                <SelectItem value="packaging">Packaging</SelectItem>
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">Unit</Label>
            <Select
              value={formData.unit}
              onValueChange={(value) =>
                updateField("unit", value as ProductFormData["unit"])
              }
            >
              <SelectTrigger id="unit">
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="piece">Piece</SelectItem>
                <SelectItem value="box">Box</SelectItem>
                <SelectItem value="kg">Kg</SelectItem>
              </SelectContent>
            </Select>
            {errors.unit && (
              <p className="text-sm text-destructive">{errors.unit}</p>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Pricing & Supplier */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Pricing & Supplier
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cost_price">Cost Price</Label>
            <Input
              id="cost_price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.cost_price}
              onChange={(e) =>
                updateField("cost_price", parseFloat(e.target.value) || 0)
              }
            />
            {errors.cost_price && (
              <p className="text-sm text-destructive">{errors.cost_price}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="retail_price">Retail Price</Label>
            <Input
              id="retail_price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.retail_price}
              onChange={(e) =>
                updateField("retail_price", parseFloat(e.target.value) || 0)
              }
            />
            {errors.retail_price && (
              <p className="text-sm text-destructive">{errors.retail_price}</p>
            )}
          </div>

          <div className="col-span-2 space-y-2">
            <Label htmlFor="supplier_name">Supplier Name</Label>
            <Input
              id="supplier_name"
              placeholder="Supplier name (optional)"
              value={formData.supplier_name}
              onChange={(e) => updateField("supplier_name", e.target.value)}
            />
            {errors.supplier_name && (
              <p className="text-sm text-destructive">
                {errors.supplier_name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier_lead_time_days">Lead Time (days)</Label>
            <Input
              id="supplier_lead_time_days"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={formData.supplier_lead_time_days}
              onChange={(e) =>
                updateField(
                  "supplier_lead_time_days",
                  parseInt(e.target.value) || 0
                )
              }
            />
            {errors.supplier_lead_time_days && (
              <p className="text-sm text-destructive">
                {errors.supplier_lead_time_days}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="min_order_quantity">Min Order Quantity</Label>
            <Input
              id="min_order_quantity"
              type="number"
              min="1"
              step="1"
              placeholder="1"
              value={formData.min_order_quantity}
              onChange={(e) =>
                updateField(
                  "min_order_quantity",
                  parseInt(e.target.value) || 1
                )
              }
            />
            {errors.min_order_quantity && (
              <p className="text-sm text-destructive">
                {errors.min_order_quantity}
              </p>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Product Type */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Product Type
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_component">Component</Label>
              <p className="text-sm text-muted-foreground">
                This product is used as a component in assemblies
              </p>
            </div>
            <Switch
              id="is_component"
              checked={formData.is_component}
              onCheckedChange={(checked) =>
                updateField("is_component", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_finished_package">Finished Package</Label>
              <p className="text-sm text-muted-foreground">
                This product is a finished package assembled from components
              </p>
            </div>
            <Switch
              id="is_finished_package"
              checked={formData.is_finished_package}
              onCheckedChange={(checked) =>
                updateField("is_finished_package", checked)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assembly_time_mins">Assembly Time (minutes)</Label>
            <Input
              id="assembly_time_mins"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={formData.assembly_time_mins}
              onChange={(e) =>
                updateField(
                  "assembly_time_mins",
                  parseInt(e.target.value) || 0
                )
              }
            />
            {errors.assembly_time_mins && (
              <p className="text-sm text-destructive">
                {errors.assembly_time_mins}
              </p>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Sustainability */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Sustainability
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sustainability_local"
                checked={formData.sustainability_local}
                onCheckedChange={(checked) =>
                  updateField("sustainability_local", checked === true)
                }
              />
              <Label htmlFor="sustainability_local" className="cursor-pointer">
                Locally Sourced
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sustainability_organic"
                checked={formData.sustainability_organic}
                onCheckedChange={(checked) =>
                  updateField("sustainability_organic", checked === true)
                }
              />
              <Label
                htmlFor="sustainability_organic"
                className="cursor-pointer"
              >
                Organic
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sustainability_fairtrade"
                checked={formData.sustainability_fairtrade}
                onCheckedChange={(checked) =>
                  updateField("sustainability_fairtrade", checked === true)
                }
              />
              <Label
                htmlFor="sustainability_fairtrade"
                className="cursor-pointer"
              >
                Fairtrade
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sustainability_recyclable"
                checked={formData.sustainability_recyclable}
                onCheckedChange={(checked) =>
                  updateField("sustainability_recyclable", checked === true)
                }
              />
              <Label
                htmlFor="sustainability_recyclable"
                className="cursor-pointer"
              >
                Recyclable
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sustainability_co2_score">
              CO2 Score (1-100)
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="sustainability_co2_score"
                type="number"
                min="1"
                max="100"
                step="1"
                className="w-24"
                value={formData.sustainability_co2_score}
                onChange={(e) =>
                  updateField(
                    "sustainability_co2_score",
                    parseInt(e.target.value) || 50
                  )
                }
              />
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${formData.sustainability_co2_score}%`,
                    backgroundColor:
                      formData.sustainability_co2_score <= 33
                        ? "#22c55e"
                        : formData.sustainability_co2_score <= 66
                          ? "#eab308"
                          : "#ef4444",
                  }}
                />
              </div>
              <span className="text-sm text-muted-foreground w-8 text-right">
                {formData.sustainability_co2_score}
              </span>
            </div>
            {errors.sustainability_co2_score && (
              <p className="text-sm text-destructive">
                {errors.sustainability_co2_score}
              </p>
            )}
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {product ? "Update Product" : "Create Product"}
        </Button>
      </div>
    </form>
  );
}
