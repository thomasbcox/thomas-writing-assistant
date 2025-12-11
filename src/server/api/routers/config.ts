import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getConfigLoader } from "~/server/services/config";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { TRPCError } from "@trpc/server";

export const configRouter = createTRPCRouter({
  getStyleGuide: publicProcedure.query(async () => {
    const loader = getConfigLoader();
    return loader.getStyleGuide();
  }),

  getCredo: publicProcedure.query(async () => {
    const loader = getConfigLoader();
    return loader.getCredo();
  }),

  getConstraints: publicProcedure.query(async () => {
    const loader = getConfigLoader();
    return loader.getConstraints();
  }),

  getStyleGuideRaw: publicProcedure.query(async () => {
    const configDir = path.join(process.cwd(), "config");
    const styleGuidePath = path.join(configDir, "style_guide.yaml");
    
    if (!fs.existsSync(styleGuidePath)) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "style_guide.yaml not found",
      });
    }

    const content = fs.readFileSync(styleGuidePath, "utf-8");
    return { content };
  }),

  getCredoRaw: publicProcedure.query(async () => {
    const configDir = path.join(process.cwd(), "config");
    const credoPath = path.join(configDir, "credo.yaml");
    
    if (!fs.existsSync(credoPath)) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "credo.yaml not found",
      });
    }

    const content = fs.readFileSync(credoPath, "utf-8");
    return { content };
  }),

  getConstraintsRaw: publicProcedure.query(async () => {
    const configDir = path.join(process.cwd(), "config");
    const constraintsPath = path.join(configDir, "constraints.yaml");
    
    if (!fs.existsSync(constraintsPath)) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "constraints.yaml not found",
      });
    }

    const content = fs.readFileSync(constraintsPath, "utf-8");
    return { content };
  }),

  updateStyleGuide: publicProcedure
    .input(z.object({ content: z.string() }))
    .mutation(async ({ input }) => {
      const configDir = path.join(process.cwd(), "config");
      const styleGuidePath = path.join(configDir, "style_guide.yaml");

      try {
        // Validate YAML syntax
        yaml.load(input.content);
        
        // Write to file
        fs.writeFileSync(styleGuidePath, input.content, "utf-8");
        
        // Reload configs immediately
        const loader = getConfigLoader();
        loader.reloadConfigs();
        
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid YAML: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  updateCredo: publicProcedure
    .input(z.object({ content: z.string() }))
    .mutation(async ({ input }) => {
      const configDir = path.join(process.cwd(), "config");
      const credoPath = path.join(configDir, "credo.yaml");

      try {
        // Validate YAML syntax
        yaml.load(input.content);
        
        // Write to file
        fs.writeFileSync(credoPath, input.content, "utf-8");
        
        // Reload configs immediately
        const loader = getConfigLoader();
        loader.reloadConfigs();
        
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid YAML: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  updateConstraints: publicProcedure
    .input(z.object({ content: z.string() }))
    .mutation(async ({ input }) => {
      const configDir = path.join(process.cwd(), "config");
      const constraintsPath = path.join(configDir, "constraints.yaml");

      try {
        // Validate YAML syntax
        yaml.load(input.content);
        
        // Write to file
        fs.writeFileSync(constraintsPath, input.content, "utf-8");
        
        // Reload configs immediately
        const loader = getConfigLoader();
        loader.reloadConfigs();
        
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid YAML: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  getStatus: publicProcedure.query(async () => {
    const loader = getConfigLoader();
    return loader.getConfigStatus();
  }),
});

