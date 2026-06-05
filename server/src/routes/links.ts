import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { Link, type ILink } from "../models/Link";
import { requireAuth, requireAdmin } from "../middleware/auth";

const urlSchema = z
  .string()
  .url()
  .refine((u) => /^https?:\/\//i.test(u), {
    message: "url must use http or https",
  });

const linkInputSchema = z.object({
  title: z.string().min(1).max(200),
  url: urlSchema,
  description: z.string().max(1000).optional(),
  icon: z.string().max(512).optional(),
  category: z.string().max(100).optional(),
  sortOrder: z.number().int().optional(),
});

const linkPatchSchema = linkInputSchema.partial();

function serialize(link: ILink) {
  return {
    id: link._id.toString(),
    title: link.title,
    url: link.url,
    description: link.description,
    icon: link.icon,
    category: link.category,
    sortOrder: link.sortOrder,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
  };
}

export const linksRouter = Router();

linksRouter.get("/", async (_req, res, next) => {
  try {
    const links = await Link.find()
      .sort({ sortOrder: 1, title: 1 })
      .lean<ILink[]>();
    res.json(links.map(serialize));
  } catch (err) {
    next(err);
  }
});

linksRouter.post("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const parsed = linkInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "invalid request body", issues: parsed.error.issues });
      return;
    }
    const created = await Link.create({
      ...parsed.data,
      createdBy: req.user ? new Types.ObjectId(req.user.sub) : undefined,
    });
    res.status(201).json(serialize(created));
  } catch (err) {
    next(err);
  }
});

linksRouter.put("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    const parsed = linkPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "invalid request body", issues: parsed.error.issues });
      return;
    }
    const updated = await Link.findByIdAndUpdate(req.params.id, parsed.data, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      res.status(404).json({ error: "link not found" });
      return;
    }
    res.json(serialize(updated));
  } catch (err) {
    next(err);
  }
});

linksRouter.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      if (!Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ error: "invalid id" });
        return;
      }
      const deleted = await Link.findByIdAndDelete(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: "link not found" });
        return;
      }
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
