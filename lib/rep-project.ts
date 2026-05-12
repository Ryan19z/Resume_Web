import { PLACEHOLDER_IMAGES } from "./media-defaults";
import type { RepresentativeProject } from "./types";

export function newRepresentativeProject(): RepresentativeProject {
  return {
    id: `rp-${crypto.randomUUID()}`,
    title: "新项目",
    description: "",
    media: { kind: "image", url: PLACEHOLDER_IMAGES.wide3 },
  };
}
