import { revalidateTag } from "next/cache";
import {
  PUBLIC_CACHE_TAGS,
  type PublicCacheTag,
} from "@/lib/public-cache-tags";

export { PUBLIC_CACHE_TAGS, type PublicCacheTag };

export function revalidatePublicCache(...tags: PublicCacheTag[]) {
  const selected =
    tags.length > 0 ? tags : (Object.values(PUBLIC_CACHE_TAGS) as PublicCacheTag[]);

  for (const tag of selected) {
    revalidateTag(tag, "max");
  }
}
