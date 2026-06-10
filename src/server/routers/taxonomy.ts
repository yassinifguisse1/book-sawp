import {
  listPublicCategoriesFlat,
  listPublicCategoryTree,
  listPublicSelectableCategories,
} from "@/server/domain/taxonomy";
import { createRouter, publicQuery } from "@/server/trpc";

export const taxonomyRouter = createRouter({
  tree: publicQuery.query(() => listPublicCategoryTree()),
  flat: publicQuery.query(() => listPublicCategoriesFlat()),
  selectable: publicQuery.query(() => listPublicSelectableCategories()),
});
