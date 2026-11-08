// Loads everything the session needs about a shopper at connect time: profile, history, offers, list.
import { findProduct } from "../data/catalog";
import type { PersonaKey } from "../data/personas";
import { adminClient } from "../supabase/server";
import { SessionError, type ListItem, type Offer, type SessionProfile } from "./types";

export type ConnectInput = { persona: PersonaKey } | { guestName: string };

export interface Shopper {
  profile: SessionProfile;
  offers: Offer[];
  list: ListItem[];
}

interface OfferRow {
  product_id: string;
  discount_pct: number;
  reason: string | null;
  profile_id: string | null;
}

const known = (productId: string) => findProduct(productId) !== undefined;

function toOffers(rows: OfferRow[]): Offer[] {
  return rows
    .filter((r) => known(r.product_id))
    .map((r) => ({
      productId: r.product_id,
      discountPct: r.discount_pct,
      reason: r.reason ?? "",
      personal: r.profile_id !== null,
    }));
}

export async function loadShopper(input: ConnectInput): Promise<Shopper> {
  const db = adminClient();

  if ("guestName" in input) {
    const name = input.guestName.trim().slice(0, 24) || "Guest";
    const { data: profile, error } = await db
      .from("profiles")
      .insert({ name, is_guest: true })
      .select("id, name")
      .single();
    if (error) throw error;
    const { data: offers, error: offersError } = await db
      .from("offers")
      .select("product_id, discount_pct, reason, profile_id")
      .is("profile_id", null);
    if (offersError) throw offersError;
    return {
      profile: { id: profile.id, key: null, name: profile.name, avatar: null, a11yMode: false, isGuest: true, history: {} },
      offers: toOffers(offers ?? []),
      list: [],
    };
  }

  const { data: profile, error } = await db
    .from("profiles")
    .select("id, persona_key, name, avatar, a11y_mode")
    .eq("persona_key", input.persona)
    .maybeSingle();
  if (error) throw error;
  if (!profile) throw new SessionError(`Persona ${input.persona} is not seeded (run npm run seed:push)`, 404);

  const [history, offers, lists] = await Promise.all([
    db.from("purchase_history").select("product_id, count").eq("profile_id", profile.id),
    db
      .from("offers")
      .select("product_id, discount_pct, reason, profile_id")
      .or(`profile_id.is.null,profile_id.eq.${profile.id}`),
    db.from("lists").select("id, list_items(product_id, qty)").eq("profile_id", profile.id).limit(1),
  ]);
  for (const r of [history, offers, lists]) if (r.error) throw r.error;

  const items = (lists.data?.[0]?.list_items ?? []) as { product_id: string; qty: number }[];
  return {
    profile: {
      id: profile.id,
      key: profile.persona_key as PersonaKey,
      name: profile.name,
      avatar: profile.avatar,
      a11yMode: profile.a11y_mode,
      isGuest: false,
      history: Object.fromEntries(
        (history.data ?? []).filter((h) => known(h.product_id)).map((h) => [h.product_id, h.count]),
      ),
    },
    offers: toOffers((offers.data ?? []) as OfferRow[]),
    list: items
      .filter((i) => known(i.product_id))
      .map((i) => ({ productId: i.product_id, qty: i.qty, checked: false, source: "list" as const })),
  };
}
