"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { MapView } from "@/components/map/map-view";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { composeRoute } from "@/lib/routing/compose";
import { formatDuration } from "@/lib/geo/distance";
import type { LatLng } from "@/types/place";
import type { RouteLeg, RouteLegMode } from "@/types/route";

type Entity = "places" | "deals" | "advisories" | "route-templates";

interface AdminPlaceRow {
  id: string;
  slug: string;
  name: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  address: string | null;
  google_place_id: string | null;
  lat: number;
  lng: number;
  price_level: number | null;
  verified: boolean;
  last_verified_at: string | null;
  is_active: boolean;
  is_open_late: boolean;
  is_race_day_recommended: boolean;
  tags: string[] | null;
}

interface AdminGenericRow {
  id: string;
  title?: string;
  name?: string;
  verified: boolean;
  is_active: boolean;
  severity?: string;
  valid_until?: string | null;
  ends_at?: string | null;
}

async function adminFetch<T>(entity: Entity): Promise<{ items: T[] }> {
  const response = await fetch(`/api/admin/${entity}`);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? "Request failed");
  }
  return response.json();
}

async function adminSave(entity: Entity, payload: unknown): Promise<void> {
  const response = await fetch(`/api/admin/${entity}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? "Save failed");
  }
}

async function adminDeactivate(entity: Entity, id: string): Promise<void> {
  const response = await fetch(`/api/admin/${entity}?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? "Deactivate failed");
  }
}

function useAdminList<T>(entity: Entity) {
  return useQuery({
    queryKey: ["admin", entity],
    queryFn: () => adminFetch<T>(entity),
    retry: false,
  });
}

