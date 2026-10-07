import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
import { worksApi } from '../services/worksApi';
import { worksKeys } from '../works.keys';
import { inventoryKeys } from '@/features/inventory/inventory.keys';
import apiClient from '@/api/axiosClient';

export function useWorks() {
  return useQuery({
    queryKey: worksKeys.list(),
    queryFn: () => worksApi.getWorks(),
  });
}

export function useCreateWork() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: worksApi.createWork,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: worksKeys.list() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      toast.success('Obra registrada y enviada a aprobación');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Error al registrar obra')),
  });
}

export function useExportWorks() {
  const exportWorks = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await apiClient.get('/exports/works.xlsx', {
        responseType: 'blob', // Importante para manejar archivos binarios
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `obras_reporte_${new Date().getTime()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success('Reporte exportado exitosamente');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Error al exportar reporte'));
    }
  };

  return { exportWorks };
}
