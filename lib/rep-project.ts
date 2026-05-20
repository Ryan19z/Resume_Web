import { PLACEHOLDER_IMAGES } from "./media-defaults";
import { randomId } from "./random-id";
import type { RepresentativeProject } from "./types";

export function newRepresentativeProject(): RepresentativeProject {
  return {
    id: randomId("rp-"),
    title: "新项目",
    description: "",
    media: { kind: "image", url: PLACEHOLDER_IMAGES.wide3 },
  };
}
