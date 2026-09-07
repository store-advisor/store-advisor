/**
 gz2 bta3 rgalt el back
 da lzez 3mlth ana 
 brdo khdo balko ana 3dlt shwya fe el back 7tet multer so i can upload but i make it local js for now
 */
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3000';

// Note: Using a stub token for now to mimic the findings endpoint behavior
const getAuthHeaders = () => {
    return {
        'Authorization': 'Bearer any-token',
    };
};

export interface FileUploadResponse {
    id: string;
    sessionId: string;
    filename: string;
    sizeBytes: number;
    storageRef: string;
    createdAt: string;
}

export interface FileSelectionResponse {
    id: string;
    uploadId: string;
    sessionId: string;
    pipelineUsed: string;
    createdAt: string;
}

export const nestApi = {
    async uploadFile(file: File, sessionId: string): Promise<FileUploadResponse> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('sessionId', sessionId);

        const response = await fetch(`${BASE_URL}/uploads`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`NestJS upload failed: ${response.statusText}`);
        }
        return response.json();
    },

    async recordSelection(
        uploadId: string, 
        sessionId: string, 
        pipelineUsed: string
    ): Promise<FileSelectionResponse> {
        const response = await fetch(`${BASE_URL}/selections`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ uploadId, sessionId, pipelineUsed }),
        });

        if (!response.ok) {
            throw new Error(`NestJS selection record failed: ${response.statusText}`);
        }
        return response.json();
    }
};
