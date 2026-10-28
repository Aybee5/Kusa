import { z } from 'zod'

/** Size or quantity choices, e.g. 25 pcs ₦9,500 / 50 pcs ₦18,000. */
export const ProductOptions = z.array(z.object({
  label: z.string().trim().min(1).max(30),
  price: z.number().int().min(50).max(50_000_000),
})).max(8)

/** With options, the product's price is the cheapest one, so lists can show "from". */
export const basePrice = (price: number, options?: { price: number }[]) => (options?.length ? Math.min(...options.map((o) => o.price)) : price)
