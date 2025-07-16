import { useState, useCallback } from 'react';

interface RefinementInput {
  file_id: number;
  encryption_key: string;
  refiner_id?: number;
}

interface RefinementJobStatus {
  job_id: string;
  status: string;
  file_id: number;
  refiner_id: number;
  error?: string;
  transaction_hash?: string;
  submitted_at: string;
  started_at?: string;
  completed_at?: string;
  processing_duration_seconds?: number;
}

interface RefinementResponseV1 {
  add_refinement_tx_hash: string;
  success?: boolean;
  error?: string;
}

interface RefinementResponseV2 {
  job_id: string;
  status: string;
  message: string;
  api_version: string;
  requires_polling: boolean;
}

type RefinementResponse = RefinementResponseV1 | RefinementResponseV2;

interface UseDataRefinementReturn {
  refine: (input: RefinementInput) => Promise<RefinementResponse>;
  checkStatus: (jobId: string) => Promise<RefinementJobStatus>;
  pollJobStatus: (jobId: string, onUpdate?: (status: RefinementJobStatus) => void) => Promise<RefinementJobStatus>;
  isLoading: boolean;
  error: Error | null;
  data: RefinementResponse | null;
}

export function useDataRefinement(): UseDataRefinementReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<RefinementResponse | null>(null);

  const refine = async (input: RefinementInput): Promise<RefinementResponse> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/refine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_id: input.file_id,
          encryption_key: input.encryption_key,
          refiner_id: input.refiner_id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Refinement request failed');
      }

      const responseData = await response.json();
      setData(responseData);
      return responseData;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const checkStatus = async (jobId: string): Promise<RefinementJobStatus> => {
    try {
      const response = await fetch(`/api/refine/status/${jobId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Status check failed');
      }

      return await response.json();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      throw error;
    }
  };

  const pollJobStatus = useCallback(async (
    jobId: string,
    onUpdate?: (status: RefinementJobStatus) => void
  ): Promise<RefinementJobStatus> => {
    const poll = async (): Promise<RefinementJobStatus> => {
      const status = await checkStatus(jobId);
      
      if (onUpdate) {
        onUpdate(status);
      }
      
      // If job is still processing, continue polling
      if (status.status === 'submitted' || status.status === 'processing') {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        return poll();
      }
      
      return status;
    };

    return poll();
  }, []);

  return {
    refine,
    checkStatus,
    pollJobStatus,
    isLoading,
    error,
    data,
  };
}
