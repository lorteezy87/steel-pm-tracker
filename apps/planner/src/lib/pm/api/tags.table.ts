import type { EntityTag, Tag } from "@/lib/pm/types";
import type { EntityTable } from "./entity-crud";

export const TAGS: EntityTable<Tag> = {
  table: "tags",
  columns: { id: "id", name: "name", color: "color" },
};

export const ENTITY_TAGS: EntityTable<EntityTag> = {
  table: "entity_tags",
  columns: {
    id: "id",
    tagId: "tag_id",
    entityType: "entity_type",
    entityId: "entity_id",
  },
};
