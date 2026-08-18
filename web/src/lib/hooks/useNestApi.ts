import { useMutation } from '@tanstack/react-query';
import { nestApi } from '../api/nest';

export function useUploadFile() {
    return useMutation({
        mutationFn: ({ file, sessionId }: { file: File; sessionId: string }) => 
            nestApi.uploadFile(file, sessionId),
    });
}

export function useRecordSelection() {
    return useMutation({
        mutationFn: ({ uploadId, sessionId, pipelineUsed }: { uploadId: string, sessionId: string, pipelineUsed: string }) => 
            nestApi.recordSelection(uploadId, sessionId, pipelineUsed),
    });
}
