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
