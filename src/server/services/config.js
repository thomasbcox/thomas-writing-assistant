import fs from "fs";
// #region agent log
(async () => { try {
    const fsLog = await import("fs");
    fsLog.default.appendFileSync("/Users/thomasbcox/Projects/thomas-writing-assistant/.cursor/debug.log", JSON.stringify({ location: 'config.ts:1', message: 'config.ts module loading fs', data: { fsType: typeof fs, fsExistsSyncType: typeof fs?.existsSync, isMock: !!fs?.existsSync?.mockImplementation }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'H3' }) + "\n");
}
catch { } })();
// #endregion
import path from "path";
import yaml from "js-yaml";
import { logger } from "~/lib/logger";
export class ConfigLoader {
    constructor(fsModule) {
        this.styleGuide = {};
        this.credo = {};
        this.constraints = {};
        this.fsModule = (fsModule ?? fs);
        this.loadConfigs();
    }
    /**
     * Reload all config files from disk
     * Call this after updating config files to get immediate changes
     */
    reloadConfigs() {
        this.loadConfigs();
        logger.info({}, "Config files reloaded");
    }
    loadConfigs() {
        const configDir = path.join(process.cwd(), "config");
        try {
            // Load style guide
            const styleGuidePath = path.join(configDir, "style_guide.yaml");
            if (this.fsModule.existsSync(styleGuidePath)) {
                const content = this.fsModule.readFileSync(styleGuidePath, "utf-8");
                this.styleGuide = yaml.load(content) ?? {};
            }
        }
        catch (error) {
            logger.warn({ err: error, configFile: "style_guide.yaml" }, "Failed to load config file");
        }
        try {
            // Load credo
            const credoPath = path.join(configDir, "credo.yaml");
            if (this.fsModule.existsSync(credoPath)) {
                const content = this.fsModule.readFileSync(credoPath, "utf-8");
                this.credo = yaml.load(content) ?? {};
            }
        }
        catch (error) {
            logger.warn({ err: error, configFile: "credo.yaml" }, "Failed to load config file");
        }
        try {
            // Load constraints
            const constraintsPath = path.join(configDir, "constraints.yaml");
            if (this.fsModule.existsSync(constraintsPath)) {
                const content = this.fsModule.readFileSync(constraintsPath, "utf-8");
                this.constraints = yaml.load(content) ?? {};
            }
        }
        catch (error) {
            logger.warn({ err: error, configFile: "constraints.yaml" }, "Failed to load config file");
        }
    }
    getStyleGuide() {
        return this.styleGuide;
    }
    getCredo() {
        return this.credo;
    }
    getConstraints() {
        return this.constraints;
    }
    getConfigStatus() {
        const configDir = path.join(process.cwd(), "config");
        const styleGuidePath = path.join(configDir, "style_guide.yaml");
        // #region agent log
        (async () => { try {
            const fsLog = await import("fs");
            fsLog.default.appendFileSync("/Users/thomasbcox/Projects/thomas-writing-assistant/.cursor/debug.log", JSON.stringify({ location: 'config.ts:110', message: 'Before existsSync call', data: { path: styleGuidePath, fsExistsSyncType: typeof this.fsModule.existsSync, isMock: !!this.fsModule.existsSync?.mockImplementation, styleGuideKeys: Object.keys(this.styleGuide).length }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'H1' }) + "\n");
        }
        catch { } })();
        // #endregion
        const styleGuideExists = this.fsModule.existsSync(styleGuidePath);
        // #region agent log
        (async () => { try {
            const fsLog = await import("fs");
            fsLog.default.appendFileSync("/Users/thomasbcox/Projects/thomas-writing-assistant/.cursor/debug.log", JSON.stringify({ location: 'config.ts:112', message: 'After existsSync call', data: { styleGuideExists, styleGuideKeys: Object.keys(this.styleGuide).length, styleGuideLoaded: styleGuideExists && Object.keys(this.styleGuide).length > 0 }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'H1' }) + "\n");
        }
        catch { } })();
        // #endregion
        const styleGuideLoaded = styleGuideExists && Object.keys(this.styleGuide).length > 0;
        const styleGuideEmpty = !styleGuideLoaded || Object.keys(this.styleGuide).length === 0;
        const credoPath = path.join(configDir, "credo.yaml");
        const credoExists = this.fsModule.existsSync(credoPath);
        const credoLoaded = credoExists && Object.keys(this.credo).length > 0;
        const credoEmpty = !credoLoaded || Object.keys(this.credo).length === 0;
        const constraintsPath = path.join(configDir, "constraints.yaml");
        const constraintsExists = this.fsModule.existsSync(constraintsPath);
        const constraintsLoaded = constraintsExists && Object.keys(this.constraints).length > 0;
        const constraintsEmpty = !constraintsLoaded || Object.keys(this.constraints).length === 0;
        return {
            styleGuide: {
                loaded: styleGuideLoaded,
                isEmpty: styleGuideEmpty,
            },
            credo: {
                loaded: credoLoaded,
                isEmpty: credoEmpty,
            },
            constraints: {
                loaded: constraintsLoaded,
                isEmpty: constraintsEmpty,
            },
        };
    }
    getSystemPrompt(context) {
        let prompt = "";
        // Build style guide section
        if (Object.keys(this.styleGuide).length > 0) {
            prompt += "Writing Style Guide:\n";
            const styleGuideYaml = yaml.dump(this.styleGuide, { indent: 2 });
            prompt += styleGuideYaml;
            prompt += "\n";
        }
        // Build credo section
        if (Object.keys(this.credo).length > 0) {
            prompt += "Core Beliefs and Values:\n";
            const credoYaml = yaml.dump(this.credo, { indent: 2 });
            prompt += credoYaml;
            prompt += "\n";
        }
        // Build constraints section
        if (Object.keys(this.constraints).length > 0) {
            prompt += "Content Constraints and Rules:\n";
            const constraintsYaml = yaml.dump(this.constraints, { indent: 2 });
            prompt += constraintsYaml;
            prompt += "\n";
        }
        if (context) {
            prompt += `Context: ${context}\n\n`;
        }
        return prompt;
    }
}
// Singleton instance
let configLoaderInstance = null;
export function getConfigLoader() {
    if (!configLoaderInstance) {
        configLoaderInstance = new ConfigLoader();
    }
    return configLoaderInstance;
}
//# sourceMappingURL=config.js.map