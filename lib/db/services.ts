import fs from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/client";

export interface DentalService {
  id: string;
  code?: string | null;
  category: string;
  name: string;
  description?: string | null;
  base_price: number;
  min_price?: number | null;
  max_price?: number | null;
  default_duration_minutes: number;
  is_active: boolean;
  bookable_online: boolean;
  created_at?: string;
  updated_at?: string;
}

const DATA_FILE = path.join(process.cwd(), "data", "dental_services.json");

function readLocalServices(): DentalService[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading local dental_services.json:", err);
  }
  return [];
}

function writeLocalServices(services: DentalService[]): void {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(services, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing local dental_services.json:", err);
  }
}

/**
 * Fetch all dental services with optional filtering
 */
export async function getDentalServices(options?: {
  category?: string;
  onlyActive?: boolean;
}): Promise<DentalService[]> {
  try {
    const supabase = createClient();
    let query = supabase.from("dental_services").select("*").order("category", { ascending: true });

    if (options?.category && options.category !== "all") {
      query = query.eq("category", options.category);
    }
    if (options?.onlyActive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data as DentalService[];
    }
  } catch (err) {
    // Fall back to local persistent store
  }

  // Fallback to local store
  let list = readLocalServices();
  if (options?.category && options.category !== "all") {
    list = list.filter((s) => s.category.toLowerCase() === options.category?.toLowerCase());
  }
  if (options?.onlyActive) {
    list = list.filter((s) => s.is_active);
  }
  return list.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

/**
 * Get a single dental service by ID
 */
export async function getDentalServiceById(id: string): Promise<DentalService | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("dental_services")
      .select("*")
      .eq("id", id)
      .single();

    if (!error && data) {
      return data as DentalService;
    }
  } catch {
    // Fall back to local store
  }

  const list = readLocalServices();
  return list.find((s) => s.id === id) || null;
}

/**
 * Create a new dental service
 */
export async function createDentalService(
  service: Omit<DentalService, "id" | "created_at" | "updated_at">
): Promise<DentalService> {
  const newService: DentalService = {
    id: `srv-${Date.now()}`,
    code: service.code || `DS-${Math.floor(1000 + Math.random() * 9000)}`,
    category: service.category,
    name: service.name,
    description: service.description || "",
    base_price: Number(service.base_price) || 0,
    min_price: service.min_price !== undefined && service.min_price !== null ? Number(service.min_price) : null,
    max_price: service.max_price !== undefined && service.max_price !== null ? Number(service.max_price) : null,
    default_duration_minutes: Number(service.default_duration_minutes) || 45,
    is_active: service.is_active !== undefined ? service.is_active : true,
    bookable_online: service.bookable_online !== undefined ? service.bookable_online : true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const supabase = createClient();
    const { data, error } = await supabase.from("dental_services").insert(newService).select().single();
    if (!error && data) {
      // Also sync local
      const list = readLocalServices();
      list.unshift(data as DentalService);
      writeLocalServices(list);
      return data as DentalService;
    }
  } catch {
    // Fall back to local store
  }

  const list = readLocalServices();
  list.unshift(newService);
  writeLocalServices(list);
  return newService;
}

/**
 * Update an existing dental service
 */
export async function updateDentalService(
  id: string,
  updates: Partial<DentalService>
): Promise<DentalService> {
  const payload = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("dental_services")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (!error && data) {
      const list = readLocalServices();
      const idx = list.findIndex((s) => s.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...(data as DentalService) };
        writeLocalServices(list);
      }
      return data as DentalService;
    }
  } catch {
    // Fall back to local store
  }

  const list = readLocalServices();
  const idx = list.findIndex((s) => s.id === id);
  if (idx === -1) {
    throw new Error(`Dental service with ID ${id} not found.`);
  }

  list[idx] = {
    ...list[idx],
    ...payload,
    base_price: updates.base_price !== undefined ? Number(updates.base_price) : list[idx].base_price,
  };
  writeLocalServices(list);
  return list[idx];
}

/**
 * Delete or soft-deactivate a dental service
 */
export async function deleteDentalService(id: string): Promise<boolean> {
  try {
    const supabase = createClient();
    await supabase.from("dental_services").delete().eq("id", id);
  } catch {
    // ignore
  }

  const list = readLocalServices();
  const filtered = list.filter((s) => s.id !== id);
  writeLocalServices(filtered);
  return true;
}
