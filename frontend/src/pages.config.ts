import { lazy } from 'react';
import { BarChart3, Package, ClipboardCheck, ShieldAlert } from 'lucide-react';

export const MAIN_PAGES = [
  {
    path: '/',
    name: 'Dashboard',
    icon: BarChart3,
    component: lazy(() => import('@/features/dashboard/DashboardPage')),
    showInSidebar: true,
  },
  {
    path: '/inventory',
    name: 'Inventario',
    icon: Package,
    component: lazy(() => import('@/features/inventory/InventoryPage')),
    showInSidebar: true,
  },
  {
    path: '/works',
    name: 'Obras',
    icon: ClipboardCheck,
    component: lazy(() => import('@/features/works/WorksPage')),
    showInSidebar: true,
  },
  {
    path: '/approvals',
    name: 'Aprobaciones',
    icon: ClipboardCheck,
    component: lazy(() => import('@/features/approvals/ApprovalsPage')),
    showInSidebar: true,
    roles: ['admin'],
  },
  {
    path: '/audit',
    name: 'Auditoría',
    icon: ShieldAlert,
    component: lazy(() => import('@/features/audit/AuditPage')),
    showInSidebar: true,
    roles: ['admin'],
  },
];
