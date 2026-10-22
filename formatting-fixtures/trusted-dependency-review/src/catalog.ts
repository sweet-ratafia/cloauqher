import { formatISO } from "date-fns";
import { uniq } from "lodash-es";
import { nanoid } from "nanoid";
import { z } from "zod";

const Item = z.object({
  title: z.string().trim().min(1),
  tags: z.array(z.string()),
});

export function createCatalogItem(input: unknown) {
  const item = Item.parse(input);
  return {
    id: nanoid(),
    title: item.title.replace(/\s+/g, " "),
    tags: uniq(item.tags.map((tag) => tag.toLowerCase())).sort(),
    updatedAt: formatISO(new Date(0)),
  };
}
