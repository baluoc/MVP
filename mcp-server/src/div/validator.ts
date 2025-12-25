// Redefine type locally as discussed
export interface DIVPacket {
    id: string;
    titel: string;
    autor: string;
    rolle: 'addon_dev' | 'core_fix' | 'config_mgr' | 'qa_only';
    erstelltAm: string;
    intent: string;
    scope: {
        paths: string[];
        risiko: string;
    };
    plan: string[];
    changes: {
        op: 'modify' | 'create' | 'delete';
        path: string;
        patch?: string; // diff
        content?: string; // for create
    }[];
    qa: {
        required: string[];
        results: {
            status: 'pending' | 'success' | 'failed';
            artifacts: string[];
        };
    };
    rollback: {
        strategy: string;
        notes: string;
    };
    review: {
        status: 'draft' | 'review' | 'approved' | 'applied' | 'rolled_back';
        comments: any[];
    };
}

export type ValidationResult = { valid: true } | { valid: false, error: string };

const ALLOWED_ROLES = ['addon_dev', 'core_fix', 'config_mgr', 'qa_only'];

const POLICY: Record<string, { allow: string[], deny: string[] }> = {
    addon_dev: { allow: ['addons/**', 'public/**'], deny: ['src/**'] },
    core_fix: { allow: ['src/**', 'public/**'], deny: ['.env', 'data/config.json'] }, // config_mgr handles config
    config_mgr: { allow: ['data/config.json'], deny: [] },
    qa_only: { allow: [], deny: ['**'] } // Cannot change files
};

// Minimatch-like simple check (MVP)
function matches(path: string, pattern: string): boolean {
    if (pattern === '**') return true;
    if (pattern.endsWith('/**')) {
        return path.startsWith(pattern.replace('/**', ''));
    }
    return path === pattern;
}

export function validateDIV(div: DIVPacket): ValidationResult {
    if (!div.id || !div.titel || !div.autor) return { valid: false, error: 'Missing metadata' };
    if (!ALLOWED_ROLES.includes(div.rolle)) return { valid: false, error: 'Invalid role' };

    // Check Format
    if (!Array.isArray(div.changes)) return { valid: false, error: 'Changes must be an array' };

    // Exception: qa_only has empty allow, but maybe allowed to read? DIV is about CHANGES.
    // So qa_only cannot have changes.
    // MUST CHECK THIS BEFORE POLICY LOOP to give specific error message
    if (div.rolle === 'qa_only' && div.changes.length > 0) {
        return { valid: false, error: 'QA role cannot make changes' };
    }

    // Check Policy
    const policy = POLICY[div.rolle];
    if (!policy) return { valid: false, error: 'No policy for role' };

    for (const change of div.changes) {
        // Deny check
        for (const deny of policy.deny) {
            if (matches(change.path, deny)) {
                return { valid: false, error: `Access denied to ${change.path} for role ${div.rolle}` };
            }
        }

        // Allow check (implicit deny if not allowed? MVP says "Allowlist pro Rolle")
        let allowed = false;
        for (const allow of policy.allow) {
            if (matches(change.path, allow)) {
                allowed = true;
                break;
            }
        }

        if (!allowed) {
            return { valid: false, error: `Path ${change.path} not in allowlist for role ${div.rolle}` };
        }
    }

    return { valid: true };
}
