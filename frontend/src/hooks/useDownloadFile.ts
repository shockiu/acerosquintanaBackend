import { useState } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';

export function useDownloadFile() {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadFile = async ({ downloader, filename, successMessage, errorMessage }: {
    downloader: () => Promise<Blob>;
    filename: string;
    successMessage?: string;
    errorMessage?: string;
  }) => {
    setIsDownloading(true);
    try {
      const blob = await downloader();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      if (successMessage) toast.success(successMessage);
    } catch (error) {
      toast.error(getErrorMessage(error, errorMessage || 'Error al descargar archivo'));
    } finally {
      setIsDownloading(false);
    }
  };

  return { downloadFile, isDownloading };
}
