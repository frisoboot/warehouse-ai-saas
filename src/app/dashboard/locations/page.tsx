"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Plus, Trash2, Loader2, MapPinOff } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { useToast } from "@/components/ui/use-toast";
import { createLocation, deleteLocation } from "@/actions/locations";
import type { Location } from "@/types/database";

export default function LocationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [warehouseId, setWarehouseId] = useState("");
  const [zone, setZone] = useState("");
  const [aisle, setAisle] = useState("");
  const [shelf, setShelf] = useState("");
  const [bin, setBin] = useState("");
  const [locationCodePreview, setLocationCodePreview] = useState("");

  // Update location code preview
  useEffect(() => {
    const parts = [warehouseId, zone, aisle, shelf, bin].filter(Boolean);
    if (parts.length > 0) {
      setLocationCodePreview(
        `${warehouseId || "___"}-${zone || "_"}-${aisle || "__"}-${shelf || "_"}-${bin || "_"}`
      );
    } else {
      setLocationCodePreview("");
    }
  }, [warehouseId, zone, aisle, shelf, bin]);

  const {
    data: locations,
    isLoading,
    error,
  } = useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: async () => {
      const res = await fetch("/api/locations");
      if (!res.ok) throw new Error("Failed to fetch locations");
      return res.json();
    },
  });

  // Fetch inventory counts per location
  const { data: inventoryCounts } = useQuery<
    Record<string, number>
  >({
    queryKey: ["inventory-counts"],
    queryFn: async () => {
      const res = await fetch("/api/inventory");
      if (!res.ok) return {};
      const data = await res.json();
      const counts: Record<string, number> = {};
      for (const item of data) {
        const locId = item.location_id;
        counts[locId] = (counts[locId] || 0) + item.quantity;
      }
      return counts;
    },
  });

  const resetForm = () => {
    setWarehouseId("");
    setZone("");
    setAisle("");
    setShelf("");
    setBin("");
    setLocationCodePreview("");
  };

  const handleCreateLocation = async () => {
    if (!warehouseId || !zone || !aisle || !shelf || !bin) {
      toast({
        title: "Validation Error",
        description: "All fields are required to create a location.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const formData = new FormData();
      formData.set("warehouse_id", warehouseId);
      formData.set("zone", zone);
      formData.set("aisle", aisle);
      formData.set("shelf", shelf);
      formData.set("bin", bin);

      const result = await createLocation(formData);

      if (result.error) {
        const errorMessages = Object.values(result.error).flat().join(", ");
        toast({
          title: "Failed to create location",
          description: errorMessages,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Location created",
        description: `Location ${locationCodePreview} has been created successfully.`,
      });

      resetForm();
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteLocation = async (id: string, locationCode: string) => {
    setDeletingId(id);
    try {
      await deleteLocation(id);
      toast({
        title: "Location deleted",
        description: `Location ${locationCode} has been removed.`,
      });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-counts"] });
    } catch (err) {
      toast({
        title: "Failed to delete location",
        description:
          err instanceof Error ? err.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Warehouse Locations
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage warehouse zones, aisles, shelves, and bins
            </p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Location
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Location</DialogTitle>
              <DialogDescription>
                Define a new warehouse location by specifying its coordinates.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="warehouse_id">Warehouse ID</Label>
                <Input
                  id="warehouse_id"
                  placeholder="e.g. WH1"
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="zone">Zone</Label>
                  <Input
                    id="zone"
                    placeholder="e.g. A"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="aisle">Aisle</Label>
                  <Input
                    id="aisle"
                    placeholder="e.g. 01"
                    value={aisle}
                    onChange={(e) => setAisle(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="shelf">Shelf</Label>
                  <Input
                    id="shelf"
                    placeholder="e.g. A"
                    value={shelf}
                    onChange={(e) => setShelf(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bin">Bin</Label>
                  <Input
                    id="bin"
                    placeholder="e.g. 1"
                    value={bin}
                    onChange={(e) => setBin(e.target.value)}
                  />
                </div>
              </div>
              {locationCodePreview && (
                <div className="rounded-md border bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    Location Code Preview
                  </p>
                  <p className="font-mono text-lg font-bold">
                    {locationCodePreview}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  setDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateLocation} disabled={isCreating}>
                {isCreating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Location
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      {/* Locations Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="space-y-3">
                <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
              </div>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MapPinOff className="h-10 w-10 text-destructive mb-3" />
          <p className="text-sm text-muted-foreground">
            Failed to load locations. Please try again.
          </p>
        </div>
      ) : !locations || locations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MapPinOff className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold">No locations found</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Get started by adding your first warehouse location.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Location
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {locations.map((location) => (
            <Card key={location.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="font-mono text-lg">
                    {location.location_code}
                  </CardTitle>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        disabled={deletingId === location.id}
                      >
                        {deletingId === location.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Location</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete location{" "}
                          <span className="font-mono font-semibold">
                            {location.location_code}
                          </span>
                          ? This action cannot be undone. Locations with existing
                          inventory cannot be deleted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() =>
                            handleDeleteLocation(
                              location.id,
                              location.location_code
                            )
                          }
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <CardDescription>
                  Warehouse {location.warehouse_id}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Zone</p>
                    <p className="font-medium">{location.zone}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Aisle</p>
                    <p className="font-medium">{location.aisle}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Shelf</p>
                    <p className="font-medium">{location.shelf}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Bin</p>
                    <p className="font-medium">{location.bin}</p>
                  </div>
                </div>
                {inventoryCounts && inventoryCounts[location.id] !== undefined && (
                  <>
                    <Separator className="my-3" />
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                        <MapPin className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {inventoryCounts[location.id]}
                        </span>{" "}
                        items stored
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
