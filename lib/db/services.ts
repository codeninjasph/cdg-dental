import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getPool, isValidUuid } from "./pool";

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
    const db = getPool();
    let query = `
      SELECT 
        id, code, category, name, description, 
        base_price::float AS base_price,
        min_price::float AS min_price,
        max_price::float AS max_price,
        default_duration_minutes,
        is_active, bookable_online,
        created_at, updated_at
      FROM public.dental_services
      WHERE 1=1
    `;
    const params: any[] = [];

    if (options?.category && options.category !== "all") {
      params.push(options.category);
      query += ` AND category = $${params.length}`;
    }
    if (options?.onlyActive) {
      query += ` AND is_active = true`;
    }

    query += ` ORDER BY category ASC, name ASC;`;

    const { rows } = await db.query(query, params);
    if (rows && rows.length > 0) {
      return rows.map((r) => ({
        ...r,
        base_price: Number(r.base_price) || 0,
        min_price: r.min_price != null ? Number(r.min_price) : null,
        max_price: r.max_price != null ? Number(r.max_price) : null,
        default_duration_minutes: Number(r.default_duration_minutes) || 45,
        is_active: Boolean(r.is_active),
        bookable_online: Boolean(r.bookable_online),
      }));
    }
  } catch (err) {
    console.warn("Could not read dental_services from DB, falling back to local file:", err);
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
 * Get a single dental service by ID or code
 */
export async function getDentalServiceById(id: string): Promise<DentalService | null> {
  try {
    const db = getPool();
    const isUuid = isValidUuid(id);
    const query = isUuid
      ? `SELECT id, code, category, name, description, 
                base_price::float AS base_price, min_price::float AS min_price, max_price::float AS max_price,
                default_duration_minutes, is_active, bookable_online, created_at, updated_at
         FROM public.dental_services WHERE id = $1::uuid;`
      : `SELECT id, code, category, name, description, 
                base_price::float AS base_price, min_price::float AS min_price, max_price::float AS max_price,
                default_duration_minutes, is_active, bookable_online, created_at, updated_at
         FROM public.dental_services WHERE code = $1;`;

    const { rows } = await db.query(query, [id]);
    if (rows && rows.length > 0) {
      const r = rows[0];
      return {
        ...r,
        base_price: Number(r.base_price) || 0,
        min_price: r.min_price != null ? Number(r.min_price) : null,
        max_price: r.max_price != null ? Number(r.max_price) : null,
        default_duration_minutes: Number(r.default_duration_minutes) || 45,
        is_active: Boolean(r.is_active),
        bookable_online: Boolean(r.bookable_online),
      };
    }
  } catch (err) {
    console.warn("Could not fetch dental service from DB:", err);
  }

  const list = readLocalServices();
  return list.find((s) => s.id === id || s.code === id) || null;
}

/**
 * Create a new dental service
 */
export async function createDentalService(
  service: Omit<DentalService, "id" | "created_at" | "updated_at">
): Promise<DentalService> {
  const serviceId = crypto.randomUUID();
  const code = service.code || `DS-${Math.floor(1000 + Math.random() * 9000)}`;
  const basePrice = Number(service.base_price) || 0;
  const minPrice = service.min_price !== undefined && service.min_price !== null ? Number(service.min_price) : null;
  const maxPrice = service.max_price !== undefined && service.max_price !== null ? Number(service.max_price) : null;
  const duration = Number(service.default_duration_minutes) || 45;
  const isActive = service.is_active !== undefined ? Boolean(service.is_active) : true;
  const bookableOnline = service.bookable_online !== undefined ? Boolean(service.bookable_online) : true;

  try {
    const db = getPool();
    const query = `
      INSERT INTO public.dental_services (
        id, code, category, name, description,
        base_price, min_price, max_price,
        default_duration_minutes, is_active, bookable_online,
        created_at, updated_at
      ) VALUES (
        $1::uuid, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10, $11,
        NOW(), NOW()
      )
      RETURNING 
        id, code, category, name, description,
        base_price::float AS base_price, min_price::float AS min_price, max_price::float AS max_price,
        default_duration_minutes, is_active, bookable_online, created_at, updated_at;
    `;
    const { rows } = await db.query(query, [
      serviceId,
      code,
      service.category,
      service.name,
      service.description || "",
      basePrice,
      minPrice,
      maxPrice,
      duration,
      isActive,
      bookableOnline,
    ]);

    if (rows && rows.length > 0) {
      const created = {
        ...rows[0],
        base_price: Number(rows[0].base_price) || 0,
        min_price: rows[0].min_price != null ? Number(rows[0].min_price) : null,
        max_price: rows[0].max_price != null ? Number(rows[0].max_price) : null,
        default_duration_minutes: Number(rows[0].default_duration_minutes) || 45,
        is_active: Boolean(rows[0].is_active),
        bookable_online: Boolean(rows[0].bookable_online),
      };

      // Also sync local file
      const list = readLocalServices();
      list.unshift(created);
      writeLocalServices(list);

      return created;
    }
  } catch (err) {
    console.error("Could not insert dental_service into DB, falling back to local file:", err);
  }

  const fallbackService: DentalService = {
    id: serviceId,
    code,
    category: service.category,
    name: service.name,
    description: service.description || "",
    base_price: basePrice,
    min_price: minPrice,
    max_price: maxPrice,
    default_duration_minutes: duration,
    is_active: isActive,
    bookable_online: bookableOnline,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const list = readLocalServices();
  list.unshift(fallbackService);
  writeLocalServices(list);
  return fallbackService;
}

/**
 * Update an existing dental service
 */
export async function updateDentalService(
  id: string,
  updates: Partial<DentalService>
): Promise<DentalService> {
  const isUuid = isValidUuid(id);

  try {
    const db = getPool();
    const sets: string[] = ["updated_at = NOW()"];
    const params: any[] = [];

    if (updates.category !== undefined) {
      params.push(updates.category);
      sets.push(`category = $${params.length}`);
    }
    if (updates.name !== undefined) {
      params.push(updates.name);
      sets.push(`name = $${params.length}`);
    }
    if (updates.code !== undefined) {
      params.push(updates.code);
      sets.push(`code = $${params.length}`);
    }
    if (updates.description !== undefined) {
      params.push(updates.description);
      sets.push(`description = $${params.length}`);
    }
    if (updates.base_price !== undefined) {
      params.push(Number(updates.base_price) || 0);
      sets.push(`base_price = $${params.length}`);
    }
    if (updates.min_price !== undefined) {
      params.push(updates.min_price != null ? Number(updates.min_price) : null);
      sets.push(`min_price = $${params.length}`);
    }
    if (updates.max_price !== undefined) {
      params.push(updates.max_price != null ? Number(updates.max_price) : null);
      sets.push(`max_price = $${params.length}`);
    }
    if (updates.default_duration_minutes !== undefined) {
      params.push(Number(updates.default_duration_minutes) || 45);
      sets.push(`default_duration_minutes = $${params.length}`);
    }
    if (updates.is_active !== undefined) {
      params.push(Boolean(updates.is_active));
      sets.push(`is_active = $${params.length}`);
    }
    if (updates.bookable_online !== undefined) {
      params.push(Boolean(updates.bookable_online));
      sets.push(`bookable_online = $${params.length}`);
    }

    params.push(id);
    const idParam = `$${params.length}`;
    const whereClause = isUuid ? `WHERE id = ${idParam}::uuid` : `WHERE code = ${idParam}`;

    const query = `
      UPDATE public.dental_services
      SET ${sets.join(", ")}
      ${whereClause}
      RETURNING 
        id, code, category, name, description,
        base_price::float AS base_price, min_price::float AS min_price, max_price::float AS max_price,
        default_duration_minutes, is_active, bookable_online, created_at, updated_at;
    `;

    const { rows } = await db.query(query, params);
    if (rows && rows.length > 0) {
      const updated = {
        ...rows[0],
        base_price: Number(rows[0].base_price) || 0,
        min_price: rows[0].min_price != null ? Number(rows[0].min_price) : null,
        max_price: rows[0].max_price != null ? Number(rows[0].max_price) : null,
        default_duration_minutes: Number(rows[0].default_duration_minutes) || 45,
        is_active: Boolean(rows[0].is_active),
        bookable_online: Boolean(rows[0].bookable_online),
      };

      const list = readLocalServices();
      const idx = list.findIndex((s) => s.id === id || s.code === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updated };
        writeLocalServices(list);
      }
      return updated;
    }
  } catch (err) {
    console.error("Could not update dental_service in DB:", err);
  }

  // Fallback to local store
  const list = readLocalServices();
  const idx = list.findIndex((s) => s.id === id || s.code === id);
  if (idx === -1) {
    throw new Error(`Dental service with ID ${id} not found.`);
  }

  list[idx] = {
    ...list[idx],
    ...updates,
    updated_at: new Date().toISOString(),
    base_price: updates.base_price !== undefined ? Number(updates.base_price) : list[idx].base_price,
  };
  writeLocalServices(list);
  return list[idx];
}

/**
 * Delete or soft-deactivate a dental service
 */
export async function deleteDentalService(id: string): Promise<boolean> {
  const isUuid = isValidUuid(id);

  try {
    const db = getPool();
    const query = isUuid
      ? `DELETE FROM public.dental_services WHERE id = $1::uuid;`
      : `DELETE FROM public.dental_services WHERE code = $1;`;
    await db.query(query, [id]);
  } catch (err) {
    console.error("Could not delete dental_service from DB:", err);
  }

  const list = readLocalServices();
  const filtered = list.filter((s) => s.id !== id && s.code !== id);
  writeLocalServices(filtered);
  return true;
}