function toIsoOrUndefined(local: string): string | undefined {
  if (!local) return undefined;
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

const EMPTY_PLACE_FORM = {
  id: undefined as string | undefined,
  slug: "",
  name: "",
  category: "hotel",
  subcategory: "",
  description: "",
  address: "",
  googlePlaceId: "",
  lat: 2.76,
  lng: 101.73,
  priceLevel: "",
  tagsText: "",
  verified: false,
  isActive: true,
  isOpenLate: false,
  isRaceDayRecommended: false,
};

function PlacesTab() {
  const queryClient = useQueryClient();
  const list = useAdminList<AdminPlaceRow>("places");
  const [form, setForm] = useState(EMPTY_PLACE_FORM);
  const [needsVerificationOnly, setNeedsVerificationOnly] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (payload: unknown) => adminSave("places", payload),
    onSuccess: () => {
      setMessage("Place saved.");
      setForm(EMPTY_PLACE_FORM);
      queryClient.invalidateQueries({ queryKey: ["admin", "places"] });
    },
    onError: (error: Error) => setMessage(error.message),
  });
  const deactivate = useMutation({
    mutationFn: (id: string) => adminDeactivate("places", id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "places"] }),
  });

  const rows = useMemo(() => {
    const items = list.data?.items ?? [];
    return needsVerificationOnly ? items.filter((r) => !r.verified) : items;
  }, [list.data, needsVerificationOnly]);

  function edit(row: AdminPlaceRow) {
    setForm({
      id: row.id,
      slug: row.slug,
      name: row.name,
      category: row.category,
      subcategory: row.subcategory ?? "",
      description: row.description ?? "",
      address: row.address ?? "",
      googlePlaceId: row.google_place_id ?? "",
      lat: row.lat,
      lng: row.lng,
      priceLevel: row.price_level?.toString() ?? "",
      tagsText: (row.tags ?? []).join(", "),
      verified: row.verified,
      isActive: row.is_active,
      isOpenLate: row.is_open_late,
      isRaceDayRecommended: row.is_race_day_recommended,
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    save.mutate({
      id: form.id,
      slug: form.slug,
      name: form.name,
      category: form.category,
      subcategory: form.subcategory || undefined,
      description: form.description || undefined,
      address: form.address || undefined,
      googlePlaceId: form.googlePlaceId || undefined,
      lat: form.lat,
      lng: form.lng,
      priceLevel: form.priceLevel === "" ? undefined : Number(form.priceLevel),
      tags: form.tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      verified: form.verified,
      isActive: form.isActive,
      isOpenLate: form.isOpenLate,
      isRaceDayRecommended: form.isRaceDayRecommended,
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Places</CardTitle>
          <label className="flex items-center gap-2 text-xs">
            <Switch
              checked={needsVerificationOnly}
              onCheckedChange={setNeedsVerificationOnly}
            />
            Needs verification
          </label>
        </CardHeader>
        <CardContent className="max-h-[28rem] space-y-1.5 overflow-y-auto">
          {list.isError && (
            <Alert>
              <AlertDescription>{(list.error as Error).message}</AlertDescription>
            </Alert>
          )}
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm"
            >
              <div className="min-w-0">
                <span className="block truncate font-medium">
                  {row.name}
                  {!row.is_active && " (inactive)"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {row.category} · {row.verified ? "verified" : "unverified"}
                </span>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="outline" onClick={() => edit(row)}>
                  Edit
                </Button>
                {row.is_active && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deactivate.mutate(row.id)}
                  >
                    Deactivate
                  </Button>
                )}
              </div>
            </div>
          ))}
          {!list.isLoading && rows.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No records.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {form.id ? "Edit place" : "New place"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="p-name">Name</Label>
                <Input
                  id="p-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-slug">Slug</Label>
                <Input
                  id="p-slug"
                  required
                  pattern="[a-z0-9-]+"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["hotel", "food", "transit", "essential", "circuit"].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-sub">Subcategory</Label>
                <Input
                  id="p-sub"
                  value={form.subcategory}
                  onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Location — click the map to set the marker</Label>
              <div className="h-48 overflow-hidden rounded-md border">
                <MapView
                  places={[]}
                  selectedPlaceId={null}
                  hoveredPlaceId={null}
                  onMarkerClick={() => {}}
                  onMarkerHover={() => {}}
                  onUserMovedMap={() => {}}
                  routeEndpoints={{
                    origin: { lat: form.lat, lng: form.lng },
                    destination: { lat: form.lat, lng: form.lng },
                  }}
                  recenterSignal={0}
                  onMapClick={(location: LatLng) =>
                    setForm({
                      ...form,
                      lat: Number(location.lat.toFixed(6)),
                      lng: Number(location.lng.toFixed(6)),
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  aria-label="Latitude"
                  type="number"
                  step="any"
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: Number(e.target.value) })}
                />
                <Input
                  aria-label="Longitude"
                  type="number"
                  step="any"
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="p-gpid">Google place ID (optional)</Label>
              <Input
                id="p-gpid"
                value={form.googlePlaceId}
                onChange={(e) => setForm({ ...form, googlePlaceId: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="p-desc">Internal description</Label>
              <Textarea
                id="p-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="p-tags">Tags (comma separated)</Label>
              <Input
                id="p-tags"
                value={form.tagsText}
                onChange={(e) => setForm({ ...form, tagsText: e.target.value })}
              />
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <Switch
                  checked={form.verified}
                  onCheckedChange={(v) => setForm({ ...form, verified: v })}
                />
                Verified (stamps today&apos;s date)
              </label>
              <label className="flex items-center gap-2">
                <Switch
                  checked={form.isRaceDayRecommended}
                  onCheckedChange={(v) => setForm({ ...form, isRaceDayRecommended: v })}
                />
                Race-day pick
              </label>
              <label className="flex items-center gap-2">
                <Switch
                  checked={form.isOpenLate}
                  onCheckedChange={(v) => setForm({ ...form, isOpenLate: v })}
                />
                Open late
              </label>
              <label className="flex items-center gap-2">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                />
                Active
              </label>
            </div>

            {message && <p className="text-xs text-muted-foreground">{message}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : form.id ? "Update place" : "Create place"}
              </Button>
              {form.id && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForm(EMPTY_PLACE_FORM)}
                >
                  New
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function DealsTab() {
  const queryClient = useQueryClient();
  const list = useAdminList<AdminGenericRow>("deals");
  const places = useAdminList<AdminPlaceRow>("places");
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    placeId: "",
    title: "",
    description: "",
    code: "",
    validFrom: "",
    validUntil: "",
    redemptionInstructions: "",
    terms: "",
    sourceUrl: "",
    verified: false,
  });

  const save = useMutation({
    mutationFn: (payload: unknown) => adminSave("deals", payload),
    onSuccess: () => {
      setMessage("Deal saved.");
      queryClient.invalidateQueries({ queryKey: ["admin", "deals"] });
    },
    onError: (error: Error) => setMessage(error.message),
  });
  const deactivate = useMutation({
    mutationFn: (id: string) => adminDeactivate("deals", id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "deals"] }),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deals</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[28rem] space-y-1.5 overflow-y-auto">
          {(list.data?.items ?? []).map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm"
            >
              <div className="min-w-0">
                <span className="block truncate font-medium">
                  {row.title}
                  {!row.is_active && " (inactive)"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {row.verified ? "verified" : "unverified"}
                  {row.valid_until &&
                    ` · expires ${new Date(row.valid_until).toLocaleDateString()}`}
                </span>
              </div>
              {row.is_active && (
                <Button size="sm" variant="ghost" onClick={() => deactivate.mutate(row.id)}>
                  Deactivate
                </Button>
              )}
            </div>
          ))}
          {!list.isLoading && (list.data?.items ?? []).length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No deals.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New deal</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({
                placeId: form.placeId,
                title: form.title,
                description: form.description || undefined,
                code: form.code || undefined,
                validFrom: toIsoOrUndefined(form.validFrom),
                validUntil: toIsoOrUndefined(form.validUntil),
                redemptionInstructions: form.redemptionInstructions || undefined,
                terms: form.terms || undefined,
                sourceUrl: form.sourceUrl || undefined,
                verified: form.verified,
                isActive: true,
              });
            }}
          >
            <div className="space-y-1">
              <Label>Place</Label>
              <Select
                value={form.placeId}
                onValueChange={(v) => setForm({ ...form, placeId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a place" />
                </SelectTrigger>
                <SelectContent>
                  {(places.data?.items ?? []).map((place) => (
                    <SelectItem key={place.id} value={place.id}>
                      {place.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="d-title">Title</Label>
              <Input
                id="d-title"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="d-desc">Description</Label>
              <Textarea
                id="d-desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="d-from">Valid from</Label>
                <Input
                  id="d-from"
                  type="datetime-local"
                  value={form.validFrom}
                  onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="d-until">Expires</Label>
                <Input
                  id="d-until"
                  type="datetime-local"
                  value={form.validUntil}
                  onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="d-code">Code</Label>
                <Input
                  id="d-code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="d-source">Source URL</Label>
                <Input
                  id="d-source"
                  type="url"
                  value={form.sourceUrl}
                  onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="d-redeem">Redemption instructions</Label>
              <Textarea
                id="d-redeem"
                rows={2}
                value={form.redemptionInstructions}
                onChange={(e) =>
                  setForm({ ...form, redemptionInstructions: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="d-terms">Terms</Label>
              <Textarea
                id="d-terms"
                rows={2}
                value={form.terms}
                onChange={(e) => setForm({ ...form, terms: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.verified}
                onCheckedChange={(v) => setForm({ ...form, verified: v })}
              />
              Verified (stamps last-checked date)
            </label>
            {message && <p className="text-xs text-muted-foreground">{message}</p>}
            <Button type="submit" disabled={save.isPending || !form.placeId}>
              {save.isPending ? "Saving…" : "Create deal"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function AdvisoriesTab() {
  const queryClient = useQueryClient();
  const list = useAdminList<AdminGenericRow>("advisories");
  const places = useAdminList<AdminPlaceRow>("places");
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    severity: "info",
    placeId: "",
    startsAt: "",
    endsAt: "",
    sourceUrl: "",
    verified: false,
  });

  const save = useMutation({
    mutationFn: (payload: unknown) => adminSave("advisories", payload),
    onSuccess: () => {
      setMessage("Advisory saved.");
      queryClient.invalidateQueries({ queryKey: ["admin", "advisories"] });
    },
    onError: (error: Error) => setMessage(error.message),
  });
  const deactivate = useMutation({
    mutationFn: (id: string) => adminDeactivate("advisories", id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "advisories"] }),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Advisories</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[28rem] space-y-1.5 overflow-y-auto">
          {(list.data?.items ?? []).map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm"
            >
              <div className="min-w-0">
                <span className="block truncate font-medium">
                  {row.title}
                  {!row.is_active && " (inactive)"}
                </span>
                <span className="text-xs text-muted-foreground">
                  <Badge variant="outline" className="mr-1 text-[10px]">
                    {row.severity}
                  </Badge>
                  {row.ends_at && `ends ${new Date(row.ends_at).toLocaleDateString()}`}
                </span>
              </div>
              {row.is_active && (
                <Button size="sm" variant="ghost" onClick={() => deactivate.mutate(row.id)}>
                  Deactivate
                </Button>
              )}
            </div>
          ))}
          {!list.isLoading && (list.data?.items ?? []).length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No advisories.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New advisory</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({
                title: form.title,
                description: form.description,
                severity: form.severity,
                placeId: form.placeId || undefined,
                startsAt: toIsoOrUndefined(form.startsAt),
                endsAt: toIsoOrUndefined(form.endsAt),
                sourceUrl: form.sourceUrl || undefined,
                verified: form.verified,
                isActive: true,
              });
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="a-title">Title</Label>
              <Input
                id="a-title"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="a-desc">Description</Label>
              <Textarea
                id="a-desc"
                rows={3}
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Severity</Label>
                <Select
                  value={form.severity}
                  onValueChange={(v) => setForm({ ...form, severity: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">info</SelectItem>
                    <SelectItem value="warning">warning</SelectItem>
                    <SelectItem value="critical">critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Place (optional)</Label>
                <Select
                  value={form.placeId || "none"}
                  onValueChange={(v) => setForm({ ...form, placeId: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {(places.data?.items ?? []).map((place) => (
                      <SelectItem key={place.id} value={place.id}>
                        {place.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="a-starts">Starts</Label>
                <Input
                  id="a-starts"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="a-ends">Ends</Label>
                <Input
                  id="a-ends"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.verified}
                onCheckedChange={(v) => setForm({ ...form, verified: v })}
              />
              Verified
            </label>
            {message && <p className="text-xs text-muted-foreground">{message}</p>}
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Create advisory"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

interface TemplateStepForm {
  mode: RouteLegMode;
  title: string;
  description: string;
  originName: string;
  destinationName: string;
  durationMinutes: number;
  estimatedCostMin?: number;
  estimatedCostMax?: number;
  warning: string;
}

const EMPTY_STEP: TemplateStepForm = {
  mode: "shuttle",
  title: "",
  description: "",
  originName: "",
  destinationName: "",
  durationMinutes: 15,
  warning: "",
};

function TemplatesTab() {
  const queryClient = useQueryClient();
  const list = useAdminList<AdminGenericRow>("route-templates");
  const places = useAdminList<AdminPlaceRow>("places");
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    originPlaceId: "",
    destinationPlaceId: "",
    activeFrom: "",
    activeUntil: "",
    reliabilityScore: 70,
    raceDaySuitabilityScore: 85,
    warning: "",
    verified: false,
  });
  const [steps, setSteps] = useState<TemplateStepForm[]>([{ ...EMPTY_STEP }]);

  const save = useMutation({
    mutationFn: (payload: unknown) => adminSave("route-templates", payload),
    onSuccess: () => {
      setMessage("Route template saved.");
      queryClient.invalidateQueries({ queryKey: ["admin", "route-templates"] });
    },
    onError: (error: Error) => setMessage(error.message),
  });
  const deactivate = useMutation({
    mutationFn: (id: string) => adminDeactivate("route-templates", id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "route-templates"] }),
  });

  const preview = useMemo(() => {
    const validSteps = steps.filter((s) => s.title && s.durationMinutes > 0);
    if (validSteps.length === 0) return null;
    const legs: RouteLeg[] = validSteps.map((step, index) => ({
      id: `preview-${index}`,
      mode: step.mode,
      title: step.title,
      description: step.description,
      originName: step.originName || "Origin",
      destinationName: step.destinationName || "Destination",
      durationMinutes: step.durationMinutes,
      estimatedCostMin: step.estimatedCostMin,
      estimatedCostMax: step.estimatedCostMax,
      currency: "MYR",
      warning: step.warning || undefined,
      source: "curated",
    }));
    return composeRoute(legs, {
      id: "preview",
      kind: "race-day",
      title: "Preview",
      travelMode: "mixed",
      reliabilityScore: form.reliabilityScore,
      raceDaySuitabilityScore: form.raceDaySuitabilityScore,
    });
  }, [steps, form.reliabilityScore, form.raceDaySuitabilityScore]);

  function updateStep(index: number, patch: Partial<TemplateStepForm>) {
    setSteps((current) =>
      current.map((step, i) => (i === index ? { ...step, ...patch } : step)),
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Route templates</CardTitle>
        </CardHeader>
        <CardContent className="max-h-56 space-y-1.5 overflow-y-auto">
          {(list.data?.items ?? []).map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm"
            >
              <span className="truncate font-medium">
                {row.name}
                {!row.is_active && " (inactive)"}
              </span>
              {row.is_active && (
                <Button size="sm" variant="ghost" onClick={() => deactivate.mutate(row.id)}>
                  Deactivate
                </Button>
              )}
            </div>
          ))}
          {!list.isLoading && (list.data?.items ?? []).length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No route templates.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New race-day route template</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({
                name: form.name,
                slug: form.slug,
                originPlaceId: form.originPlaceId,
                destinationPlaceId: form.destinationPlaceId,
                routeType: "mixed",
                activeFrom: toIsoOrUndefined(form.activeFrom),
                activeUntil: toIsoOrUndefined(form.activeUntil),
                steps: steps.map((step) => ({
                  mode: step.mode,
                  title: step.title,
                  description: step.description,
                  originName: step.originName || "Origin",
                  destinationName: step.destinationName || "Destination",
                  durationMinutes: step.durationMinutes,
                  estimatedCostMin: step.estimatedCostMin,
                  estimatedCostMax: step.estimatedCostMax,
                  currency: "MYR",
                  warning: step.warning || undefined,
                })),
                reliabilityScore: form.reliabilityScore,
                raceDaySuitabilityScore: form.raceDaySuitabilityScore,
                warning: form.warning || undefined,
                verified: form.verified,
                isActive: true,
              });
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="t-name">Name</Label>
                <Input
                  id="t-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="t-slug">Slug</Label>
                <Input
                  id="t-slug"
                  required
                  pattern="[a-z0-9-]+"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Origin place</Label>
                <Select
                  value={form.originPlaceId}
                  onValueChange={(v) => setForm({ ...form, originPlaceId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {(places.data?.items ?? []).map((place) => (
                      <SelectItem key={place.id} value={place.id}>
                        {place.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Destination place</Label>
                <Select
                  value={form.destinationPlaceId}
                  onValueChange={(v) => setForm({ ...form, destinationPlaceId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {(places.data?.items ?? []).map((place) => (
                      <SelectItem key={place.id} value={place.id}>
                        {place.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="t-from">Active from</Label>
                <Input
                  id="t-from"
                  type="datetime-local"
                  value={form.activeFrom}
                  onChange={(e) => setForm({ ...form, activeFrom: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="t-until">Active until</Label>
                <Input
                  id="t-until"
                  type="datetime-local"
                  value={form.activeUntil}
                  onChange={(e) => setForm({ ...form, activeUntil: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="t-rel">Reliability (0–100)</Label>
                <Input
                  id="t-rel"
                  type="number"
                  min={0}
                  max={100}
                  value={form.reliabilityScore}
                  onChange={(e) =>
                    setForm({ ...form, reliabilityScore: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="t-race">Race-day suitability (0–100)</Label>
                <Input
                  id="t-race"
                  type="number"
                  min={0}
                  max={100}
                  value={form.raceDaySuitabilityScore}
                  onChange={(e) =>
                    setForm({ ...form, raceDaySuitabilityScore: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Legs</Label>
              {steps.map((step, index) => (
                <div key={index} className="space-y-2 rounded-md border p-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={step.mode}
                      onValueChange={(v) => updateStep(index, { mode: v as RouteLegMode })}
                    >
                      <SelectTrigger aria-label="Leg mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["walk", "drive", "transit", "train", "bus", "shuttle", "ride-hailing"].map(
                          (mode) => (
                            <SelectItem key={mode} value={mode}>
                              {mode}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <Input
                      aria-label="Duration minutes"
                      type="number"
                      min={1}
                      value={step.durationMinutes}
                      onChange={(e) =>
                        updateStep(index, { durationMinutes: Number(e.target.value) })
                      }
                    />
                    <Input
                      aria-label="Leg title"
                      placeholder="Title (e.g. Board race-day shuttle)"
                      className="col-span-2"
                      value={step.title}
                      onChange={(e) => updateStep(index, { title: e.target.value })}
                    />
                    <Input
                      aria-label="From"
                      placeholder="From"
                      value={step.originName}
                      onChange={(e) => updateStep(index, { originName: e.target.value })}
                    />
                    <Input
                      aria-label="To"
                      placeholder="To"
                      value={step.destinationName}
                      onChange={(e) => updateStep(index, { destinationName: e.target.value })}
                    />
                    <Input
                      aria-label="Cost min (MYR)"
                      type="number"
                      min={0}
                      placeholder="Cost min (MYR)"
                      value={step.estimatedCostMin ?? ""}
                      onChange={(e) =>
                        updateStep(index, {
                          estimatedCostMin:
                            e.target.value === "" ? undefined : Number(e.target.value),
                        })
                      }
                    />
                    <Input
                      aria-label="Cost max (MYR)"
                      type="number"
                      min={0}
                      placeholder="Cost max (MYR)"
                      value={step.estimatedCostMax ?? ""}
                      onChange={(e) =>
                        updateStep(index, {
                          estimatedCostMax:
                            e.target.value === "" ? undefined : Number(e.target.value),
                        })
                      }
                    />
                    <Input
                      aria-label="Warning"
                      placeholder="Warning (optional)"
                      className="col-span-2"
                      value={step.warning}
                      onChange={(e) => updateStep(index, { warning: e.target.value })}
                    />
                  </div>
                  {steps.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setSteps((s) => s.filter((_, i) => i !== index))}
                    >
                      Remove leg
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setSteps((s) => [...s, { ...EMPTY_STEP }])}
              >
                Add leg
              </Button>
            </div>

            {preview && (
              <div className="rounded-md border bg-muted/30 p-3 text-xs">
                <p className="font-medium">Preview</p>
                <p className="mt-1 text-muted-foreground">
                  Total {formatDuration(preview.totalDurationMinutes)} ·{" "}
                  {preview.totalWalkingMinutes} min walking · {preview.transfers} transfer
                  {preview.transfers === 1 ? "" : "s"}
                  {preview.estimatedCostMin !== undefined &&
                    ` · est. MYR ${preview.estimatedCostMin}–${preview.estimatedCostMax}`}
                </p>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.verified}
                onCheckedChange={(v) => setForm({ ...form, verified: v })}
              />
              Verified (stamps verification date)
            </label>
            {message && <p className="text-xs text-muted-foreground">{message}</p>}
            <Button
              type="submit"
              disabled={save.isPending || !form.originPlaceId || !form.destinationPlaceId}
            >
              {save.isPending ? "Saving…" : "Create template"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminDashboard() {
  return (
    <Tabs defaultValue="places">
      <TabsList>
        <TabsTrigger value="places">Places</TabsTrigger>
        <TabsTrigger value="deals">Deals</TabsTrigger>
        <TabsTrigger value="advisories">Advisories</TabsTrigger>
        <TabsTrigger value="route-templates">Route templates</TabsTrigger>
      </TabsList>
      <TabsContent value="places" className="mt-4">
        <PlacesTab />
      </TabsContent>
      <TabsContent value="deals" className="mt-4">
        <DealsTab />
      </TabsContent>
      <TabsContent value="advisories" className="mt-4">
        <AdvisoriesTab />
      </TabsContent>
      <TabsContent value="route-templates" className="mt-4">
        <TemplatesTab />
      </TabsContent>
    </Tabs>
  );
}
