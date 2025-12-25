import { AppUser, AppConfig } from "./types";

export type CommandContext = {
    user: AppUser;
    stats: { points: number };
};

export function parseCommand(text: string, conf: any): { cmdKey: string; args: string[] } | null {
    if (!text.startsWith("!")) return null;

    // Use builtIn config if available, otherwise defaults
    const builtIn = conf.commands?.builtIn || {};
    const listing = conf.commands?.listing || {};

    const triggerMap: Record<string, string> = {};

    // Map triggers to internal keys
    if (builtIn.score?.enabled) triggerMap[builtIn.score.trigger || "!score"] = "score";
    if (builtIn.help?.enabled) triggerMap[builtIn.help.trigger || "!help"] = "help";

    if (listing.commands?.enabled) triggerMap[listing.commands.trigger || "!commands"] = "commands";

    const parts = text.split(" ");
    const trigger = parts[0].toLowerCase();

    if (triggerMap[trigger]) {
        return { cmdKey: triggerMap[trigger], args: parts.slice(1) };
    }

    return null;
}

export function buildCommandResponse(cmdKey: string, ctx: CommandContext, conf: any): string | null {
    if (cmdKey === "score") {
        // @{nickname} du hast {points} Punkte.
        const name = ctx.user.nickname || ctx.user.uniqueId || "User";
        const pts = ctx.stats.points || 0;
        return `@${name} du hast ${pts} Punkte.`;
    }

    if (cmdKey === "help") {
        // Nutze !commands für alle Befehle. Punkte: !score
        const cmdTrigger = conf.commands?.listing?.commands?.trigger || "!commands";
        const scoreTrigger = conf.commands?.builtIn?.score?.trigger || "!score";
        return `Nutze ${cmdTrigger} für alle Befehle. Punkte: ${scoreTrigger}`;
    }

    if (cmdKey === "commands") {
        // Verfügbare Befehle: !score, !help, !commands
        const list = [];
        const builtIn = conf.commands?.builtIn || {};
        const listing = conf.commands?.listing || {};

        if (builtIn.score?.enabled) list.push(builtIn.score.trigger || "!score");
        if (builtIn.help?.enabled) list.push(builtIn.help.trigger || "!help");
        if (listing.commands?.enabled) list.push(listing.commands.trigger || "!commands");

        return `Verfügbare Befehle: ${list.join(", ")}`;
    }

    return null;
}
